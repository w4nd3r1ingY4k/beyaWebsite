// handlers/flowUpdate.js

/**
 * Lambda function to handle PATCH updates to a “flow” in the DynamoDB table.
 * 
 * - Supports updating arbitrary scalar fields (strings, numbers, etc.), which will overwrite existing values.
 * - Supports appending to an existing `participants` array without overwriting it, using DynamoDB’s list_append.
 * - Preserves all existing functionality (CORS preflight, method check, flowId extraction, error handling).
 */

const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();

// The DynamoDB table name should be configured in your Lambda’s environment variables
const TABLE = process.env.FLOWS_TABLE;

exports.handler = async function(event) {
  // 1) CORS Preflight (OPTIONS)  — typically Function URL CORS settings handle the headers.
  //    We simply return 200 for OPTIONS to allow the client to proceed.
  const method = event.requestContext.http.method;
  if (method === "OPTIONS") {
    return {
      statusCode: 200
    };
  }

  // 2) Only PATCH is allowed for this endpoint. Reject any other HTTP methods.
  if (method !== "PATCH") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  // 3) Extract flowId from the path: expected path format → /flows/{flowId}
  //    event.requestContext.http.path might look like "/flows/abc-123".
  const parts = (event.requestContext.http.path || "").split("/");
  const flowId = parts[2];
  if (!flowId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing flowId in path" })
    };
  }

  // 4) Parse JSON body to get the update fields. We expect a `userId` field + any other fields to update.
  let updates;
  try {
    updates = JSON.parse(event.body || "{}");
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON" })
    };
  }

  // 4.a) Pull out userId, which maps to contactId in DynamoDB.
  const contactId = updates.userId;
  if (!contactId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing userId" })
    };
  }
  // Remove userId from updates so it doesn’t become an actual attribute in the table.
  delete updates.userId;

  // 5) Build a DynamoDB UpdateExpression dynamically based on the `updates` keys.
  //    We will iterate through each [key, value] pair in `updates` and:
  //      - If key === "participants", generate a list_append expression.
  //      - Otherwise, generate a simple SET assignment to overwrite the field.

  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = {};
  const setParts = [];
  
  // We will use a single placeholder ":empty" for initializing an empty list if `participants` doesn’t exist.
  let needsEmptyListPlaceholder = false;

  Object.entries(updates).forEach(([attrName, attrValue], index) => {
    // Create unique placeholders for attribute name and value
    const nameKey = `#f${index}`;
    const valKey = `:v${index}`;

    // Map the placeholder to the real attribute name
    ExpressionAttributeNames[nameKey] = attrName;

    // If this update pertains to “participants”, we want to append rather than overwrite:
    if (attrName === "participants") {
      // Mark that we need an empty-list placeholder (":empty") if it doesn’t already exist
      needsEmptyListPlaceholder = true;

      // Set the expression: 
      //   #fX = list_append(if_not_exists(#fX, :empty), :vX)
      // This means:
      //   - if #fX doesn’t exist yet, treat it as an empty list (`:empty`)
      //   - then append the new array (:vX) to that list
      setParts.push(
        `${nameKey} = list_append(if_not_exists(${nameKey}, :empty), ${valKey})`
      );
      // Assign the new participants array (which should itself be a list of one or more strings)
      ExpressionAttributeValues[valKey] = attrValue;
    } else {
      // For any other attribute, just overwrite with the new value
      setParts.push(`${nameKey} = ${valKey}`);
      ExpressionAttributeValues[valKey] = attrValue;
    }
  });

  // If we determined that we need the ":empty" placeholder for participants, define it now:
  if (needsEmptyListPlaceholder) {
    // This will ensure that if “participants” doesn’t exist, DynamoDB treats it as an empty list.
    ExpressionAttributeValues[":empty"] = [];
  }

  // 5.a) Ensure there is at least one field to update
  if (setParts.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "No update fields provided" })
    };
  }

  // 6) Construct the final UpdateExpression
  const updateExpression = "SET " + setParts.join(", ");

  // 7) Build the DynamoDB Update params
  const params = {
    TableName: TABLE,
    Key: {
      contactId,
      flowId
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues: "ALL_NEW" // Return the entire updated item
  };

  // 8) Execute the update and return the updated attributes or an error
  try {
    const result = await docClient.update(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ updated: result.Attributes })
    };
  } catch (err) {
    console.error("flowUpdate error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
// getAllContacts/index.js
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const REGION = process.env.AWS_REGION;
const TABLE  = process.env.CONTACTS_TABLE; // e.g. "Contacts"

const ddb     = new DynamoDBClient({ region: REGION });
const ddbDoc  = DynamoDBDocumentClient.from(ddb, {
  marshallOptions: { removeUndefinedValues: true },
});

export const handler = async (event) => {
  console.log("──── getAllContacts invoked ────");
  console.log("QueryStringParameters:", JSON.stringify(event.queryStringParameters));

  // 1) Parse pagination parameters from the query string
  //    - limit (how many items per page), default 50
  //    - startKey (base64-encoded LastEvaluatedKey from a previous page)
  const qs = event.queryStringParameters || {};
  const limit = qs.limit ? parseInt(qs.limit, 10) : 50;
  let ExclusiveStartKey = undefined;

  if (qs.startKey) {
    try {
      // qs.startKey is expected to be a base64‐encoded JSON string of the DynamoDB key object
      const decoded = Buffer.from(qs.startKey, "base64").toString("utf-8");
      ExclusiveStartKey = JSON.parse(decoded);
    } catch (e) {
      console.warn("Invalid startKey provided, ignoring it:", e);
    }
  }

  // 2) Build the ScanCommand parameters
  const params = {
    TableName: TABLE,
    Limit: limit,
    ...(ExclusiveStartKey ? { ExclusiveStartKey } : {}),
  };

  let result;
  try {
    result = await ddbDoc.send(new ScanCommand(params));
  } catch (err) {
    console.error("Error scanning DynamoDB:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Error reading contacts", error: err.message }),
    };
  }

  // 3) If DynamoDB returned a LastEvaluatedKey, base64-encode it for the client
  let nextKey = null;
  if (result.LastEvaluatedKey) {
    try {
      const stringified = JSON.stringify(result.LastEvaluatedKey);
      nextKey = Buffer.from(stringified).toString("base64");
    } catch (e) {
      console.warn("Failed to stringify LastEvaluatedKey:", e);
      nextKey = null;
    }
  }

  // 4) Return the page of items, plus lastKey (if any)
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contacts: result.Items || [],
      lastKey: nextKey, // the client can include this as ?startKey=... on the next request
    }),
  };
};
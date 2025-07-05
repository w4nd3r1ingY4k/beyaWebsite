// handlers/createUser.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuid } = require("uuid");

// Initialize DocumentClient once
const ddbClient = new DynamoDBClient({});
const ddb       = DynamoDBDocumentClient.from(ddbClient);

const USERS_TABLE = process.env.USERS_TABLE; // e.g. "Users"

/**
 * Lambda handler to create or update a user record with:
 *   - userId
 *   - subscriber_email
 *   - createdAt
 *   - lastLoginAt
 *   - companyId
 *   - timezone
 *   - displayName
 *   - connectedAccounts
 */
exports.handler = async (event) => {
  try {
    // parse incoming JSON, with defaults for optional fields
    const {
      action           = "create", // "create" or "update"
      email,
      sub,
      userId,
      companyId        = null,
      timezone         = null,
      displayName      = null,
      connectedAccounts= {}
    } = JSON.parse(event.body || "{}");

    if (action === "update") {
      // Handle update operation
      if (!userId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Missing required field: userId for update" })
        };
      }

      // Build update expression and values
      let updateExpression = "SET";
      const expressionAttributeValues = {};
      const updates = [];

      if (connectedAccounts && Object.keys(connectedAccounts).length > 0) {
        // Update connectedAccounts
        Object.entries(connectedAccounts).forEach(([key, value]) => {
          updates.push(`connectedAccounts.#${key} = :${key}`);
          expressionAttributeValues[`:${key}`] = value;
        });
      }

      if (displayName !== null) {
        updates.push("displayName = :displayName");
        expressionAttributeValues[":displayName"] = displayName;
      }

      if (timezone !== null) {
        updates.push("timezone = :timezone");
        expressionAttributeValues[":timezone"] = timezone;
      }

      if (updates.length === 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "No fields to update" })
        };
      }

      updateExpression += " " + updates.join(", ");

      const expressionAttributeNames = {};
      if (connectedAccounts && Object.keys(connectedAccounts).length > 0) {
        Object.keys(connectedAccounts).forEach(key => {
          expressionAttributeNames[`#${key}`] = key;
        });
      }

      // Update user in DynamoDB
      await ddb.send(new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ...(Object.keys(expressionAttributeNames).length > 0 && {
          ExpressionAttributeNames: expressionAttributeNames
        })
      }));

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "User updated successfully", userId })
      };

    } else {
      // Handle create operation (existing logic)
      if (!email) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Missing required field: email" })
        };
      }

      const now = new Date().toISOString();
      const newUserId = sub || uuid();

      // build the complete item
      const item = {
        userId: newUserId,
        subscriber_email: email,
        createdAt: now,
        lastLoginAt: now,
        companyId,
        timezone,
        displayName,
        connectedAccounts
      };

      // write to DynamoDB
      await ddb.send(new PutCommand({
        TableName: USERS_TABLE,
        Item: item
      }));

      return {
        statusCode: 201,
        body: JSON.stringify({ userId: newUserId })
      };
    }
  } catch (err) {
    console.error("Error in user operation:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to process user operation", error: err.message })
    };
  }
};
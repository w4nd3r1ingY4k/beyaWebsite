// handlers/createUser.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuid } = require("uuid");

// Initialize DocumentClient once
const ddbClient = new DynamoDBClient({});
const ddb       = DynamoDBDocumentClient.from(ddbClient);

const USERS_TABLE = process.env.USERS_TABLE; // e.g. "Users"

/**
 * Lambda handler to create a user record with:
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
      email,
      sub,
      companyId        = null,
      timezone         = null,
      displayName      = null,
      connectedAccounts= {}
    } = JSON.parse(event.body || "{}");

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required field: email" })
      };
    }

    const now    = new Date().toISOString();
    const userId = sub || uuid();

    // build the complete item
    const item = {
      userId,
      subscriber_email:   email,
      createdAt:          now,
      lastLoginAt:        now,
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
      body: JSON.stringify({ userId })
    };
  } catch (err) {
    console.error("Error creating user:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to create user" })
    };
  }
};
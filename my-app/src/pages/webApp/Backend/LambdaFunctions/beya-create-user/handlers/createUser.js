// handler.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuid } = require("uuid");

// Initialize DocumentClient
const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

const USERS_TABLE = process.env.USERS_TABLE; // make sure to set this in your Lambda’s env

exports.handler = async (event) => {
  try {
    const { email, sub } = JSON.parse(event.body);
    const userId = sub || uuid();

    await ddb.send(
      new PutCommand({
        TableName: USERS_TABLE,
        Item: {
          userId,
          subscriber_email: email,
          createdAt: new Date().toISOString()
        }
      })
    );

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
// handlers/getUser.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand
} = require("@aws-sdk/lib-dynamodb");

// Initialize DocumentClient
const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

const USERS_TABLE = process.env.USERS_TABLE; // ensure this is set in your Lambda env

exports.handler = async (event) => {
  try {
    // Extract the userId from the HTTP path: GET /users/{userId}
    const userId = event.pathParameters && event.pathParameters.userId;
    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing path parameter 'userId'" })
      };
    }

    // Fetch the item from DynamoDB
    const { Item } = await ddb.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));

    // If no item found, return 404
    if (!Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "User not found" })
      };
    }

    // Return the full metadata
    return {
      statusCode: 200,
      body: JSON.stringify(Item)
    };
  } catch (err) {
    console.error("Error fetching user:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" })
    };
  }
};
// handlers/lookupUserByEmail.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand
} = require("@aws-sdk/lib-dynamodb");

// Initialize a v3 DocumentClient
const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

// Environment variables
const USERS_TABLE = process.env.USERS_TABLE;       // e.g. "Users"
const EMAIL_INDEX = process.env.EMAIL_INDEX || null; // e.g. "SubscriberEmailIndex" or blank

exports.handler = async function(event) {
  // 1) CORS preflight
  const method = event.requestContext.http.method;
  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: ""
    };
  }

  // 2) Only GET allowed
  if (method !== "GET") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "Method Not Allowed"
    };
  }

  // 3) Extract `email` from query string
  const email = event.queryStringParameters?.email;
  if (!email || typeof email !== "string" || !email.trim()) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Missing or invalid 'email' query parameter" })
    };
  }
  // Don’t lowercase—use exactly what’s stored
  const normalizedEmail = email.trim();

  // 4) Ensure USERS_TABLE is set
  if (!USERS_TABLE) {
    console.error("Environment variable USERS_TABLE is not set");
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Internal configuration error" })
    };
  }

  console.log("Looking up in table:", USERS_TABLE, "via index:", EMAIL_INDEX, "for email:", normalizedEmail);

  try {
    // 5) If you have a GSI on subscriber_email, query that first
    if (EMAIL_INDEX) {
      const queryParams = {
        TableName: USERS_TABLE,
        IndexName: EMAIL_INDEX,
        KeyConditionExpression: "#se = :emailVal",
        ExpressionAttributeNames: { "#se": "subscriber_email" },
        ExpressionAttributeValues: { ":emailVal": normalizedEmail },
      };

      const queryResult = await ddb.send(new QueryCommand(queryParams));
      console.log("QueryResult:", JSON.stringify(queryResult));
      if (queryResult.Items && queryResult.Items.length > 0) {
        return {
          statusCode: 200,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify(queryResult.Items[0])
        };
      }
      // If no match, fall through to Scan
    }

    // 6) Fallback to Scan on subscriber_email
    const scanParams = {
      TableName: USERS_TABLE,
      FilterExpression: "#se = :emailVal",
      ExpressionAttributeNames: { "#se": "subscriber_email" },
      ExpressionAttributeValues: { ":emailVal": normalizedEmail },
    };

    const scanResult = await ddb.send(new ScanCommand(scanParams));
    console.log("ScanResult:", JSON.stringify(scanResult));
    if (scanResult.Items && scanResult.Items.length > 0) {
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(scanResult.Items[0])
      };
    }

    // 7) No user found
    return {
      statusCode: 404,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: `User with email "${normalizedEmail}" not found.` })
    };

  } catch (dbErr) {
    console.error("DynamoDB error:", dbErr);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  }
};
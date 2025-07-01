// handlers/flowComments.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

// Initialize DynamoDB Document Client (v3)
const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

// Name of your comments table (must be set in Lambda’s environment variables)
const COMMENTS_TABLE = process.env.FLOW_COMMENTS_TABLE;

exports.handler = async function(event) {
  // Extract HTTP method from the event
  const httpMethod = event.requestContext?.http?.method;

  // 1) Handle CORS preflight (OPTIONS)
  //    When using a Lambda Function URL with CORS enabled, AWS itself will inject
  //    the Access-Control-Allow-* headers into the response. So here we just return 200.
  if (httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      body: ""
    };
  }

  // 2) Parse the path to ensure it matches “/flows/{flowId}/comments”
  //    We expect event.rawPath = "/flows/abcdef1234/comments"
  const rawPath = event.rawPath || "";
  const parts = rawPath.split("/"); 
  // → parts = ["", "flows", "<flowId>", "comments"]

  if (
    parts.length !== 4 ||
    parts[1] !== "flows" ||
    parts[3] !== "comments"
  ) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Invalid path. Expected /flows/{flowId}/comments"
      })
    };
  }

  const flowId = decodeURIComponent(parts[2]);
  if (!flowId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing flowId in path" })
    };
  }

  // 3) If method = GET → query DynamoDB for all comments under this flowId
  if (httpMethod === "GET") {
    try {
      const queryParams = {
        TableName: COMMENTS_TABLE,
        KeyConditionExpression: "flowId = :f",
        ExpressionAttributeValues: {
          ":f": flowId
        },
        // Sort by commentId or createdAt if you have a GSI; here we keep it simple
        ScanIndexForward: true // ascending on sort key (commentId)
      };
      const result = await ddb.send(new QueryCommand(queryParams));
      const comments = result.Items || [];

      return {
        statusCode: 200,
        body: JSON.stringify({ comments })
      };
    } catch (err) {
      console.error("DynamoDB Query error:", err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to load comments" })
      };
    }
  }

  // 4) If method = POST → insert a new comment
  if (httpMethod === "POST") {
    // 4a) Parse JSON body
    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON" })
      };
    }

    const { authorId, authorName, text } = payload;
    if (!authorId || !authorName || !text) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Must include authorId, authorName, and text"
        })
      };
    }

    // 4b) Build and write the new comment item
    const commentId = uuidv4();
    const now = new Date().toISOString();
    const item = {
      flowId,
      commentId,
      authorId,
      authorName,
      text,
      createdAt: now
    };

    try {
      await ddb.send(
        new PutCommand({
          TableName: COMMENTS_TABLE,
          Item: item
        })
      );
    } catch (dbErr) {
      console.error("DynamoDB Put error:", dbErr);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Could not save comment" })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, comment: item })
    };
  }

  // 5) Any other method → 405
  return {
    statusCode: 405,
    body: "Method Not Allowed"
  };
};
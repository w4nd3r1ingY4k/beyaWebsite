// handlers/getFlowComments.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

// 1. Initialize a v3 DynamoDBDocumentClient
const ddbClient = new DynamoDBClient({ region: "us-east-1" });
const ddb = DynamoDBDocumentClient.from(ddbClient);

// 2. The environment variable FLOW_COMMENTS_TABLE must be set to "FlowComments"
const COMMENTS_TABLE = process.env.FLOW_COMMENTS_TABLE;

exports.handler = async (event) => {
  // Only allow GET on this endpoint
  if (event.requestContext.http.method !== "GET") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "Method Not Allowed"
    };
  }

  // Extract flowId from the path ("/flows/{flowId}/comments")
  const flowId = event.pathParameters && event.pathParameters.flowId;
  if (!flowId) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Missing path parameter 'flowId'" })
    };
  }

  // Perform a Query: all items where PartitionKey = flowId, sorted by createdAt asc
  try {
    const params = {
      TableName: COMMENTS_TABLE,
      KeyConditionExpression: "#f = :fid",
      ExpressionAttributeNames: { "#f": "flowId" },
      ExpressionAttributeValues: { ":fid": flowId },
      ScanIndexForward: true  // oldest comments first
    };

    const result = await ddb.send(new QueryCommand(params));
    const comments = (result.Items || []).map(item => ({
      commentId:  item.commentId,
      authorId:   item.authorId,
      authorName: item.authorName,
      text:       item.text,
      createdAt:  item.createdAt
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ comments })
    };
  } catch (err) {
    console.error("Error querying FlowComments:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Could not fetch comments" })
    };
  }
};
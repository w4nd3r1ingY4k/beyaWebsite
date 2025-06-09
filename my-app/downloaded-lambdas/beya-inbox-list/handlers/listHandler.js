// handlers/flowsHandler.js
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const REGION    = process.env.AWS_REGION;
const MSG_TABLE = process.env.MSG_TABLE;
const CORS      = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'OPTIONS,GET',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const ddb       = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddb);

export async function handler(event) {
  const method = event.requestContext?.http?.method;
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS };
  }
  if (method !== 'GET') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  }
  if (!MSG_TABLE) {
    console.error('Missing MSG_TABLE env var');
    return { statusCode: 500, headers: CORS };
  }

  const threadId = event.pathParameters?.threadId;

  try {
    if (threadId) {
      // ——— RETURN ALL MESSAGES FOR THAT THREAD ———
      const resp = await docClient.send(new QueryCommand({
        TableName: MSG_TABLE,
        KeyConditionExpression: 'ThreadId = :tid',
        ExpressionAttributeValues: {
          ':tid': threadId
        }
      }));

      // resp.Items is an array of your message objects
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ messages: resp.Items || [] })
      };
    } else {
      // ——— NO threadId → LIST ALL THREADS ———
      const resp = await docClient.send(new ScanCommand({ TableName: MSG_TABLE }));
      const items = resp.Items || [];
      const threads = Array.from(new Set(items.map(i => i.ThreadId)));
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ threads })
      };
    }
  } catch (err) {
    console.error('❌ flowsHandler error', err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
}
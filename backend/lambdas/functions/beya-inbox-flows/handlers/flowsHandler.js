// handlers/flowsHandler.js
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const REGION      = process.env.AWS_REGION;
const FLOWS_TABLE = process.env.FLOWS_TABLE;
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'OPTIONS,GET',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const ddb  = new DynamoDBClient({ region: REGION });
const doc  = DynamoDBDocumentClient.from(ddb);

export async function handler(event) {
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS };
  }
  try {
    const resp = await doc.send(new ScanCommand({ TableName: FLOWS_TABLE }));
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ flows: resp.Items || [] })
    };
  } catch (err) {
    console.error('❌ flowsHandler error', err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
}
// handlers/listHandler.js
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const REGION    = process.env.AWS_REGION;
const MSG_TABLE = process.env.MSG_TABLE;
const FLOWS_TABLE = process.env.FLOWS_TABLE || 'Flows';
const USER_MESSAGES_INDEX = 'User-Messages-Index'; // GSI name
const CORS      = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const ddb       = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddb);

// Helper function to check if user has access to a thread
async function userHasAccessToThread(userId, threadId) {
  try {
    // First, check if user is the owner (contactId)
    const ownerCheck = await docClient.send(new GetCommand({
      TableName: FLOWS_TABLE,
      Key: {
        contactId: userId,
        flowId: threadId
      }
    }));
    
    if (ownerCheck.Item) {
      console.log(`✅ User ${userId} is owner of thread ${threadId}`);
      return true;
    }
    
    // If not owner, scan to see if user is a participant
    // Note: In production, you might want to use a GSI for better performance
    const participantCheck = await docClient.send(new ScanCommand({
      TableName: FLOWS_TABLE,
      FilterExpression: 'flowId = :fid AND contains(participants, :uid)',
      ExpressionAttributeValues: {
        ':fid': threadId,
        ':uid': userId
      }
    }));
    
    if (participantCheck.Items && participantCheck.Items.length > 0) {
      console.log(`✅ User ${userId} is participant in thread ${threadId}`);
      return true;
    }
    
    console.log(`❌ User ${userId} has no access to thread ${threadId}`);
    return false;
  } catch (error) {
    console.error('Error checking thread access:', error);
    return false;
  }
}

export async function handler(event) {
  const method = event.requestContext?.http?.method;
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS };
  }
  if (method !== 'GET' && method !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  }
  if (!MSG_TABLE) {
    console.error('Missing MSG_TABLE env var');
    return { statusCode: 500, headers: CORS };
  }

  // Extract userId from request body (POST) or query parameters (GET)
  let userId = null;
  if (method === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      userId = body.userId;
    } catch {
      return { statusCode: 400, headers: CORS, body: 'Invalid JSON' };
    }
  } else {
    userId = event.queryStringParameters?.userId;
  }

  if (!userId) {
    return { 
      statusCode: 400, 
      headers: CORS, 
      body: JSON.stringify({ error: 'userId is required' })
    };
  }

  const threadId = event.pathParameters?.threadId;

  try {
    if (threadId) {
      // ——— RETURN ALL MESSAGES FOR THAT THREAD (IF USER HAS ACCESS) ———
      
      // First check if user has access to this thread
      const hasAccess = await userHasAccessToThread(userId, threadId);
      
      if (!hasAccess) {
        return {
          statusCode: 403,
          headers: CORS,
          body: JSON.stringify({ error: 'Access denied to this thread' })
        };
      }
      
      // User has access, so fetch ALL messages for this thread using primary key
      const resp = await docClient.send(new QueryCommand({
        TableName: MSG_TABLE,
        KeyConditionExpression: 'ThreadId = :tid',
        ExpressionAttributeValues: {
          ':tid': threadId
        },
        ScanIndexForward: true // Sort by timestamp ascending
      }));

      console.log(`📧 Returning ${resp.Items?.length || 0} messages for thread ${threadId}`);
      
      // resp.Items is an array of ALL messages in the thread
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ messages: resp.Items || [] })
      };
    } else {
      // ——— LIST ALL THREADS FOR THIS USER ———
      const resp = await docClient.send(new QueryCommand({
        TableName: MSG_TABLE,
        IndexName: USER_MESSAGES_INDEX,
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: {
          ':uid': userId
        }
      }));
      
      const items = resp.Items || [];
      // Extract unique ThreadIds from user's messages
      const threads = Array.from(new Set(items.map(i => i.ThreadId)));
      
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ threads })
      };
    }
  } catch (err) {
    console.error('❌ listHandler error', err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
}
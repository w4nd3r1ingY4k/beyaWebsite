// handlers/listHandler.js
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

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

// Helper function to mark messages as read
async function markMessagesAsRead(userId, threadId, messageIds = null) {
  try {
    // If specific messageIds are provided, mark only those
    if (messageIds && messageIds.length > 0) {
      const updatePromises = messageIds.map(messageId => {
        // We need both ThreadId and Timestamp for the primary key
        // First get the message to find its timestamp
        return docClient.send(new QueryCommand({
          TableName: MSG_TABLE,
          KeyConditionExpression: 'ThreadId = :tid',
          FilterExpression: 'MessageId = :mid',
          ExpressionAttributeValues: {
            ':tid': threadId,
            ':mid': messageId
          }
        })).then(result => {
          if (result.Items && result.Items.length > 0) {
            const message = result.Items[0];
            return docClient.send(new UpdateCommand({
              TableName: MSG_TABLE,
              Key: {
                ThreadId: threadId,
                Timestamp: message.Timestamp
              },
              UpdateExpression: 'SET IsUnread = :false',
              ExpressionAttributeValues: {
                ':false': false
              }
            }));
          }
        });
      });
      
      await Promise.all(updatePromises);
    } else {
      // Mark all messages in the thread as read
      const messages = await docClient.send(new QueryCommand({
        TableName: MSG_TABLE,
        KeyConditionExpression: 'ThreadId = :tid',
        FilterExpression: 'IsUnread = :true',
        ExpressionAttributeValues: {
          ':tid': threadId,
          ':true': true
        }
      }));
      
      if (messages.Items && messages.Items.length > 0) {
        const updatePromises = messages.Items.map(message => 
          docClient.send(new UpdateCommand({
            TableName: MSG_TABLE,
            Key: {
              ThreadId: threadId,
              Timestamp: message.Timestamp
            },
            UpdateExpression: 'SET IsUnread = :false',
            ExpressionAttributeValues: {
              ':false': false
            }
          }))
        );
        
        await Promise.all(updatePromises);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
}

export async function handler(event) {
  const method = event.requestContext?.http?.method;
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS };
  }
  
  // Handle mark as read endpoint
  if (method === 'POST' && (event.pathParameters?.action === 'mark-read' || event.rawPath === '/mark-read')) {
    try {
      const body = JSON.parse(event.body || '{}');
      const { userId, threadId, messageIds } = body;
      
      if (!userId || !threadId) {
        return {
          statusCode: 400,
          headers: CORS,
          body: JSON.stringify({ error: 'userId and threadId are required' })
        };
      }
      
      // Check if user has access to this thread
      const hasAccess = await userHasAccessToThread(userId, threadId);
      if (!hasAccess) {
        return {
          statusCode: 403,
          headers: CORS,
          body: JSON.stringify({ error: 'Access denied to this thread' })
        };
      }
      
      await markMessagesAsRead(userId, threadId, messageIds);
      
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ success: true })
      };
    } catch (error) {
      console.error('Error in mark-read handler:', error);
      return {
        statusCode: 500,
        headers: CORS,
        body: JSON.stringify({ error: 'Internal Server Error' })
      };
    }
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
      let resp = await docClient.send(new QueryCommand({
        TableName: MSG_TABLE,
        KeyConditionExpression: 'ThreadId = :tid',
        ExpressionAttributeValues: {
          ':tid': threadId
        },
        ScanIndexForward: true // Sort by timestamp ascending
      }));

      // BACKWARDS COMPATIBILITY: If no messages found with UUID, 
      // check if this is an old flow and look for messages with the original contact identifier
      if (!resp.Items || resp.Items.length === 0) {
        console.log(`📧 No messages found for UUID ${threadId}, checking for backwards compatibility...`);
        
        // Get the flow to see if it has a contactIdentifier (new flows) or if flowId is actually a contact identifier (old flows)
        const flowCheck = await docClient.send(new GetCommand({
          TableName: FLOWS_TABLE,
          Key: {
            contactId: userId,
            flowId: threadId
          }
        }));
        
        let contactIdentifier = null;
        if (flowCheck.Item) {
          // Check if this flow has a contactIdentifier field (new format)
          if (flowCheck.Item.contactIdentifier) {
            contactIdentifier = flowCheck.Item.contactIdentifier;
            console.log(`📧 Found contactIdentifier: ${contactIdentifier} for flow ${threadId}`);
          } 
          // OR if flowId looks like an email/phone (old format)
          else if (threadId.includes('@') || threadId.startsWith('+')) {
            contactIdentifier = threadId;
            console.log(`📧 Using flowId as contact identifier: ${contactIdentifier}`);
          }
        }
        
        // If we found a contact identifier, try querying messages with that
        if (contactIdentifier) {
          console.log(`📧 Querying messages with contact identifier: ${contactIdentifier}`);
          resp = await docClient.send(new QueryCommand({
            TableName: MSG_TABLE,
            KeyConditionExpression: 'ThreadId = :tid',
            ExpressionAttributeValues: {
              ':tid': contactIdentifier
            },
            ScanIndexForward: true
          }));
          
          console.log(`📧 Found ${resp.Items?.length || 0} messages using backwards compatibility`);
        }
      }

      console.log(`📧 Returning ${resp.Items?.length || 0} messages for thread ${threadId}`);
      
      // resp.Items is an array of ALL messages in the thread
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ messages: resp.Items || [] })
      };
    } else {
      // ——— LIST ALL THREADS FOR THIS USER WITH UNREAD COUNTS ———
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
      const uniqueThreadIds = Array.from(new Set(items.map(i => i.ThreadId)));
      
      // Calculate unread counts for each thread
      const threadsWithUnreadCounts = await Promise.all(
        uniqueThreadIds.map(async (threadId) => {
          try {
            // Count unread messages for this thread (only incoming messages)
            const unreadQuery = await docClient.send(new QueryCommand({
              TableName: MSG_TABLE,
              KeyConditionExpression: 'ThreadId = :tid',
              FilterExpression: 'IsUnread = :true AND Direction = :incoming',
              ExpressionAttributeValues: {
                ':tid': threadId,
                ':true': true,
                ':incoming': 'incoming'
              },
              Select: 'COUNT'
            }));
            
            const unreadCount = unreadQuery.Count || 0;
            
            return {
              threadId,
              unreadCount,
              hasUnreadMessages: unreadCount > 0
            };
          } catch (error) {
            console.error(`Error counting unread messages for thread ${threadId}:`, error);
            return {
              threadId,
              unreadCount: 0,
              hasUnreadMessages: false
            };
          }
        })
      );
      
      console.log(`📧 Returning ${uniqueThreadIds.length} threads with unread counts`);
      
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ 
          threads: uniqueThreadIds,
          unreadCounts: threadsWithUnreadCounts
        })
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
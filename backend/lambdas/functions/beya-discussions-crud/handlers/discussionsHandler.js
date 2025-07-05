// handlers/discussionsHandler.js

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

// ─── Environment variables ──────────────────────────────────────────────
const REGION = process.env.AWS_REGION;
const DISCUSSIONS_TABLE = process.env.DISCUSSIONS_TABLE || 'Discussions';
const DISCUSSION_MESSAGES_TABLE = process.env.DISCUSSION_MESSAGES_TABLE || 'DiscussionMessages';
const USERS_TABLE = process.env.USERS_TABLE || 'Users';
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'beya-platform-bus';

if (!REGION) {
  throw new Error('Missing required env var: AWS_REGION');
}

// ─── AWS clients ─────────────────────────────────────────────────────────
const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true }
});
const eventBridgeClient = new EventBridgeClient({ region: REGION });

// Helper function to get user display name
async function getUserDisplayName(userId) {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));
    
    if (result.Item) {
      // Return subscriber_email or displayName, fallback to userId
      return result.Item.subscriber_email || result.Item.displayName || userId;
    }
    
    return userId; // Fallback if user not found
  } catch (error) {
    console.error('Error fetching user:', error);
    return userId; // Fallback on error
  }
}

// ─── Helper: Emit rawEvent to EventBridge ───────────────────────────────
async function emitRawEvent(eventType, userId, data) {
  const rawEvent = {
    eventId: uuidv4(),
    timestamp: new Date().toISOString(),
    source: "discussions-service",
    userId: userId,
    eventType: eventType,
    data: data
  };

  try {
    await eventBridgeClient.send(new PutEventsCommand({
      Entries: [{
        EventBusName: EVENT_BUS_NAME,
        Source: rawEvent.source,
        DetailType: rawEvent.eventType,
        Time: new Date(rawEvent.timestamp),
        Detail: JSON.stringify(rawEvent)
      }]
    }));
    console.log('✅ RawEvent emitted:', rawEvent.eventId, eventType);
  } catch (eventErr) {
    console.error('❌ Failed to emit rawEvent:', eventErr);
    // Don't fail the operation if event emission fails
  }
}

// Migration function to update existing discussions with status fields
async function migrateDiscussionsStatus() {
  try {
    console.log('🔄 Starting discussions status migration...');
    
    // Scan all discussions
    const result = await docClient.send(new ScanCommand({
      TableName: DISCUSSIONS_TABLE
    }));
    
    const discussions = result.Items || [];
    console.log(`🔄 Found ${discussions.length} discussions to check`);
    
    let updatedCount = 0;
    
    for (const discussion of discussions) {
      // Check if discussion is missing status fields
      if (!discussion.status || !discussion.primaryTag || !discussion.secondaryTags) {
        console.log(`🔄 Updating discussion: ${discussion.title || discussion.discussionId}`);
        
        const updateFields = [];
        const attributeValues = {};
        
        if (!discussion.status) {
          updateFields.push('#status = :status');
          attributeValues[':status'] = 'open';
        }
        
        if (!discussion.primaryTag) {
          updateFields.push('primaryTag = :primaryTag');
          attributeValues[':primaryTag'] = 'discussion';
        }
        
        if (!discussion.secondaryTags) {
          updateFields.push('secondaryTags = :secondaryTags');
          attributeValues[':secondaryTags'] = [];
        }
        
        if (updateFields.length > 0) {
          await docClient.send(new UpdateCommand({
            TableName: DISCUSSIONS_TABLE,
            Key: { discussionId: discussion.discussionId },
            UpdateExpression: 'SET ' + updateFields.join(', '),
            ExpressionAttributeNames: discussion.status ? undefined : { '#status': 'status' },
            ExpressionAttributeValues: attributeValues
          }));
          
          updatedCount++;
        }
      }
    }
    
    console.log(`✅ Migration complete. Updated ${updatedCount} discussions.`);
    return { operation: 'migrateDiscussionsStatus', result: { updatedCount }, eventData: { updatedCount } };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// ─── CRUD Operations ─────────────────────────────────────────────────────

// Create Discussion
async function createDiscussion(payload) {
  const { title, userId, participants = [], tags = [], status = 'open', primaryTag = null, secondaryTags = [] } = payload;
  
  if (!title || !userId) {
    throw new Error('Missing required fields: title, userId');
  }

  const discussionId = uuidv4();
  const timestamp = Date.now();
  
  const discussion = {
    discussionId,
    title,
    createdBy: userId,
    createdAt: timestamp,
    lastMessageAt: timestamp,
    participants: Array.from(new Set([userId, ...participants])), // Ensure creator is included
    tags, // Legacy tags field
    status, // 'open', 'waiting', 'resolved', 'overdue'
    primaryTag, // Department: 'sales', 'logistics', 'support'
    secondaryTags, // Attributes: ['urgent', 'vip', 'complex', etc.]
    messageCount: 0
  };

  await docClient.send(new PutCommand({
    TableName: DISCUSSIONS_TABLE,
    Item: discussion
  }));

  return { operation: 'createDiscussion', result: discussion, eventData: { discussionId, title, participants: discussion.participants, tags, status, primaryTag, secondaryTags } };
}

// List Discussions for User
async function listDiscussions(userId) {
  if (!userId) {
    throw new Error('Missing required field: userId');
  }

  // Scan for discussions where user is in participants array
  const params = {
    TableName: DISCUSSIONS_TABLE,
    FilterExpression: 'contains(participants, :userId)',
    ExpressionAttributeValues: {
      ':userId': userId
    }
  };

  const result = await docClient.send(new ScanCommand(params));
  
  // Sort by lastMessageAt descending
  const discussions = (result.Items || []).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  
  return { operation: 'listDiscussions', result: { discussions }, eventData: { discussionCount: discussions.length } };
}

// Get Discussion by ID
async function getDiscussion(discussionId, userId) {
  if (!discussionId || !userId) {
    throw new Error('Missing required fields: discussionId, userId');
  }

  const result = await docClient.send(new GetCommand({
    TableName: DISCUSSIONS_TABLE,
    Key: { discussionId }
  }));

  if (!result.Item) {
    throw new Error('Discussion not found');
  }

  // Check if user has access
  if (!result.Item.participants.includes(userId)) {
    throw new Error('Access denied to this discussion');
  }

  return { operation: 'getDiscussion', result: result.Item, eventData: { discussionId } };
}

// Update Discussion
async function updateDiscussion(discussionId, userId, updates) {
  if (!discussionId || !userId) {
    throw new Error('Missing required fields: discussionId, userId');
  }

  // First verify user has access
  await getDiscussion(discussionId, userId);
  
  // Build update expression
  const updateFields = [];
  const attributeValues = {};
  const attributeNames = {};
  
  if (updates.title) {
    updateFields.push('#title = :title');
    attributeNames['#title'] = 'title';
    attributeValues[':title'] = updates.title;
  }
  
  if (updates.participants) {
    updateFields.push('participants = :participants');
    attributeValues[':participants'] = Array.from(new Set([userId, ...updates.participants]));
  }
  
  if (updates.tags) {
    updateFields.push('tags = :tags');
    attributeValues[':tags'] = updates.tags;
  }

  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }

  const updateExpression = 'SET ' + updateFields.join(', ');

  await docClient.send(new UpdateCommand({
    TableName: DISCUSSIONS_TABLE,
    Key: { discussionId },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: Object.keys(attributeNames).length > 0 ? attributeNames : undefined,
    ExpressionAttributeValues: attributeValues
  }));

  return { operation: 'updateDiscussion', result: { success: true, discussionId }, eventData: { discussionId, updates } };
}

// Update Discussion Status and Tags
async function updateDiscussionStatus(discussionId, userId, updates) {
  if (!discussionId || !userId) {
    throw new Error('Missing required fields: discussionId, userId');
  }

  // First verify user has access
  await getDiscussion(discussionId, userId);
  
  // Build update expression
  const updateFields = [];
  const attributeValues = {};
  const attributeNames = {};
  
  if (updates.status) {
    updateFields.push('#status = :status');
    attributeNames['#status'] = 'status';
    attributeValues[':status'] = updates.status;
  }
  
  if (updates.primaryTag !== undefined) {
    updateFields.push('primaryTag = :primaryTag');
    attributeValues[':primaryTag'] = updates.primaryTag;
  }
  
  if (updates.secondaryTags !== undefined) {
    updateFields.push('secondaryTags = :secondaryTags');
    attributeValues[':secondaryTags'] = updates.secondaryTags;
  }

  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }

  const updateExpression = 'SET ' + updateFields.join(', ');

  const result = await docClient.send(new UpdateCommand({
    TableName: DISCUSSIONS_TABLE,
    Key: { discussionId },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: Object.keys(attributeNames).length > 0 ? attributeNames : undefined,
    ExpressionAttributeValues: attributeValues,
    ReturnValues: 'ALL_NEW'
  }));

  return { operation: 'updateDiscussionStatus', result: result.Attributes, eventData: { discussionId, updates } };
}

// Archive Discussion
async function archiveDiscussion(discussionId, userId) {
  if (!discussionId || !userId) {
    throw new Error('Missing required fields: discussionId, userId');
  }

  // Verify user has access
  await getDiscussion(discussionId, userId);

  await docClient.send(new UpdateCommand({
    TableName: DISCUSSIONS_TABLE,
    Key: { discussionId },
    UpdateExpression: 'SET #status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': 'archived' }
  }));

  return { operation: 'archiveDiscussion', result: { success: true, discussionId }, eventData: { discussionId } };
}

// Create Discussion Message
async function createMessage(discussionId, userId, content) {
  if (!discussionId || !userId || !content) {
    throw new Error('Missing required fields: discussionId, userId, content');
  }

  // Verify user has access to discussion
  const discussion = await getDiscussion(discussionId, userId);
  
  // Get user's display name (email or displayName)
  const authorName = await getUserDisplayName(userId);
  
  const messageId = uuidv4();
  const timestamp = Date.now();
  
  const message = {
    messageId,
    discussionId,
    authorId: userId,
    authorName: authorName,
    content: content.trim(),
    createdAt: timestamp
  };

  // Insert message
  await docClient.send(new PutCommand({
    TableName: DISCUSSION_MESSAGES_TABLE,
    Item: message
  }));

  // Update discussion lastMessageAt and increment messageCount
  await docClient.send(new UpdateCommand({
    TableName: DISCUSSIONS_TABLE,
    Key: { discussionId },
    UpdateExpression: 'SET lastMessageAt = :timestamp ADD messageCount :inc',
    ExpressionAttributeValues: {
      ':timestamp': timestamp,
      ':inc': 1
    }
  }));

  return { operation: 'createMessage', result: message, eventData: { messageId, discussionId, content, authorId: userId } };
}

// Get Discussion Messages
async function getMessages(discussionId, userId, limit = 50) {
  if (!discussionId || !userId) {
    throw new Error('Missing required fields: discussionId, userId');
  }

  // Verify user has access
  await getDiscussion(discussionId, userId);

  const params = {
    TableName: DISCUSSION_MESSAGES_TABLE,
    KeyConditionExpression: 'discussionId = :discussionId',
    ExpressionAttributeValues: { ':discussionId': discussionId },
    ScanIndexForward: true, // ascending by createdAt
    Limit: limit
  };

  const result = await docClient.send(new QueryCommand(params));
  return { operation: 'getMessages', result: { messages: result.Items || [] }, eventData: { discussionId, messageCount: result.Items?.length || 0 } };
}

// ─── Lambda Handler ──────────────────────────────────────────────────────
export async function handler(event) {
  console.log('⚙️ Invoked discussionsHandler:', {
    body: event.body,
    resource: event.resource,
    pathParameters: event.pathParameters,
    requestContext: event.requestContext,
    httpMethod: event.httpMethod,
    method: event.requestContext?.http?.method,
    directEvent: event.operation ? 'Direct' : 'API Gateway'
  });

  // CORS is now handled by Lambda Function URL configuration

  try {
    let payload;
    try {
      // Handle both direct invocation and API Gateway events
      if (event.body) {
        // API Gateway event
        payload = JSON.parse(event.body || '{}');
      } else {
        // Direct invocation (function URL or direct test)
        payload = event;
      }
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON' })
      };
    }

    const { operation, userId, ...eventPayload } = payload;
    
    // Validate required fields for most operations (except migration)
    if (operation !== 'migrateDiscussionsStatus' && !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing userId field' })
      };
    }

    console.log(`🚀 ${operation} operation requested`, { userId, eventPayload });

    let operationResult;

    switch (operation) {
      case 'createDiscussion':
        operationResult = await createDiscussion(payload);
        break;
        
      case 'listDiscussions':
        operationResult = await listDiscussions(payload.userId);
        break;
        
      case 'getDiscussion':
        operationResult = await getDiscussion(payload.discussionId, payload.userId);
        break;
        
      case 'updateDiscussion':
        operationResult = await updateDiscussion(payload.discussionId, payload.userId, payload.updates);
        break;
        
      case 'updateDiscussionStatus':
        operationResult = await updateDiscussionStatus(payload.discussionId, payload.userId, payload.updates);
        break;
        
      case 'archiveDiscussion':
        operationResult = await archiveDiscussion(payload.discussionId, payload.userId);
        break;
        
      case 'createMessage':
        operationResult = await createMessage(payload.discussionId, payload.userId, payload.content);
        break;
        
      case 'getMessages':
        operationResult = await getMessages(payload.discussionId, payload.userId, payload.limit);
        break;
        
      case 'migrateDiscussionsStatus':
        operationResult = await migrateDiscussionsStatus();
        break;
        
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Unknown operation: ${operation}` })
        };
    }

    // ─── Emit rawEvent to indexing pipeline (LAST STEP) ─────────────────────
    if (operationResult.eventData) {
      const eventType = operationResult.operation === 'createDiscussion' ? 'discussion.created' :
                       operationResult.operation === 'updateDiscussion' ? 'discussion.updated' :
                       operationResult.operation === 'archiveDiscussion' ? 'discussion.archived' :
                       operationResult.operation === 'createMessage' ? 'discussion.message.sent' :
                       operationResult.operation === 'listDiscussions' ? 'discussion.list.accessed' :
                       operationResult.operation === 'getDiscussion' ? 'discussion.accessed' :
                       operationResult.operation === 'getMessages' ? 'discussion.messages.accessed' :
                       'discussion.unknown';

      await emitRawEvent(eventType, userId, operationResult.eventData);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(operationResult.result)
    };

  } catch (error) {
    console.error('❌ discussionsHandler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
} 
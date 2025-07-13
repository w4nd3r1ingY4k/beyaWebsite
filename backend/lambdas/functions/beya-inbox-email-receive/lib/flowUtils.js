import { DynamoDBDocumentClient, QueryCommand, ScanCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

/**
 * Normalize email subject for threading comparison
 * @param {string} subject - Raw email subject
 * @returns {string} - Normalized subject for comparison
 */
function normalizeSubject(subject) {
  if (!subject) return '';
  
  return subject
    .trim()
    .toLowerCase()
    // Remove common email prefixes (case insensitive)
    .replace(/^(re|fw|fwd|forward):\s*/i, '')
    .trim();
}

/**
 * Generate or retrieve a unique flowId for email threading based on contact + subject
 * @param {DynamoDBDocumentClient} docClient - DynamoDB document client
 * @param {string} flowsTable - Name of the Flows table
 * @param {string} userId - User ID (contactId in the table)
 * @param {string} contactIdentifier - Email address
 * @param {string} subject - Email subject line
 * @param {Object} headers - Email headers (for reply detection)
 * @returns {Promise<string>} - Unique flowId
 */
export async function generateOrGetEmailFlowId(docClient, flowsTable, userId, contactIdentifier, subject, headers = {}) {
  // Convert Gmail headers array to object for easier lookup
  let headerMap = {};
  if (Array.isArray(headers)) {
    // Gmail sends headers as array of {name, value} objects
    headers.forEach(header => {
      headerMap[header.name.toLowerCase()] = header.value;
    });
  } else {
    // If headers is already an object, normalize keys to lowercase
    Object.keys(headers).forEach(key => {
      headerMap[key.toLowerCase()] = headers[key];
    });
  }
  
  // Check if this is a reply using email headers
  const inReplyTo = headerMap['in-reply-to'];
  const references = headerMap['references'];
  
  // If this is a reply, try to find the original thread first
  if (inReplyTo || references) {
    console.log(`📧 Detected reply email with In-Reply-To: ${inReplyTo}, References: ${references}`);
    
    // Extract the Message-ID we're replying to
    let replyToMessageId = inReplyTo;
    if (!replyToMessageId && references) {
      // References contains space-separated Message-IDs, last one is usually the direct parent
      const refIds = references.trim().split(/\s+/);
      replyToMessageId = refIds[refIds.length - 1];
    }
    
    if (replyToMessageId) {
      // Clean up the Message-ID (remove < > brackets if present)
      const cleanMessageId = replyToMessageId.replace(/^<|>$/g, '');
      
      try {
        // Search for existing message with this Message-ID
        const msgTable = process.env.MSG_TABLE || 'Messages';
        const searchParams = {
          TableName: msgTable,
          FilterExpression: 'userId = :userId AND contains(messageId, :messageId)',
          ExpressionAttributeValues: {
            ':userId': userId,
            ':messageId': cleanMessageId
          }
        };
        
        const replyResult = await docClient.send(new ScanCommand(searchParams));
        if (replyResult.Items && replyResult.Items.length > 0) {
          const originalMessage = replyResult.Items[0];
          console.log(`🔗 Found reply thread: ${originalMessage.ThreadId} for Message-ID: ${cleanMessageId}`);
          return originalMessage.ThreadId;
        }
      } catch (error) {
        console.log(`⚠️ Could not search for original thread, continuing with subject-based threading:`, error.message);
      }
    }
  }
  
  // Normalize the subject for consistent threading
  const normalizedSubject = normalizeSubject(subject);
  console.log(`📧 Normalized subject: "${subject}" → "${normalizedSubject}"`);
  
  // Create a composite key for email threading: contact + subject
  const threadingKey = `${contactIdentifier}#${normalizedSubject}`;
  
  // Search for existing flow with this user + threading key
  const queryParams = {
    TableName: flowsTable,
    KeyConditionExpression: 'contactId = :userId',
    FilterExpression: 'threadingKey = :threadingKey',
    ExpressionAttributeValues: {
      ':userId': userId,
      ':threadingKey': threadingKey
    }
  };

  try {
    const result = await docClient.send(new QueryCommand(queryParams));
    
    if (result.Items && result.Items.length > 0) {
      // Flow exists, return the existing flowId
      const existingFlow = result.Items[0];
      console.log(`📧 Found existing email thread: ${existingFlow.flowId} for subject "${normalizedSubject}"`);
      return existingFlow.flowId;
    }
    
    // No existing flow found, generate a new one
    const newFlowId = uuidv4();
    console.log(`📧 Generated new email thread: ${newFlowId} for subject "${normalizedSubject}"`);
    
    // Create the flow record with the new flowId and threading key
    const timestamp = Date.now();
    await docClient.send(new PutCommand({
      TableName: flowsTable,
      Item: {
        contactId: userId,
        flowId: newFlowId,
        contactIdentifier: contactIdentifier,
        threadingKey: threadingKey, // New field for email threading
        subject: subject, // Store original subject
        normalizedSubject: normalizedSubject, // Store normalized subject for debugging
        createdAt: timestamp,
        lastMessageAt: timestamp,
        messageCount: 0,
        tags: ['all'],
        status: 'open',
        threadingType: 'email-subject' // Track how this thread was created
      },
      ConditionExpression: 'attribute_not_exists(flowId)' // Prevent duplicates
    }));
    
    return newFlowId;
    
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      // Race condition - another process created the flow, query again
      console.log('📧 Race condition detected, re-querying for email flowId');
      const retryResult = await docClient.send(new QueryCommand(queryParams));
      if (retryResult.Items && retryResult.Items.length > 0) {
        return retryResult.Items[0].flowId;
      }
    }
    console.error('❌ Error in generateOrGetEmailFlowId:', error);
    throw error;
  }
}

/**
 * Generate or retrieve a unique flowId for a given user and contact identifier
 * @param {DynamoDBDocumentClient} docClient - DynamoDB document client
 * @param {string} flowsTable - Name of the Flows table
 * @param {string} userId - User ID (contactId in the table)
 * @param {string} contactIdentifier - Email address or phone number
 * @returns {Promise<string>} - Unique flowId
 */
export async function generateOrGetFlowId(docClient, flowsTable, userId, contactIdentifier) {
  // First, check if a flow already exists for this user+contact combination
  const queryParams = {
    TableName: flowsTable,
    KeyConditionExpression: 'contactId = :userId',
    FilterExpression: 'contactIdentifier = :contactId',
    ExpressionAttributeValues: {
      ':userId': userId,
      ':contactId': contactIdentifier
    }
  };

  try {
    const result = await docClient.send(new QueryCommand(queryParams));
    
    if (result.Items && result.Items.length > 0) {
      // Flow exists, return the existing flowId
      const existingFlow = result.Items[0];
      console.log(`📋 Found existing flow: ${existingFlow.flowId} for ${contactIdentifier}`);
      return existingFlow.flowId;
    }
    
    // No existing flow found, generate a new one
    const newFlowId = uuidv4();
    console.log(`📋 Generated new flowId: ${newFlowId} for ${contactIdentifier}`);
    
    // Create the flow record with the new flowId
    const timestamp = Date.now();
    await docClient.send(new PutCommand({
      TableName: flowsTable,
      Item: {
        contactId: userId,
        flowId: newFlowId,
        contactIdentifier: contactIdentifier,
        createdAt: timestamp,
        lastMessageAt: timestamp,
        messageCount: 0,
        tags: ['all'],
        status: 'open'
      },
      ConditionExpression: 'attribute_not_exists(flowId)' // Prevent duplicates
    }));
    
    return newFlowId;
    
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      // Race condition - another process created the flow, query again
      console.log('📋 Race condition detected, re-querying for flowId');
      const retryResult = await docClient.send(new QueryCommand(queryParams));
      if (retryResult.Items && retryResult.Items.length > 0) {
        return retryResult.Items[0].flowId;
      }
    }
    console.error('❌ Error in generateOrGetFlowId:', error);
    throw error;
  }
}

/**
 * Update flow metadata (message count, last message timestamp)
 * @param {DynamoDBDocumentClient} docClient - DynamoDB document client
 * @param {string} flowsTable - Name of the Flows table
 * @param {string} userId - User ID (contactId in the table)
 * @param {string} flowId - Unique flow ID
 * @param {number} timestamp - Message timestamp
 */
export async function updateFlowMetadata(docClient, flowsTable, userId, flowId, timestamp) {
  const updateParams = {
    TableName: flowsTable,
    Key: {
      contactId: userId,
      flowId: flowId
    },
    UpdateExpression: 'SET lastMessageAt = :ts ADD messageCount :inc',
    ExpressionAttributeValues: {
      ':ts': timestamp,
      ':inc': 1
    }
  };

  try {
    await docClient.send(new UpdateCommand(updateParams));
    console.log(`📋 Updated flow metadata for flowId: ${flowId}`);
  } catch (error) {
    console.error('❌ Error updating flow metadata:', error);
    throw error;
  }
} 
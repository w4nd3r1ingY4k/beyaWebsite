import { DynamoDBDocumentClient, QueryCommand, ScanCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

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
 * Generate or retrieve a unique flowId for email threading based on participants + subject
 * @param {DynamoDBDocumentClient} docClient - DynamoDB document client
 * @param {string} flowsTable - Name of the Flows table
 * @param {string} userId - User ID (contactId in the table)
 * @param {string} contactIdentifier - Primary contact email address
 * @param {string} subject - Email subject line
 * @param {Object} options - Options object with headers, participants, etc.
 * @returns {Promise<string>} - Unique flowId
 */
export async function generateOrGetEmailFlowId(docClient, flowsTable, userId, contactIdentifier, subject, options = {}) {
  const { headers = {}, participants = [], cc = [], bcc = [], messageId = null } = options;
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
    
    // FIRST: Try Gmail Thread ID matching (most reliable)
    const incomingGmailThreadId = headerMap['gmail-thread-id'] || headerMap['x-gmail-thread-id'];
    if (incomingGmailThreadId) {
      console.log(`📧 Found Gmail Thread ID: ${incomingGmailThreadId}`);
      
      try {
        const msgTable = process.env.MSG_TABLE || 'Messages';
        const threadSearchParams = {
          TableName: msgTable,
          FilterExpression: 'userId = :userId AND attribute_exists(Headers.#gmailThreadId) AND Headers.#gmailThreadId = :threadId',
          ExpressionAttributeNames: {
            '#gmailThreadId': 'Gmail-Thread-ID'
          },
          ExpressionAttributeValues: {
            ':userId': userId,
            ':threadId': incomingGmailThreadId
          }
        };
        
        console.log(`🔍 Searching for Gmail Thread ID in Messages table:`, threadSearchParams);
        
        // Scan might need to check multiple pages
        let items = [];
        let lastEvaluatedKey = undefined;
        
        do {
          const scanParams = { ...threadSearchParams };
          if (lastEvaluatedKey) {
            scanParams.ExclusiveStartKey = lastEvaluatedKey;
          }
          
          const threadResult = await docClient.send(new ScanCommand(scanParams));
          if (threadResult.Items) {
            items = items.concat(threadResult.Items);
          }
          lastEvaluatedKey = threadResult.LastEvaluatedKey;
          
          // Stop if we found a match
          if (items.length > 0) break;
        } while (lastEvaluatedKey && items.length === 0);
        
        console.log(`🔍 Gmail Thread ID search result:`, { 
          found: items.length,
          items: items.map(item => ({ 
            MessageId: item.MessageId, 
            ThreadId: item.ThreadId,
            Subject: item.Subject,
            Direction: item.Direction,
            'Gmail-Thread-ID': item.Headers?.['Gmail-Thread-ID']
          }))
        });
        
        if (items.length > 0) {
          const originalMessage = items[0];
          console.log(`🔗 Found reply thread via Gmail Thread ID: ${originalMessage.ThreadId}`);
          return originalMessage.ThreadId;
        }
      } catch (error) {
        console.log(`⚠️ Gmail Thread ID search failed:`, error.message);
      }
    }
    
    // FALLBACK: Try Message-ID matching (legacy approach)
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
        // We need to search for different possible formats since Gmail may store differently
        const msgTable = process.env.MSG_TABLE || 'Messages';
        const searchParams = {
          TableName: msgTable,
          FilterExpression: 'userId = :userId AND (Headers.#msgId = :messageId OR Headers.#msgId = :messageIdWithBrackets OR Headers.#msgId = :messageIdGmailFormat OR contains(Headers.#msgId, :messageIdCore))',
          ExpressionAttributeNames: {
            '#msgId': 'Message-ID'
          },
          ExpressionAttributeValues: {
            ':userId': userId,
            ':messageId': cleanMessageId,
            ':messageIdWithBrackets': `<${cleanMessageId}>`,
            ':messageIdGmailFormat': `<${cleanMessageId}@mail.gmail.com>`,
            ':messageIdCore': cleanMessageId.split('@')[0] // Just the core ID part
          }
        };
        
        const replyResult = await docClient.send(new ScanCommand(searchParams));
        if (replyResult.Items && replyResult.Items.length > 0) {
          const originalMessage = replyResult.Items[0];
          console.log(`🔗 Found reply thread via Message-ID: ${originalMessage.ThreadId} for: ${cleanMessageId}`);
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
  
  // Extract participants from headers if not provided
  let allParticipants = participants;
  if (participants.length === 0 && Object.keys(headers).length > 0) {
    const extracted = extractEmailParticipants(headers);
    allParticipants = extracted.all;
  }
  
  // If still no participants, fall back to single contact
  if (allParticipants.length === 0) {
    allParticipants = [contactIdentifier];
  }
  
  // Create a composite key for email threading: participants + subject
  const threadingKey = generateParticipantThreadingKey(allParticipants, normalizedSubject);
  console.log(`📧 Threading key: ${threadingKey} for participants: [${allParticipants.join(', ')}]`);
  
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
    
    // Build participant history for this message
    const participantHistory = {};
    if (messageId) {
      participantHistory[messageId] = {
        To: participants.includes(contactIdentifier) ? [contactIdentifier] : [],
        CC: cc || [],
        BCC: bcc || [],
        timestamp: timestamp
      };
    }
    
    await docClient.send(new PutCommand({
      TableName: flowsTable,
      Item: {
        contactId: userId,
        flowId: newFlowId,
        contactIdentifier: contactIdentifier, // Primary contact for display
        primaryContact: contactIdentifier, // Main contact for threading
        participants: allParticipants, // All participants in conversation
        participantHistory: participantHistory, // Track participant changes
        threadingKey: threadingKey, // Enhanced threading key
        subject: subject, // Store original subject
        normalizedSubject: normalizedSubject, // Store normalized subject for debugging
        createdAt: timestamp,
        lastMessageAt: timestamp,
        messageCount: 0,
        tags: ['all'],
        status: 'open',
        threadingType: allParticipants.length > 1 ? 'email-participants' : 'email-subject'
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

// Export helper functions for use in other modules
export { parseEmailList, extractEmailAddress, generateParticipantThreadingKey, extractEmailParticipants };

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

// =============================================================================
// HELPER FUNCTIONS FOR CC/BCC SUPPORT
// =============================================================================

/**
 * Parse comma-separated email list into array of clean email addresses
 * @param {string} emailString - Comma-separated email string
 * @returns {string[]} Array of clean email addresses
 */
function parseEmailList(emailString) {
  if (!emailString) return [];
  return emailString
    .split(',')
    .map(email => extractEmailAddress(email.trim()))
    .filter(Boolean);
}

/**
 * Extract email address from various formats
 * @param {string} emailString - Email in format "Name <email>" or "email"
 * @returns {string|null} Clean email address
 */
function extractEmailAddress(emailString) {
  if (!emailString) return null;
  
  // Handle formats like "Name <email@domain.com>" or just "email@domain.com"
  const match = emailString.match(/<([^>]+)>/) || emailString.match(/([^\s<>]+@[^\s<>]+)/);
  return match ? match[1].toLowerCase().trim() : emailString.toLowerCase().trim();
}

/**
 * Generate threading key for multi-participant emails
 * @param {string[]} participants - Array of email addresses
 * @param {string} subject - Normalized subject
 * @returns {string} Threading key
 */
function generateParticipantThreadingKey(participants, subject) {
  if (!participants || participants.length === 0) {
    return `single:#${subject}`;
  }
  
  // Sort participants for consistent hashing
  const sorted = [...participants].sort();
  const participantString = sorted.join(',');
  const hash = crypto.createHash('md5').update(participantString).digest('hex').substring(0, 8);
  
  return `participants:${hash}#${subject}`;
}

/**
 * Extract all participants from email headers
 * @param {Object} headers - Email headers object
 * @returns {Object} Object with participant arrays
 */
function extractEmailParticipants(headers) {
  const fromAddress = extractEmailAddress(headers['From'] || headers['from']);
  const toAddresses = parseEmailList(headers['To'] || headers['to']);
  const ccAddresses = parseEmailList(headers['Cc'] || headers['CC'] || headers['cc']);
  const bccAddresses = parseEmailList(headers['Bcc'] || headers['BCC'] || headers['bcc']);
  
  // Combine all participants (excluding BCC for threading - they're invisible)
  const allParticipants = [fromAddress, ...toAddresses, ...ccAddresses].filter(Boolean);
  
  return {
    from: fromAddress,
    to: toAddresses,
    cc: ccAddresses,
    bcc: bccAddresses,
    all: allParticipants,
    primary: fromAddress || (toAddresses.length > 0 ? toAddresses[0] : null)
  };
} 
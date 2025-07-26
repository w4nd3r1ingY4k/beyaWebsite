/**
 * Thread Context Fetcher - Pulls full email threads from DynamoDB
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

let docClient = null;

const initializeDynamoDB = () => {
  if (!docClient) {
    const ddbClient = new DynamoDBClient({ region: 'us-east-1' });
    docClient = DynamoDBDocumentClient.from(ddbClient, {
      marshallOptions: { removeUndefinedValues: true }
    });
  }
  return docClient;
};

/**
 * Fetch full thread by threadId
 * @param {string} threadId - Thread ID to fetch (Gmail threadId or flowId)
 * @param {number} limit - Max messages to fetch (default 10)
 * @param {string} userId - User ID for Flows table lookup
 * @param {string} emailParticipant - Email participant for Flows table lookup (legacy)
 * @param {string} messageId - Message ID for direct lookup fallback
 * @param {string} subject - Email subject for Flows table lookup
 */
export async function fetchThreadById(threadId, limit = 10, userId = null, emailParticipant = null, messageId = null, subject = null) {
  const client = initializeDynamoDB();
  
  try {
    console.log(`🧵 Fetching thread: ${threadId}`);
    
    // First try direct ThreadId query (for flowId format)
    const directParams = {
      TableName: 'Messages',
      KeyConditionExpression: 'ThreadId = :threadId',
      ExpressionAttributeValues: {
        ':threadId': threadId
      },
      ScanIndexForward: false, // Get newest first
      Limit: limit
    };
    
    let result = await client.send(new QueryCommand(directParams));
    let messages = result.Items || [];
    
         // If no results, try alternative approaches
     if (messages.length === 0) {
       console.log(`🔍 No results with ThreadId=${threadId}, trying alternative lookup...`);
       
       // Debug: Let's see what's actually in the table (these are NOT the search results)
       const debugScan = {
         TableName: 'Messages',
         Limit: 5
       };
       
       const debugResult = await client.send(new ScanCommand(debugScan));
       console.log(`📋 Sample Messages table entries (DEBUG ONLY - not search results):`, debugResult.Items?.map(item => ({
         ThreadId: item.ThreadId,
         MessageId: item.MessageId,
         Subject: item.Subject,
         From: item.From
       })));
       
               // If threadId looks like Gmail format, try to find flowId via Flows table
        if (threadId.includes('-') && threadId.length > 30 && userId && subject) {
          console.log(`🔍 Gmail threadId detected, looking up flowId via Flows table...`);
          console.log(`   userId: ${userId}, subject: ${subject}`);
          
          const flowId = await lookupFlowIdFromFlowsTable(userId, subject);
          
          if (flowId) {
            console.log(`✅ Found flowId: ${flowId}, retrying Messages query...`);
            
            // Retry with the correct flowId
            const retryParams = {
              TableName: 'Messages',
              KeyConditionExpression: 'ThreadId = :threadId',
              ExpressionAttributeValues: {
                ':threadId': flowId
              },
              ScanIndexForward: false,
              Limit: limit
            };
            
            const retryResult = await client.send(new QueryCommand(retryParams));
            const retryMessages = retryResult.Items || [];
            
            console.log(`✅ Found ${retryMessages.length} messages using flowId ${flowId}`);
            return {
              threadId: flowId, // Return the working flowId
              originalThreadId: threadId, // Keep original for reference
              messages: retryMessages.reverse(),
              messageCount: retryMessages.length
            };
          } else {
            console.log(`❌ Could not find flowId for subject: ${subject}`);
          }
        }
     }
    
    // If still no messages, try direct message lookup
    if (messages.length === 0) {
      console.log(`🔍 Thread lookup failed. Params: userId=${userId}, messageId=${messageId}`);
      
      if (userId && messageId) {
        console.log(`🔄 Attempting direct message lookup for messageId: ${messageId}`);
        const directResult = await fetchMessageById(messageId, userId);
        if (directResult.messageCount > 0) {
          console.log(`✅ Found email via direct lookup - this is the Pinecone result you were looking for!`);
          return directResult;
        }
      } else {
        console.log(`❌ Cannot try direct lookup: missing userId (${!!userId}) or messageId (${!!messageId})`);
      }
    }
    
    console.log(`✅ Found ${messages.length} messages in thread ${threadId}`);
    return {
      threadId,
      messages: messages.reverse(), // Chronological order
      messageCount: messages.length
    };
    
  } catch (error) {
    console.error(`❌ Failed to fetch thread ${threadId}:`, error);
    return { threadId, messages: [], messageCount: 0, error: error.message };
  }
}

/**
 * Fetch single message by messageId when thread lookup fails
 * @param {string} messageId - Message ID to fetch
 * @param {string} userId - User ID for filtering
 */
async function fetchMessageById(messageId, userId) {
  const client = initializeDynamoDB();
  
  try {
    console.log(`📧 Trying direct message lookup for messageId: ${messageId}`);
    
    // Use GSI to search by MessageId across all threads
    const params = {
      TableName: 'Messages',
      FilterExpression: 'MessageId = :messageId AND userId = :userId',
      ExpressionAttributeValues: {
        ':messageId': messageId,
        ':userId': userId
      },
      Limit: 1
    };
    
    const result = await client.send(new ScanCommand(params));
    
    if (result.Items && result.Items.length > 0) {
      const message = result.Items[0];
      console.log(`✅ Found message by direct lookup: ${message.Subject}`);
      return {
        threadId: message.ThreadId,
        messages: [message],
        messageCount: 1,
        foundViaDirectLookup: true
      };
    } else {
      console.log(`❌ No message found with messageId: ${messageId}`);
      return { threadId: null, messages: [], messageCount: 0 };
    }
    
  } catch (error) {
    console.error(`❌ Direct message lookup failed:`, error);
    return { threadId: null, messages: [], messageCount: 0, error: error.message };
  }
}

/**
 * Build rich context from thread data
 * @param {Object} threadData - Thread data from fetchThreadById or fetchMessageById
 */
export function buildThreadContext(threadData) {
  if (!threadData.messages || threadData.messages.length === 0) {
    return 'No thread context available.';
  }
  
  const messages = threadData.messages;
  const contextParts = [];
  
  contextParts.push(`📧 **Thread Context** (${messages.length} messages):`);
  contextParts.push('');
  
  messages.forEach((msg, index) => {
    const timestamp = new Date(msg.Timestamp).toLocaleString();
    const direction = msg.EventType === 'email.sent' ? '→ SENT' : '← RECEIVED';
    const from = msg.From || 'Unknown';
    const to = msg.To || 'Unknown';
    const subject = msg.Subject || 'No subject';
    
    contextParts.push(`**Message ${index + 1}** ${direction} *${timestamp}*`);
    contextParts.push(`From: **${from}**`);
    contextParts.push(`To: **${to}**`);
    contextParts.push(`Subject: **${subject}**`);
    
    if (msg.Body) {
      // Truncate long emails
      const body = msg.Body.length > 300 
        ? msg.Body.substring(0, 300) + '...' 
        : msg.Body;
      contextParts.push(`Content: ${body}`);
    } else if (msg.BodyText) {
      // Fallback for legacy field name
      const body = msg.BodyText.length > 300 
        ? msg.BodyText.substring(0, 300) + '...' 
        : msg.BodyText;
      contextParts.push(`Content: ${body}`);
    }
    
    contextParts.push('---');
  });
  
  return contextParts.join('\n');
}

/**
 * Auto context fetcher - ALWAYS fetch thread context when emails are found
 * @param {Array} pineconeResults - Results from semantic search
 */
export function shouldFetchThreadContext(pineconeResults) {
  const hasRelevantResults = pineconeResults && pineconeResults.length > 0;
  
  if (!hasRelevantResults) {
    return {
      shouldFetch: false,
      reason: 'No email results found',
      threadData: []
    };
  }
  
  // Extract thread data with user and participant info for Flows table lookup
  const threadData = pineconeResults
    .filter(result => result.threadId)
    .map(result => ({
      threadId: result.threadId,
      userId: result.userId,
      emailParticipant: result.emailParticipant,
      messageId: result.messageId,
      subject: result.subject
    }));
  
  // Get unique threadIds for processing
  const uniqueThreadIds = [...new Set(threadData.map(t => t.threadId))];
  
  return {
    shouldFetch: threadData.length > 0,
    reason: `Found ${uniqueThreadIds.length} unique threads to fetch`,
    threadData,
    resultCount: pineconeResults.length
  };
}

/**
 * Fetch multiple threads in parallel using thread data with user context
 * @param {Array} threadData - Array of thread data objects with userId, threadId, emailParticipant
 * @param {number} messagesPerThread - Max messages per thread
 */
export async function fetchMultipleThreads(threadData, messagesPerThread = 5) {
  console.log(`🧵 Fetching ${threadData.length} threads in parallel...`);
  
  const threadPromises = threadData.map(data => 
    fetchThreadById(data.threadId, messagesPerThread, data.userId, data.emailParticipant, data.messageId, data.subject)
  );
  
  const threadResults = await Promise.all(threadPromises);
  
  const successfulThreads = threadResults.filter(result => !result.error);
  const totalMessages = successfulThreads.reduce((sum, thread) => sum + thread.messageCount, 0);
  
  console.log(`✅ Fetched ${successfulThreads.length}/${threadData.length} threads with ${totalMessages} total messages`);
  
  return {
    threads: successfulThreads,
    totalMessages,
    fetchedCount: successfulThreads.length,
    requestedCount: threadData.length
  };
}

/**
 * Lookup flowId from Flows table using userId and subject
 * @param {string} userId - User ID  
 * @param {string} subject - Email subject for matching
 */
async function lookupFlowIdFromFlowsTable(userId, subject) {
  const client = initializeDynamoDB();
  
  try {
    console.log(`🔍 Looking up flowId for userId: ${userId}, subject: ${subject}`);
    
    const params = {
      TableName: 'Flows',
      KeyConditionExpression: 'contactId = :userId',
      FilterExpression: 'contains(subject, :subject) OR contains(primarySubject, :subject)',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':subject': subject
      },
      Limit: 1
    };
    
    const result = await client.send(new QueryCommand(params));
    
    if (result.Items && result.Items.length > 0) {
      const flowId = result.Items[0].flowId;
      console.log(`✅ Found flowId: ${flowId} for subject: ${subject}`);
      return flowId;
    } else {
      console.log(`❌ No flowId found for subject: ${subject}`);
      return null;
    }
    
  } catch (error) {
    console.error(`❌ Error looking up flowId:`, error);
    return null;
  }
} 
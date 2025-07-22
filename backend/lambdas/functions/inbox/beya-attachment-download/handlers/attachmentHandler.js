// handlers/attachmentHandler.js

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { createBackendClient } from "@pipedream/sdk/server";

// Environment variables
const REGION = process.env.AWS_REGION || 'us-east-1';
const MSG_TABLE = process.env.MSG_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;

if (!MSG_TABLE || !USERS_TABLE) {
  throw new Error('Missing required env vars: MSG_TABLE, USERS_TABLE');
}

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

// CORS is handled by function URL configuration, no need for headers in response

/**
 * Download Gmail attachment using Pipedream proxy to fetch Gmail attachments
 */
export async function handler(event) {
  console.log("📎 attachmentHandler", JSON.stringify(event));

  // Handle CORS preflight
  if (event.requestContext?.http?.method === "OPTIONS") {
    return { statusCode: 200 };
  }

  try {
    // Parse path parameters from Function URL (different format than API Gateway)
    const path = event.requestContext?.http?.path || event.rawPath || '';
    const pathParts = path.split('/').filter(part => part); // Remove empty parts
    
    if (pathParts.length < 3) {
      console.error('❌ Invalid path format. Expected: /{userId}/{messageId}/{attachmentId}', { path, pathParts });
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid path format. Expected: /{userId}/{messageId}/{attachmentId}',
          receivedPath: path
        })
      };
    }
    
    // URL decode the parameters
    const userId = decodeURIComponent(pathParts[0]);
    const messageId = decodeURIComponent(pathParts[1]);
    const attachmentId = decodeURIComponent(pathParts[2]);
    
    console.log('📋 Parsed parameters:', { userId, messageId, attachmentId });
    
    if (!userId || !messageId || !attachmentId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required parameters: userId, messageId, attachmentId' 
        })
      };
    }

    console.log(`📎 Downloading attachment: ${attachmentId} from message: ${messageId} for user: ${userId}`);

    // Skip database lookup - download attachment directly from Gmail API
    console.log(`🚀 Bypassing database, calling Gmail API directly...`);
    const attachmentData = await downloadGmailAttachment(userId, messageId, attachmentId);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/octet-stream', // Gmail will provide the actual content type
        'Content-Disposition': `attachment; filename="attachment"`, // Gmail will provide actual filename  
        'Content-Length': attachmentData.length.toString(),
      },
      body: attachmentData.toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('❌ Error downloading attachment:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to download attachment',
        message: error.message 
      })
    };
  }
}

/**
 * Get attachment metadata from Messages table
 */
async function getAttachmentMetadata(userId, messageId, attachmentId) {
  try {
    // First, find the message by scanning for messageId and userId
    // Since we don't have the ThreadId, we need to scan
    const scanParams = {
      TableName: MSG_TABLE,
      FilterExpression: 'userId = :userId AND (MessageId = :messageId OR Headers.#msgId = :messageId OR GmailMessageId = :messageId)',
      ExpressionAttributeNames: {
        '#msgId': 'Message-ID'
      },
      ExpressionAttributeValues: {
        ':userId': userId,
        ':messageId': messageId
      }
    };

    console.log(`🔍 Scanning for message: ${messageId} for user: ${userId}`);
    console.log(`📋 Scan params:`, JSON.stringify(scanParams, null, 2));
    
    const result = await docClient.send(new ScanCommand(scanParams));
    
    console.log(`📊 Scan result: Found ${result.Items?.length || 0} items`);
    if (result.Items && result.Items.length > 0) {
      console.log(`🔍 First item preview:`, {
        userId: result.Items[0].userId,
        MessageId: result.Items[0].MessageId,
        GmailMessageId: result.Items[0].GmailMessageId,
        Headers: result.Items[0].Headers
      });
    }
    
    if (!result.Items || result.Items.length === 0) {
      console.warn(`❌ Message not found: ${messageId} for user: ${userId}`);
      
      // Try a broader search to see what messages exist for this user
      const debugScanParams = {
        TableName: MSG_TABLE,
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        },
        Limit: 5
      };
      
      console.log(`🔍 Debug: Scanning for ANY messages for user: ${userId}`);
      const debugResult = await docClient.send(new ScanCommand(debugScanParams));
      
      if (debugResult.Items && debugResult.Items.length > 0) {
        console.log(`📋 Found ${debugResult.Items.length} messages for user. Sample message IDs:`, 
          debugResult.Items.map(item => ({
            MessageId: item.MessageId,
            GmailMessageId: item.GmailMessageId,
            hasHeaders: !!item.Headers
          }))
        );
      } else {
        console.warn(`❌ No messages found for user: ${userId}`);
        
        // Ultimate test: scan entire table to see what's there
        console.log(`🔍 Ultimate test: Scanning entire Messages table (limit 3)...`);
        const ultimateTest = await docClient.send(new ScanCommand({
          TableName: MSG_TABLE,
          Limit: 3
        }));
        
        if (ultimateTest.Items && ultimateTest.Items.length > 0) {
          console.log(`📋 Found ${ultimateTest.Items.length} total items in Messages table:`, 
            ultimateTest.Items.map(item => ({
              userId: item.userId,
              MessageId: item.MessageId,
              GmailMessageId: item.GmailMessageId,
              Channel: item.Channel,
              hasAttachments: !!item.Attachments || !!item.attachments
            }))
          );
        } else {
          console.error(`❌ Messages table appears to be empty or inaccessible!`);
        }
      }
      
      return null;
    }

    const message = result.Items[0];
    console.log(`✅ Found message:`, {
      messageId: message.MessageId,
      hasAttachments: !!message.Attachments,
      attachmentsRaw: message.Attachments
    });
    
    // Handle DynamoDB format - Attachments could be in List format
    let attachments = [];
    if (message.Attachments) {
      if (Array.isArray(message.Attachments)) {
        // Already a JavaScript array (from DocumentClient)
        attachments = message.Attachments;
      } else if (message.Attachments.L) {
        // DynamoDB List format - need to extract from .M (Map) format
        attachments = message.Attachments.L.map(item => ({
          Id: item.M?.Id?.S,
          Name: item.M?.Name?.S,
          MimeType: item.M?.MimeType?.S,
          SizeBytes: item.M?.SizeBytes?.N,
          Url: item.M?.Url?.S
        }));
      }
    }
    
    console.log(`📋 Processed ${attachments.length} attachments:`, attachments.map(a => ({
      id: a.Id || a.id,
      name: a.Name || a.name
    })));
    
    // Find the specific attachment with more flexible matching
    const attachment = attachments.find(att => {
      const attId = att.Id || att.id || att.attachmentId || att.AttachmentId;
      console.log(`🔍 Comparing: "${attId}" === "${attachmentId}"`);
      return attId === attachmentId;
    });

    if (!attachment) {
      console.warn(`❌ Attachment not found: ${attachmentId} in message: ${messageId}`);
      console.log(`Available attachments:`, attachments.map(a => ({ 
        id: a.Id || a.id || a.attachmentId || a.AttachmentId,
        name: a.Name || a.name 
      })));
      return null;
    }

    console.log(`✅ Found attachment: ${attachment.Name || attachment.name}`);
    
    return {
      name: attachment.Name || attachment.name || 'unknown',
      mimeType: attachment.MimeType || attachment.mimeType || 'application/octet-stream',
      sizeBytes: attachment.SizeBytes || attachment.sizeBytes || 0,
      url: attachment.Url || attachment.url,
      messageId: messageId
    };

  } catch (error) {
    console.error('❌ Error getting attachment metadata:', error);
    throw error;
  }
}

/**
 * Download Gmail attachment using Pipedream Connect API proxy
 */
async function downloadGmailAttachment(userId, messageId, attachmentId) {
  try {
    console.log(`📎 Starting download: attachmentId=${attachmentId}, messageId=${messageId}, userId=${userId}`);
    
    // Validate required environment variables
    const requiredEnvVars = ['PIPEDREAM_CLIENT_ID', 'PIPEDREAM_CLIENT_SECRET', 'PIPEDREAM_PROJECT_ID'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    // Initialize Pipedream client
    const pd = createBackendClient({
      environment: process.env.PIPEDREAM_PROJECT_ENVIRONMENT || "production",
      credentials: {
        clientId: process.env.PIPEDREAM_CLIENT_ID,
        clientSecret: process.env.PIPEDREAM_CLIENT_SECRET,
      },
      projectId: process.env.PIPEDREAM_PROJECT_ID,
    });

    console.log(`🔍 Getting Gmail accounts for user: ${userId}`);
    
    // Get user's Gmail account with headers for external user ID
    const accounts = await pd.getAccounts({
      external_user_id: userId,
      app: "gmail",
    });

    if (!accounts || !accounts.data || accounts.data.length === 0) {
      console.error(`❌ No Gmail accounts found for user: ${userId}`);
      throw new Error('No Gmail account connected for this user');
    }

    // Find a healthy account
    const gmailAccount = accounts.data.find(acc => acc.healthy && !acc.dead) || accounts.data[0];
    console.log(`✅ Using Gmail account: ${gmailAccount.name || gmailAccount.external_id} (ID: ${gmailAccount.id})`);

    // Use Pipedream proxy to download attachment
    console.log(`📥 Downloading attachment via Gmail API...`);
    const response = await pd.makeProxyRequest(
      {
        searchParams: {
          account_id: gmailAccount.id,
          external_user_id: userId
        }
      },
      {
        url: `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
        options: {
          method: "GET",
          headers: {
            "Accept": "*/*"
          }
        }
      }
    );

    console.log(`📎 Gmail API response status: ${response.status || 'unknown'}`);
    console.log(`📎 Response keys:`, Object.keys(response || {}));

    if (!response || (!response.data && response.status !== 200)) {
      console.error(`❌ Invalid response from Gmail API:`, response);
      throw new Error(`Gmail API error: ${response?.status || 'unknown'}`);
    }

    // Gmail returns attachment data as base64 encoded
    const attachmentData = response.data;
    
    if (typeof attachmentData === 'string') {
      // If it's a base64 string, decode it
      console.log(`✅ Downloaded ${attachmentData.length} characters of base64 data`);
      return Buffer.from(attachmentData, 'base64');
    } else if (attachmentData && attachmentData.data) {
      // If it's wrapped in a data object
      console.log(`✅ Downloaded attachment data from wrapped object`);
      return Buffer.from(attachmentData.data, 'base64');
    } else {
      console.error(`❌ Unexpected attachment data format:`, typeof attachmentData, Object.keys(attachmentData || {}));
      throw new Error('Unexpected attachment data format from Gmail API');
    }

  } catch (error) {
    console.error('❌ Error downloading Gmail attachment:', {
      error: error.message,
      stack: error.stack,
      userId,
      messageId,
      attachmentId
    });
    throw error;
  }
} 
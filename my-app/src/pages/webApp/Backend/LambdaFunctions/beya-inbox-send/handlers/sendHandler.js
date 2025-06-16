// handlers/sendHandler.js

import { sendWhatsApp } from '../lib/whatsapp.js';
import { sendEmail, replyEmail } from '../lib/email.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  GetCommand
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// ─── 0) Load & validate env vars ──────────────────────────────────────────────
const REGION      = process.env.AWS_REGION;
const MSG_TABLE   = process.env.MSG_TABLE;    // e.g. "Messages"
const FLOWS_TABLE = process.env.FLOWS_TABLE;  // e.g. "Flows"
if (!REGION || !MSG_TABLE || !FLOWS_TABLE) {
  throw new Error(
    'Missing required env vars: AWS_REGION, MSG_TABLE, FLOWS_TABLE'
  );
}

// ─── 1) Dynamo client with removeUndefinedValues ─────────────────────────────
const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true }
});

// ─── 1a) Helper: fetch the first‐incoming MessageId for a given ThreadId ──────
async function getFirstIncomingMessageId(threadId) {
  const params = {
    TableName: MSG_TABLE,
    KeyConditionExpression:    "ThreadId = :th",
    FilterExpression:          "Direction = :dir",
    ExpressionAttributeValues: {
      ":th":  threadId,
      ":dir": "incoming"
    },
    ScanIndexForward: true, // ascending by Timestamp
    Limit: 1
  };

  const { Items } = await docClient.send(new QueryCommand(params));
  if (Items && Items.length > 0) {
    const message = Items[0];
    
    // First, try to get the original email Message-ID from headers
    if (message.Headers && message.Headers['Message-ID']) {
      console.log('📧 Found original Message-ID in headers:', message.Headers['Message-ID']);
      return message.Headers['Message-ID'];
    }
    
    // Fallback: check if there's a MessageId in the Result object (for SES)
    if (message.Result && message.Result.MessageId) {
      console.log('📧 Found Message-ID in Result:', message.Result.MessageId);
      return message.Result.MessageId;
    }
    
    // Last resort: use the MessageId field (our UUID)
    if (message.MessageId) {
      console.log('📧 Using fallback MessageId (UUID):', message.MessageId);
      return message.MessageId;
    }
  }
  
  console.log('📧 No Message-ID found for threadId:', threadId);
  return null;
}

// ─── 1b) Helper: fetch the most recent incoming MessageId for better threading ──────
async function getLastIncomingMessageId(threadId) {
  const params = {
    TableName: MSG_TABLE,
    KeyConditionExpression:    "ThreadId = :th",
    FilterExpression:          "Direction = :dir",
    ExpressionAttributeValues: {
      ":th":  threadId,
      ":dir": "incoming"
    },
    ScanIndexForward: false, // descending by Timestamp (most recent first)
    Limit: 1
  };

  const { Items } = await docClient.send(new QueryCommand(params));
  if (Items && Items.length > 0) {
    const message = Items[0];
    
    // Same logic as above but for the most recent message
    if (message.Headers && message.Headers['Message-ID']) {
      console.log('📧 Found recent Message-ID in headers:', message.Headers['Message-ID']);
      return message.Headers['Message-ID'];
    }
    
    if (message.Result && message.Result.MessageId) {
      console.log('📧 Found recent Message-ID in Result:', message.Result.MessageId);
      return message.Result.MessageId;
    }
    
    if (message.MessageId) {
      console.log('📧 Using fallback recent MessageId (UUID):', message.MessageId);
      return message.MessageId;
    }
  }
  
  console.log('📧 No recent Message-ID found for threadId:', threadId);
  return null;
}

// ─── 2) CORS headers ─────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
  'Access-Control-Allow-Headers': 'Content-Type'
};

// ─── 3) Handler ─────────────────────────────────────────────────────────────
export async function handler(event) {
  console.log('⚙️  Invoked sendHandler', {
    method: event.requestContext?.http?.method,
    path:   event.rawPath || event.path,
    body:   event.body
  });

  // 3a) CORS preflight
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS };
  }

  // 3b) Only allow POST
  if (event.requestContext.http.method !== 'POST') {
    return {
      statusCode: 405,
      headers:    CORS,
      body:       'Method Not Allowed'
    };
  }

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'Invalid JSON' })
    };
  }

  // Extract required parameters
  const {
    to,           // recipient's email or phone number
    text,         // message text
    subject,      // email subject (optional for email)
    html,         // HTML version (optional for email)
    userId,       // ID of the user sending the message
    channel,      // 'email' or 'whatsapp'
    originalMessageId // optional, for replies
  } = body;

  // Validate required parameters
  if (!to || !text || !userId || !channel) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({
        error: 'Missing required parameters',
        required: ['to', 'text', 'userId', 'channel'],
        received: { to, text, userId, channel }
      })
    };
  }

  // Validate channel
  if (!['email', 'whatsapp'].includes(channel)) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({
        error: 'Invalid channel',
        message: 'Channel must be either "email" or "whatsapp"'
      })
    };
  }

  // For email, validate additional parameters
  if (channel === 'email' && !subject) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({
        error: 'Missing required parameter for email',
        message: 'Subject is required for email messages'
      })
    };
  }

  // Get user's connected accounts from database
  let userData;
  try {
    const result = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId }
    }));
    userData = result.Item;
  } catch (err) {
    console.error('Failed to fetch user data:', err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({
        error: 'Failed to fetch user data',
        message: 'Internal server error'
      })
    };
  }

  if (!userData) {
    return {
      statusCode: 404,
      headers: CORS,
      body: JSON.stringify({
        error: 'User not found',
        message: `No user found with ID: ${userId}`
      })
    };
  }

  // Verify user has the required integration for the channel
  const connectedAccounts = userData.connectedAccounts || {};
  if (channel === 'email' && !connectedAccounts.email) {
    return {
      statusCode: 403,
      headers: CORS,
      body: JSON.stringify({
        error: 'Email not connected',
        message: 'User has not connected their email account'
      })
    };
  }
  if (channel === 'whatsapp' && !connectedAccounts.whatsappBusiness) {
    return {
      statusCode: 403,
      headers: CORS,
      body: JSON.stringify({
        error: 'WhatsApp not connected',
        message: 'User has not connected their WhatsApp Business account'
      })
    };
  }

  try {
    let resp;
    let replyId = originalMessageId || null;

    if (channel === "whatsapp") {
      // Send WhatsApp message using user's connected account
      resp = await sendWhatsApp(
        to,
        text,
        connectedAccounts.whatsappBusiness
      );
    } else if (channel === "email") {
      // Get reply ID if needed
      if (!replyId) {
        replyId = await getLastIncomingMessageId(to);
        if (!replyId) {
          replyId = await getFirstIncomingMessageId(to);
        }
      }

      // Send email using user's connected account
      if (replyId) {
        resp = await replyEmail(
          to,
          subject,
          text,
          html,
          replyId,
          connectedAccounts.email
        );
      } else {
        resp = await sendEmail(
          to,
          subject,
          text,
          html,
          connectedAccounts.email
        );
      }
    }

    // Persist outgoing message
    const timestamp = Date.now();
    const messageId = uuidv4();
    const messageItem = {
      ThreadId: to,
      Timestamp: timestamp,
      MessageId: messageId,
      Channel: channel,
      Direction: 'outgoing',
      Body: text,
      Result: resp,
      UserId: userId,  // Add userId to track who sent the message
      From: channel === 'email' ? connectedAccounts.email : connectedAccounts.whatsappBusiness
    };

    // Add email-specific fields
    if (channel === 'email') {
      messageItem.Subject = subject;
      if (html) messageItem.Html = html;
      if (replyId) {
        messageItem.ReplyTo = replyId;
        messageItem.Headers = {
          'In-Reply-To': replyId,
          'References': replyId
        };
      }
    }

    await docClient.send(new PutCommand({
      TableName: MSG_TABLE,
      Item: messageItem
    }));

    // Update flow
    await docClient.send(new UpdateCommand({
      TableName: FLOWS_TABLE,
      Key: {
        contactId: userId,
        flowId: to
      },
      UpdateExpression: `
        SET createdAt = if_not_exists(createdAt, :ts),
            lastMessageAt = :ts,
            tags = if_not_exists(tags, :tags)
        ADD messageCount :inc
      `,
      ExpressionAttributeValues: {
        ':ts': timestamp,
        ':inc': 1,
        ':tags': ['all']
      }
    }));

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        success: true,
        messageId: resp.MessageId || messageId,
        timestamp
      })
    };

  } catch (error) {
    console.error('Failed to send message:', error);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({
        error: 'Failed to send message',
        message: error.message
      })
    };
  }
}
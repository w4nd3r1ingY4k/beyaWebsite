// handlers/sendHandler.js

import { sendWhatsApp } from '../lib/whatsapp.js';
import { sendEmail, replyEmail } from '../lib/email.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  QueryCommand
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

// ─── 0) Load & validate env vars ──────────────────────────────────────────────
const REGION      = process.env.AWS_REGION;
const MSG_TABLE   = process.env.MSG_TABLE;    // e.g. "Messages"
const FLOWS_TABLE = process.env.FLOWS_TABLE;  // e.g. "Flows"
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'beya-platform-bus';

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

// ─── 1b) EventBridge client ──────────────────────────────────────────────────
const eventBridgeClient = new EventBridgeClient({ region: REGION });

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

  // 3c) Extract path‐parameter and JSON payload
  const channel = event.pathParameters?.channel; // "whatsapp" or "email"
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers:    CORS,
      body:       'Invalid JSON'
    };
  }

  // pull out the usual fields + optional originalMessageId
  const {
    to,
    subject,
    text,
    html,
    userId,
    originalMessageId
  } = payload;

  // 3d) Validate required fields
  if (!channel || !to || !text || !userId) {
    return {
      statusCode: 400,
      headers:    CORS,
      body:       JSON.stringify({
        error: 'Missing required fields: channel, to, text or userId'
      })
    };
  }

  try {
    let resp;

    let replyId = originalMessageId || null;
    console.log("Fetched replyId:", replyId)
    if (channel === "whatsapp") {
      // ─── WhatsApp send ─────────────────────────────────────────────────
      resp = await sendWhatsApp(to, text);

    } else if (channel === "email") {
      // ─── Email branch: decide between fresh send vs. reply ─────────────

      // ➋ If no originalMessageId passed, try to find the best message to reply to
      if (!replyId) {
        // First try the most recent incoming message for better threading
        replyId = await getLastIncomingMessageId(to);
        
        // If no recent message, try the first incoming message
        if (!replyId) {
          replyId = await getFirstIncomingMessageId(to);
        }
      }

      console.log('📧 Email send decision:', {
        to,
        hasReplyId: !!replyId,
        replyId: replyId,
        isReply: !!replyId
      });

      // ➌ If we have replyId, use replyEmail; otherwise, sendEmail
      if (replyId) {
        resp = await replyEmail(to, subject, text, html, replyId);
      } else {
        resp = await sendEmail(to, subject, text, html);
      }

    } else {
      return {
        statusCode: 400,
        headers:    CORS,
        body:       JSON.stringify({ error: `Unknown channel: ${channel}` })
      };
    }

    // ─── 5) Persist outgoing message in Messages table ───────────────────────
    const timestamp = Date.now();
    const messageId = uuidv4();
    const messageItem = {
      ThreadId:   to,
      Timestamp:  timestamp,
      MessageId:  messageId,
      Channel:    channel,
      Direction:  'outgoing',
      Body:       text,
      Result:     {}
    };

    if (channel === "whatsapp") {
      messageItem.Result = { MessageId: resp.MessageId || resp.messageId };
    } else {
      messageItem.Result = { MessageId: resp?.MessageId || resp };
      if (replyId) {
        messageItem.InReplyTo = replyId;
      }
    }

    await docClient.send(new PutCommand({
      TableName: MSG_TABLE,
      Item:      messageItem
    }));

    // ─── 6) Update per-user Flow in Flows table ───────────────────────────────
    await docClient.send(new UpdateCommand({
      TableName: FLOWS_TABLE,
      Key: {
        contactId: userId,
        flowId:    to
      },
      UpdateExpression: [
        "SET createdAt     = if_not_exists(createdAt, :ts)",
        "   , lastMessageAt = :ts",
        "ADD messageCount  :inc"
      ].join(' '),
      ExpressionAttributeValues: {
        ":ts":  timestamp,
        ":inc": 1
      }
    }));

    // ─── 7) Build rawEvent envelope for context engine ────────────────────
    const rawEvent = {
      eventId: uuidv4(),
      timestamp: new Date(timestamp).toISOString(),
      source: "inbox-service",            // name of this micro-service
      userId: userId,
      eventType: channel === "whatsapp" ? "whatsapp.sent" : "email.sent",
      data: {
        messageId: messageItem.Result.MessageId,
        threadId: to,
        subject: subject,
        bodyText: text,
        bodyHtml: html,
        to: Array.isArray(to) ? to : [to],
        from: "akbar@usebeya.com", // Sender address for sent emails
      }
    };

    // ─── 5c) Emit rawEvent to EventBridge ──────────────────────────────────────
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
      console.log('✅ RawEvent emitted to EventBridge:', rawEvent.eventId);
    } catch (eventErr) {
      console.error('❌ Failed to emit rawEvent:', eventErr);
      // Don't fail the entire request if event emission fails
    }

    // ─── 8) Return success + provider's messageId ──────────────────────────
    return {
      statusCode: 200,
      headers:    CORS,
      body:       JSON.stringify(messageItem.Result)
    };

  } catch (err) {
    console.error('❌ sendHandler error:', err);
    return {
      statusCode: 500,
      headers:    CORS,
      body:       JSON.stringify({ error: err.message })
    };
  }
}
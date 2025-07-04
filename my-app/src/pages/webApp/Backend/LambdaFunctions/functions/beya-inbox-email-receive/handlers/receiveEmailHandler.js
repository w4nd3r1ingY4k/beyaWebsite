// handlers/receiveEmailHandler.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  ScanCommand
} from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { simpleParser } from "mailparser";
import { v4 as uuidv4 } from "uuid";
import { generateOrGetFlowId, updateFlowMetadata } from "../lib/flowUtils.js";

const REGION      = process.env.AWS_REGION;
const MSG_TABLE   = process.env.MSG_TABLE;
const FLOWS_TABLE = process.env.FLOWS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const BUCKET      = process.env.S3_BUCKET;
const PREFIX      = process.env.S3_KEY_PREFIX || "";
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'beya-platform-bus';

if (!REGION || !MSG_TABLE || !FLOWS_TABLE || !USERS_TABLE) {
  throw new Error("Missing required env vars");
}

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true }
});
const s3Client  = new S3Client({ region: REGION });
const eventBridgeClient = new EventBridgeClient({ region: REGION });

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "OPTIONS,POST",
  "Access-Control-Allow-Headers": "Content-Type",
};

function streamToString(stream) {
  const chunks = [];
  return (async () => {
    for await (let c of stream) chunks.push(c);
    return Buffer.concat(chunks).toString("utf-8");
  })();
}

// Helper function to extract email address from various formats
function extractEmailAddress(emailString) {
  if (!emailString) return null;
  
  // Handle formats like "Name <email@domain.com>" or just "email@domain.com"
  const match = emailString.match(/<([^>]+)>/) || emailString.match(/([^\s<>]+@[^\s<>]+)/);
  return match ? match[1] : emailString;
}

// Helper function to find user by email address (works for both Gmail and SES)
async function findUserByEmail(emailAddress) {
  try {
    const scan = await docClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      ProjectionExpression: "userId, connectedAccounts.email, connectedAccounts.gmail",
      FilterExpression: "connectedAccounts.email = :email OR connectedAccounts.gmail = :email",
      ExpressionAttributeValues: { ":email": emailAddress }
    }));
    
    if (scan.Items && scan.Items.length > 0) {
      return scan.Items[0].userId;
    }
    
    console.warn(`No user found for email: ${emailAddress}`);
    return null;
  } catch (err) {
    console.error("User lookup failed:", err);
    return null;
  }
}

// Helper function to clean undefined values from objects
function cleanUndefinedValues(obj) {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanUndefinedValues).filter(item => item !== undefined);
  
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanUndefinedValues(value);
    }
  }
  return cleaned;
}

// Helper function to persist message and update flow
async function persistEmailMessage(messageData) {
  const { 
    ownerUserId, 
    fromAddress, 
    toAddress, 
    subject, 
    textBody, 
    htmlBody, 
    headers, 
    messageId,
    provider = 'ses' // 'ses' or 'gmail-mcp'
  } = messageData;

  const ts = Date.now();
  const internalId = messageId || uuidv4();

  try {
    // Generate or get unique flowId for this user+contact combination
    const flowId = await generateOrGetFlowId(docClient, FLOWS_TABLE, ownerUserId, fromAddress);
    
    // Clean headers to remove any undefined values
    const cleanHeaders = cleanUndefinedValues(headers) || {};
    
    // Persist message
    const messageItem = {
      ThreadId:  flowId,  // Use unique flowId instead of fromAddress
      Timestamp: ts,
      MessageId: internalId,
      Channel:   "email",
      Direction: "incoming",
      Subject:   subject || "(no subject)",
      Body:      textBody || "(no content)",
      Headers:   cleanHeaders,
      Provider:  provider,  // Track which email provider received this
      // ✅ ADD GSI FIELDS FOR USER ISOLATION
      userId:    ownerUserId,
      ThreadIdTimestamp: `${flowId}#${ts}`  // Use flowId for consistency
    };
    
    // Add HTML body only if it exists
    if (htmlBody) {
      messageItem.HtmlBody = htmlBody;
    }
    
    await docClient.send(new PutCommand({
      TableName: MSG_TABLE,
      Item: messageItem
    }));

    // Update flow metadata (flowId was already generated above)
    await updateFlowMetadata(docClient, FLOWS_TABLE, ownerUserId, flowId, fromAddress, ts);

    // Build and emit rawEvent for context engine
    const rawEvent = {
      eventId: uuidv4(),
      timestamp: new Date(ts).toISOString(),
      source: "inbox-service",
      userId: ownerUserId,
      eventType: "email.received",
      data: {
        messageId: headers['Message-ID'] || internalId,
        threadId: flowId,  // Use unique flowId instead of fromAddress
        subject: subject,
        bodyText: textBody,
        bodyHtml: htmlBody || "",
        from: fromAddress,
        to: toAddress,
        headers: headers,
        provider: provider
      }
    };

    await eventBridgeClient.send(new PutEventsCommand({
      Entries: [{
        EventBusName: EVENT_BUS_NAME,
        Source: rawEvent.source,
        DetailType: rawEvent.eventType,
        Time: new Date(rawEvent.timestamp),
        Detail: JSON.stringify(rawEvent)
      }]
    }));

    console.log(`✅ ${provider.toUpperCase()} email persisted and event emitted:`, rawEvent.eventId);
    return { success: true, messageId: internalId, eventId: rawEvent.eventId };

  } catch (err) {
    console.error("Failed to persist email message:", err);
    throw err;
  }
}

export async function handler(event) {
  console.log("📥 receiveEmailHandler", JSON.stringify(event));

  // ──────────────────────────────────────────────────────────────────────────
  // 1) PIPEDREAM GMAIL WEBHOOK (NEW) 🔥
  // ──────────────────────────────────────────────────────────────────────────
  
  // Check if this is a Pipedream Gmail webhook
  // Pipedream sends the Gmail message data in event.body when using webhook trigger
  if (event.requestContext?.http?.method === "POST" && event.body) {
    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      console.log("Not valid JSON, continuing to other checks...");
    }
    
    // Check for Pipedream Gmail webhook payload structure
    // Handle both direct Gmail format and Pipedream wrapper format
    let gmailMessage = null;
    if (body && body.gmail_data) {
      // Pipedream wrapper format: { userId, gmail_account_id, email, gmail_data }
      console.log("🔥 Processing Pipedream Gmail webhook (wrapped format)");
      gmailMessage = body.gmail_data;
    } else if (body && (body.id || body.payload || body.snippet)) {
      // Direct Gmail format
      console.log("🔥 Processing Pipedream Gmail webhook (direct format)");
      gmailMessage = body;
    }
    
    if (gmailMessage) {
      try {
        // Extract Gmail message data
        const messageId = gmailMessage.id;
        const snippet = gmailMessage.snippet || "";
        
        // Extract headers from Gmail payload
        const headers = {};
        const payload = gmailMessage.payload || {};
        const payloadHeaders = payload.headers || [];
        
        // Build headers object from Gmail API headers
        payloadHeaders.forEach(header => {
          headers[header.name] = header.value;
        });
        
        const fromAddress = extractEmailAddress(headers['From']);
        const toAddress = extractEmailAddress(headers['To']);
        const subject = headers['Subject'] || "(no subject)";
        const messageIdHeader = headers['Message-ID'];
        
        console.log(`📧 Gmail webhook: From ${fromAddress} → To ${toAddress}`);
        
        if (!fromAddress || !toAddress) {
          console.warn("Missing from/to addresses in Gmail webhook");
          return { statusCode: 400, headers: CORS, body: "Missing addresses" };
        }
        
        // Find the user who owns this Gmail account
        // If Pipedream provided userId, use it; otherwise lookup by email
        let ownerUserId = null;
        if (body && body.userId && body.gmail_data) {
          // Use the userId provided by Pipedream
          ownerUserId = body.userId;
          console.log(`Using Pipedream-provided userId: ${ownerUserId}`);
        } else {
          // Fallback to email lookup
          ownerUserId = await findUserByEmail(toAddress);
        }
        
        if (!ownerUserId) {
          console.warn(`No user found for Gmail address: ${toAddress}`);
          return { statusCode: 404, headers: CORS, body: "User not found" };
        }
        
        // Extract email body
        let textBody = snippet;
        let htmlBody = "";
        
        // Try to extract full body from Gmail payload
        if (payload.body?.data) {
          textBody = Buffer.from(payload.body.data, 'base64').toString('utf-8');
        } else if (payload.parts && payload.parts.length > 0) {
          // Handle multipart messages
          for (const part of payload.parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              textBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
            } else if (part.mimeType === 'text/html' && part.body?.data) {
              htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
          }
        }
        
        // Clean up the text body
        textBody = textBody?.trim() || snippet || "(no text)";
        
        // Prepare standardized headers for threading
        const standardHeaders = {
          'Message-ID': messageIdHeader || messageId,
          'From': headers['From'] || fromAddress,
          'To': headers['To'] || toAddress,
          'Subject': subject,
          'Date': headers['Date']
        };
        
        // Include threading headers if they exist
        if (headers['References']) {
          standardHeaders['References'] = headers['References'];
        }
        if (headers['In-Reply-To']) {
          standardHeaders['In-Reply-To'] = headers['In-Reply-To'];
        }
        
        // Persist the Gmail message
        await persistEmailMessage({
          ownerUserId,
          fromAddress,
          toAddress,
          subject,
          textBody,
          htmlBody,
          headers: standardHeaders,
          messageId: messageIdHeader || messageId,
          provider: 'gmail-mcp'
        });
        
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, provider: 'gmail-mcp' }) };
        
      } catch (err) {
        console.error("Gmail webhook processing error:", err);
        return { statusCode: 500, headers: CORS, body: "Gmail processing failed" };
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2) SES → S3 → LAMBDA (EXISTING)
  // ──────────────────────────────────────────────────────────────────────────
  
  if (Array.isArray(event.Records) && event.Records[0]?.ses) {
    console.log("📧 Processing SES → S3 email");
    
    if (!BUCKET) {
      throw new Error("S3_BUCKET env var required for SES processing");
    }
    
    const { mail } = event.Records[0].ses;
    const messageId   = mail.messageId;
    const fromAddress = mail.source;
    const toAddress   = mail.destination?.[0];
    const subject     = mail.commonHeaders.subject || "";

    if (!toAddress) {
      console.warn("Missing destination in SES event");
      return { statusCode: 400 };
    }

    // Download raw email from S3
    let rawEmail;
    try {
      const obj = await s3Client.send(new GetObjectCommand({
        Bucket: BUCKET,
        Key:    `${PREFIX}${messageId}`
      }));
      rawEmail = await streamToString(obj.Body);
    } catch (err) {
      console.error("S3 get error", err);
      return { statusCode: 500 };
    }

    const parsed   = await simpleParser(rawEmail);
    const textBody = parsed.text?.trim() || "(no text)";

    // Extract headers for threading
    const headers = {
      'Message-ID': parsed.messageId || messageId,
      'From': parsed.from?.text || fromAddress,
      'To': parsed.to?.text || toAddress,
      'Subject': subject,
      'Date': parsed.date?.toISOString() || new Date().toISOString()
    };
    
    // Include References and In-Reply-To if they exist (for proper threading)
    if (parsed.references) {
      headers['References'] = Array.isArray(parsed.references) ? parsed.references.join(' ') : parsed.references;
    }
    if (parsed.inReplyTo) {
      headers['In-Reply-To'] = parsed.inReplyTo;
    }

    // Find owning user by mailbox
    const ownerUserId = await findUserByEmail(toAddress);
    if (!ownerUserId) {
      console.warn(`No user found for SES mailbox: ${toAddress}`);
      return { statusCode: 404 };
    }

    // Persist the SES message
    await persistEmailMessage({
      ownerUserId,
      fromAddress,
      toAddress,
      subject,
      textBody,
      htmlBody: parsed.html || "",
      headers,
      messageId: parsed.messageId || messageId,
      provider: 'ses'
    });

    return { statusCode: 200 };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3) HTTP PREFLIGHT
  // ──────────────────────────────────────────────────────────────────────────
  
  const method = event.requestContext?.http?.method;
  if (method === "OPTIONS") {
    return { statusCode: 200, headers: CORS };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4) HTTP JSON POST (LEGACY)
  // ──────────────────────────────────────────────────────────────────────────
  
  if (method === "POST") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, headers: CORS, body: "Bad JSON" };
    }
    
    const { from, subject = "", text = "", to: toAddress } = body;
    if (!from || !text || !toAddress) {
      return { statusCode: 400, headers: CORS, body: "Missing from/text/to" };
    }

    // Find owning user
    const ownerUserId = await findUserByEmail(toAddress);
    if (!ownerUserId) {
      return { statusCode: 404, headers: CORS, body: "Account not found" };
    }

    // Create headers for legacy HTTP POST
    const legacyHeaders = {
      'Message-ID': body.messageId || uuidv4(),
      'From': from,
      'To': toAddress,
      'Subject': subject,
      'Date': new Date().toISOString()
    };
    
    // Persist the legacy message
    await persistEmailMessage({
      ownerUserId,
      fromAddress: from,
      toAddress,
      subject,
      textBody: text,
      htmlBody: body.html || "",
      headers: legacyHeaders,
      messageId: body.messageId,
      provider: 'http-post'
    });

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, provider: 'http-post' }) };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5) UNKNOWN REQUEST TYPE
  // ──────────────────────────────────────────────────────────────────────────
  
  console.warn("Unknown request type:", { method, hasRecords: !!event.Records, hasBody: !!event.body });
  return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };
}
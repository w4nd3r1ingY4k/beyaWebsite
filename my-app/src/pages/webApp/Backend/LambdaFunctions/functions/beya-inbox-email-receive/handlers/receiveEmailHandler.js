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

const REGION      = process.env.AWS_REGION;
const MSG_TABLE   = process.env.MSG_TABLE;
const FLOWS_TABLE = process.env.FLOWS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const BUCKET      = process.env.S3_BUCKET;
const PREFIX      = process.env.S3_KEY_PREFIX || "";
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'beya-platform-bus';

if (!REGION || !MSG_TABLE || !FLOWS_TABLE || !USERS_TABLE || !BUCKET) {
  throw new Error("Missing required env vars");
}

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);
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

export async function handler(event) {
  console.log("📥 receiveEmailHandler", JSON.stringify(event));

  // 1) SES → S3 → Lambda
  if (Array.isArray(event.Records) && event.Records[0].ses) {
    const { mail } = event.Records[0].ses;
    const messageId   = mail.messageId;
    const fromAddress = mail.source;
    const toAddress   = mail.destination?.[0];
    const subject     = mail.commonHeaders.subject || "";

    if (!toAddress) {
      console.warn("Missing destination");
      return { statusCode: 400 };
    }

    // 1a) download raw email
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
      'Message-ID': parsed.messageId || mail.messageId,
      'From': parsed.from?.text || fromAddress,
      'To': parsed.to?.text || toAddress,
      'Subject': subject
    };
    
    // Include References and In-Reply-To if they exist (for proper threading)
    if (parsed.references) {
      headers['References'] = Array.isArray(parsed.references) ? parsed.references.join(' ') : parsed.references;
    }
    if (parsed.inReplyTo) {
      headers['In-Reply-To'] = parsed.inReplyTo;
    }

    // 1b) find owning user by mailbox
    let scan;
    try {
      scan = await docClient.send(new ScanCommand({
        TableName: USERS_TABLE,
        ProjectionExpression:    "userId, connectedAccounts.email",
        FilterExpression:        "connectedAccounts.email = :acc",
        ExpressionAttributeValues: { ":acc": toAddress }
      }));
    } catch (err) {
      console.error("User scan failed", err);
      return { statusCode: 500 };
    }
    if (!scan.Items?.length) {
      console.warn(`No user for mailbox ${toAddress}`);
      return { statusCode: 404 };
    }
    const ownerUserId = scan.Items[0].userId;

    // 1c) persist message
    const ts = Date.now();
    const id = uuidv4();
    try {
      await docClient.send(new PutCommand({
        TableName: MSG_TABLE,
        Item: {
          ThreadId:  fromAddress,
          Timestamp: ts,
          MessageId: id,
          Channel:   "email",
          Direction: "incoming",
          Subject:   subject,
          Body:      textBody,
          Headers:   headers  // 🔥 ADD HEADERS FOR THREADING
        }
      }));
    } catch (err) {
      console.error("Message write failed", err);
      return { statusCode: 500 };
    }

    // 1d) upsert per-user flow
    try {
      await docClient.send(new UpdateCommand({
        TableName: FLOWS_TABLE,
        Key: {
          contactId: ownerUserId,
          flowId:    fromAddress
        },
        UpdateExpression: `
          SET createdAt     = if_not_exists(createdAt, :ts),
              lastMessageAt = :ts,
              tags          = if_not_exists(tags, :tags)
          ADD messageCount :inc
        `,
        ExpressionAttributeValues: {
          ":ts":   ts,
          ":inc":  1,
          ":tags": ["all"]
        }
      }));
    } catch (err) {
      console.error("Flow update failed", err);
      return { statusCode: 500 };
    }

    // 1e) Build rawEvent envelope for context engine
    const rawEvent = {
      eventId: uuidv4(),
      timestamp: new Date(ts).toISOString(),
      source: "inbox-service",
      userId: ownerUserId,
      eventType: "email.received",
      data: {
        messageId: headers['Message-ID'] || id,
        threadId: fromAddress,
        subject: subject,
        bodyText: textBody,
        bodyHtml: parsed.html || "",
        from: fromAddress,
        to: toAddress,
        headers: headers
      }
    };

    // 1f) Emit rawEvent to EventBridge
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

    return { statusCode: 200 };
  }

  // 2) HTTP preflight
  const method = event.requestContext?.http?.method;
  if (method === "OPTIONS") {
    return { statusCode: 200, headers: CORS };
  }

  // 3) HTTP JSON POST (legacy)
  if (method === "POST") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, headers: CORS, body: "Bad JSON" };
    }
    const { from, subject = "", text = "" } = body;
    if (!from || !text) {
      return { statusCode: 400, headers: CORS, body: "Missing from/text" };
    }

    // find owner by destination in body (you'll need to pass it in client-side)
    const toAddress = body.to;  
    if (!toAddress) {
      return { statusCode: 400, headers: CORS, body: "Missing to" };
    }
    let scan;
    try {
      scan = await docClient.send(new ScanCommand({
        TableName: USERS_TABLE,
        ProjectionExpression:    "userId, connectedAccounts.email",
        FilterExpression:        "connectedAccounts.email = :acc",
        ExpressionAttributeValues: { ":acc": toAddress }
      }));
    } catch (err) {
      console.error("User scan failed", err);
      return { statusCode: 500, headers: CORS };
    }
    if (!scan.Items?.length) {
      return { statusCode: 404, headers: CORS, body: "Account not found" };
    }
    const ownerUserId = scan.Items[0].userId;

    // persist message + flow exactly as above
    const ts = Date.now();
    const id = uuidv4();
    
    // Create headers for legacy HTTP POST (may not have full header info)
    const legacyHeaders = {
      'Message-ID': body.messageId || id, // fallback to our UUID
      'From': from,
      'To': toAddress,
      'Subject': subject
    };
    
    try {
      await docClient.send(new PutCommand({
        TableName: MSG_TABLE,
        Item: {
          ThreadId:  from,
          Timestamp: ts,
          MessageId: id,
          Channel:   "email",
          Direction: "incoming",
          Subject,
          Body:      text,
          Headers:   legacyHeaders  // 🔥 ADD HEADERS FOR THREADING
        }
      }));
      await docClient.send(new UpdateCommand({
        TableName: FLOWS_TABLE,
        Key: {
          contactId: ownerUserId,
          flowId:    from
        },
        UpdateExpression: `
          SET createdAt     = if_not_exists(createdAt, :ts),
              lastMessageAt = :ts,
              tags          = if_not_exists(tags, :tags)
          ADD messageCount :inc
        `,
        ExpressionAttributeValues: {
          ":ts":   ts,
          ":inc":  1,
          ":tags": ["all"]
        }
      }));
    } catch (err) {
      console.error("Dynamo error", err);
      return { statusCode: 500, headers: CORS, body: "Server error" };
    }

    // Build rawEvent envelope for context engine (HTTP POST path)
    const rawEventLegacy = {
      eventId: uuidv4(),
      timestamp: new Date(ts).toISOString(),
      source: "inbox-service",
      userId: ownerUserId,
      eventType: "email.received",
      data: {
        messageId: legacyHeaders['Message-ID'] || id,
        threadId: from,
        subject: subject,
        bodyText: text,
        bodyHtml: body.html || "",
        from: from,
        to: toAddress,
        headers: legacyHeaders
      }
    };

    // Emit rawEvent to EventBridge (HTTP POST path)
    try {
      await eventBridgeClient.send(new PutEventsCommand({
        Entries: [{
          EventBusName: EVENT_BUS_NAME,
          Source: rawEventLegacy.source,
          DetailType: rawEventLegacy.eventType,
          Time: new Date(rawEventLegacy.timestamp),
          Detail: JSON.stringify(rawEventLegacy)
        }]
      }));
      console.log('✅ RawEvent emitted to EventBridge (legacy):', rawEventLegacy.eventId);
    } catch (eventErr) {
      console.error('❌ Failed to emit rawEvent (legacy):', eventErr);
      // Don't fail the entire request if event emission fails
    }

    return { statusCode: 200, headers: CORS, body: "" };
  }

  // nothing else
  return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };
}
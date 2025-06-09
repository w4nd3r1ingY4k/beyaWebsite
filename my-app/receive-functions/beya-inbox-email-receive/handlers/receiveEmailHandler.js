import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  ScanCommand
} from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { simpleParser } from "mailparser";
import { v4 as uuidv4 } from "uuid";

const REGION      = process.env.AWS_REGION;
const MSG_TABLE   = process.env.MSG_TABLE;
const FLOWS_TABLE = process.env.FLOWS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const BUCKET      = process.env.S3_BUCKET;
const PREFIX      = process.env.S3_KEY_PREFIX || "";

if (!REGION || !MSG_TABLE || !FLOWS_TABLE || !USERS_TABLE || !BUCKET) {
  throw new Error("Missing required env vars");
}

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client  = new S3Client({ region: REGION });

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

    // 🔧 FIX: Extract all important headers for email threading
    const headers = {};
    if (parsed.headers) {
      // Convert headers Map to plain object and extract key threading headers
      for (let [key, value] of parsed.headers) {
        headers[key] = value;
      }
    }

    // 🎯 CRITICAL: Extract the original Message-ID for threading
    const originalMessageId = headers['message-id'] || headers['Message-ID'] || messageId;
    
    console.log('📧 Email headers extracted:', {
      'Message-ID': originalMessageId,
      'From': headers['from'],
      'To': headers['to'],
      'Subject': headers['subject'],
      'Date': headers['date'],
      'Reply-To': headers['reply-to'],
      'In-Reply-To': headers['in-reply-to'],
      'References': headers['references']
    });

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

    // 1c) persist message WITH HEADERS for threading
    const ts = Date.now();
    const id = uuidv4();
    try {
      await docClient.send(new PutCommand({
        TableName: MSG_TABLE,
        Item: {
          ThreadId:  fromAddress,
          Timestamp: ts,
          MessageId: id,                    // Internal UUID for DynamoDB
          Channel:   "email",
          Direction: "incoming",
          Subject:   subject,
          Body:      textBody,
          Headers:   headers                // 🎯 CRITICAL: Store original email headers including Message-ID
        }
      }));
      
      console.log('✅ Email stored with headers:', {
        ThreadId: fromAddress,
        InternalMessageId: id,
        OriginalMessageId: originalMessageId,
        HasHeaders: Object.keys(headers).length > 0
      });
      
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
              category      = if_not_exists(category, :cat)
          ADD messageCount :inc
        `,
        ExpressionAttributeValues: {
          ":ts":  ts,
          ":inc": 1,
          ":cat": "all"
        }
      }));
    } catch (err) {
      console.error("Flow update failed", err);
      return { statusCode: 500 };
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
    
    // 🔧 FIX: For HTTP POST, create basic headers structure
    const headers = {
      'from': from,
      'to': toAddress,
      'subject': subject,
      'message-id': `<${id}@http-post-fallback>`,  // Fallback Message-ID for HTTP posts
      'date': new Date(ts).toISOString()
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
          Headers:   headers                // 🎯 Store headers for HTTP POST too
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
              category      = if_not_exists(category, :cat)
          ADD messageCount :inc
        `,
        ExpressionAttributeValues: {
          ":ts":  ts,
          ":inc": 1,
          ":cat": "all"
        }
      }));
    } catch (err) {
      console.error("Dynamo error", err);
      return { statusCode: 500, headers: CORS, body: "Server error" };
    }

    return { statusCode: 200, headers: CORS, body: "" };
  }

  // nothing else
  return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };
} 
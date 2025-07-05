// handlers/receiveHandler.js

import crypto from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  ScanCommand
} from '@aws-sdk/lib-dynamodb';
import { normalizeNumber } from '../lib/normalizePhone.js';
import { generateOrGetFlowId, updateFlowMetadata } from '../lib/flowUtils.js';

const MSG_TABLE   = process.env.MSG_TABLE;
const FLOWS_TABLE = process.env.FLOWS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;          // your “Users” table
const VERIFY      = process.env.WHATSAPP_VERIFY_TOKEN;
const SECRET      = process.env.WHATSAPP_APP_SECRET;

if (!MSG_TABLE || !FLOWS_TABLE || !USERS_TABLE || !VERIFY || !SECRET) {
  throw new Error('Missing required env vars');
}

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

export async function handler(event) {
  const method = event.requestContext.http.method;

  // 1) GET handshake
  if (method === 'GET') {
    const qs = event.queryStringParameters || {};
    if (qs['hub.mode'] === 'subscribe' && qs['hub.verify_token'] === VERIFY) {
      return { statusCode: 200, body: qs['hub.challenge'] };
    }
    return { statusCode: 403 };
  }

  // 2) POST inbound message
  if (method === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400 };
    }

    const entry  = (body.entry  || [])[0];
    const change = (entry?.changes || [])[0];
    const msg    = change?.value?.messages?.[0];
    if (!msg) return { statusCode: 204 };

    const from      = normalizeNumber(msg.from);
    const toAccount = change.value.metadata.display_phone_number;
    if (!toAccount) return { statusCode: 400, body: 'Missing to' };

    // Normalize the toAccount phone number to match database format
    const normalizedToAccount = normalizeNumber(toAccount);

    // 3) Find the user whose connectedAccounts.whatsappBusiness matches `normalizedToAccount`
    let usersScan;
    try {
      usersScan = await docClient.send(new ScanCommand({
        TableName: USERS_TABLE,
        // only project userId and the map key to reduce data transfer
        ProjectionExpression: 'userId, connectedAccounts.whatsappBusiness',
        // filter for map attribute equals our normalizedToAccount
        FilterExpression: 'connectedAccounts.whatsappBusiness = :acc',
        ExpressionAttributeValues: {
          ':acc': normalizedToAccount
        }
      }));
    } catch (err) {
      console.error('Error scanning Users for account match', err);
      return { statusCode: 500 };
    }

    if (!usersScan.Items || usersScan.Items.length === 0) {
      console.warn(`No user found for WhatsApp business ${normalizedToAccount} (original: ${toAccount})`);
      return { statusCode: 404, body: 'Account not registered' };
    }

    const ownerUserId = usersScan.Items[0].userId;

    const timestamp = Date.now();
    const messageId = msg.id;
    const textBody  = msg.text?.body || '';

    // 4) Generate or get unique flowId for this user+contact combination
    const flowId = await generateOrGetFlowId(docClient, FLOWS_TABLE, ownerUserId, from);
    
    // 5) Put message under that userId using the unique flowId as ThreadId
    try {
      await docClient.send(new PutCommand({
        TableName: MSG_TABLE,
        Item: {
          ThreadId:  flowId,       // Use unique flowId instead of phone number
          Timestamp: timestamp,    // SK
          MessageId: messageId,    // non-key attrs can be anything
          Channel:   'whatsapp',
          Direction: 'incoming',
          Body:      textBody,
          userId:    ownerUserId,  // Required for User-Messages-Index GSI hash key
          ThreadIdTimestamp: `${flowId}#${timestamp}` // Use flowId for consistency
        },
        ConditionExpression: 'attribute_not_exists(MessageId)'
      }));
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') {
        console.log('Duplicate message, skipping', messageId);
      } else {
        console.error('Error writing message', err);
        throw err;
      }
    }

    // 6) Update flow metadata
    try {
      await updateFlowMetadata(docClient, FLOWS_TABLE, ownerUserId, flowId, from, timestamp);
    } catch (err) {
      console.error('Error updating flow', err);
      throw err;
    }

    return { statusCode: 200 };
  }

  // unsupported method
  return { statusCode: 405 };
}
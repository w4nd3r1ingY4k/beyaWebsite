// handlers/sendHandler.js

import { sendWhatsApp, sendWhatsAppTemplate } from '../lib/whatsapp.js';
import { sendEmail, replyEmail } from '../lib/email.js';
import { GmailMCPSender } from '../lib/gmail-mcp.js';
import { generateOrGetFlowId, generateOrGetEmailFlowId, updateFlowMetadata } from '../lib/flowUtils.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  QueryCommand
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { createBackendClient } from "@pipedream/sdk/server";
import fetch from 'node-fetch';

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
    userId,      // NOW REQUIRED for Gmail MCP
    originalMessageId,
    // New fields for WhatsApp templates
    templateName,
    templateLanguage,
    templateComponents
  } = payload;

  // 3d) Validate required fields
  if (!channel || !to || !userId) {
    return {
      statusCode: 400,
      headers:    CORS,
      body:       JSON.stringify({
        error: 'Missing required fields: channel, to, or userId'
      })
    };
  }
  
  // For regular messages, text is required
  if (!templateName && !text) {
    return {
      statusCode: 400,
      headers:    CORS,
      body:       JSON.stringify({
        error: 'Missing required field: text (or templateName for templates)'
      })
    };
  }

  try {
    let resp;
    let gmailAccount = null; // Track Gmail account info for event data
    let userEmailAddress = null; // Store the user's actual email address

    let replyId = originalMessageId || null;
    console.log("Fetched replyId:", replyId)
    if (channel === "whatsapp") {
      // ─── WhatsApp send - fetch credentials from Pipedream ─────────────────────
      let whatsappCredentials = null;
      
      try {
        // Initialize Pipedream client
        const pd = createBackendClient({
          environment: process.env.PIPEDREAM_PROJECT_ENVIRONMENT || "production",
          credentials: {
            clientId: process.env.PIPEDREAM_CLIENT_ID,
            clientSecret: process.env.PIPEDREAM_CLIENT_SECRET,
          },
          projectId: process.env.PIPEDREAM_PROJECT_ID,
        });

        // Check if user has connected WhatsApp account
        const accounts = await pd.getAccounts({
          external_user_id: userId,
          app: "whatsapp_business",
          include_credentials: true,
        });
        
        console.log(`📱 WhatsApp accounts for user ${userId}:`, JSON.stringify(accounts, null, 2));
        
        if (accounts && accounts.data && accounts.data.length > 0) {
          const whatsappAccount = accounts.data[0];
          console.log(`📱 Found WhatsApp account: ${whatsappAccount.name || whatsappAccount.external_id}`);
          
          // Get the auth data which should contain the access token and phone number ID
          // This is where Pipedream stores the WhatsApp credentials
          // Note: business_account_id is not the same as phone_number_id
          // We'll need to make an API call to get the phone number ID
          const businessAccountId = whatsappAccount.credentials?.business_account_id;
          const accessToken = whatsappAccount.credentials?.permanent_access_token || whatsappAccount.auth?.access_token;
          
          if (businessAccountId && accessToken) {
            // Get phone number ID from the business account
            try {
              const phoneNumbersResponse = await fetch(
                `https://graph.facebook.com/v17.0/${businessAccountId}/phone_numbers`,
                {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`
                  }
                }
              );
              
              if (phoneNumbersResponse.ok) {
                const phoneNumbersData = await phoneNumbersResponse.json();
                console.log(`📱 Phone numbers response:`, JSON.stringify(phoneNumbersData, null, 2));
                
                // Use the first phone number ID found
                const phoneNumberId = phoneNumbersData.data?.[0]?.id;
                
                if (phoneNumberId) {
                  whatsappCredentials = {
                    token: accessToken,
                    phoneNumberId: phoneNumberId,
                    businessAccountId: businessAccountId,
                    accountName: whatsappAccount.name || whatsappAccount.external_id
                  };
                  console.log(`📱 WhatsApp credentials found with phone number ID: ${phoneNumberId}`);
                } else {
                  console.error('❌ No phone numbers found for this WhatsApp Business account');
                }
              } else {
                console.error('❌ Failed to fetch phone numbers:', await phoneNumbersResponse.text());
              }
            } catch (error) {
              console.error('❌ Error fetching phone number ID:', error);
            }
          } else {
            // Fallback to original logic if structure is different
            whatsappCredentials = {
              token: accessToken,
              phoneNumberId: whatsappAccount.auth?.phone_number_id || whatsappAccount.auth?.whatsapp_business_account_id,
              accountName: whatsappAccount.name || whatsappAccount.external_id
            };
          }
        }
      } catch (error) {
        console.log(`⚠️ Failed to fetch WhatsApp credentials from Pipedream:`, error.message);
      }

      // Send WhatsApp message ONLY if we have Pipedream credentials
      if (whatsappCredentials?.token && whatsappCredentials?.phoneNumberId) {
        console.log('📱 Using WhatsApp credentials from Pipedream');
        
        // Check if this is a template message
        if (templateName) {
          console.log('📱 Sending WhatsApp template message');
          resp = await sendWhatsAppTemplate(
            to, 
            templateName, 
            templateLanguage || 'en_US', 
            templateComponents,
            whatsappCredentials.token, 
            whatsappCredentials.phoneNumberId
          );
        } else {
          console.log('📱 Sending regular WhatsApp text message');
          resp = await sendWhatsApp(to, text, whatsappCredentials.token, whatsappCredentials.phoneNumberId);
        }
      } else {
        throw new Error('No WhatsApp Business account connected. Please connect your WhatsApp Business account through Pipedream first.');
      }

    } else if (channel === "email") {
      // ─── Email branch: Try Gmail MCP first, fallback to SES ─────────────

      // Initialize Gmail sender
      const gmailSender = new GmailMCPSender();
      let useGmail = false;
      
      try {
        // Check if user has connected Gmail account
        useGmail = await gmailSender.isGmailConnected(userId);
        if (useGmail) {
          gmailAccount = await gmailSender.getGmailAccount(userId);
          // Get the user's email address from the Gmail account
          userEmailAddress = gmailAccount.name || gmailAccount.external_id;
          console.log(`📧 User's Gmail address: ${userEmailAddress}`);
        }
        console.log(`📧 Gmail connection status for user ${userId}:`, useGmail);
      } catch (error) {
        console.log(`⚠️ Gmail connection check failed, using SES fallback:`, error.message);
        useGmail = false;
      }

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
        isReply: !!replyId,
        useGmail: useGmail,
        userEmailAddress: userEmailAddress
      });

      if (useGmail) {
        // ➌ Send via Gmail MCP
        try {
          if (replyId) {
            resp = await gmailSender.sendReply(userId, {
              originalMessageId: replyId,
              threadId: to,
              to,
              subject,
              body: html || text
            });
          } else {
            resp = await gmailSender.sendEmail(userId, {
              to,
              subject,
              body: html || text
            });
          }
          console.log('✅ Email sent via Gmail MCP');
        } catch (gmailError) {
          console.error('❌ Gmail MCP send failed, falling back to SES:', gmailError.message);
          // Fall back to SES
          if (replyId) {
            resp = await replyEmail(to, subject, text, html, replyId);
          } else {
            resp = await sendEmail(to, subject, text, html);
          }
        }
      } else {
        // ➌ Send via SES (original logic)
        if (replyId) {
          resp = await replyEmail(to, subject, text, html, replyId);
        } else {
          resp = await sendEmail(to, subject, text, html);
        }
      }

    } else {
      return {
        statusCode: 400,
        headers:    CORS,
        body:       JSON.stringify({ error: `Unknown channel: ${channel}` })
      };
    }

    // ─── 5) Generate or get unique flowId for this user+contact combination FIRST ───
    let flowId;
    if (channel === "email") {
      // Use email-specific threading that considers subject lines
      flowId = await generateOrGetEmailFlowId(docClient, FLOWS_TABLE, userId, to, subject, {});
    } else {
      // Use contact-based threading for other channels (WhatsApp, etc.)
      flowId = await generateOrGetFlowId(docClient, FLOWS_TABLE, userId, to);
    }
    
    // ─── 6) Persist outgoing message in Messages table using flowId as ThreadId ───
    const timestamp = Date.now();
    const messageId = uuidv4();
    const messageItem = {
      ThreadId:   flowId,  // ✅ Use flowId as ThreadId for consistency
      Timestamp:  timestamp,
      MessageId:  messageId,
      Channel:    channel,
      Direction:  'outgoing',
      Body:       text || `[Template: ${templateName}]`,
      Result:     {},
      userId:     userId,
      ThreadIdTimestamp: `${flowId}#${timestamp}`  // ✅ Use flowId here too
    };
    
    // Add template info if this was a template message
    if (templateName) {
      messageItem.TemplateInfo = {
        name: templateName,
        language: templateLanguage || 'en_US',
        components: templateComponents
      };
    }

    if (channel === "whatsapp") {
      messageItem.Result = { 
        MessageId: resp?.messageId || resp?.MessageId || resp?.messages?.[0]?.id || 'whatsapp-sent'
      };
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

    // ─── 7) Update per-user Flow in Flows table ───────────────────────────────
    // flowId was already generated above, just update metadata
    await updateFlowMetadata(docClient, FLOWS_TABLE, userId, flowId, timestamp);

    // ─── 8) Build rawEvent envelope for context engine ────────────────────
    // Determine the sender email based on provider and available user info
    let senderEmail = "akbar@usebeya.com"; // Default SES sender
    let provider = "ses"; // Default provider
    
    if (channel === "whatsapp") {
      // WhatsApp message handling
      provider = "whatsapp";
    } else if (resp && resp.provider === "gmail-mcp") {
      // Gmail MCP was used - use the email from the response
      senderEmail = resp.from || userEmailAddress || gmailAccount?.external_id || "gmail-user@connected.com";
      provider = "gmail";
    } else if (userEmailAddress) {
      // User has Gmail connected but we're using SES - still show their Gmail address
      senderEmail = userEmailAddress;
      provider = "ses-with-gmail-identity";
      console.log(`📧 Using user's Gmail address with SES: ${senderEmail}`);
    }
    // If no Gmail account connected, falls back to default SES sender

    const rawEvent = {
      eventId: uuidv4(),
      timestamp: new Date(timestamp).toISOString(),
      source: "inbox-service",            // name of this micro-service
      userId: userId,
      eventType: channel === "whatsapp" ? "whatsapp.sent" : "email.sent",
      data: {
        messageId: messageItem.Result.MessageId,
        threadId: flowId,  // ✅ Use flowId for consistency
        ...(channel === "email" && {
          subject: subject,
          bodyText: text,
          bodyHtml: html,
          to: Array.isArray(to) ? to : [to],
          from: senderEmail,
        }),
        ...(channel === "whatsapp" && {
          bodyText: text || `[Template: ${templateName}]`,
          to: to,
          ...(templateName && {
            templateInfo: {
              name: templateName,
              language: templateLanguage || 'en_US',
              components: templateComponents
            }
          })
        }),
        provider: provider,
        ...(resp && resp.provider === "gmail-mcp" && { gmailData: resp.toolResult })
      }
    };

    // ─── 8c) Emit rawEvent to EventBridge ──────────────────────────────────────
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

    // ─── 9) Return success + provider's messageId ──────────────────────────
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
// handlers/sendHandler.js

import { sendWhatsApp, sendWhatsAppTemplate } from '../lib/whatsapp.js';
// SES email removed - using Gmail MCP only
import { GmailMCPSender } from '../lib/gmail-mcp.js';
import { generateOrGetFlowId, generateOrGetEmailFlowId, updateFlowMetadata } from '../lib/flowUtils.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand
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

// ─── 1a) Helper: fetch any MessageId for a given ThreadId (incoming first, then outgoing) ──────
async function getFirstIncomingMessageId(threadId) {
  // First try incoming messages (preferred for replies)
  let params = {
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

  let result = await docClient.send(new QueryCommand(params));
  
  // If no incoming messages, try outgoing messages (to continue conversations you started)
  if (!result.Items || result.Items.length === 0) {
    console.log('📧 No incoming messages found, checking outgoing messages for threading...');
    params.ExpressionAttributeValues[":dir"] = "outgoing";
    result = await docClient.send(new QueryCommand(params));
  }

  if (result.Items && result.Items.length > 0) {
    const message = result.Items[0];
    
    // Priority 1: Get the original email Message-ID from headers (best for threading)
    if (message.Headers && message.Headers['Message-ID'] && message.Headers['Message-ID'].S) {
      const messageId = message.Headers['Message-ID'].S;
      console.log('📧 Found Message-ID in headers:', messageId, 'from', message.Direction, 'message');
      return messageId;
    }
    
    // Priority 2: Check Result object for Gmail/SES Message-ID
    if (message.Result && message.Result.MessageId) {
      console.log('📧 Found Message-ID in Result:', message.Result.MessageId, 'from', message.Direction, 'message');
      return message.Result.MessageId;
    }
    
    // Priority 3: Use internal MessageId (UUID) - still better than nothing for threading
    if (message.MessageId) {
      console.log('📧 Using internal MessageId for threading:', message.MessageId, 'from', message.Direction, 'message');
      return message.MessageId;
    }
  }
  
  console.log('📧 No Message-ID found for threadId:', threadId);
  return null;
}

// ─── 1b) Helper: fetch the most recent valid MessageId for better threading (incoming first, then outgoing) ──────
async function getLastIncomingMessageId(threadId) {
  // First try incoming messages (preferred for replies)
  let params = {
    TableName: MSG_TABLE,
    KeyConditionExpression:    "ThreadId = :th",
    FilterExpression:          "Direction = :dir",
    ExpressionAttributeValues: {
      ":th":  threadId,
      ":dir": "incoming"
    },
    ScanIndexForward: false, // descending by Timestamp (most recent first)
    Limit: 5 // Get more to find a valid Message-ID
  };

  let result = await docClient.send(new QueryCommand(params));
  
  // If no incoming messages, try outgoing messages (to continue conversations you started)
  if (!result.Items || result.Items.length === 0) {
    console.log('📧 No recent incoming messages found, checking outgoing messages for threading...');
    params.ExpressionAttributeValues[":dir"] = "outgoing";
    result = await docClient.send(new QueryCommand(params));
  }

  if (result.Items && result.Items.length > 0) {
    // Try to find a valid Message-ID (should look like an email Message-ID)
    for (const message of result.Items) {
      // Priority 1: Get email Message-ID from headers (best for threading)
      if (message.Headers && message.Headers['Message-ID'] && message.Headers['Message-ID'].S) {
        const messageId = message.Headers['Message-ID'].S;
        // Validate that it looks like a real email Message-ID (contains @ or <)
        if (messageId.includes('@') || messageId.includes('<')) {
          console.log('📧 ✅ Found valid Message-ID in headers:', messageId, 'from', message.Direction, 'message');
          return messageId;
        }
      }
    }
    
    // If no valid Message-ID found, fall back to first message
    const message = result.Items[0];
    
    // Priority 2: Check Result object for Gmail/SES Message-ID
    if (message.Result && message.Result.MessageId) {
      // Validate this too
      if (message.Result.MessageId.includes('@') || message.Result.MessageId.includes('<')) {
        console.log('📧 ⚠️ Fallback: Found valid Message-ID in Result:', message.Result.MessageId, 'from', message.Direction, 'message');
        return message.Result.MessageId;
      }
    }
    
    // Priority 3: Don't use internal MessageIds for email threading as they're not valid email Message-IDs
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
    cc,          // NEW: CC recipients array
    bcc,         // NEW: BCC recipients array
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
        // Search for existing conversations with this recipient
        try {
          // Try a broader search first - just find any email messages for this user
          const conversationSearch = {
            TableName: MSG_TABLE,
            FilterExpression: 'userId = :userId AND Channel = :channel',
            ExpressionAttributeValues: {
              ':userId': userId,
              ':channel': 'email'
            }
          };
          
          console.log(`📧 Searching for any existing email messages for user...`);
          const existingMessages = await docClient.send(new ScanCommand(conversationSearch));
          
          console.log(`📧 Found ${existingMessages.Items?.length || 0} email messages for user`);
          
          if (existingMessages.Items && existingMessages.Items.length > 0) {
            // Filter for messages involving this recipient (handle display name formats)
            const relevantMessages = existingMessages.Items.filter(msg => {
              // Extract email from "Display Name <email@domain.com>" format
              const extractEmail = (emailField) => {
                if (!emailField) return '';
                if (typeof emailField === 'string') {
                  const match = emailField.match(/<(.+)>/);
                  return match ? match[1] : emailField;
                }
                return emailField;
              };
              
              const fromEmail = extractEmail(msg.From);
              const fromMatch = fromEmail === to;
              
              // Handle To field (can be array or string)
              let toMatch = false;
              if (Array.isArray(msg.To)) {
                toMatch = msg.To.some(toAddr => extractEmail(toAddr) === to);
              } else {
                toMatch = extractEmail(msg.To) === to;
              }
              
              return fromMatch || toMatch;
            });
            
            console.log(`📧 Found ${relevantMessages.length} messages involving ${to}`);
            
            if (relevantMessages.length > 0) {
              // Sort by timestamp to get most recent first
              const sortedMessages = relevantMessages.sort((a, b) => b.Timestamp - a.Timestamp);
              const recentMessage = sortedMessages[0];
              const threadId = recentMessage.ThreadId;
              console.log(`📧 Found existing conversation thread: ${threadId}`);
              
              // Now look for Message-IDs within this specific thread
              replyId = await getLastIncomingMessageId(threadId);
              
              // If no recent message, try the first incoming message
              if (!replyId) {
                replyId = await getFirstIncomingMessageId(threadId);
              }
              
              console.log(`📧 Message-ID lookup result: ${replyId}`);
            } else {
              console.log(`📧 No messages found involving ${to}`);
            }
          } else {
            console.log(`📧 No email messages found for user`);
          }
        } catch (error) {
          console.log(`⚠️ Error searching for existing conversation:`, error.message);
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
              cc: cc || [],
              bcc: bcc || [],
              subject,
              body: html || text
            });
          } else {
            resp = await gmailSender.sendEmail(userId, {
              to,
              cc: cc || [],
              bcc: bcc || [],
              subject,
              body: html || text
            });
          }
          console.log('✅ Email sent via Gmail MCP');
        } catch (gmailError) {
          console.error('❌ Gmail MCP send failed:', gmailError.message);
          throw gmailError; // No SES fallback, just fail
        }
      } else {
        // ➌ No Gmail connected - require Gmail connection
        throw new Error('Gmail account required for sending emails. Please connect your Gmail account.');
      }

    } else {
      return {
        statusCode: 400,
        headers:    CORS,
        body:       JSON.stringify({ error: `Unknown channel: ${channel}` })
      };
    }

    // ─── 5) Generate messageId and flowId ───
    const timestamp = Date.now();
    const messageId = uuidv4();
    let flowId;
    
    if (channel === "email") {
      // For replies, try to find the existing thread first
      if (replyId) {
        console.log(`📧 This is a reply, searching for original thread with replyId: ${replyId}`);
        
        // Search for the original message to get its ThreadId
        try {
          // Clean up the Message-ID (remove < > brackets if present)
          const cleanReplyId = replyId.replace(/^<|>$/g, '');
          
          console.log(`🔍 Searching for original message with Message-ID: ${replyId}`);
          console.log(`🔍 Clean Message-ID: ${cleanReplyId}`);
          
          // Use robust Message-ID search that handles different storage patterns
          const originalMessageQuery = {
            TableName: MSG_TABLE,
            FilterExpression: 'userId = :userId AND (Headers.#msgId = :messageId OR Headers.#msgId = :messageIdWithBrackets OR Headers.#msgId = :cleanMessageId OR MessageId = :messageId OR MessageId = :cleanMessageId)',
            ExpressionAttributeNames: {
              '#msgId': 'Message-ID'
            },
            ExpressionAttributeValues: {
              ':userId': userId,
              ':messageId': replyId,                    // Original format with brackets
              ':messageIdWithBrackets': `<${cleanReplyId}>`, // Ensure brackets
              ':cleanMessageId': cleanReplyId           // Without brackets
            }
          };
          
          console.log(`🔍 Message-ID search query:`, {
            formats: {
              original: replyId,
              withBrackets: `<${cleanReplyId}>`,
              clean: cleanReplyId,
              core: cleanReplyId.split('@')[0]
            }
          });
          
          // Paginate through scan results to handle large tables
          let originalMessage = null;
          let lastEvaluatedKey = undefined;
          let totalScanned = 0;
          
          do {
            const scanParams = {
              ...originalMessageQuery,
              ExclusiveStartKey: lastEvaluatedKey
            };
            
            const scanResult = await docClient.send(new ScanCommand(scanParams));
            totalScanned += scanResult.ScannedCount || 0;
            
            if (scanResult.Items && scanResult.Items.length > 0) {
              originalMessage = scanResult.Items[0];
              break;
            }
            
            lastEvaluatedKey = scanResult.LastEvaluatedKey;
          } while (lastEvaluatedKey);
          
          console.log(`🔍 Search result: Scanned ${totalScanned} items, found ${originalMessage ? 1 : 0} matching messages`);
          
          if (originalMessage) {
            flowId = originalMessage.ThreadId;
            console.log(`📧 ✅ Found original thread for reply: ${flowId}`, {
              originalMessageId: originalMessage.MessageId,
              originalSubject: originalMessage.Subject,
              storedMessageId: originalMessage.Headers?.['Message-ID']
            });
          } else {
            console.log(`📧 ❌ No matching messages found for Message-ID search after scanning ${totalScanned} items`);
            
            // FALLBACK: Try searching by any Gmail thread information we might have
            console.log(`🔍 Attempting fallback search by subject and participants...`);
            
            const fallbackQuery = {
              TableName: MSG_TABLE,
              FilterExpression: 'userId = :userId AND Channel = :channel AND (contains(#to, :targetEmail) OR contains(#from, :targetEmail))',
              ExpressionAttributeNames: {
                '#to': 'To',
                '#from': 'From'
              },
              ExpressionAttributeValues: {
                ':userId': userId,
                ':channel': 'email',
                ':targetEmail': to // The email we're replying to
              }
            };
            
            const fallbackResult = await docClient.send(new ScanCommand(fallbackQuery));
            
            if (fallbackResult.Items && fallbackResult.Items.length > 0) {
              // Sort by timestamp to get the most recent conversation
              const sortedMessages = fallbackResult.Items.sort((a, b) => b.Timestamp - a.Timestamp);
              const recentMessage = sortedMessages[0];
              flowId = recentMessage.ThreadId;
              console.log(`📧 🔄 Found thread via fallback search: ${flowId}`, {
                fallbackMessageId: recentMessage.MessageId,
                fallbackSubject: recentMessage.Subject,
                messagesFound: fallbackResult.Items.length
              });
            }
          }
        } catch (error) {
          console.log(`⚠️ Could not find original thread for reply, creating new thread:`, error.message);
        }
      }
      
      // If we didn't find an existing thread (new email or failed reply lookup), generate a new one
      if (!flowId) {
        // Prepare all participants for email threading (EXCLUDING BCC - they're invisible for threading)
        const threadingParticipants = [to, ...(cc || [])].filter(Boolean);
        
        // Use email-specific threading that considers subject lines and participants
        flowId = await generateOrGetEmailFlowId(docClient, FLOWS_TABLE, userId, to, subject, {
          participants: threadingParticipants,  // BCC excluded from threading calculation
          cc: cc || [],
          bcc: bcc || [],  // Still pass BCC for participant history tracking
          messageId: messageId // Will be used for participant history
        });
      }
    } else {
      // Use contact-based threading for other channels (WhatsApp, etc.)
      flowId = await generateOrGetFlowId(docClient, FLOWS_TABLE, userId, to);
    }
    
    // ─── 6) Persist outgoing message in Messages table using flowId as ThreadId ───
    const messageItem = {
      ThreadId:   flowId,  // ✅ Use flowId as ThreadId for consistency
      Timestamp:  timestamp,
      MessageId:  messageId,
      Channel:    channel,
      Direction:  'outgoing',
      Body:       text || `[Template: ${templateName}]`,
      Result:     {},
      userId:     userId,
      ThreadIdTimestamp: `${flowId}#${timestamp}`,  // ✅ Use flowId here too
      // ✅ PARTICIPANT INFORMATION FOR EMAIL
      ...(channel === "email" && {
        To:  Array.isArray(to) ? to : [to],
        CC:  cc || [],
        BCC: bcc || [],
        Subject: subject
      })
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
      // Handle both Gmail MCP response and SES response
      const gmailMessageId = resp?.messageId || resp?.MessageId || resp?.id || resp || 'email-sent';
      const gmailThreadId = resp?.threadId; // Capture Gmail Thread ID
      
      // DEBUG: Log the actual Gmail response structure
      console.log('🔍 DEBUG Gmail MCP Response:', {
        fullResponse: resp,
        messageId: gmailMessageId,
        threadId: gmailThreadId,
        responseKeys: Object.keys(resp || {})
      });
      
      messageItem.Result = { 
        MessageId: gmailMessageId,
        ThreadId: gmailThreadId // Store Gmail Thread ID
      };
      
      // Store the Gmail Thread ID in Headers for threading lookup
      messageItem.Headers = messageItem.Headers || {};
      messageItem.Headers['Message-ID'] = gmailMessageId;
      messageItem.Headers['Gmail-Thread-ID'] = gmailThreadId; // NEW: Store Gmail Thread ID
      
      if (replyId) {
        messageItem.InReplyTo = replyId;
        messageItem.Headers['In-Reply-To'] = replyId;
      }
    }

    console.log('📝 About to store message in database:', {
      TableName: MSG_TABLE,
      MessageId: messageItem.MessageId,
      ThreadId: messageItem.ThreadId,
      Channel: messageItem.Channel,
      Direction: messageItem.Direction
    });
    
    await docClient.send(new PutCommand({
      TableName: MSG_TABLE,
      Item:      messageItem
    }));
    
    console.log('✅ Message stored successfully in database');

    // ─── 7) Update per-user Flow in Flows table ───────────────────────────────
    // flowId was already generated above, just update metadata
    await updateFlowMetadata(docClient, FLOWS_TABLE, userId, flowId, timestamp);

    // ─── 8) Build rawEvent envelope for context engine ────────────────────
    // Determine the sender email based on provider and available user info
    let senderEmail = userEmailAddress;
    let provider = "gmail"; // Gmail MCP only
    
    if (channel === "whatsapp") {
      // WhatsApp message handling
      provider = "whatsapp";
    } else if (resp && resp.provider === "gmail-mcp") {
      // Gmail MCP was used - use the email from the response
      senderEmail = resp.from || userEmailAddress || gmailAccount?.external_id || "gmail-user@connected.com";
      provider = "gmail";
    }

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
          cc: cc || [],
          bcc: bcc || [],
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
import { sendWhatsApp } from '../lib/whatsapp.js';
import { sendEmail, replyEmail } from '../lib/email.js';
import { GmailMCPSender } from '../lib/gmail-mcp.js';
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

if (channel === "whatsapp") {
  // ─── WhatsApp send - fetch credentials from Pipedream ONLY ─────────────────────
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
    resp = await sendWhatsApp(to, text, whatsappCredentials.token, whatsappCredentials.phoneNumberId);
  } else {
    throw new Error('No WhatsApp Business account connected. Please connect your WhatsApp Business account through Pipedream first.');
  }

} else if (channel === "email") {
  // ... existing code ...
}
} 
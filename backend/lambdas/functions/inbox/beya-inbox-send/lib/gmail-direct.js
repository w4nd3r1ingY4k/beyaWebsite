import { createBackendClient } from "@pipedream/sdk/server";

/**
 * Gmail Proxy Client
 * Uses Pipedream's proxy API to send emails via Gmail API with full threading support
 */
export class GmailDirectClient {
  constructor() {
    this.pd = createBackendClient({
      environment: process.env.PIPEDREAM_PROJECT_ENVIRONMENT || "production",
      credentials: {
        clientId: process.env.PIPEDREAM_CLIENT_ID,
        clientSecret: process.env.PIPEDREAM_CLIENT_SECRET,
      },
      projectId: process.env.PIPEDREAM_PROJECT_ID,
    });
  }
  

  /**
   * Get Gmail account info from Pipedream (without credentials)
   */
  async getGmailAccount(userId) {
    try {
      // Use Pipedream SDK to get accounts
      const accounts = await this.pd.getAccounts({
        app: 'gmail',
        external_user_id: userId
      });

      if (!accounts?.data?.length) {
        throw new Error(`No Gmail account found for user: ${userId}`);
      }

      // Get the first healthy Gmail account
      const gmailAccount = accounts.data.find(acc => acc.healthy && !acc.dead);
      if (!gmailAccount) {
        throw new Error(`No healthy Gmail account found for user: ${userId}`);
      }

      console.log(`📧 Found Gmail account: ${gmailAccount.name || gmailAccount.external_id}, ID: ${gmailAccount.id}`);
      return gmailAccount;

    } catch (error) {
      console.error(`❌ Error fetching Gmail account:`, error);
      throw error;
    }
  }

  /**
   * Send email via Pipedream Proxy API using SDK
   */
  async sendEmailViaProxy(accountId, userId, rawEmailData) {
    try {
      console.log(`📤 Sending email via Pipedream Proxy SDK...`);
      
      const response = await this.pd.makeProxyRequest(
        {
          searchParams: {
            account_id: accountId,
            external_user_id: userId
          }
        },
        {
          url: "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
          options: {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: {
              raw: rawEmailData
            }
          }
        }
      );

      console.log(`✅ Email sent via Proxy SDK:`, response);
      
      return response;

    } catch (error) {
      console.error('❌ Proxy SDK error:', error);
      throw error;
    }
  }

  /**
   * Send email via Pipedream Proxy API (maintains threading support)
   */
  async sendEmail(userId, emailData) {
    const { to, subject, body, cc = [], bcc = [], replyTo = null } = emailData;
    
    try {
      // Get user's Gmail account (no credentials needed for proxy)
      const gmailAccount = await this.getGmailAccount(userId);
      
      // Generate a unique Message-ID for this email
      const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@${gmailAccount.name.split('@')[1]}>`;
      
      // Build email headers
      const headers = [
        `From: ${gmailAccount.name}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `Message-ID: ${messageId}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=UTF-8`,
        `Date: ${new Date().toUTCString()}`
      ];
      
      // Add CC/BCC if provided
      if (cc && cc.length > 0) {
        headers.push(`Cc: ${cc.join(',')}`);
      }
      if (bcc && bcc.length > 0) {
        headers.push(`Bcc: ${bcc.join(',')}`);
      }
      
      // Add threading headers if this is a reply
      if (replyTo && replyTo.includes('@') && replyTo.includes('<')) {
        headers.push(`In-Reply-To: ${replyTo}`);
        headers.push(`References: ${replyTo}`);
        console.log(`📧 Adding threading headers - In-Reply-To: ${replyTo}`);
      }
      
      // Build the raw email
      const rawEmail = [
        ...headers,
        '', // Empty line between headers and body
        body
      ].join('\r\n');
      
      // Encode to base64 (Gmail API format)
      const encodedEmail = Buffer.from(rawEmail)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      // Send via Pipedream Proxy
      const result = await this.sendEmailViaProxy(gmailAccount.id, userId, encodedEmail);
      
      console.log(`✅ Email sent successfully via Gmail Proxy API!`);
      
      return {
        success: true,
        messageId: result.id,
        threadId: result.threadId,
        from: gmailAccount.name,
        to,
        subject,
        sentAt: new Date().toISOString(),
        provider: "gmail-proxy",
        headers: {
          'Message-ID': messageId,
          'In-Reply-To': replyTo
        }
      };
      
    } catch (error) {
      console.error('❌ Gmail Proxy API error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        errors: error.errors
      });
      throw error;
    }
  }
} 
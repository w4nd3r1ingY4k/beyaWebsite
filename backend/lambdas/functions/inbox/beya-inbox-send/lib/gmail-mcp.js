import { createBackendClient } from "@pipedream/sdk";
import { GmailDirectClient } from "./gmail-direct.js";

/**
 * Direct Gmail MCP Email Sender
 * Sends emails via connected Gmail accounts using Pipedream MCP
 */
export class GmailMCPSender {
  constructor() {
    this.pd = createBackendClient({
      environment: process.env.PIPEDREAM_PROJECT_ENVIRONMENT || "production",
      credentials: {
        clientId: process.env.PIPEDREAM_CLIENT_ID,
        clientSecret: process.env.PIPEDREAM_CLIENT_SECRET,
      },
      projectId: process.env.PIPEDREAM_PROJECT_ID,
    });
    
    // Initialize direct Gmail client as well
    this.directClient = new GmailDirectClient();
  }

  /**
   * Check if user has connected Gmail account
   */
  async isGmailConnected(userId) {
    try {
      console.log(`🔍 Checking Gmail connection for userId: ${userId}`);
      console.log(`🔍 Using environment: ${process.env.PIPEDREAM_PROJECT_ENVIRONMENT}`);
      console.log(`🔍 Using project ID: ${process.env.PIPEDREAM_PROJECT_ID}`);
      
      const accounts = await this.pd.getAccounts({
        external_user_id: userId,
        app: "gmail",
      });
      
      console.log(`🔍 Raw accounts response:`, JSON.stringify(accounts, null, 2));
      const isConnected = accounts && Array.isArray(accounts.data) && accounts.data.length > 0;
      console.log(`🔍 Gmail connection result: ${isConnected}`);
      
      return isConnected;
    } catch (err) {
      console.error("❌ Error checking Gmail connection:", err);
      console.error("❌ Error details:", {
        message: err.message,
        stack: err.stack,
        response: err.response?.data
      });
      return false;
    }
  }

  /**
   * Get connected Gmail account info
   */
  async getGmailAccount(userId) {
    try {
      const accounts = await this.pd.getAccounts({
        external_user_id: userId,
        app: "gmail",
      });
      if (!accounts || !accounts.data || accounts.data.length === 0) {
        throw new Error("No Gmail connection found");
      }
      return accounts.data[0];
    } catch (err) {
      console.error("Error getting Gmail account:", err);
      throw err;
    }
  }

  /**
   * Send email directly via Gmail MCP tool using Pipedream SDK
   */
  async sendEmail(userId, emailData) {
    const { to, subject, body, cc = [], bcc = [], replyTo = null, threadId = null } = emailData;

    try {
      // Check if Gmail is connected
      const isConnected = await this.isGmailConnected(userId);
      if (!isConnected) {
        throw new Error("Gmail account not connected. Please connect your Gmail account first.");
      }

      // Get Gmail account
      const gmailAccount = await this.getGmailAccount(userId);
      console.log(`📧 Sending email via Gmail account:`, gmailAccount.name || gmailAccount.external_id);

      // Try direct Gmail API first to avoid threadId issues
      console.log(`🔧 Attempting Gmail send via direct API for user: ${userId}`);
      
      try {
        const directResult = await this.directClient.sendEmail(userId, {
          to,
          subject,
          body,
          cc,
          bcc,
          replyTo
        });
        
        console.log(`✅ Email sent successfully via direct Gmail API!`);
        return directResult;
        
      } catch (directError) {
        console.log(`⚠️ Direct Gmail API failed, falling back to Pipedream:`, directError.message);
        // Continue with Pipedream approach below
      }
      
      console.log(`🔧 Attempting Gmail send via Pipedream SDK for user: ${userId}`);
      
      // Use Pipedream SDK to execute the Gmail send action directly
      const actionParams = {
        to: to,
        subject: subject,
        body: body,
        bodyType: "html", // Default to HTML
      };

      // Add CC/BCC if provided
      if (cc && cc.length > 0) {
        actionParams.cc = cc.join(',');
        console.log(`📧 Adding CC recipients: ${actionParams.cc}`);
      }
      if (bcc && bcc.length > 0) {
        actionParams.bcc = bcc.join(',');
        console.log(`📧 Adding BCC recipients: ${actionParams.bcc}`);
      }

      // Add proper threading headers for email replies
      // NOTE: Pipedream Gmail action doesn't support inReplyTo parameter
      // Threading must be done via direct Gmail API
      if (replyTo && replyTo.includes('@') && replyTo.includes('<')) {
        console.log(`📧 Have valid Message-ID for threading: ${replyTo} (but Pipedream doesn't support it)`);
      } else {
        console.log(`⚠️ No valid Message-ID for threading: ${replyTo}`);
      }
      
      // Never add threadId - let Gmail handle threading automatically via references
      if (threadId) {
        console.log(`⚠️ Skipping threadId parameter to avoid Gmail API errors: ${threadId}`);
      }

      console.log(`📧 Gmail action params:`, actionParams);

      // Build final configuration - explicitly exclude threadId and threading params
      const finalConfig = {
        gmail: {
          authProvisionId: gmailAccount.id,
        },
        ...actionParams
      };
      
      // Remove problematic threading parameters
      delete finalConfig.threadId;
      delete finalConfig.references;
      delete finalConfig.inReplyTo;
      
      console.log(`📧 Final Gmail action config (no auto-threading):`, JSON.stringify(finalConfig, null, 2));

      // Execute the Gmail send action using Pipedream SDK
      const result = await this.pd.runAction({
        actionId: "gmail-send-email",
        configuredProps: finalConfig,
        externalUserId: userId,
      });

      console.log(`📧 Gmail action result:`, JSON.stringify(result, null, 2));

      if (result && (result.ret || result.exports)) {
        console.log(`✅ Gmail email sent successfully via Pipedream!`);
        
        const emailResponse = result.ret || result.exports;
        
        return {
          success: true,
          messageId: emailResponse.id || emailResponse.messageId || 'gmail-sent',
          threadId: emailResponse.threadId || threadId,
          from: gmailAccount.name || gmailAccount.external_id,
          to,
          subject,
          sentAt: new Date().toISOString(),
          provider: "gmail-pipedream",
          actionResult: result
        };
      }

      throw new Error(`Gmail action execution failed - no valid response`);

    } catch (error) {
      console.error("❌ Gmail Pipedream action failed:", error);
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Send reply email with proper threading
   */
  async sendReply(userId, replyData) {
    const { 
      originalMessageId, 
      threadId, 
      to, 
      subject, 
      body,
      cc = [],
      bcc = []
    } = replyData;

    // Ensure subject has "Re:" prefix if it's a reply
    const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;

    return this.sendEmail(userId, {
      to,
      subject: replySubject,
      body,
      cc,
      bcc,
      replyTo: originalMessageId,
      threadId
    });
  }
}

 
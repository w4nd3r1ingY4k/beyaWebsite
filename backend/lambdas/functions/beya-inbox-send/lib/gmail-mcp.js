import { createBackendClient } from "@pipedream/sdk";

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
    const { to, subject, body, replyTo = null, threadId = null } = emailData;

    try {
      // Check if Gmail is connected
      const isConnected = await this.isGmailConnected(userId);
      if (!isConnected) {
        throw new Error("Gmail account not connected. Please connect your Gmail account first.");
      }

      // Get Gmail account
      const gmailAccount = await this.getGmailAccount(userId);
      console.log(`📧 Sending email via Gmail account:`, gmailAccount.name || gmailAccount.external_id);

      console.log(`🔧 Attempting Gmail send via Pipedream SDK for user: ${userId}`);
      
      // Use Pipedream SDK to execute the Gmail send action directly
      const actionParams = {
        to: to,
        subject: subject,
        body: body,
        bodyType: "html", // Default to HTML
      };

      // Only add inReplyTo if it's a valid Message-ID (not a UUID fallback)
      if (replyTo && !replyTo.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // Use references field instead of inReplyTo to avoid Pipedream auto-threading issues
        actionParams.references = replyTo;
        console.log(`📧 Adding email references for threading: ${replyTo}`);
      } else if (replyTo) {
        console.log(`⚠️ Skipping UUID fallback replyTo: ${replyTo} - sending as new conversation`);
      }
      
      // Never add threadId - let Gmail handle threading automatically via references
      if (threadId) {
        console.log(`⚠️ Skipping threadId parameter to avoid Gmail API errors: ${threadId}`);
      }

      console.log(`📧 Gmail action params:`, actionParams);

      // Execute the Gmail send action using Pipedream SDK
      const result = await this.pd.runAction({
        actionId: "gmail-send-email",
        configuredProps: {
          gmail: {
            authProvisionId: gmailAccount.id,
          },
          ...actionParams
        },
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
      body 
    } = replyData;

    // Ensure subject has "Re:" prefix if it's a reply
    const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;

    return this.sendEmail(userId, {
      to,
      subject: replySubject,
      body,
      replyTo: originalMessageId,
      threadId
    });
  }
}

 
import { createBackendClient } from "@pipedream/sdk/server";

export class WhatsAppConnectService {
  constructor() {
    // Initialize Pipedream backend client
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
   * Create a WhatsApp Business Connect token & link URL
   */
  async getConnectUrl(userId, externalUserId = null) {
    try {
      const baseUrl = process.env.PIPEDREAM_BASE_URL || "http://localhost:3000";

      const result = await this.pd.createConnectToken({
        external_user_id: externalUserId || userId,
        allowed_origins: [baseUrl],
        success_redirect_uri: `${baseUrl}/integrations?connected=whatsapp`,
        error_redirect_uri: `${baseUrl}/integrations?error=whatsapp`,
      });

      return {
        token: result.token,
        expires_at: result.expires_at,
        connect_link_url: `${result.connect_link_url}?app=whatsapp_business`,
      };
    } catch (err) {
      console.error("Error creating WhatsApp Business connect token:", err);
      throw new Error(`Pipedream.createConnectToken failed: ${err.message}`);
    }
  }

  /**
   * Check if user has a connected WhatsApp Business account
   */
  async isConnected(userId, externalUserId = null) {
    try {
      const accounts = await this.pd.getAccounts({
        external_user_id: externalUserId || userId,
        app: "whatsapp_business",
        include_credentials: 1, // Include credentials to verify full access
      });
      return accounts && Array.isArray(accounts.data) && accounts.data.length > 0;
    } catch (err) {
      console.error("Error checking WhatsApp Business connection:", err);
      return false;
    }
  }

  /**
   * Get the (first) connected WhatsApp Business account info
   */
  async getAccountInfo(userId, externalUserId = null) {
    try {
      const accounts = await this.pd.getAccounts({
        external_user_id: externalUserId || userId,
        app: "whatsapp_business",
        include_credentials: 1, // Include credentials to get phone number from OAuth
      });
      if (!accounts || !accounts.data || accounts.data.length === 0) {
        throw new Error("No WhatsApp Business connection found");
      }
      const acct = accounts.data[0];
      return {
        id: acct.id,
        name: acct.name || "WhatsApp Business Account",
        phone: acct.credentials?.phone_number || acct.external_id || "Unknown",
        business_name: acct.credentials?.business_name || "Unknown Business",
        connected_at: acct.created_at,
        external_user_id: acct.external_user_id,
        app: acct.app,
      };
    } catch (err) {
      console.error("Error getting WhatsApp Business account info:", err);
      throw err;
    }
  }

  /**
   * Get connected WhatsApp Business credentials for API calls
   */
  async getCredentials(userId, externalUserId = null) {
    try {
      // First get the account list to get account IDs
      const accounts = await this.pd.getAccounts({
        external_user_id: externalUserId || userId,
        app: "whatsapp_business",
      });
      if (!accounts || !accounts.data || accounts.data.length === 0) {
        throw new Error("No WhatsApp Business connection found");
      }
      
      // Then fetch the specific account with credentials
      const accountId = accounts.data[0].id;
      const accountWithCredentials = await this.pd.makeAuthorizedRequest(`/accounts/${accountId}`, {
        method: "GET",
        params: {
          include_credentials: 1
        }
      });
      
      if (!accountWithCredentials?.data?.credentials) {
        throw new Error("No credentials found for WhatsApp Business account");
      }
      
      return accountWithCredentials.data.credentials;
    } catch (err) {
      console.error("Error getting WhatsApp Business credentials:", err);
      throw err;
    }
  }

  /**
   * Combined status + info
   */
  async getConnectionStatus(userId, externalUserId = null) {
    try {
      const connected = await this.isConnected(userId, externalUserId);
      if (!connected) {
        return { connected: false, account: null };
      }
      const account = await this.getAccountInfo(userId, externalUserId);
      return { connected: true, account };
    } catch (err) {
      console.error("Error getting WhatsApp Business connection status:", err);
      return { connected: false, account: null, error: err.message };
    }
  }
} 
import { createBackendClient } from "@pipedream/sdk/server";

export class GmailConnectService {
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
   * Create a Gmail Connect token & link URL
   */
  async getConnectUrl(userId, externalUserId = null) {
    try {
      const baseUrl = process.env.PIPEDREAM_BASE_URL || "http://localhost:3000";

      const result = await this.pd.createConnectToken({
        external_user_id: externalUserId || userId,
        allowed_origins: [baseUrl],
        success_redirect_uri: `${baseUrl}/integrations?connected=gmail`,
        error_redirect_uri: `${baseUrl}/integrations?error=gmail`,
      });

      return {
        token: result.token,
        expires_at: result.expires_at,
        connect_link_url: result.connect_link_url,
      };
    } catch (err) {
      console.error("Error creating Gmail connect token:", err);
      throw new Error(`Pipedream.createConnectToken failed: ${err.message}`);
    }
  }

  /**
   * Check if user has a connected Gmail account
   */
  async isConnected(userId, externalUserId = null) {
    try {
      const accounts = await this.pd.getAccounts({
        external_user_id: externalUserId || userId,
        app: "gmail",
        include_credentials: 1, // Include credentials to verify full access
      });
      return accounts && Array.isArray(accounts.data) && accounts.data.length > 0;
    } catch (err) {
      console.error("Error checking Gmail connection:", err);
      return false;
    }
  }

  /**
   * Get the (first) connected Gmail account info
   */
  async getAccountInfo(userId, externalUserId = null) {
    try {
      const accounts = await this.pd.getAccounts({
        external_user_id: externalUserId || userId,
        app: "gmail",
        include_credentials: 1, // Include credentials to get email from OAuth
      });
      if (!accounts || !accounts.data || accounts.data.length === 0) {
        throw new Error("No Gmail connection found");
      }
      const acct = accounts.data[0];
      return {
        id: acct.id,
        name: acct.name || "Gmail Account",
        email: acct.credentials?.email || acct.external_id || "Unknown",
        connected_at: acct.created_at,
        external_user_id: acct.external_user_id,
        app: acct.app,
      };
    } catch (err) {
      console.error("Error getting Gmail account info:", err);
      throw err;
    }
  }

  /**
   * Get connected Gmail credentials for API calls
   */
  async getCredentials(userId, externalUserId = null) {
    try {
      // First get the account list to get account IDs
      const accounts = await this.pd.getAccounts({
        external_user_id: externalUserId || userId,
        app: "gmail",
      });
      if (!accounts || !accounts.data || accounts.data.length === 0) {
        throw new Error("No Gmail connection found");
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
        throw new Error("No credentials found for Gmail account");
      }
      
      return accountWithCredentials.data.credentials;
    } catch (err) {
      console.error("Error getting Gmail credentials:", err);
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
      console.error("Error getting Gmail connection status:", err);
      return { connected: false, account: null, error: err.message };
    }
  }
} 
import { createBackendClient } from "@pipedream/sdk/server";

export class SquareConnectService {
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
   * Create a Square Connect token & link URL
   */
  async getConnectUrl(userId, externalUserId = null) {
    try {
      const baseUrl = process.env.PIPEDREAM_BASE_URL || "http://localhost:3000";
      const result = await this.pd.createConnectToken({
        external_user_id: externalUserId || userId,
        allowed_origins: [baseUrl],
        success_redirect_uri: `${baseUrl}/integrations?connected=square`,
        error_redirect_uri:   `${baseUrl}/integrations?error=square`,
      });
      return {
        token:            result.token,
        expires_at:       result.expires_at,
        connect_link_url: result.connect_link_url,
      };
    } catch (err) {
      console.error("Error creating Square connect token:", err);
      throw new Error(`Pipedream.createConnectToken failed: ${err.message}`);
    }
  }

  /**
   * Check if user has a connected Square account
   */
  async isConnected(userId, externalUserId = null) {
    try {
      const accounts = await this.pd.getAccounts({
        external_user_id: externalUserId || userId,
        app: "square",
      });
      return Array.isArray(accounts) && accounts.length > 0;
    } catch (err) {
      console.error("Error checking Square connection:", err);
      return false;
    }
  }

  /**
   * Get the (first) connected Square account info
   */
  async getAccountInfo(userId, externalUserId = null) {
    try {
      const accounts = await this.pd.getAccounts({
        external_user_id: externalUserId || userId,
        app: "square",
      });
      if (!accounts || accounts.length === 0) {
        throw new Error("No Square connection found");
      }
      const acct = accounts[0];
      return {
        id:               acct.id,
        name:             acct.name || "Square Account",
        connected_at:     acct.created_at,
        external_user_id: acct.external_user_id,
        app:              acct.app,
      };
    } catch (err) {
      console.error("Error getting Square account info:", err);
      throw err;
    }
  }

  /**
   * Disconnect all Square accounts for this user
   */
  async disconnect(userId, externalUserId = null) {
    try {
      const accounts = await this.pd.getAccounts({
        external_user_id: externalUserId || userId,
        app: "square",
      });
      if (!accounts || accounts.length === 0) {
        return { success: true, message: "No Square connection found" };
      }
      await Promise.all(accounts.map(a => this.pd.deleteAccount({ id: a.id })));
      return {
        success: true,
        message: `Disconnected ${accounts.length} Square account(s)`,
      };
    } catch (err) {
      console.error("Error disconnecting Square:", err);
      throw new Error("Failed to disconnect Square");
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
      console.error("Error getting Square connection status:", err);
      return { connected: false, account: null, error: err.message };
    }
  }
}
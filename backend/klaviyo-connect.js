import { createBackendClient } from "@pipedream/sdk";

export class KlaviyoConnectService {
  constructor() {
    this.pd = createBackendClient({
      environment: process.env.PIPEDREAM_PROJECT_ENVIRONMENT || "production",
      credentials: {
        clientId:     process.env.PIPEDREAM_CLIENT_ID,
        clientSecret: process.env.PIPEDREAM_CLIENT_SECRET,
      },
      projectId: process.env.PIPEDREAM_PROJECT_ID,
    });
  }

  /**
   * Create a Klaviyo Connect token & link URL
   */
  async getConnectUrl(userId, externalUserId = null) {
    try {
      const baseUrl = process.env.PIPEDREAM_BASE_URL || "http://localhost:3000";

      const result = await this.pd.createConnectToken({
        external_user_id: externalUserId || userId,
        allowed_origins: [baseUrl],
        success_redirect_uri: `${baseUrl}/integrations?connected=klaviyo`,
        error_redirect_uri:   `${baseUrl}/integrations?error=klaviyo`,
      });

      return {
        token:           result.token,
        expires_at:      result.expires_at,
        connect_link_url: result.connect_link_url,
      };
    } catch (err) {
      console.error("Error creating Klaviyo connect token:", err);
      throw new Error(`Pipedream.createConnectToken failed: ${err.message}`);
    }
  }

  /**
   * Check if user has a connected Klaviyo account
   */
  async isConnected(userId, externalUserId = null) {
    try {
      const accounts = await this.pd.getAccounts({
        external_user_id: externalUserId || userId,
        app: "klaviyo",
      });
      return Array.isArray(accounts) && accounts.length > 0;
    } catch (err) {
      console.error("Error checking Klaviyo connection:", err);
      return false;
    }
  }

  /**
   * Get the (first) connected Klaviyo account info
   */
  async getAccountInfo(userId, externalUserId = null) {
    try {
      const accounts = await this.pd.getAccounts({
        external_user_id: externalUserId || userId,
        app: "klaviyo",
      });
      if (!accounts || accounts.length === 0) {
        throw new Error("No Klaviyo connection found");
      }
      const acct = accounts[0];
      return {
        id:               acct.id,
        name:             acct.name || "Klaviyo Account",
        connected_at:     acct.created_at,
        external_user_id: acct.external_user_id,
        app:              acct.app,
      };
    } catch (err) {
      console.error("Error getting Klaviyo account info:", err);
      throw err;
    }
  }

  /**
   * Disconnect all Klaviyo accounts for this user
   */
  async disconnect(userId, externalUserId = null) {
    try {
      const accounts = await this.pd.getAccounts({
        external_user_id: externalUserId || userId,
        app: "klaviyo",
      });
      if (!accounts || accounts.length === 0) {
        return { success: true, message: "No Klaviyo connection found" };
      }
      await Promise.all(accounts.map(a => this.pd.deleteAccount({ id: a.id })));
      return {
        success: true,
        message: `Disconnected ${accounts.length} Klaviyo account(s)`,
      };
    } catch (err) {
      console.error("Error disconnecting Klaviyo:", err);
      throw new Error("Failed to disconnect Klaviyo");
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
      console.error("Error getting Klaviyo connection status:", err);
      return { connected: false, account: null, error: err.message };
    }
  }
}
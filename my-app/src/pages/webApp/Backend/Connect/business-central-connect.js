import { createBackendClient } from "@pipedream/sdk/server";

// Business Central Connect Service using Pipedream Connect
export class BusinessCentralConnectService {
  constructor() {
    // Initialize Pipedream backend client
    this.pd = createBackendClient({
      environment: process.env.PIPEDREAM_PROJECT_ENVIRONMENT || "production",
      credentials: {
        clientId: process.env.PIPEDREAM_CLIENT_ID,
        clientSecret: process.env.PIPEDREAM_CLIENT_SECRET,
      },
      projectId: process.env.PIPEDREAM_PROJECT_ID
    });
  }

  /**
   * Get Business Central Connect URL using Pipedream Connect
   */
  async getConnectUrl(userId, externalUserId = null) {
    try {
      console.log('Getting Business Central Connect URL for user:', userId);
  
      // Derive your base URL (where your React app lives)
      const baseUrl = process.env.PIPEDREAM_BASE_URL || 'http://localhost:3000';
  
      const result = await this.pd.createConnectToken({
        external_user_id: externalUserId || userId,
        // whitelist your frontend origin
        allowed_origins: [ baseUrl ],
        // (optional) full-page redirect fallback
        success_redirect_uri: `${baseUrl}/integrations?connected=business-central`,
        error_redirect_uri:   `${baseUrl}/integrations?error=business-central`,
      });
  
      console.log('✅ Pipedream createConnectToken result:', result);
      return {
        token:          result.token,
        expires_at:     result.expires_at,
        connect_link_url: result.connect_link_url,
      };
    } catch (err) {
      // Log the raw error so you see exactly why it failed
      console.error('Error creating connect token:', err);
      throw new Error(`Pipedream.createConnectToken failed: ${err.message}`);
    }
  }

  /**
   * Check if user has connected Business Central via Pipedream
   */
  async isConnected(userId, externalUserId = null) {
    try {
      console.log('Checking Business Central connection for user:', userId);
      
      const accounts = await this.pd.getAccounts({
        external_user_id: externalUserId || userId,
        app: "microsoft_dynamics_365_business_central"
      });

      const isConnected = accounts && accounts.length > 0;
      console.log('Business Central connection status:', isConnected);
      return isConnected;
    } catch (error) {
      console.error('Error checking Business Central connection:', error);
      return false;
    }
  }

  /**
   * Get Business Central account information for connected user
   */
  async getAccountInfo(userId, externalUserId = null) {
    try {
      console.log('Getting Business Central account info for user:', userId);
      
      const accounts = await this.pd.getAccounts({
        external_user_id: externalUserId || userId,
        app: "microsoft_dynamics_365_business_central"
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No Business Central connection found');
      }

      // Return the first connected account
      const account = accounts[0];
      return {
        id: account.id,
        name: account.name || 'Business Central Account',
        connected_at: account.created_at,
        external_user_id: account.external_user_id,
        app: account.app
      };
    } catch (error) {
      console.error('Error getting Business Central account info:', error);
      throw error;
    }
  }

  /**
   * Disconnect Business Central for a user
   */
  async disconnect(userId, externalUserId = null) {
    try {
      console.log('Disconnecting Business Central for user:', userId);
      
      const accounts = await this.pd.getAccounts({
        external_user_id: externalUserId || userId,
        app: "dynamics_365_business_central_api"
      });

      if (!accounts || accounts.length === 0) {
        console.log('No Business Central connection found to disconnect');
        return { success: true, message: 'No connection found' };
      }

      // Disconnect all Business Central accounts for this user
      const disconnectPromises = accounts.map(account => 
        this.pd.deleteAccount({ id: account.id })
      );

      await Promise.all(disconnectPromises);
      
      console.log(`Successfully disconnected ${accounts.length} Business Central connection(s) for user: ${userId}`);
      return { 
        success: true, 
        message: `Disconnected ${accounts.length} Business Central account(s)` 
      };
    } catch (error) {
      console.error('Error disconnecting Business Central:', error);
      throw new Error('Failed to disconnect Business Central');
    }
  }

  /**
   * Get Business Central connection status and account details
   */
  async getConnectionStatus(userId, externalUserId = null) {
    try {
      const isConnected = await this.isConnected(userId, externalUserId);
      
      if (!isConnected) {
        return {
          connected: false,
          account: null
        };
      }

      const accountInfo = await this.getAccountInfo(userId, externalUserId);
      
      return {
        connected: true,
        account: accountInfo
      };
    } catch (error) {
      console.error('Error getting Business Central connection status:', error);
      return {
        connected: false,
        account: null,
        error: error.message
      };
    }
  }
} 
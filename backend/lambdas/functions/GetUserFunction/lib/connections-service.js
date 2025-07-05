/**
 * Connections Service - Fetches connected accounts from Pipedream using OAuth client credentials
 */
class ConnectionsService {
  constructor() {
    this.clientId = process.env.PIPEDREAM_CLIENT_ID;
    this.clientSecret = process.env.PIPEDREAM_CLIENT_SECRET;
    this.projectId = process.env.PIPEDREAM_PROJECT_ID;
    this.environment = process.env.PIPEDREAM_PROJECT_ENVIRONMENT || "production";
  }

  /**
   * Get OAuth access token using client credentials
   */
  async getAccessToken() {
    try {
      const response = await fetch('https://api.pipedream.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.status}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (err) {
      console.error('[ConnectionsService] Error getting access token:', err);
      throw err;
    }
  }

  /**
   * Get all connected accounts from Pipedream Connect API
   */
  async getAllConnectedAccounts(userId) {
    try {
      console.log(`[ConnectionsService] Getting all connected accounts for userId: ${userId}`);
      
      if (!this.clientId || !this.clientSecret || !this.projectId) {
        console.error('[ConnectionsService] Pipedream credentials not configured');
        return {
          connections: {
            gmail: { connected: false, accounts: [] },
            whatsapp: { connected: false, accounts: [] },
            shopify: { connected: false, accounts: [] },
            square: { connected: false, accounts: [] },
            klaviyo: { connected: false, accounts: [] }
          },
          summary: {
            totalConnections: 0,
            connectedIntegrations: []
          }
        };
      }

      // Get OAuth access token
      const accessToken = await this.getAccessToken();
      
      // Fetch all connected accounts
      const url = `https://api.pipedream.com/v1/connect/${this.projectId}/accounts`;
      
      console.log(`[ConnectionsService] Querying URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-PD-Environment': this.environment,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`[ConnectionsService] Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ConnectionsService] API error:`, response.status, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log(`[ConnectionsService] Response data:`, JSON.stringify(data, null, 2));
      
      // Process and categorize accounts
      const accounts = data.data || [];
      const connections = {
        gmail: { connected: false, accounts: [] },
        whatsapp: { connected: false, accounts: [] },
        shopify: { connected: false, accounts: [] },
        square: { connected: false, accounts: [] },
        klaviyo: { connected: false, accounts: [] }
      };

      // Filter accounts by user if userId is provided
      const userAccounts = userId ? 
        accounts.filter(account => account.external_id === userId) : 
        accounts;

      // Categorize accounts by app type
      userAccounts.forEach(account => {
        const appSlug = account.app?.name_slug;
        let category = null;

        switch (appSlug) {
          case 'gmail':
            category = 'gmail';
            break;
          case 'whatsapp_business':
            category = 'whatsapp';
            break;
          case 'shopify':
            category = 'shopify';
            break;
          case 'square':
            category = 'square';
            break;
          case 'klaviyo':
            category = 'klaviyo';
            break;
        }

        if (category && connections[category]) {
          connections[category].connected = true;
          connections[category].accounts.push({
            id: account.id,
            name: account.name || account.external_id,
            email: account.name, // For Gmail, name is usually the email
            status: account.healthy ? 'active' : 'inactive',
            createdAt: account.created_at,
            updatedAt: account.updated_at,
            appName: account.app?.name || appSlug
          });
        }
      });

      // Calculate summary
      const connectedIntegrations = Object.entries(connections)
        .filter(([_, conn]) => conn.connected)
        .map(([name, _]) => name);

      const result = {
        connections,
        summary: {
          totalConnections: connectedIntegrations.length,
          connectedIntegrations,
          totalAccounts: userAccounts.length
        }
      };

      console.log(`[ConnectionsService] Final result:`, JSON.stringify(result, null, 2));
      return result;
      
    } catch (err) {
      console.error(`❌ [ConnectionsService] Error getting all connected accounts:`, err);
      throw err;
    }
  }

  /**
   * Get connected accounts for a specific app and user
   */
  async getConnectedAccounts(userId, app) {
    try {
      const allConnections = await this.getAllConnectedAccounts(userId);
      const appConnections = allConnections.connections[app];
      return appConnections ? appConnections.accounts : [];
    } catch (err) {
      console.error(`❌ [ConnectionsService] Error getting ${app} accounts:`, err);
      return [];
    }
  }

  /**
   * Check if a specific app is connected
   */
  async isAppConnected(userId, app) {
    try {
      const accounts = await this.getConnectedAccounts(userId, app);
      return accounts.length > 0;
    } catch (err) {
      console.error(`❌ [ConnectionsService] Error checking ${app} connection:`, err);
      return false;
    }
  }
}

module.exports = { ConnectionsService }; 
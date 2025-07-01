import { createBackendClient } from "@pipedream/sdk";

// Backend service to generate Connect tokens for Shopify
export class ShopifyConnectService {
  static async createConnectToken(userId) {
    if (!userId) {
      throw new Error('userId is required');
    }

    try {
      // Initialize Pipedream backend client
      const pd = createBackendClient({
        environment: "production",
        credentials: {
          clientId: process.env.PIPEDREAM_CLIENT_ID,
          clientSecret: process.env.PIPEDREAM_CLIENT_SECRET,
        },
        projectId: process.env.PIPEDREAM_PROJECT_ID
      });

      // Create a token for the specific user
      const { token, expires_at, connect_link_url } = await pd.createConnectToken({
        external_user_id: userId,
        // Optional: Add success/error redirect URLs
        // success_redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/integrations/shopify/success`,
        // error_redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/integrations/shopify/error`,
      });

      return {
        success: true,
        token,
        expires_at,
        connect_link_url: `${connect_link_url}?app=shopify` // Add Shopify app parameter
      };

    } catch (error) {
      console.error('Error creating Pipedream Connect token:', error);
      throw new Error(`Failed to create Connect token: ${error.message}`);
    }
  }

  static async getConnectedAccounts(userId) {
    try {
      const pd = createBackendClient({
        environment: "production",
        credentials: {
          clientId: process.env.PIPEDREAM_CLIENT_ID,
          clientSecret: process.env.PIPEDREAM_CLIENT_SECRET,
        },
        projectId: process.env.PIPEDREAM_PROJECT_ID
      });

      // Get user's connected accounts
      const accounts = await pd.getAccounts({
        external_user_id: userId,
        app: 'shopify'
      });

      return accounts;

    } catch (error) {
      console.error('Error getting connected accounts:', error);
      throw new Error(`Failed to get connected accounts: ${error.message}`);
    }
  }
}

// API handler function for if you want to expose this as an endpoint
export async function handleShopifyConnect(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, action } = req.body;

  try {
    if (action === 'create_token') {
      const result = await ShopifyConnectService.createConnectToken(userId);
      return res.status(200).json(result);
    } else if (action === 'get_accounts') {
      const accounts = await ShopifyConnectService.getConnectedAccounts(userId);
      return res.status(200).json({ success: true, accounts });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    return res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
} 
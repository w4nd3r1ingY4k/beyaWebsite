import dotenv from 'dotenv';
import { ShopifyConnectService } from './shopify-connect.js';
import { BusinessCentralConnectService } from './business-central-connect.js';
import { KlaviyoConnectService } from './klaviyo-connect.js';
import { SquareConnectService } from './square-connect.js';

// Load environment variables
dotenv.config({ path: "./.env" });

export async function handleShopifyConnect(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, action } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    if (action === 'create_token') {
      const result = await ShopifyConnectService.createConnectToken(userId);
      return res.status(200).json(result);
    } else if (action === 'get_accounts') {
      const accounts = await ShopifyConnectService.getConnectedAccounts(userId);
      return res.status(200).json({ success: true, accounts });
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "create_token" or "get_accounts"' });
    }
  } catch (error) {
    console.error('Shopify Connect API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

export async function handleBusinessCentralConnect(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, action } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    if (!process.env.PIPEDREAM_CLIENT_ID || !process.env.PIPEDREAM_CLIENT_SECRET || !process.env.PIPEDREAM_PROJECT_ID) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Pipedream credentials not configured. Please set PIPEDREAM_CLIENT_ID, PIPEDREAM_CLIENT_SECRET, and PIPEDREAM_PROJECT_ID environment variables.'
      });
    }

    const bcService = new BusinessCentralConnectService();

    if (action === 'create_token') {
      const result = await bcService.getConnectUrl(userId);
      return res.status(200).json(result);
    } else if (action === 'get_accounts') {
      const isConnected = await bcService.isConnected(userId);
      const accounts = isConnected ? await bcService.getAccountInfo(userId) : [];
      return res.status(200).json({ success: true, accounts });
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "create_token" or "get_accounts"' });
    }
  } catch (error) {
    console.error('Business Central Connect API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

// === New Klaviyo handler ===
export async function handleKlaviyoConnect(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, action } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    if (!process.env.PIPEDREAM_CLIENT_ID || !process.env.PIPEDREAM_CLIENT_SECRET || !process.env.PIPEDREAM_PROJECT_ID) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Pipedream credentials not configured. Please set PIPEDREAM_CLIENT_ID, PIPEDREAM_CLIENT_SECRET, and PIPEDREAM_PROJECT_ID environment variables.'
      });
    }

    const klaviyoService = new KlaviyoConnectService();

    if (action === 'create_token') {
      const result = await klaviyoService.getConnectUrl(userId);
      return res.status(200).json(result);
    } else if (action === 'get_accounts') {
      const isConnected = await klaviyoService.isConnected(userId);
      const accounts = isConnected
        ? await klaviyoService.getAccountInfo(userId)
        : [];
      return res.status(200).json({ success: true, accounts });
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "create_token" or "get_accounts"' });
    }
  } catch (error) {
    console.error('Klaviyo Connect API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

export async function handleSquareConnect(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, action } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Ensure Pipedream creds are configured
    if (
      !process.env.PIPEDREAM_CLIENT_ID ||
      !process.env.PIPEDREAM_CLIENT_SECRET ||
      !process.env.PIPEDREAM_PROJECT_ID
    ) {
      return res.status(500).json({
        error: 'Server configuration error',
        message:
          'Pipedream credentials not configured. Please set PIPEDREAM_CLIENT_ID, PIPEDREAM_CLIENT_SECRET, and PIPEDREAM_PROJECT_ID environment variables.',
      });
    }

    const sqService = new SquareConnectService();

    if (action === 'create_token') {
      const result = await sqService.getConnectUrl(userId);
      return res.status(200).json(result);
    }
    else if (action === 'get_accounts') {
      const isConnected = await sqService.isConnected(userId);
      const accounts = isConnected
        ? await sqService.getAccountInfo(userId)
        : [];
      return res.status(200).json({ success: true, accounts });
    } else {
      return res
        .status(400)
        .json({ error: 'Invalid action. Use "create_token" or "get_accounts"' });
    }
  } catch (error) {
    console.error('Square Connect API error:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error', message: error.message });
  }
}
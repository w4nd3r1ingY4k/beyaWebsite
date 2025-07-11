// openwa-service.js
// OpenWA WhatsApp Web Integration Service

import { create } from '@open-wa/wa-automate';
import AWS from 'aws-sdk';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const eventBridge = new AWS.EventBridge({
  region: process.env.AWS_REGION || 'us-east-1'
});

/**
 * OpenWA Service - Bridges WhatsApp Web automation with Beya infrastructure
 */
export class OpenWAService {
  constructor() {
    this.client = null;
    this.sessions = new Map(); // userId -> WhatsApp session
    this.sessionTable = process.env.OPENWA_SESSIONS_TABLE || 'beya-openwa-sessions';
    this.messageWebhookUrl = process.env.MESSAGE_WEBHOOK_URL || 'https://22y6e3kow4ozzkerpbd6shyxoi0hbcxx.lambda-url.us-east-1.on.aws/';
    this.isInitialized = false;
  }

  /**
   * Initialize OpenWA service
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing OpenWA service...');
    
    // Load existing sessions from database
    await this.loadExistingSessions();
    
    this.isInitialized = true;
    console.log('✅ OpenWA service initialized');
  }

  /**
   * Create a new WhatsApp Web session for a user
   * @param {string} userId - User ID
   * @param {Object} options - Session options
   * @returns {Object} Session details including QR code
   */
  async createSession(userId, options = {}) {
    console.log(`📱 Creating OpenWA session for user ${userId}`);
    
    try {
      // Check if user already has a session
      if (this.sessions.has(userId)) {
        console.log(`⚠️ Session already exists for user ${userId}`);
        return {
          success: false,
          error: 'Session already exists. Please disconnect first.'
        };
      }

      // Create OpenWA client with custom session ID
      const sessionId = `beya-${userId}-${Date.now()}`;
      
      const client = await create({
        sessionId,
        multiDevice: true, // Support for multi-device
        authTimeout: 120, // 2 minutes for QR code scanning
        qrTimeout: 120,
        blockCrashLogs: true,
        disableSpins: true,
        headless: true, // Run in headless mode
        qrLogSkip: true,
        logConsole: false,
        deleteSessionDataOnLogout: true,
        // Custom user agent to appear more like regular WhatsApp Web
        useChrome: true,
        chromiumArgs: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ],
        // Event handlers
        qrCallback: async (qr) => {
          console.log(`📱 QR Code generated for user ${userId}`);
          await this.handleQRCode(userId, qr);
        },
        ...options
      });

      // Set up message listeners
      this.setupMessageListeners(client, userId);

      // Store session
      this.sessions.set(userId, {
        client,
        sessionId,
        status: 'pending_auth',
        createdAt: new Date().toISOString()
      });

      // Save session info to database
      await this.saveSessionToDatabase(userId, sessionId, 'pending_auth');

      // Wait for QR code
      const qr = await client.getQRCode();

      return {
        success: true,
        sessionId,
        qrCode: qr,
        status: 'pending_auth',
        message: 'Please scan the QR code with WhatsApp'
      };

    } catch (error) {
      console.error(`❌ Error creating OpenWA session for user ${userId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Set up message listeners for a WhatsApp client
   */
  setupMessageListeners(client, userId) {
    // Listen for incoming messages
    client.onMessage(async (message) => {
      console.log(`📨 New message for user ${userId}:`, message.from, message.body);
      await this.handleIncomingMessage(userId, message);
    });

    // Listen for connection state changes
    client.onStateChanged((state) => {
      console.log(`📱 WhatsApp state changed for user ${userId}:`, state);
      this.updateSessionStatus(userId, state);
    });

    // Listen for incoming calls
    client.onIncomingCall(async (call) => {
      console.log(`📞 Incoming call for user ${userId}:`, call);
      // Auto-reject calls or notify user
      await client.sendText(call.peerJid, 'Sorry, calls are not supported. Please send a message instead.');
    });
  }

  /**
   * Handle incoming WhatsApp message
   */
  async handleIncomingMessage(userId, message) {
    try {
      const {
        from,
        to,
        body,
        timestamp,
        id: messageId,
        type,
        isGroupMsg,
        chat,
        sender
      } = message;

      // Skip group messages for now
      if (isGroupMsg) {
        console.log(`⏭️ Skipping group message for user ${userId}`);
        return;
      }

      // Normalize phone numbers
      const fromNumber = from.replace('@c.us', '');
      const toNumber = to.replace('@c.us', '');

      // Format message for our webhook (similar to WhatsApp Business API format)
      const webhookPayload = {
        userId,
        serviceType: 'whatsapp-web',
        source: 'openwa',
        entry: [{
          id: uuidv4(),
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: toNumber,
                phone_number_id: `openwa_${userId}`
              },
              messages: [{
                from: fromNumber,
                id: messageId,
                timestamp: Math.floor(timestamp / 1000).toString(),
                type: 'text',
                text: {
                  body: body
                }
              }]
            }
          }]
        }]
      };

      // Send to our standard WhatsApp receive webhook
      const response = await fetch(this.messageWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
          'X-Source': 'openwa',
          'X-Service-Type': 'whatsapp-web'
        },
        body: JSON.stringify(webhookPayload)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }

      console.log(`✅ Message forwarded to webhook for user ${userId}`);

      // Emit event to EventBridge
      await this.emitMessageEvent(userId, 'whatsapp.received', {
        messageId,
        from: fromNumber,
        to: toNumber,
        body,
        timestamp: new Date(timestamp).toISOString(),
        provider: 'openwa'
      });

    } catch (error) {
      console.error(`❌ Error handling incoming message for user ${userId}:`, error);
    }
  }

  /**
   * Send a WhatsApp message
   */
  async sendMessage(userId, to, content, options = {}) {
    try {
      const session = this.sessions.get(userId);
      if (!session || session.status !== 'authenticated') {
        throw new Error('No active WhatsApp session found');
      }

      const { client } = session;
      
      // Format phone number for WhatsApp
      const chatId = to.includes('@') ? to : `${to.replace(/\D/g, '')}@c.us`;

      let result;
      if (options.type === 'template') {
        // OpenWA doesn't support templates - send as regular message
        result = await client.sendText(chatId, content);
      } else if (options.media) {
        // Send media message
        result = await client.sendImage(
          chatId,
          options.media.url || options.media.base64,
          options.media.filename || 'image.jpg',
          content
        );
      } else {
        // Send text message
        result = await client.sendText(chatId, content);
      }

      console.log(`✅ Message sent via OpenWA for user ${userId}`);

      // Emit event to EventBridge
      await this.emitMessageEvent(userId, 'whatsapp.sent', {
        messageId: result.id || uuidv4(),
        to: to.replace(/\D/g, ''),
        body: content,
        timestamp: new Date().toISOString(),
        provider: 'openwa'
      });

      return {
        success: true,
        messageId: result.id || result,
        provider: 'openwa'
      };

    } catch (error) {
      console.error(`❌ Error sending message via OpenWA for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get session status
   */
  async getSessionStatus(userId) {
    const session = this.sessions.get(userId);
    if (!session) {
      return {
        connected: false,
        status: 'not_found'
      };
    }

    try {
      const { client, status } = session;
      const connectionState = await client.getConnectionState();
      
      return {
        connected: connectionState === 'CONNECTED',
        status,
        connectionState,
        sessionId: session.sessionId,
        createdAt: session.createdAt
      };
    } catch (error) {
      return {
        connected: false,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Disconnect a session
   */
  async disconnectSession(userId) {
    try {
      const session = this.sessions.get(userId);
      if (!session) {
        return { success: true, message: 'No session found' };
      }

      const { client } = session;
      await client.logout();
      
      this.sessions.delete(userId);
      await this.removeSessionFromDatabase(userId);

      console.log(`✅ OpenWA session disconnected for user ${userId}`);

      return {
        success: true,
        message: 'WhatsApp session disconnected successfully'
      };

    } catch (error) {
      console.error(`❌ Error disconnecting OpenWA session for user ${userId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle QR code generation
   */
  async handleQRCode(userId, qr) {
    // Store QR code in database or send to frontend via WebSocket
    await dynamodb.update({
      TableName: this.sessionTable,
      Key: { userId },
      UpdateExpression: 'SET qrCode = :qr, qrGeneratedAt = :timestamp',
      ExpressionAttributeValues: {
        ':qr': qr,
        ':timestamp': new Date().toISOString()
      }
    }).promise();

    // TODO: Emit QR code event to frontend via WebSocket
    console.log(`📱 QR code stored for user ${userId}`);
  }

  /**
   * Update session status
   */
  async updateSessionStatus(userId, state) {
    const session = this.sessions.get(userId);
    if (!session) return;

    let status = 'unknown';
    switch (state) {
      case 'CONNECTED':
        status = 'authenticated';
        break;
      case 'OPENING':
      case 'PAIRING':
        status = 'pending_auth';
        break;
      case 'TIMEOUT':
        status = 'timeout';
        break;
      case 'CONFLICT':
      case 'UNLAUNCHED':
      case 'PROXYBLOCK':
        status = 'error';
        break;
    }

    session.status = status;
    await this.saveSessionToDatabase(userId, session.sessionId, status);
  }

  /**
   * Load existing sessions from database
   */
  async loadExistingSessions() {
    try {
      const result = await dynamodb.scan({
        TableName: this.sessionTable,
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': 'authenticated'
        }
      }).promise();

      console.log(`📱 Found ${result.Items.length} existing OpenWA sessions to restore`);

      // TODO: Implement session restoration
      // This would require saving session data and restoring it

    } catch (error) {
      console.error('❌ Error loading existing sessions:', error);
    }
  }

  /**
   * Save session to database
   */
  async saveSessionToDatabase(userId, sessionId, status) {
    await dynamodb.put({
      TableName: this.sessionTable,
      Item: {
        userId,
        sessionId,
        status,
        provider: 'openwa',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }).promise();
  }

  /**
   * Remove session from database
   */
  async removeSessionFromDatabase(userId) {
    await dynamodb.delete({
      TableName: this.sessionTable,
      Key: { userId }
    }).promise();
  }

  /**
   * Emit message event to EventBridge
   */
  async emitMessageEvent(userId, eventType, data) {
    try {
      await eventBridge.putEvents({
        Entries: [{
          Source: 'beya-openwa',
          DetailType: eventType,
          Detail: JSON.stringify({
            userId,
            timestamp: new Date().toISOString(),
            ...data
          })
        }]
      }).promise();
    } catch (error) {
      console.error('❌ Error emitting event to EventBridge:', error);
    }
  }
}

// Export singleton instance
export const openWAService = new OpenWAService(); 
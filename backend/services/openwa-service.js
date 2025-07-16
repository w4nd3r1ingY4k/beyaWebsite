// openwa-service.js
// OpenWA WhatsApp Web Integration Service

const { create, Client } = require('@open-wa/wa-automate');
const QRCode = require('qrcode-terminal');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const FLOWS_TABLE = 'Flows';
const MESSAGES_TABLE = 'Messages';

class OpenWAService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.userId = null;
    this.sessionData = null;
  }

  async startSession(userId) {
    try {
      this.userId = userId;
      console.log(`Starting OpenWA session for user: ${userId}`);

      // Create OpenWA client with configuration
      this.client = await create({
        sessionId: `beya-${userId}`,
        multiDevice: true,
        authTimeout: 60,
        blockCrashLogs: true,
        disableSpins: true,
        headless: true,
        hostNotificationLang: 'PT_BR',
        logConsole: false,
        popup: false,
        qrTimeout: 0,
        restartOnCrash: true,
        throwErrorOnTosBlock: false,
        useChrome: true,
        killProcessOnBrowserClose: true,
        onLoadingScreen: () => {
          console.log('Loading WhatsApp Web...');
        },
        qrLogSkip: false,
        qrCallback: (qr) => {
          console.log('QR Code for WhatsApp Web:');
          QRCode.generate(qr, { small: true });
          
          // Store QR code for frontend to display
          this.sessionData = {
            qrCode: qr,
            status: 'waiting_for_scan',
            timestamp: Date.now()
          };
        }
      });

      // Set up event listeners
      this.setupEventListeners();

      console.log('OpenWA client created successfully');
      return { success: true, message: 'Session started. Please scan QR code.' };

    } catch (error) {
      console.error('Error starting OpenWA session:', error);
      return { success: false, error: error.message };
    }
  }

  setupEventListeners() {
    if (!this.client) return;

    // Handle incoming messages
    this.client.onMessage(async (message) => {
      try {
        await this.handleIncomingMessage(message);
      } catch (error) {
        console.error('Error handling incoming message:', error);
      }
    });

    // Handle connection state changes
    this.client.onStateChanged((state) => {
      console.log('WhatsApp state changed:', state);
      
      if (state === 'CONNECTED') {
        this.isConnected = true;
        this.sessionData = {
          status: 'connected',
          timestamp: Date.now()
        };
        console.log('WhatsApp connected successfully!');
      } else if (state === 'DISCONNECTED') {
        this.isConnected = false;
        this.sessionData = {
          status: 'disconnected',
          timestamp: Date.now()
        };
        console.log('WhatsApp disconnected');
      }
    });

    // Handle authentication success
    this.client.onAuth(() => {
      console.log('WhatsApp authenticated successfully');
      this.sessionData = {
        status: 'authenticated',
        timestamp: Date.now()
      };
    });
  }

  async handleIncomingMessage(message) {
    try {
      console.log('Received WhatsApp message:', message);

      const phoneNumber = message.from.replace('@c.us', '');
      const messageBody = message.body || '';
      const timestamp = Date.now();
      const messageId = message.id;

      // Create or get flow for this contact
      const flowId = await this.getOrCreateFlow(phoneNumber, messageBody);

      // Save message to Messages table
      await docClient.send(new PutCommand({
        TableName: MESSAGES_TABLE,
        Item: {
          ThreadId: flowId,
          Timestamp: timestamp,
          MessageId: messageId,
          Channel: 'whatsapp',
          Direction: 'incoming',
          Body: messageBody,
          userId: this.userId,
          ThreadIdTimestamp: `${flowId}#${timestamp}`,
          IsUnread: true,
          // OpenWA specific fields
          FromNumber: phoneNumber,
          MessageType: message.type || 'text',
          ...(message.quotedMsgId && { QuotedMessageId: message.quotedMsgId })
        }
      }));

      console.log(`Message saved: ${messageId} from ${phoneNumber}`);

    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  }

  async getOrCreateFlow(phoneNumber, firstMessage) {
    try {
      // Check if flow already exists
      const existingFlow = await docClient.send(new GetCommand({
        TableName: FLOWS_TABLE,
        Key: {
          userId: this.userId,
          ContactIdentifier: phoneNumber
        }
      }));

      if (existingFlow.Item) {
        // Update existing flow
        await docClient.send(new UpdateCommand({
          TableName: FLOWS_TABLE,
          Key: {
            userId: this.userId,
            ContactIdentifier: phoneNumber
          },
          UpdateExpression: 'SET lastMessageAt = :timestamp, lastMessage = :message',
          ExpressionAttributeValues: {
            ':timestamp': Date.now(),
            ':message': firstMessage
          }
        }));
        return existingFlow.Item.FlowId;
      } else {
        // Create new flow
        const flowId = uuidv4();
        await docClient.send(new PutCommand({
          TableName: FLOWS_TABLE,
          Item: {
            userId: this.userId,
            ContactIdentifier: phoneNumber,
            FlowId: flowId,
            Channel: 'whatsapp',
            lastMessageAt: Date.now(),
            lastMessage: firstMessage,
            createdAt: Date.now()
          }
        }));
        return flowId;
      }
    } catch (error) {
      console.error('Error getting/creating flow:', error);
      throw error;
    }
  }

  async sendMessage(phoneNumber, message) {
    try {
      if (!this.client || !this.isConnected) {
        throw new Error('WhatsApp not connected');
      }

      const chatId = `${phoneNumber}@c.us`;
      const result = await this.client.sendText(chatId, message);
      
      console.log('Message sent successfully:', result);
      return { success: true, messageId: result };

    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  }

  getSessionStatus() {
    return {
      isConnected: this.isConnected,
      sessionData: this.sessionData,
      userId: this.userId
    };
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.kill();
        this.client = null;
      }
      this.isConnected = false;
      this.sessionData = null;
      console.log('OpenWA session disconnected');
    } catch (error) {
      console.error('Error disconnecting OpenWA:', error);
    }
  }
}

// Singleton instance
let openWAInstance = null;

function getOpenWAInstance() {
  if (!openWAInstance) {
    openWAInstance = new OpenWAService();
  }
  return openWAInstance;
}

module.exports = {
  OpenWAService,
  getOpenWAInstance
}; 
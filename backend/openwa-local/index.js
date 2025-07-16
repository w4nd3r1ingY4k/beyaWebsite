const express = require('express');
const cors = require('cors');
const { create } = require('@open-wa/wa-automate');
const QRCode = require('qrcode-terminal');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const FLOWS_TABLE = 'Flows';
const MESSAGES_TABLE = 'Messages';
const PORT = process.env.PORT || 3001;

// Store active sessions
const activeSessions = new Map();

// Function to spawn a new terminal window with QR code
function spawnQRTerminal(qrCode, userId) {
  // Create a temporary script file that displays the QR code
  const scriptPath = path.join(__dirname, `qr-display-${userId}.js`);
  
  const scriptContent = `
const QRCode = require('qrcode-terminal');

console.clear();
console.log('\\n🚀 Beya WhatsApp Integration');
console.log('=' .repeat(50));
console.log('📱 Scan this QR code with your WhatsApp mobile app');
console.log('📱 Go to WhatsApp > Menu > Linked devices > Link a device');
console.log('=' .repeat(50));

QRCode.generate('${qrCode}', { small: true });

console.log('=' .repeat(50));
console.log('✅ After scanning, you can close this window');
console.log('🔄 Connection status will update in your main app');
console.log('=' .repeat(50));

// Keep the terminal open
process.stdin.resume();
`;

  // Write the script file
  fs.writeFileSync(scriptPath, scriptContent);

  // Spawn a new Terminal window on macOS
  const terminal = spawn('osascript', [
    '-e',
    `tell application "Terminal"
      activate
      do script "cd ${__dirname} && node qr-display-${userId}.js"
    end tell`
  ]);

  terminal.on('error', (error) => {
    console.error('❌ Failed to spawn terminal:', error);
    // Fallback to console display
    console.log('\\n📱 QR Code for WhatsApp Web:');
    console.log('=' .repeat(50));
    QRCode.generate(qrCode, { small: true });
    console.log('=' .repeat(50));
  });

  // Clean up script file after 5 minutes
  setTimeout(() => {
    try {
      fs.unlinkSync(scriptPath);
    } catch (err) {
      // Ignore cleanup errors
    }
  }, 5 * 60 * 1000);
}

class LocalOpenWAService {
  constructor(userId) {
    this.client = null;
    this.isConnected = false;
    this.userId = userId;
    this.sessionData = null;
  }

  async startSession() {
    try {
      // Check if session already exists for this user
      if (this.client) {
        if (this.isConnected) {
          return { 
            success: false, 
            error: 'Session already active for this user' 
          };
        }
      }

      console.log(`🚀 Starting OpenWA session for user: ${this.userId}`);

      // Create OpenWA client with user-specific configuration
      this.client = await create({
        sessionId: `beya-${this.userId}`,
        headless: true,
        qrLogSkip: false, // Show QR in terminal
        authTimeout: 60,
        qrTimeout: 0,
        browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        userDataDir: `/tmp/beya-openwa-profile-${this.userId}`, // User-specific profile
        qrCallback: (qr) => {
          console.log(`\n📱 QR Code for WhatsApp Web (User: ${this.userId}):`);
          console.log('=' .repeat(50));
          QRCode.generate(qr, { small: true });
          console.log('=' .repeat(50));
          console.log('📱 Scan this QR code with your WhatsApp mobile app');
          console.log('📱 Go to WhatsApp > Menu > Linked devices > Link a device');
          console.log('=' .repeat(50));
          
          // Store QR code for any API calls
          this.sessionData = {
            qrCode: qr,
            status: 'waiting_for_scan',
            timestamp: Date.now()
          };
        }
      });

      // Set up event listeners
      this.setupEventListeners();

      console.log(`✅ OpenWA client created successfully for user: ${this.userId}`);
      return { success: true, message: 'Session started. Please scan QR code.' };

    } catch (error) {
      console.error(`❌ Error starting OpenWA session for user ${this.userId}:`, error);
      return { success: false, error: error.message };
    }
  }

  setupEventListeners() {
    if (!this.client) return;

    // Handle incoming messages
    this.client.onMessage(async (message) => {
      try {
        console.log('📨 Received WhatsApp message:', {
          from: message.from,
          body: message.body,
          type: message.type
        });
        await this.handleIncomingMessage(message);
      } catch (error) {
        console.error('❌ Error handling incoming message:', error);
      }
    });

    // Handle connection state changes
    this.client.onStateChanged((state) => {
      console.log('📱 WhatsApp state changed:', state);
      console.log('📱 Current isConnected before state change:', this.isConnected);
      
      if (state === 'CONNECTED') {
        this.isConnected = true;
        this.sessionData = {
          status: 'connected',
          timestamp: Date.now()
        };
        console.log('✅ WhatsApp connected successfully!');
      } else if (state === 'DISCONNECTED') {
        this.isConnected = false;
        this.sessionData = {
          status: 'disconnected',
          timestamp: Date.now()
        };
        console.log('❌ WhatsApp disconnected');
      } else {
        console.log('📱 Unknown state received:', state);
        console.log('📱 Not changing isConnected status, current value:', this.isConnected);
      }
      
      console.log('📱 Current isConnected after state change:', this.isConnected);
    });

    // Handle authentication success - onAuth might not be available in all versions
    // We'll rely on state changes to detect authentication
    console.log('✅ Event listeners set up successfully');
  }

  async handleIncomingMessage(message) {
    try {
      // Handle both individual contacts (@c.us) and group chats (@g.us)
      let contactIdentifier = message.from;
      let isGroupChat = false;
      
      if (message.from.endsWith('@c.us')) {
        // Individual contact - strip @c.us suffix to get phone number
        contactIdentifier = message.from.replace('@c.us', '');
      } else if (message.from.endsWith('@g.us')) {
        // Group chat - keep the full identifier
        contactIdentifier = message.from;
        isGroupChat = true;
      }
      
      const messageBody = message.body || '';
      const timestamp = Date.now();
      const messageId = message.id;

      console.log(`📨 Processing ${isGroupChat ? 'group' : 'individual'} message from ${contactIdentifier}: ${messageBody}`);

      // Create or get flow for this contact
      const flowId = await this.getOrCreateFlow(contactIdentifier, messageBody);

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
          FromNumber: contactIdentifier,
          IsGroupChat: isGroupChat,
          MessageType: message.type || 'text',
          ...(message.quotedMsgId && { QuotedMessageId: message.quotedMsgId })
        }
      }));

      console.log(`✅ Message saved: ${messageId} from ${contactIdentifier}`);

    } catch (error) {
      console.error('❌ Error handling incoming message:', error);
    }
  }

  async getOrCreateFlow(contactIdentifier, firstMessage) {
    try {
      // First, check if a flow already exists for this user+contact combination
      const queryParams = {
        TableName: FLOWS_TABLE,
        KeyConditionExpression: 'contactId = :userId',
        FilterExpression: 'contactIdentifier = :contactId',
        ExpressionAttributeValues: {
          ':userId': this.userId,
          ':contactId': contactIdentifier
        }
      };

      const result = await docClient.send(new QueryCommand(queryParams));
      
      if (result.Items && result.Items.length > 0) {
        // Flow exists, update it
        const existingFlow = result.Items[0];
        await docClient.send(new UpdateCommand({
          TableName: FLOWS_TABLE,
          Key: {
            contactId: this.userId,
            flowId: existingFlow.flowId
          },
          UpdateExpression: 'SET lastMessageAt = :timestamp, lastMessage = :message',
          ExpressionAttributeValues: {
            ':timestamp': Date.now(),
            ':message': firstMessage
          }
        }));
        return existingFlow.flowId;
      } else {
        // Create new flow
        const flowId = uuidv4();
        await docClient.send(new PutCommand({
          TableName: FLOWS_TABLE,
          Item: {
            contactId: this.userId,
            contactIdentifier: contactIdentifier,
            flowId: flowId,
            Channel: 'whatsapp',
            lastMessageAt: Date.now(),
            lastMessage: firstMessage,
            createdAt: Date.now(),
            status: 'open',
            tags: ['all'],
            messageCount: 1
          }
        }));
        return flowId;
      }
    } catch (error) {
      console.error('❌ Error getting/creating flow:', error);
      throw error;
    }
  }

  async sendMessage(contactIdentifier, message) {
    try {
      // Check if client exists and has required methods (fallback for state detection issues)
      const clientIsReady = this.client && 
                           typeof this.client.sendText === 'function' && 
                           typeof this.client.onMessage === 'function';
      
      if (!clientIsReady) {
        throw new Error('WhatsApp client not initialized');
      }
      
      // If client exists but isConnected is false, it might be a state detection issue
      // Let's try to send anyway and update the connection status if it works
      if (!this.isConnected) {
        console.log('⚠️ Client exists but isConnected is false, attempting to send anyway...');
      }

      // Determine the correct chat ID format
      let chatId;
      if (contactIdentifier.endsWith('@g.us')) {
        // Group chat - use as-is
        chatId = contactIdentifier;
      } else if (contactIdentifier.endsWith('@c.us')) {
        // Individual contact with suffix - use as-is
        chatId = contactIdentifier;
      } else {
        // Phone number without suffix - add @c.us
        chatId = `${contactIdentifier}@c.us`;
      }

      const result = await this.client.sendText(chatId, message);
      
      // If we got here, the client is actually connected
      if (!this.isConnected) {
        console.log('✅ Message sent successfully, updating connection status');
        this.isConnected = true;
        this.sessionData = {
          status: 'connected',
          timestamp: Date.now()
        };
      }
      
      console.log('✅ Message sent successfully:', result);
      
      // Save outgoing message to database (same logic as handleIncomingMessage but for outgoing)
      try {
        const timestamp = Date.now();
        const messageId = `sent_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
        
        console.log(`📤 Saving outgoing message to ${contactIdentifier}: ${message}`);
        
        // Create or get flow for this contact
        const flowId = await this.getOrCreateFlow(contactIdentifier, message);
        
        // Save message to Messages table
        await docClient.send(new PutCommand({
          TableName: MESSAGES_TABLE,
          Item: {
            ThreadId: flowId,
            Timestamp: timestamp,
            MessageId: messageId,
            Channel: 'whatsapp',
            Direction: 'outgoing',
            Body: message,
            userId: this.userId,
            ThreadIdTimestamp: `${flowId}#${timestamp}`,
            IsUnread: false, // Outgoing messages are not unread
            // OpenWA specific fields
            ToNumber: contactIdentifier,
            MessageType: 'text',
            SentMessageId: result // Store the WhatsApp message ID from the send result
          }
        }));
        
        console.log(`✅ Outgoing message saved: ${messageId} to ${contactIdentifier}`);
        
      } catch (dbError) {
        console.error('❌ Error saving outgoing message to database:', dbError);
        // Don't fail the whole send operation if database save fails
      }
      
      return { success: true, messageId: result };

    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // If sending fails, the connection might actually be broken
      if (error.message.includes('not connected') || error.message.includes('not authenticated')) {
        this.isConnected = false;
        this.sessionData = {
          status: 'disconnected',
          timestamp: Date.now()
        };
      }
      
      return { success: false, error: error.message };
    }
  }

  getSessionStatus() {
    const basicStatus = {
      isConnected: this.isConnected,
      sessionData: this.sessionData,
      userId: this.userId
    };
    
    // Add more debugging info
    if (this.client) {
      try {
        // Try to get more info from the client if available
        basicStatus.clientExists = true;
        basicStatus.clientType = typeof this.client;
        
        // Check if client has methods we expect
        basicStatus.hasOnMessage = typeof this.client.onMessage === 'function';
        basicStatus.hasOnStateChanged = typeof this.client.onStateChanged === 'function';
        basicStatus.hasSendText = typeof this.client.sendText === 'function';
        
      } catch (error) {
        basicStatus.clientError = error.message;
      }
    } else {
      basicStatus.clientExists = false;
    }
    
    return basicStatus;
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.kill();
        this.client = null;
      }
      this.isConnected = false;
      this.sessionData = null;
      
      // Remove from active sessions
      if (this.userId) {
        activeSessions.delete(this.userId);
        console.log(`✅ OpenWA session disconnected for user: ${this.userId}`);
      }
      
    } catch (error) {
      console.error(`❌ Error disconnecting OpenWA for user ${this.userId}:`, error);
    }
  }
}

// API Routes
app.post('/start-session', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Check if user already has an active session
    if (activeSessions.has(userId)) {
      const existingSession = activeSessions.get(userId);
      if (existingSession.isConnected) {
        return res.status(400).json({ 
          error: 'User already has an active session',
          status: existingSession.getSessionStatus()
        });
      } else {
        // Session exists but not connected, allow restart
        console.log(`🔄 Restarting session for user: ${userId}`);
        await existingSession.disconnect();
        activeSessions.delete(userId);
      }
    }

    const service = new LocalOpenWAService(userId);
    const result = await service.startSession();
    
    if (result.success) {
      // Store the session in the global map
      activeSessions.set(userId, service);
    }
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error starting session:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/session-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const session = activeSessions.get(userId);
    
    if (!session) {
      return res.json({ 
        isConnected: false, 
        status: 'no_session',
        message: 'No active session found' 
      });
    }
    
    res.json(session.getSessionStatus());
  } catch (error) {
    console.error('❌ Error getting session status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get QR code for display in frontend
app.get('/qr-code/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('📱 QR Code API called for user:', userId);
    
    const session = activeSessions.get(userId);
    
    if (!session) {
      console.log('❌ No active session found for user:', userId);
      return res.status(404).json({ error: 'No active session found' });
    }
    
    const status = session.getSessionStatus();
    console.log('📱 Session status:', JSON.stringify(status, null, 2));
    
    if (status.sessionData && status.sessionData.qrCode) {
      console.log('✅ QR Code found, returning to frontend');
      res.json({
        qrCode: status.sessionData.qrCode,
        status: status.sessionData.status,
        timestamp: status.sessionData.timestamp
      });
    } else {
      console.log('❌ No QR code available in session data');
      res.status(404).json({ error: 'No QR code available' });
    }
  } catch (error) {
    console.error('❌ Error getting QR code:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/send-message', async (req, res) => {
  try {
    const { userId, phoneNumber, message } = req.body;
    
    if (!userId || !phoneNumber || !message) {
      return res.status(400).json({ 
        error: 'userId, phoneNumber (or contactIdentifier), and message are required' 
      });
    }

    const session = activeSessions.get(userId);
    if (!session) {
      return res.status(400).json({ error: 'No active session found' });
    }

    // phoneNumber can be either a phone number or a group chat ID
    const result = await session.sendMessage(phoneNumber, message);
    res.json(result);
  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/disconnect/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const session = activeSessions.get(userId);
    
    if (!session) {
      return res.json({ 
        success: true, 
        message: 'No active session to disconnect' 
      });
    }

    await session.disconnect();
    res.json({ success: true, message: 'Session disconnected successfully' });
  } catch (error) {
    console.error('❌ Error disconnecting session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  const sessionInfo = {};
  
  // Get status for each active session
  for (const [userId, session] of activeSessions) {
    sessionInfo[userId] = {
      isConnected: session.isConnected,
      status: session.sessionData?.status || 'unknown',
      hasClient: !!session.client
    };
  }
  
  res.json({ 
    status: 'ok', 
    service: 'beya-openwa-local',
    activeSessions: activeSessions.size,
    sessionDetails: sessionInfo,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Beya OpenWA Local Service running on port ${PORT}`);
  console.log(`📱 Ready to handle WhatsApp Web integrations`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Beya OpenWA Local Service...');
  
  // Disconnect all active sessions
  for (const [userId, session] of activeSessions) {
    console.log(`📱 Disconnecting session for user: ${userId}`);
    await session.disconnect();
  }
  
  console.log('✅ All sessions disconnected. Goodbye!');
  process.exit(0);
}); 
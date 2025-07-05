import { google } from 'googleapis';
import { GmailConnectService } from './gmail-connect.js';
import AWS from 'aws-sdk';

// Configure AWS
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

/**
 * Production Multi-Service Integration Polling Manager
 * Handles persistent, database-driven polling for all connected services (Gmail, WhatsApp, Slack, etc.)
 */
export class MultiServicePollingManager {
  constructor() {
    this.gmailConnectService = new GmailConnectService();
    this.integrationsTable = process.env.INTEGRATIONS_TABLE || 'beya-integration-sessions';
    this.activePollers = new Map(); // In-memory tracking of active intervals
    this.pollingIntervalMs = 30000; // 30 seconds default
    this.maxErrorCount = 5; // Stop polling after 5 consecutive errors
    
    // Auto-start polling on initialization
    this.initializePolling();
  }

  /**
   * Initialize polling for all users and services on server startup
   */
  async initializePolling() {
    try {
      console.log('🔄 Initializing polling for all connected integrations...');
      
      // Get all active polling sessions from database
      const sessions = await this.getActiveIntegrationSessionsFromDB();
      
      console.log(`📧 Found ${sessions.length} active integration polling sessions`);
      
      // Start polling for each session based on service type
      for (const session of sessions) {
        switch (session.serviceType) {
          case 'gmail':
            await this.startGmailPollingForUser(session.userId, session.webhookUrl, false);
            break;
          case 'whatsapp':
            // await this.startWhatsAppPollingForUser(session.userId, session.webhookUrl, false);
            console.log(`📱 WhatsApp polling for user ${session.userId} - TODO: implement`);
            break;
          case 'slack':
            // await this.startSlackPollingForUser(session.userId, session.webhookUrl, false);
            console.log(`💬 Slack polling for user ${session.userId} - TODO: implement`);
            break;
          default:
            console.log(`⚠️ Unknown service type: ${session.serviceType}`);
        }
      }
      
      console.log('✅ Integration polling initialization complete');
    } catch (error) {
      console.error('❌ Failed to initialize integration polling:', error);
    }
  }

  /**
   * Get all active integration sessions from database
   */
  async getActiveIntegrationSessionsFromDB(serviceType = null) {
    try {
      let params = {
        TableName: this.integrationsTable,
        FilterExpression: 'isActive = :active',
        ExpressionAttributeValues: {
          ':active': 'true'
        }
      };

      // Filter by service type if specified
      if (serviceType) {
        params.FilterExpression += ' AND serviceType = :serviceType';
        params.ExpressionAttributeValues[':serviceType'] = serviceType;
      }
      
      const result = await dynamodb.scan(params).promise();
      return result.Items || [];
    } catch (error) {
      console.error('Error getting integration sessions from DB:', error);
      return [];
    }
  }

  /**
   * Start Gmail polling for a specific user
   */
  async startGmailPollingForUser(userId, webhookUrl, saveToDb = true) {
    return await this.startPollingForUser(userId, 'gmail', webhookUrl, saveToDb);
  }

  /**
   * Generic method to start polling for any service
   */
  async startPollingForUser(userId, serviceType, webhookUrl, saveToDb = true) {
    try {
      console.log(`📧 Starting ${serviceType} polling for user ${userId}`);
      
      // Stop existing polling if any
      await this.stopPollingForUser(userId, serviceType, false);
      
      let initialState = {};
      
      // Service-specific initialization
      switch (serviceType) {
        case 'gmail':
          const { gmail } = await this.createGmailClient(userId);
          const profile = await gmail.users.getProfile({ userId: 'me' });
          initialState = {
            lastHistoryId: profile.data.historyId,
            emailAddress: profile.data.emailAddress
          };
          break;
        case 'whatsapp':
          // TODO: WhatsApp initialization
          initialState = { lastMessageId: null };
          break;
        case 'slack':
          // TODO: Slack initialization  
          initialState = { lastEventTs: null };
          break;
        default:
          throw new Error(`Unsupported service type: ${serviceType}`);
      }
      
      // Save to database if requested
      if (saveToDb) {
        await this.saveIntegrationSessionToDB({
          userId,
          serviceType,
          webhookUrl,
          isActive: 'true', // String for GSI compatibility
          pollingIntervalMs: this.pollingIntervalMs,
          createdAt: new Date().toISOString(),
          lastPollAt: new Date().toISOString(),
          errorCount: 0,
          serviceState: initialState // Service-specific state
        });
      }
      
      // Start the polling interval
      const intervalId = setInterval(async () => {
        await this.pollServiceForUser(userId, serviceType, webhookUrl);
      }, this.pollingIntervalMs);
      
      // Track the interval in memory
      const sessionKey = `${userId}-${serviceType}`;
      this.activePollers.set(sessionKey, {
        intervalId,
        webhookUrl,
        serviceType,
        startedAt: new Date().toISOString()
      });
      
      console.log(`✅ ${serviceType} polling started for user ${userId}`);
      
      return {
        success: true,
        userId,
        serviceType,
        webhookUrl,
        pollingIntervalMs: this.pollingIntervalMs,
        initialState
      };
      
    } catch (error) {
      console.error(`❌ Failed to start ${serviceType} polling for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Stop polling for a specific user and service
   */
  async stopPollingForUser(userId, serviceType, updateDb = true) {
    try {
      const sessionKey = `${userId}-${serviceType}`;
      
      // Clear the interval if it exists
      const pollerInfo = this.activePollers.get(sessionKey);
      if (pollerInfo) {
        clearInterval(pollerInfo.intervalId);
        this.activePollers.delete(sessionKey);
        console.log(`📧 Stopped ${serviceType} polling interval for user ${userId}`);
      }
      
      // Update database if requested
      if (updateDb) {
        await this.updateIntegrationSessionInDB(userId, serviceType, { isActive: 'false' });
      }
      
      return { success: true, userId, serviceType };
    } catch (error) {
      console.error(`❌ Failed to stop ${serviceType} polling for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Generic polling method that delegates to service-specific handlers
   */
  async pollServiceForUser(userId, serviceType, webhookUrl) {
    switch (serviceType) {
      case 'gmail':
        return await this.pollGmailForUser(userId, webhookUrl);
      case 'whatsapp':
        // return await this.pollWhatsAppForUser(userId, webhookUrl);
        console.log(`📱 WhatsApp polling for user ${userId} - TODO: implement`);
        break;
      case 'slack':
        // return await this.pollSlackForUser(userId, webhookUrl);
        console.log(`💬 Slack polling for user ${userId} - TODO: implement`);
        break;
      default:
        console.error(`Unknown service type: ${serviceType}`);
    }
  }

  /**
   * Poll Gmail for a specific user
   */
  async pollGmailForUser(userId, webhookUrl) {
    try {
      // Get current session from database
      const session = await this.getIntegrationSessionFromDB(userId, 'gmail');
      if (!session || session.isActive !== 'true') {
        console.log(`⚠️ Gmail polling session for user ${userId} is no longer active`);
        await this.stopPollingForUser(userId, 'gmail', false);
        return;
      }
      
      const { gmail } = await this.createGmailClient(userId);
      
      // Get history since last check
      const history = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: session.serviceState.lastHistoryId,
        labelId: 'INBOX',
      });

      if (history.data.history && history.data.history.length > 0) {
        console.log(`📧 User ${userId}: Found ${history.data.history.length} new Gmail events`);
        
        // Process each history event
        for (const historyItem of history.data.history) {
          if (historyItem.messagesAdded) {
            for (const messageAdded of historyItem.messagesAdded) {
              await this.processNewGmailMessage(userId, messageAdded.message, webhookUrl);
            }
          }
        }
        
        // Update last history ID in database
        await this.updateIntegrationSessionInDB(userId, 'gmail', {
          'serviceState.lastHistoryId': history.data.historyId,
          lastPollAt: new Date().toISOString(),
          errorCount: 0 // Reset error count on success
        });
      }
      
    } catch (error) {
      console.error(`❌ Error polling Gmail for user ${userId}:`, error);
      
      // Increment error count
      try {
        const session = await this.getIntegrationSessionFromDB(userId, 'gmail');
        const newErrorCount = (session?.errorCount || 0) + 1;
        
        if (newErrorCount >= this.maxErrorCount) {
          console.error(`❌ Max errors reached for user ${userId} Gmail, stopping polling`);
          await this.stopPollingForUser(userId, 'gmail', true);
        } else {
          await this.updateIntegrationSessionInDB(userId, 'gmail', { errorCount: newErrorCount });
        }
      } catch (dbError) {
        console.error('Error updating error count:', dbError);
      }
    }
  }

  /**
   * Process a new Gmail message and send to webhook
   */
  async processNewGmailMessage(userId, message, webhookUrl) {
    try {
      const { gmail } = await this.createGmailClient(userId);
      
      // Get full message details
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });

      console.log(`📧 Processing new Gmail message: ${message.id} for user ${userId}`);
      
      // Send to webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
          'X-Source': 'gmail-multi-service-polling',
        },
        body: JSON.stringify({
          userId,
          serviceType: 'gmail',
          gmailAccountId: 'direct-api',
          email: 'polling-mode',
          gmail_data: fullMessage.data,
        }),
      });

      if (response.ok) {
        console.log(`✅ Sent Gmail message ${message.id} to webhook for user ${userId}`);
      } else {
        console.error(`❌ Failed to send to webhook for user ${userId}: ${response.status}`);
      }

    } catch (error) {
      console.error(`Error processing Gmail message for user ${userId}:`, error);
    }
  }

  /**
   * Save integration session to database
   */
  async saveIntegrationSessionToDB(sessionData) {
    try {
      const params = {
        TableName: this.integrationsTable,
        Item: {
          ...sessionData,
          // Composite key for multi-service support
          sessionId: `${sessionData.userId}#${sessionData.serviceType}`
        }
      };
      
      await dynamodb.put(params).promise();
      console.log(`💾 Saved ${sessionData.serviceType} session for user ${sessionData.userId}`);
    } catch (error) {
      console.error('Error saving integration session to DB:', error);
      throw error;
    }
  }

  /**
   * Update integration session in database
   */
  async updateIntegrationSessionInDB(userId, serviceType, updates) {
    try {
      const updateExpressions = [];
      const expressionAttributeValues = {};
      const expressionAttributeNames = {};
      
      Object.entries(updates).forEach(([key, value]) => {
        if (key.includes('.')) {
          // Handle nested attributes like 'serviceState.lastHistoryId'
          const [parent, child] = key.split('.');
          const parentKey = `#${parent}`;
          const childKey = `:${parent}_${child}`;
          
          expressionAttributeNames[parentKey] = parent;
          updateExpressions.push(`${parentKey}.${child} = ${childKey}`);
          expressionAttributeValues[childKey] = value;
        } else {
          updateExpressions.push(`${key} = :${key}`);
          expressionAttributeValues[`:${key}`] = value;
        }
      });
      
      const params = {
        TableName: this.integrationsTable,
        Key: { 
          userId,
          serviceType 
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues
      };

      if (Object.keys(expressionAttributeNames).length > 0) {
        params.ExpressionAttributeNames = expressionAttributeNames;
      }
      
      await dynamodb.update(params).promise();
    } catch (error) {
      console.error('Error updating integration session in DB:', error);
      throw error;
    }
  }

  /**
   * Get integration session from database
   */
  async getIntegrationSessionFromDB(userId, serviceType) {
    try {
      const params = {
        TableName: this.integrationsTable,
        Key: { userId, serviceType }
      };
      
      const result = await dynamodb.get(params).promise();
      return result.Item;
    } catch (error) {
      console.error('Error getting integration session from DB:', error);
      return null;
    }
  }

  /**
   * Get status of all active integration sessions
   */
  async getPollingStatus() {
    try {
      const dbSessions = await this.getActiveIntegrationSessionsFromDB();
      const inMemorySessions = Array.from(this.activePollers.keys());
      
      return {
        totalActiveInDB: dbSessions.length,
        totalActiveInMemory: inMemorySessions.length,
        sessionsByService: dbSessions.reduce((acc, session) => {
          acc[session.serviceType] = (acc[session.serviceType] || 0) + 1;
          return acc;
        }, {}),
        sessions: dbSessions.map(session => ({
          userId: session.userId,
          serviceType: session.serviceType,
          isActiveInDB: session.isActive,
          isActiveInMemory: this.activePollers.has(`${session.userId}-${session.serviceType}`),
          lastPollAt: session.lastPollAt,
          errorCount: session.errorCount,
          webhookUrl: session.webhookUrl
        }))
      };
    } catch (error) {
      console.error('Error getting polling status:', error);
      return { error: error.message };
    }
  }

  /**
   * Create Gmail API client with user's OAuth credentials
   */
  async createGmailClient(userId) {
    try {
      const credentials = await this.gmailConnectService.getCredentials(userId);
      
      if (!credentials.oauth_access_token || !credentials.oauth_refresh_token) {
        throw new Error('Missing required OAuth tokens');
      }

      // Create OAuth2 client - Use current environment client ID instead of stored one
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'https://developers.google.com/oauthplayground'
      );

      // Set credentials
      oauth2Client.setCredentials({
        access_token: credentials.oauth_access_token,
        refresh_token: credentials.oauth_refresh_token,
      });

      // Create Gmail API client
      const gmail = google.gmail({
        version: 'v1',
        auth: oauth2Client,
      });

      return { gmail, oauth2Client };
    } catch (error) {
      console.error('Error creating Gmail client:', error);
      throw error;
    }
  }

  // Backward compatibility methods for Gmail
  async startPollingForUser_Gmail(userId, webhookUrl, saveToDb = true) {
    return await this.startGmailPollingForUser(userId, webhookUrl, saveToDb);
  }

  async stopPollingForUser_Gmail(userId, updateDb = true) {
    return await this.stopPollingForUser(userId, 'gmail', updateDb);
  }
} 
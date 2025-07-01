import { google } from 'googleapis';
import { GmailConnectService } from './gmail-connect.js';

/**
 * Gmail Push Notification Manager
 * Sets up Gmail API watch() notifications to send emails to Pipedream webhooks
 */
export class GmailPushManager {
  constructor() {
    this.gmailConnectService = new GmailConnectService();
    // Google Cloud Pub/Sub topic (you'll need to create this in GCP)
    this.pubsubTopic = process.env.GMAIL_PUBSUB_TOPIC || 'projects/your-project/topics/gmail-notifications';
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
      // This fixes the issue when OAuth app credentials are regenerated
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,  // ✅ Use current environment client ID
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

  /**
   * Set up Gmail push notifications using watch() API
   * @param {string} userId - User ID
   * @param {string} webhookUrl - Pipedream webhook URL to receive notifications
   * @param {string[]} labelIds - Gmail labels to watch (default: ['INBOX'])
   * @returns {Object} Watch response from Gmail API
   */
  async setupGmailWatch(userId, webhookUrl, labelIds = ['INBOX']) {
    try {
      console.log(`📧 Setting up Gmail watch for user ${userId}`);
      console.log(`📧 Webhook URL: ${webhookUrl}`);
      console.log(`📧 Labels: ${labelIds.join(', ')}`);

      const { gmail } = await this.createGmailClient(userId);

      // Gmail watch request
      const watchRequest = {
        userId: 'me',
        requestBody: {
          // Use Pub/Sub topic for push notifications
          topicName: this.pubsubTopic,
          labelIds: labelIds,
          labelFilterAction: 'include', // Only watch specified labels
        },
      };

      const response = await gmail.users.watch(watchRequest);
      
      console.log(`✅ Gmail watch setup successful:`, response.data);
      
      return {
        success: true,
        userId,
        historyId: response.data.historyId,
        expiration: response.data.expiration,
        webhookUrl,
        labelIds,
        watchResponse: response.data
      };

    } catch (error) {
      console.error(`❌ Failed to setup Gmail watch for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Alternative approach: Use Gmail API directly with a webhook endpoint
   * This bypasses Pub/Sub and sends notifications directly to a webhook
   * Note: This requires a different approach using Gmail API's history API
   */
  async setupDirectGmailPolling(userId, webhookUrl, pollingIntervalMs = 30000) {
    try {
      console.log(`📧 Setting up direct Gmail polling for user ${userId}`);
      
      const { gmail } = await this.createGmailClient(userId);
      
      // Get initial history ID
      const profile = await gmail.users.getProfile({ userId: 'me' });
      let lastHistoryId = profile.data.historyId;
      
      console.log(`📧 Starting Gmail polling from historyId: ${lastHistoryId}`);
      
      // Set up polling interval
      const pollGmail = async () => {
        try {
          // Get history since last check
          const history = await gmail.users.history.list({
            userId: 'me',
            startHistoryId: lastHistoryId,
            labelId: 'INBOX',
          });

          if (history.data.history && history.data.history.length > 0) {
            console.log(`📧 Found ${history.data.history.length} new Gmail events`);
            
            // Process each history event
            for (const historyItem of history.data.history) {
              if (historyItem.messagesAdded) {
                for (const messageAdded of historyItem.messagesAdded) {
                  await this.processNewGmailMessage(userId, messageAdded.message, webhookUrl);
                }
              }
            }
            
            // Update last history ID
            lastHistoryId = history.data.historyId;
          }
        } catch (error) {
          console.error('Error polling Gmail:', error);
        }
      };

      // Start polling
      const intervalId = setInterval(pollGmail, pollingIntervalMs);
      
      return {
        success: true,
        userId,
        webhookUrl,
        pollingIntervalMs,
        intervalId: 'polling_active', // Don't return actual intervalId (not serializable)
        lastHistoryId
      };

    } catch (error) {
      console.error(`❌ Failed to setup Gmail polling for user ${userId}:`, error);
      throw error;
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

      console.log(`📧 Processing new Gmail message: ${message.id}`);
      
      // Send to webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
          'X-Source': 'gmail-direct-polling',
        },
        body: JSON.stringify({
          userId,
          gmailAccountId: 'direct-api',
          email: 'polling-mode',
          gmail_data: fullMessage.data,
        }),
      });

      if (response.ok) {
        console.log(`✅ Sent Gmail message ${message.id} to webhook`);
      } else {
        console.error(`❌ Failed to send to webhook: ${response.status}`);
      }

    } catch (error) {
      console.error('Error processing Gmail message:', error);
    }
  }

  /**
   * Stop Gmail watch notifications
   */
  async stopGmailWatch(userId) {
    try {
      const { gmail } = await this.createGmailClient(userId);
      
      const response = await gmail.users.stop({ userId: 'me' });
      
      console.log(`✅ Stopped Gmail watch for user ${userId}`);
      return { success: true, userId };

    } catch (error) {
      console.error(`❌ Failed to stop Gmail watch for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get current Gmail watch status
   */
  async getGmailWatchStatus(userId) {
    try {
      const { gmail } = await this.createGmailClient(userId);
      
      // Check if there's an active watch by trying to get profile
      const profile = await gmail.users.getProfile({ userId: 'me' });
      
      return {
        success: true,
        userId,
        currentHistoryId: profile.data.historyId,
        emailAddress: profile.data.emailAddress,
        messagesTotal: profile.data.messagesTotal,
        threadsTotal: profile.data.threadsTotal,
      };

    } catch (error) {
      console.error(`❌ Failed to get Gmail watch status for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * List Gmail threads with optional filters
   * @param {string} userId - User ID
   * @param {Object} options - Search options
   * @returns {Array} Array of Gmail threads
   */
  async listGmailThreads(userId, options = {}) {
    try {
      const { gmail } = await this.createGmailClient(userId);
      
      const {
        maxResults = 50,
        labelIds = ['INBOX'],
        q = '', // Gmail search query
        pageToken = null
      } = options;

      console.log(`📧 Listing Gmail threads for user ${userId}`);
      console.log(`📧 Options:`, { maxResults, labelIds, q });

      const response = await gmail.users.threads.list({
        userId: 'me',
        maxResults,
        labelIds,
        q,
        pageToken
      });

      console.log(`📧 Found ${response.data.threads?.length || 0} Gmail threads`);

      return {
        success: true,
        userId,
        threads: response.data.threads || [],
        nextPageToken: response.data.nextPageToken,
        resultSizeEstimate: response.data.resultSizeEstimate
      };

    } catch (error) {
      console.error(`❌ Failed to list Gmail threads for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed Gmail thread with all messages
   * @param {string} userId - User ID  
   * @param {string} threadId - Gmail thread ID
   * @returns {Object} Detailed thread with messages
   */
  async getGmailThread(userId, threadId) {
    try {
      const { gmail } = await this.createGmailClient(userId);
      
      console.log(`📧 Getting Gmail thread ${threadId} for user ${userId}`);

      const response = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full' // Get full message details
      });

      const thread = response.data;
      
      // Process messages to extract useful information
      const processedMessages = thread.messages?.map(message => {
        const headers = {};
        message.payload?.headers?.forEach(header => {
          headers[header.name] = header.value;
        });

        return {
          id: message.id,
          threadId: message.threadId,
          snippet: message.snippet,
          historyId: message.historyId,
          internalDate: message.internalDate,
          headers,
          from: headers['From'],
          to: headers['To'],
          subject: headers['Subject'],
          date: headers['Date'],
          messageId: headers['Message-ID'],
          inReplyTo: headers['In-Reply-To'],
          references: headers['References']
        };
      }) || [];

      console.log(`📧 Thread ${threadId} has ${processedMessages.length} messages`);

      return {
        success: true,
        userId,
        threadId,
        thread: {
          id: thread.id,
          historyId: thread.historyId,
          messages: processedMessages,
          snippet: thread.snippet
        }
      };

    } catch (error) {
      console.error(`❌ Failed to get Gmail thread ${threadId} for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Search Gmail messages/threads
   * @param {string} userId - User ID
   * @param {string} query - Gmail search query (e.g., "from:sender@example.com")
   * @param {Object} options - Search options
   * @returns {Array} Search results
   */
  async searchGmail(userId, query, options = {}) {
    try {
      const { gmail } = await this.createGmailClient(userId);
      
      const {
        maxResults = 50,
        labelIds = ['INBOX'],
        includeSpamTrash = false
      } = options;

      console.log(`📧 Searching Gmail for user ${userId} with query: "${query}"`);

      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
        labelIds,
        includeSpamTrash
      });

      const messages = response.data.messages || [];
      
      // Get full details for each message
      const detailedMessages = await Promise.all(
        messages.slice(0, 10).map(async (message) => { // Limit to 10 for performance
          try {
            const fullMessage = await gmail.users.messages.get({
              userId: 'me',
              id: message.id,
              format: 'metadata',
              metadataHeaders: ['From', 'To', 'Subject', 'Date', 'Message-ID']
            });

            const headers = {};
            fullMessage.data.payload?.headers?.forEach(header => {
              headers[header.name] = header.value;
            });

            return {
              id: fullMessage.data.id,
              threadId: fullMessage.data.threadId,
              snippet: fullMessage.data.snippet,
              headers,
              from: headers['From'],
              to: headers['To'], 
              subject: headers['Subject'],
              date: headers['Date']
            };
          } catch (err) {
            console.error(`Error getting message ${message.id}:`, err);
            return null;
          }
        })
      );

      const validMessages = detailedMessages.filter(msg => msg !== null);

      console.log(`📧 Search found ${validMessages.length} messages`);

      return {
        success: true,
        userId,
        query,
        messages: validMessages,
        totalResults: response.data.resultSizeEstimate
      };

    } catch (error) {
      console.error(`❌ Failed to search Gmail for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get Gmail labels
   * @param {string} userId - User ID
   * @returns {Array} Gmail labels
   */
  async getGmailLabels(userId) {
    try {
      const { gmail } = await this.createGmailClient(userId);
      
      const response = await gmail.users.labels.list({
        userId: 'me'
      });

      return {
        success: true,
        userId,
        labels: response.data.labels || []
      };

    } catch (error) {
      console.error(`❌ Failed to get Gmail labels for user ${userId}:`, error);
      throw error;
    }
  }
} 
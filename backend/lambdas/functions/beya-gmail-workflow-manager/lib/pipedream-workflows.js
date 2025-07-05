// lib/pipedream-workflows.js
// Pipedream Workflow Management Service

import fetch from 'node-fetch';
import { createBackendClient } from "@pipedream/sdk/server";
import { google } from 'googleapis';

export default class PipedreamWorkflowManager {
  constructor() {
    console.log('[PipedreamWorkflowManager] Initializing...');
    this.pd = createBackendClient({
      environment: process.env.PIPEDREAM_PROJECT_ENVIRONMENT || "production",
      credentials: {
        clientId: process.env.PIPEDREAM_CLIENT_ID,
        clientSecret: process.env.PIPEDREAM_CLIENT_SECRET,
      },
      projectId: process.env.PIPEDREAM_PROJECT_ID,
    });
    console.log('[PipedreamWorkflowManager] Pipedream SDK client configured.');
    this.apiKey = process.env.PIPEDREAM_API_TOKEN;
    this.baseUrl = 'https://api.pipedream.com/v1';
    this.lambdaUrl = process.env.GMAIL_RECEIVE_WEBHOOK_URL || 'https://22y6e3kow4ozzkerpbd6shyxoi0hbcxx.lambda-url.us-east-1.on.aws/';
    this.orgId = process.env.PIPEDREAM_ORG_ID || 'o_ZjIMD7a';
    this.projectId = process.env.PIPEDREAM_PROJECT_ID || 'proj_GzsqKG9';
    // Template workflow ID - this should be set to your actual template workflow ID
    this.templateWorkflowId = process.env.GMAIL_TEMPLATE_WORKFLOW_ID || 'tch_z2f9XN';
  }

  /**
   * Check if the template workflow exists
   * @returns {boolean} True if template exists
   */
  async checkTemplateExists() {
    try {
      console.log(`[PipedreamWorkflowManager] Checking if template workflow exists: ${this.templateWorkflowId}`);
      const workflow = await this.getWorkflowStatus(this.templateWorkflowId);
      console.log(`✅ Template workflow found: ${workflow.id}`);
      return true;
    } catch (error) {
      console.error(`❌ Template workflow not found: ${this.templateWorkflowId}`);
      return false;
    }
  }

  /**
   * Create a Gmail receiving workflow for a specific user by cloning template
   * @param {string} userId - User ID
   * @param {string} gmailAccountId - Gmail account ID from MCP
   * @param {string} userEmail - User's email address
   * @returns {Object} Created workflow details
   */
  async createGmailReceiveWorkflow(userId, gmailAccountId, userEmail) {
    console.log(`[PipedreamWorkflowManager] Attempting to create workflow for userId: ${userId}`);
    
    try {
      // Skip template check since template IDs are different from workflow IDs
      // The template existence will be validated when we try to create from it
      console.log(`[PipedreamWorkflowManager] Using template ID: ${this.templateWorkflowId}`);

      const accessToken = await this.pd.rawAccessToken();
      console.log('[PipedreamWorkflowManager] Acquired raw access token.');

      // If userEmail is not provided, fetch it from Gmail API using OAuth credentials
      if (!userEmail) {
        console.log(`[PipedreamWorkflowManager] No userEmail provided, fetching from Gmail API for account: ${gmailAccountId}`);
        
        try {
          userEmail = await this.getGmailEmailAddress(gmailAccountId, accessToken);
          console.log(`[PipedreamWorkflowManager] Fetched email from Gmail API: ${userEmail}`);
        } catch (error) {
          console.error(`[PipedreamWorkflowManager] Error fetching email from Gmail API:`, error);
          userEmail = `user-${userId}@gmail.com`;
        }
      }

      const workflowName = `${userEmail} - Gmail Receive`;
      
             // Use the correct Pipedream template instantiation API format
       const templateData = {
         org_id: this.orgId,
         project_id: this.projectId,
         settings: {
           name: workflowName,
           auto_deploy: true
         },
         triggers: [
           {
             props: {
               method: "POST",
               path: `/gmail-webhook-${userId.substring(0, 8)}`
             }
           }
         ],
         steps: [
           {
             namespace: "code",
             props: {
               userId: userId,
               gmailAccountId: gmailAccountId,
               userEmail: userEmail,
               lambdaUrl: this.lambdaUrl
             }
           }
         ]
       };

       console.log('Creating workflow from template with data:', JSON.stringify(templateData, null, 2));

       // Use the template instantiation endpoint
       const response = await fetch(`${this.baseUrl}/workflows?template_id=${this.templateWorkflowId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
                 body: JSON.stringify(templateData)
       });

       console.log(`[PipedreamWorkflowManager] Template API Response Status: ${response.status}`);
       const result = await response.json();
       console.log('[PipedreamWorkflowManager] Template API Response Body:', JSON.stringify(result, null, 2));

       if (!response.ok) {
         throw new Error(`Pipedream Template API Error: ${response.status} - ${JSON.stringify(result)}`);
       }

       // Get the webhook URL from the created workflow
       const createdWorkflowId = result.data?.id || result.id;
       
       // Extract webhook URL from the response
       let webhookUrl = 'https://webhook.site/placeholder';
       if (result.data?.triggers && result.data.triggers.length > 0) {
         const httpTrigger = result.data.triggers.find(t => t.endpoint_url);
         if (httpTrigger && httpTrigger.endpoint_url) {
           webhookUrl = httpTrigger.endpoint_url;
         }
       }

       console.log('✅ Workflow created and auto-deployed successfully:', createdWorkflowId);
       console.log('📍 Webhook URL:', webhookUrl);

             return {
         userId,
         workflowId: createdWorkflowId,
         gmailAccountId,
         userEmail,
         name: workflowName,
         active: true,
         status: 'created_from_template',
         createdAt: new Date().toISOString(),
         webhook_url: webhookUrl,
        templateId: this.templateWorkflowId
      };
    } catch (error) {
      console.error(`❌ Failed to create Gmail receive workflow for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a Gmail receiving workflow
   * @param {string} workflowId - The Pipedream workflow ID
   * @returns {boolean} Success status
   */
  async deleteGmailReceiveWorkflow(workflowId) {
    console.log(`🗑️ Deleting Gmail receive workflow: ${workflowId}`);
    
    try {
      const response = await fetch(`${this.baseUrl}/workflows/${workflowId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete workflow: ${response.status}`);
      }

      console.log(`✅ Deleted Gmail receive workflow: ${workflowId}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to delete Gmail receive workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Get workflow status
   * @param {string} workflowId - The Pipedream workflow ID
   * @returns {Object} Workflow details
   */
  async getWorkflowStatus(workflowId) {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/${workflowId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get workflow: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error(`❌ Failed to get workflow status ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * List all workflows for debugging
   * @returns {Array} List of workflows
   */
  async listWorkflows() {
    try {
      const response = await fetch(`${this.baseUrl}/workflows`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list workflows: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];

    } catch (error) {
      console.error(`❌ Failed to list workflows:`, error);
      throw error;
    }
  }

  /**
   * Get Gmail email address using OAuth credentials from Pipedream account
   * @param {string} gmailAccountId - Pipedream Gmail account ID
   * @param {string} accessToken - Pipedream access token
   * @returns {string} Gmail email address
   */
  async getGmailEmailAddress(gmailAccountId, accessToken) {
    try {
      // First, get the OAuth credentials from Pipedream
      const accountResponse = await fetch(`${this.baseUrl}/accounts/${gmailAccountId}?include_credentials=1`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!accountResponse.ok) {
        throw new Error(`Failed to get account credentials: ${accountResponse.status}`);
      }

      const accountData = await accountResponse.json();
      const credentials = accountData.data?.credentials;

      if (!credentials?.oauth_access_token || !credentials?.oauth_refresh_token) {
        throw new Error('Missing OAuth tokens in account credentials');
      }

      // Create OAuth2 client using environment variables (same as Fargate)
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

      // Get user profile to get email address
      const profile = await gmail.users.getProfile({ userId: 'me' });
      
      return profile.data.emailAddress;

    } catch (error) {
      console.error('Error getting Gmail email address:', error);
      throw error;
    }
  }
} 
// lib/pipedream-workflows.js
// Pipedream Workflow Management Service

import fetch from 'node-fetch';
import { createBackendClient } from "@pipedream/sdk/server";

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
  }

  /**
   * Create a Gmail receiving workflow for a specific user using template
   * @param {string} userId - User ID
   * @param {string} gmailAccountId - Gmail account ID from MCP
   * @param {string} userEmail - User's email address
   * @returns {Object} Created workflow details
   */
  async createGmailReceiveWorkflow(userId, gmailAccountId, userEmail) {
    console.log(`[PipedreamWorkflowManager] Attempting to create workflow for userId: ${userId}`);
    try {
      const accessToken = await this.pd.rawAccessToken();
      console.log('[PipedreamWorkflowManager] Acquired raw access token.');

      const workflowName = `${userEmail} - Gmail Receive`;
      
      // Use the template-based approach with proper Node.js component code
      const workflowData = {
        org_id: this.orgId,
        project_id: this.projectId,
        steps: [
          {
            namespace: "code",
            props: {
              userId: userId,
              gmailAccountId: gmailAccountId,
              userEmail: userEmail,
              lambdaUrl: this.lambdaUrl
            },
            // Include the proper Node.js component code
            code: `import { axios } from "@pipedream/platform";

export default defineComponent({
  props: {
    userId: {
      type: "string",
      description: "User ID for this workflow"
    },
    gmailAccountId: {
      type: "string", 
      description: "Gmail account ID"
    },
    userEmail: {
      type: "string",
      description: "User's email address"
    },
    lambdaUrl: {
      type: "string",
      default: "${this.lambdaUrl}"
    }
  },
  async run({ steps, $ }) {
    // Get the Gmail data from the webhook trigger
    const gmailData = steps.trigger.event.body.gmail_data;
    
    if (!gmailData) {
      throw new Error("No Gmail data found in trigger event");
    }
    
    // Forward the Gmail data to Beya's email processor
    // The Lambda expects the gmail_data in the body along with user info
    const response = await axios($, {
      method: "POST",
      url: this.lambdaUrl,
      data: {
        userId: this.userId,
        gmail_account_id: this.gmailAccountId,
        email: this.userEmail,
        gmail_data: gmailData
      },
      headers: {
        "Content-Type": "application/json"
      }
    });
    
    $.export("$summary", \`Forwarded Gmail data to Beya processor for \${this.userEmail}\`);
    return response;
  },
});`
          }
        ],
        triggers: [
          {
            props: {
              emitShape: "ERGONOMIC",
              responseType: "default",
              domains: [],
              authorization: "none",
              discardAutomatedRequests: null,
              staticResponseStatus: 200,
              staticResponseHeaders: {},
              staticResponseBody: "",
              bearerToken: ""
            }
          }
        ],
        settings: {
          name: workflowName,
          auto_deploy: true
        }
      };

      console.log('Creating workflow with embedded Node.js code:', JSON.stringify(workflowData, null, 2));

      const response = await fetch(`${this.baseUrl}/workflows`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflowData)
      });

      console.log(`[PipedreamWorkflowManager] API Response Status: ${response.status}`);
      const result = await response.json();
      console.log('[PipedreamWorkflowManager] API Response Body:', JSON.stringify(result, null, 2));

      if (!response.ok) {
        throw new Error(`Pipedream API Error: ${response.status} - ${JSON.stringify(result)}`);
      }
      console.log('Template workflow created successfully:', result);

      return {
        userId,
        workflowId: result.data?.id || result.id,
        gmailAccountId,
        userEmail,
        name: workflowName,
        active: true,
        status: 'created_with_embedded_code',
        createdAt: new Date().toISOString(),
        // The workflow should now have proper HTTP trigger and code steps
        webhook_url: result.data?.workflow_url || `https://eogak5zthuwi1jw.m.pipedream.net`,
        triggers: result.data?.triggers || [],
        steps: result.data?.steps || []
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
} 
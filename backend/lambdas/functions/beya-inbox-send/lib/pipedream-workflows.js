// lib/pipedream-workflows.js
// Pipedream Workflow Management Service

import fetch from 'node-fetch';

class PipedreamWorkflowManager {
  constructor() {
    this.apiKey = process.env.PIPEDREAM_API_TOKEN;
    this.baseUrl = 'https://api.pipedream.com/v1';
    this.lambdaUrl = process.env.GMAIL_RECEIVE_WEBHOOK_URL || 'https://22y6e3kow4ozzkerpbd6shyxoi0hbcxx.lambda-url.us-east-1.on.aws/';
  }

  /**
   * Create a Gmail receiving workflow for a specific user
   * @param {string} userId - The user's ID
   * @param {string} gmailAccountId - The Pipedream Gmail account ID (apn_xxx)
   * @param {string} userEmail - The user's Gmail address
   * @returns {Object} Created workflow details
   */
  async createGmailReceiveWorkflow(userId, gmailAccountId, userEmail) {
    console.log(`📧 Creating Gmail receive workflow for user ${userId} (${userEmail})`);
    
    const workflowConfig = {
      name: `Beya Gmail Receive - ${userEmail}`,
      description: `Automated Gmail receiving workflow for Beya user ${userId}`,
      
      // The trigger: Monitor Gmail for new emails
      trigger: {
        app: "gmail",
        event: "new-email-received",
        config: {
          gmail: {
            authProvisionId: gmailAccountId
          },
          // Monitor all emails in inbox
          labels: ["INBOX"],
          // Exclude spam and trash
          excludeLabels: ["SPAM", "TRASH"]
        }
      },
      
      // The action: Send to your Lambda
      steps: [
        {
          name: "send_to_beya_lambda",
          action: {
            app: "http",
            event: "custom_request"
          },
          config: {
            method: "POST",
            url: this.lambdaUrl,
            headers: {
              "Content-Type": "application/json",
              "X-User-ID": userId,
              "X-Gmail-Account": gmailAccountId,
              "X-Source": "pipedream-gmail-webhook"
            },
            // Forward the entire Gmail payload
            body: "{{JSON.stringify(steps.trigger)}}"
          }
        }
      ]
    };

    try {
      const response = await fetch(`${this.baseUrl}/workflows`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflowConfig)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create workflow: ${response.status} ${errorText}`);
      }

      const workflow = await response.json();
      console.log(`✅ Created Gmail receive workflow: ${workflow.id} for user ${userId}`);
      
      return {
        workflowId: workflow.id,
        userId,
        gmailAccountId,
        userEmail,
        status: 'created',
        createdAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Failed to create Gmail receive workflow for user ${userId}:`, error);
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

export default PipedreamWorkflowManager; 
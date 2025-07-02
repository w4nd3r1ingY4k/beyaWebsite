// handlers/workflowHandler.js
// Lambda function to manage Gmail receiving workflows

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import PipedreamWorkflowManager from "../lib/pipedream-workflows.js";
import { GmailMCPSender } from "../lib/gmail-mcp.js";

const REGION = process.env.AWS_REGION;
const WORKFLOWS_TABLE = process.env.WORKFLOWS_TABLE || 'beya-gmail-workflows';

const dynamoClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event) => {
  console.log('--- NEW INVOCATION ---');
  console.log('EVENT RECEIVED:', JSON.stringify(event, null, 2));
  
  // Lambda Function URLs handle CORS automatically, no need for manual handling
  
  // --- Enhanced Diagnostics ---
  console.log('--- ENVIRONMENT VARIABLES ---');
  console.log('PIPEDREAM_PROJECT_ID:', process.env.PIPEDREAM_PROJECT_ID || 'NOT SET');
  console.log('PIPEDREAM_CLIENT_ID:', process.env.PIPEDREAM_CLIENT_ID ? 'SET' : 'NOT SET');
  console.log('PIPEDREAM_CLIENT_SECRET:', process.env.PIPEDREAM_CLIENT_SECRET ? 'SET' : 'NOT SET');
  console.log('PIPEDREAM_PROJECT_ENVIRONMENT:', process.env.PIPEDREAM_PROJECT_ENVIRONMENT || 'NOT SET');
  console.log('WORKFLOWS_TABLE:', process.env.WORKFLOWS_TABLE || 'NOT SET');
  console.log('AWS_REGION:', process.env.AWS_REGION || 'NOT SET');
  console.log('---------------------------');
  // --- End Diagnostics ---

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { action, userId, gmailAccountId, userEmail, workflowId } = body;
    
    console.log(`Parsed action: "${action}" for userId: "${userId}"`);

    const workflowManager = new PipedreamWorkflowManager();
    const gmailMCP = new GmailMCPSender();
    
    switch (action) {
      case 'create_workflow':
        return await createWorkflow(workflowManager, gmailMCP, userId, gmailAccountId, userEmail);
      
      case 'delete_workflow':
        return await deleteWorkflow(workflowManager, userId, workflowId);
      
      case 'get_workflow':
        return await getWorkflowStatus(workflowManager, userId);
      
      case 'auto_create_for_user':
        return await autoCreateWorkflowForUser(workflowManager, gmailMCP, userId);
      
      case 'list_workflows':
        return await listAllWorkflows(workflowManager);
      
      case 'check_template':
        return await checkTemplate(workflowManager);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
  } catch (error) {
    console.error('❌ Gmail Workflow Manager error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

/**
 * Create a new Gmail receiving workflow for a user
 */
async function createWorkflow(workflowManager, gmailMCP, userId, gmailAccountId, userEmail) {
  console.log(`📧 Creating workflow for user ${userId}`);
  
  // Check if workflow already exists for this user
  const existingWorkflow = await getStoredWorkflow(userId);
  if (existingWorkflow) {
    console.log(`⚠️ Workflow already exists for user ${userId}: ${existingWorkflow.workflowId}`);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Workflow already exists',
        workflow: existingWorkflow
      })
    };
  }
  
  // Create the workflow via Pipedream API
  const workflowResult = await workflowManager.createGmailReceiveWorkflow(userId, gmailAccountId, userEmail);
  
  // Store workflow info in DynamoDB
  await storeWorkflow(workflowResult);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: true,
      message: 'Gmail receiving workflow created successfully',
      workflow: workflowResult
    })
  };
}

/**
 * Auto-create workflow when user connects Gmail (called from IntegrationsPanel)
 */
async function autoCreateWorkflowForUser(workflowManager, gmailMCP, userId) {
  console.log(`🔄 Auto-creating workflow for user ${userId}`);
  
  // Get user's Gmail account from MCP
  const hasGmail = await gmailMCP.isGmailConnected(userId);
  if (!hasGmail) {
    throw new Error('User does not have Gmail connected');
  }
  
  const gmailAccount = await gmailMCP.getGmailAccount(userId);
  if (!gmailAccount) {
    throw new Error('Failed to get Gmail account details');
  }
  
  // Create workflow
  return await createWorkflow(workflowManager, gmailMCP, userId, gmailAccount.id, gmailAccount.name);
}

/**
 * Delete a Gmail receiving workflow
 */
async function deleteWorkflow(workflowManager, userId, workflowId) {
  console.log(`🗑️ Deleting workflow for user ${userId}`);
  
  // Get workflow ID from storage if not provided
  if (!workflowId) {
    const storedWorkflow = await getStoredWorkflow(userId);
    if (!storedWorkflow) {
      throw new Error('No workflow found for user');
    }
    workflowId = storedWorkflow.workflowId;
  }
  
  // Delete from Pipedream
  await workflowManager.deleteGmailReceiveWorkflow(workflowId);
  
  // Remove from DynamoDB
  await removeStoredWorkflow(userId);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: true,
      message: 'Gmail receiving workflow deleted successfully'
    })
  };
}

/**
 * Get workflow status for a user
 */
async function getWorkflowStatus(workflowManager, userId) {
  const storedWorkflow = await getStoredWorkflow(userId);
  if (!storedWorkflow) {
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        message: 'No workflow found for user'
      })
    };
  }
  
  // Get live status from Pipedream
  const liveStatus = await workflowManager.getWorkflowStatus(storedWorkflow.workflowId);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: true,
      workflow: {
        ...storedWorkflow,
        liveStatus
      }
    })
  };
}

/**
 * List all workflows (admin function)
 */
async function listAllWorkflows(workflowManager) {
  const storedWorkflows = await getAllStoredWorkflows();
  const liveWorkflows = await workflowManager.listWorkflows();
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: true,
      stored: storedWorkflows,
      live: liveWorkflows
    })
  };
}

/**
 * Check if template workflow exists
 */
async function checkTemplate(workflowManager) {
  const templateExists = await workflowManager.checkTemplateExists();
  const templateId = workflowManager.templateWorkflowId;
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: true,
      templateId: templateId,
      exists: templateExists,
      message: templateExists 
        ? `Template workflow ${templateId} exists and is ready to use` 
        : `Template workflow ${templateId} not found. Please create it in Pipedream first.`
    })
  };
}

// DynamoDB helper functions
async function storeWorkflow(workflowData) {
  const params = {
    TableName: WORKFLOWS_TABLE,
    Item: {
      userId: workflowData.userId,
      workflowId: workflowData.workflowId,
      gmailAccountId: workflowData.gmailAccountId,
      userEmail: workflowData.userEmail,
      status: workflowData.status,
      createdAt: workflowData.createdAt,
      updatedAt: new Date().toISOString(),
      webhook_url: workflowData.webhook_url // Store the webhook URL
    }
  };
  
  await docClient.send(new PutCommand(params));
  console.log(`💾 Stored workflow info for user ${workflowData.userId}`);
}

async function getStoredWorkflow(userId) {
  const params = {
    TableName: WORKFLOWS_TABLE,
    Key: { userId }
  };
  
  const result = await docClient.send(new GetCommand(params));
  return result.Item;
}

async function removeStoredWorkflow(userId) {
  const params = {
    TableName: WORKFLOWS_TABLE,
    Key: { userId }
  };
  
  await docClient.send(new DeleteCommand(params));
  console.log(`🗑️ Removed workflow info for user ${userId}`);
}

async function getAllStoredWorkflows() {
  const params = {
    TableName: WORKFLOWS_TABLE
  };
  
  const result = await docClient.send(new ScanCommand(params));
  return result.Items || [];
} 
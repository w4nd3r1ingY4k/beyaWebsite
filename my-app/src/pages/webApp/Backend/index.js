import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import express from "express";
import { createBackendClient } from "@pipedream/sdk/server";
import OpenAI from "openai";
import cors from "cors";
import { handleShopifyConnect, handleBusinessCentralConnect, handleKlaviyoConnect } from './connect.js';
import { semanticSearch, queryWithAI, getCustomerContext, searchByThreadId, searchWithinThread } from './semantic-search.js';

// Initialize SDKs
const pd = createBackendClient({
  environment: process.env.PIPEDREAM_PROJECT_ENVIRONMENT,
  credentials: {
    clientId: process.env.PIPEDREAM_CLIENT_ID,
    clientSecret: process.env.PIPEDREAM_CLIENT_SECRET,
  },
  projectId: process.env.PIPEDREAM_PROJECT_ID,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Import Square SDK for native fallback
import square from 'square';
const { Client } = square;

/**
 * Get connected account credentials from Pipedream
 */
async function getConnectedAccountCredentials(appSlug, externalUserId) {
  try {
    // Get the connected account for this user
    const connectedAccounts = await pd.getConnectedAccounts({
      app_slug: appSlug,
      external_user_id: externalUserId
    });
    
    if (connectedAccounts && connectedAccounts.length > 0) {
      // Return the first connected account's credentials
      return connectedAccounts[0].credentials;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching connected account for ${appSlug}:`, error);
    return null;
  }
}

/**
 * Initialize Square client with Pipedream credentials
 */
async function getSquareClient(externalUserId) {
  const credentials = await getConnectedAccountCredentials('square', externalUserId);
  
  if (!credentials || !credentials.access_token) {
    throw new Error('Square account not connected or credentials not available');
  }
  
  return new Client({
    accessToken: credentials.access_token,
    environment: credentials.sandbox ? 'sandbox' : 'production'
  });
}

// Tool manifest with proper MCP tool names (UPPERCASE with hyphens)
const toolManifest = {
  Square: {
    app_slug: "square",
    app_label: "Square",
    actions: {
      "create_customer": "SQUARE-CREATE-CUSTOMER",
      "list_customers": "SQUARE-LIST-CUSTOMERS",
      "create_payment": "SQUARE-CREATE-PAYMENT",
      "list_payments": "SQUARE-LIST-PAYMENTS",
      "create_invoice": "SQUARE-CREATE-INVOICE",
      "send_invoice": "SQUARE-SEND-INVOICE",
      "create_order": "SQUARE-CREATE-ORDER"
    }
  },
  Slack: {
    app_slug: "slack",
    app_label: "Slack",
    actions: {
      "send_message": "SLACK-SEND-MESSAGE",
      "create_channel": "SLACK-CREATE-CHANNEL",
      "list_users": "SLACK-LIST-USERS"
    }
  },
  Google_Sheets: {
    app_slug: "google_sheets",
    app_label: "Google Sheets",
    actions: {
      "add_single_row": "GOOGLE-SHEETS-ADD-SINGLE-ROW",
      "get_values": "GOOGLE-SHEETS-GET-VALUES",
      "update_row": "GOOGLE-SHEETS-UPDATE-ROW",
      "create_spreadsheet": "GOOGLE-SHEETS-CREATE-SPREADSHEET"
    }
  },
  HubSpot: {
    app_slug: "hubspot",
    app_label: "HubSpot",
    actions: {
      "search_crm": "HUBSPOT-SEARCH-CRM",
      "update_lead": "HUBSPOT-UPDATE-LEAD",
      "update_deal": "HUBSPOT-UPDATE-DEAL",
      "update_custom_object": "HUBSPOT-UPDATE-CUSTOM-OBJECT",
      "update_contact": "HUBSPOT-UPDATE-CONTACT",
      "update_company": "HUBSPOT-UPDATE-COMPANY",
      "get_meeting": "HUBSPOT-GET-MEETING",
      "get_file_public_url": "HUBSPOT-GET-FILE-PUBLIC-URL",
      "get_deal": "HUBSPOT-GET-DEAL",
      "get_contact": "HUBSPOT-GET-CONTACT",
      "get_company": "HUBSPOT-GET-COMPANY",
      "get_associated_meetings": "HUBSPOT-GET-ASSOCIATED-MEETINGS",
      "enroll_contact_into_workflow": "HUBSPOT-ENROLL-CONTACT-INTO-WORKFLOW",
      "create_ticket": "HUBSPOT-CREATE-TICKET",
      "create_task": "HUBSPOT-CREATE-TASK",
      "create_or_update_contact": "HUBSPOT-CREATE-OR-UPDATE-CONTACT",
      "create_meeting": "HUBSPOT-CREATE-MEETING",
      "create_lead": "HUBSPOT-CREATE-LEAD",
      "create_engagement": "HUBSPOT-CREATE-ENGAGEMENT",
      "create_deal": "HUBSPOT-CREATE-DEAL",
      "create_custom_object": "HUBSPOT-CREATE-CUSTOM-OBJECT",
      "create_company": "HUBSPOT-CREATE-COMPANY",
      "create_communication": "HUBSPOT-CREATE-COMMUNICATION",
      "create_associations": "HUBSPOT-CREATE-ASSOCIATIONS",
      "batch_create_or_update_contact": "HUBSPOT-BATCH-CREATE-OR-UPDATE-CONTACT",
      "add_contact_to_list": "HUBSPOT-ADD-CONTACT-TO-LIST"
    }
  },
  OpenAI: {
    app_slug: "openai",
    app_label: "OpenAI"
  }
};

/**
 * Debug function to list available tools for an app
 */
async function debugListTools(appSlug, accessToken, externalUserId) {
  console.log(`\n🔍 Debugging: Listing tools for ${appSlug}...`);
  
  try {
    const response = await openai.responses.create({
      model: "gpt-4.1",
      input: "Please list all available tools for this integration.",
      tools: [{
        type: "mcp",
        server_label: "pipedream", // Changed to "pipedream"
        server_url: "https://remote.mcp.pipedream.net",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "x-pd-project-id": process.env.PIPEDREAM_PROJECT_ID,
          "x-pd-environment": process.env.PIPEDREAM_PROJECT_ENVIRONMENT,
          "x-pd-external-user-id": externalUserId,
          "x-pd-app-slug": appSlug
        },
        allowed_tools: ["*"],
        require_approval: "never"
      }],
      temperature: 0,
      max_output_tokens: 2048,
      store: true
    });
    
    // Look for mcp_list_tools in the output
    const toolsList = response.output?.find(o => o.type === "mcp_list_tools");
    if (toolsList && toolsList.tools) {
      console.log(`✅ Found ${toolsList.tools.length} tools:`, toolsList.tools);
      return toolsList.tools;
    } else {
      console.log("⚠️ No tools found in response");
      return [];
    }
  } catch (error) {
    console.error(`❌ Error listing tools:`, error.message);
    return [];
  }
}

/**
 * Execute Square operation using native SDK as fallback
 */
async function executeSquareNativeFallback(action, args, externalUserId) {
  console.log(`🔄 Attempting Square native SDK fallback for ${action}`);
  
  try {
    const squareClient = await getSquareClient(externalUserId);
    
    switch (action) {
      case 'create_customer': {
        const { customersApi } = squareClient;
        const response = await customersApi.createCustomer({
          givenName: args.given_name || args.name?.split(' ')[0],
          familyName: args.family_name || args.name?.split(' ').slice(1).join(' '),
          emailAddress: args.email,
          phoneNumber: args.phone,
          companyName: args.company,
          note: args.note
        });
        
        if (response.result.errors) {
          throw new Error(response.result.errors[0].detail);
        }
        
        return response.result.customer;
      }
      
      case 'list_customers': {
        const { customersApi } = squareClient;
        const response = await customersApi.listCustomers({
          limit: args.limit || 100,
          cursor: args.cursor
        });
        
        if (response.result.errors) {
          throw new Error(response.result.errors[0].detail);
        }
        
        return response.result.customers || [];
      }
      
      case 'create_payment': {
        const { paymentsApi } = squareClient;
        const response = await paymentsApi.createPayment({
          sourceId: args.source_id,
          idempotencyKey: args.idempotency_key || Date.now().toString(),
          amountMoney: {
            amount: args.amount,
            currency: args.currency || 'USD'
          },
          customerId: args.customer_id,
          note: args.note
        });
        
        if (response.result.errors) {
          throw new Error(response.result.errors[0].detail);
        }
        
        return response.result.payment;
      }
      
      case 'list_payments': {
        const { paymentsApi } = squareClient;
        const response = await paymentsApi.listPayments({
          limit: args.limit || 100,
          cursor: args.cursor,
          locationId: args.location_id
        });
        
        if (response.result.errors) {
          throw new Error(response.result.errors[0].detail);
        }
        
        return response.result.payments || [];
      }
      
      // Add more Square operations as needed
      default:
        throw new Error(`Square native operation '${action}' not implemented`);
    }
  } catch (error) {
    console.error(`❌ Square native fallback failed:`, error.message);
    throw error;
  }
}

/**
 * Execute MCP tool with proper formatting, auth link detection, and native fallback
 */
async function executeMCPTool(toolConfig, action, args, state) {
  const accessToken = await pd.rawAccessToken();
  const mcpToolName = toolConfig.actions[action];
  
  // Debug: List available tools on first call
  if (!state._debuggedTools?.[toolConfig.app_slug]) {
    state._debuggedTools = state._debuggedTools || {};
    const availableTools = await debugListTools(toolConfig.app_slug, accessToken, state.externalUserId);
    state._debuggedTools[toolConfig.app_slug] = availableTools;
    
    // Check if our expected tool is in the list
    const expectedTool = mcpToolName;
    const foundTool = availableTools.find(t => 
      t.name === expectedTool || 
      t.name === expectedTool.toUpperCase() ||
      t.name === expectedTool.replace(/-/g, '_').toUpperCase()
    );
    
    if (foundTool) {
      console.log(`✅ Found matching tool: ${foundTool.name}`);
    } else {
      console.log(`⚠️ Expected tool "${expectedTool}" not found in available tools`);
      
      // If it's Square and tool not found, try native fallback
      if (toolConfig.app_slug === 'square') {
        console.log(`🔄 Attempting Square native SDK fallback...`);
        try {
          return await executeSquareNativeFallback(action, args, state.externalUserId);
        } catch (fallbackError) {
          console.error(`❌ Square native fallback also failed:`, fallbackError.message);
          // Continue with MCP attempt anyway
        }
      }
    }
  }
  
  // Create the MCP configuration
  const mcpConfig = {
    type: "mcp",
    server_label: "pipedream", // Changed from toolConfig.app_label to "pipedream"
    server_url: "https://remote.mcp.pipedream.net",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "x-pd-project-id": process.env.PIPEDREAM_PROJECT_ID,
      "x-pd-environment": process.env.PIPEDREAM_PROJECT_ENVIRONMENT,
      "x-pd-external-user-id": state.externalUserId,
      "x-pd-app-slug": toolConfig.app_slug
    },
    allowed_tools: [mcpToolName], // Only allow the specific tool we need
    require_approval: "never"
  };

  // Create a prompt that explicitly requests tool use
  let toolPrompt;
  if (Object.keys(args).length === 0) {
    toolPrompt = `Use the ${mcpToolName} tool to ${action.replace(/_/g, ' ')}.`;
  } else {
    toolPrompt = `Use the ${mcpToolName} tool to ${action.replace(/_/g, ' ')} with these parameters: ${JSON.stringify(args, null, 2)}`;
  }

  console.log(`\n📞 Attempting to call: ${mcpToolName}`);
  console.log(`📝 Prompt: ${toolPrompt}`);

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1",
      input: toolPrompt,
      tools: [mcpConfig],
      temperature: 0,
      max_output_tokens: 2048,
      top_p: 1,
      store: true
    });

    console.log(`\n📊 Response structure:`);
    console.log(`- Status: ${response.status}`);
    console.log(`- Output items: ${response.output?.length || 0}`);
    if (response.output) {
      response.output.forEach((item, idx) => {
        console.log(`  [${idx}] Type: ${item.type}`);
        if (item.type === "mcp_call") {
          console.log(`      Tool: ${item.name}`);
          console.log(`      Has output: ${item.output !== null}`);
        }
        if (item.type === "message" && item.content) {
          // Check for auth links in message content
          item.content.forEach(content => {
            if (content.type === "text" && content.text) {
              // Look for Pipedream auth URLs
              const authUrlMatch = content.text.match(/https:\/\/[^\s]+pipedream[^\s]+connect[^\s]+/i);
              if (authUrlMatch) {
                console.log(`🔗 Found authorization URL: ${authUrlMatch[0]}`);
              }
            }
          });
        }
      });
    }

    // Extract the tool call result
    const toolCall = response.output?.find(o => o.type === "mcp_call" && o.output !== null);
    
    if (toolCall) {
      console.log(`✅ Tool call successful!`);
      try {
        const parsedOutput = JSON.parse(toolCall.output);
        return parsedOutput;
      } catch {
        return toolCall.output;
      }
    }

    // Check for auth required response
    // Pipedream typically returns a message with an authorization URL when the app isn't connected
    const messageOutput = response.output?.find(o => o.type === "message");
    if (messageOutput && messageOutput.content) {
      let authUrl = null;
      let fullText = "";
      
      // Extract text and look for auth URL
      messageOutput.content.forEach(content => {
        if (content.type === "text" && content.text) {
          fullText += content.text + "\n";
          // Look for Pipedream connect URLs
          const urlMatch = content.text.match(/https:\/\/[^\s]+pipedream[^\s]+connect[^\s]+/i) ||
                          content.text.match(/https:\/\/connect\.pipedream\.com[^\s]+/i);
          if (urlMatch) {
            authUrl = urlMatch[0];
          }
        }
      });

      if (authUrl) {
        console.log(`⚠️ ${toolConfig.app_label} requires authorization`);
        return {
          error: true,
          requiresAuth: true,
          authUrl: authUrl,
          message: `Please connect your ${toolConfig.app_label} account to continue`,
          details: fullText.trim()
        };
      }

      // No auth URL found, but got a message response
      console.log(`⚠️ Got message instead of tool call`);
      
      // Try Square native fallback if MCP failed
      if (toolConfig.app_slug === 'square' && !authUrl) {
        console.log(`🔄 MCP failed, attempting Square native SDK fallback...`);
        try {
          const nativeResult = await executeSquareNativeFallback(action, args, state.externalUserId);
          console.log(`✅ Square native fallback successful!`);
          return nativeResult;
        } catch (fallbackError) {
          console.error(`❌ Square native fallback also failed:`, fallbackError.message);
          return {
            error: true,
            message: `Unable to call ${toolConfig.app_label} tool via MCP or native SDK`,
            details: `MCP: ${fullText.trim() || response.output_text}\nNative: ${fallbackError.message}`
          };
        }
      }
      
      return {
        error: true,
        message: `Unable to call ${toolConfig.app_label} tool`,
        details: fullText.trim() || response.output_text
      };
    }

    throw new Error(`No tool call or meaningful output found in response`);

  } catch (error) {
    console.error(`❌ Error calling MCP tool:`, error.message);
    
    // Final fallback attempt for Square
    if (toolConfig.app_slug === 'square') {
      console.log(`🔄 Final Square native SDK fallback attempt...`);
      try {
        return await executeSquareNativeFallback(action, args, state.externalUserId);
      } catch (fallbackError) {
        console.error(`❌ Final Square fallback failed:`, fallbackError.message);
      }
    }
    
    throw error;
  }
}

/**
 * Main workflow execution
 */
export async function runWorkflow(userRequest, externalUserId = 'test-user-123') {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 STARTING WORKFLOW EXECUTION");
  console.log("=".repeat(60));
  console.log(`User Request: "${userRequest}"`);
  console.log(`External User ID: ${externalUserId}`);
  
  // Step 1: Create the plan
  const plannerPrompt = `
You are a methodical Planner Agent. Your sole purpose is to convert a user's request into a precise, step-by-step execution plan.

**CRITICAL**: You must return a JSON object with exactly one key "steps" containing an array of step objects.

Example output:
{
  "steps": [
    {
      "step": 1,
      "tool": "Square",
      "action": "list_customers",
      "args": {}
    },
    {
      "step": 2,
      "tool": "Slack",
      "action": "send_message",
      "args": {
        "channel": "#general",
        "text": "Found {{count_from_step_1}} customers"
      }
    }
  ]
}

**Available Tools and Actions:**
- Square: create_customer, list_customers, create_payment, list_payments, create_invoice, send_invoice, create_order
- Slack: send_message, create_channel, list_users
- Google_Sheets: add_single_row, get_values, update_row, create_spreadsheet
- HubSpot: search_crm, update_lead, update_deal, update_custom_object, update_contact, update_company, get_meeting, get_file_public_url, get_deal, get_contact, get_company, get_associated_meetings, enroll_contact_into_workflow, create_ticket, create_task, create_or_update_contact, create_meeting, create_lead, create_engagement, create_deal, create_custom_object, create_company, create_communication, create_associations, batch_create_or_update_contact, add_contact_to_list
- OpenAI: chat.completions.create

**Important Rules:**
1. Use exact action names as listed above
2. Use {{key_from_step_N}} to reference outputs from previous steps
3. For array results, you can use {{count_from_step_N}} to get the count
4. Keep plans simple and focused on the user's request
5. When you need to transform data or process arrays (like creating multiple items from a list), use OpenAI to help:
   - First get the data
   - Then use OpenAI to transform/iterate over the data
   - Then execute the actions with the transformed data

**Handling Arrays and Batch Operations:**
- If the user wants to "create replicas", "copy all", or process multiple items, use OpenAI as an intermediary step
- Example: To create Square customers from HubSpot contacts:
  Step 1: Get HubSpot contacts
  Step 2: Use OpenAI to transform the data into individual creation commands
  Step 3+: Execute each creation command

**Data References:**
- {{result_step_N}} - The full result from step N
- {{items_from_step_N}} - If step N returned an array
- {{count_from_step_N}} - The count of items if step N returned an array
- {{key_from_step_N}} - A specific field from step N's result`;

  const planResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: plannerPrompt },
      { role: "user", content: userRequest }
    ],
    temperature: 0.0,
    response_format: { type: "json_object" }
  });

  let plan;
  try {
    const parsedOutput = JSON.parse(planResponse.choices[0].message.content);
    plan = parsedOutput.steps;
    if (!Array.isArray(plan)) {
      throw new Error("Plan must contain a 'steps' array");
    }
  } catch (e) {
    throw new Error(`Failed to parse plan: ${e.message}`);
  }

  console.log("\n📝 Generated plan:", JSON.stringify(plan, null, 2));

  // Step 2: Execute the plan
  const state = { 
    externalUserId,
    _debuggedTools: {},
    _startTime: Date.now()
  };

  for (const step of plan) {
    console.log("\n" + "-".repeat(60));
    console.log(`📍 Step ${step.step}: ${step.tool}.${step.action}`);
    console.log("-".repeat(60));
    
    try {
      // Interpolate arguments
      const interpolatedArgs = interpolateArgs(step.args, state);
      console.log(`📌 Arguments:`, JSON.stringify(interpolatedArgs, null, 2));
      
      if (step.tool.toLowerCase() === "openai") {
        // Handle OpenAI calls directly
        if (step.action === "chat.completions.create") {
          console.log(`🤖 Calling OpenAI directly...`);
          const resp = await openai.chat.completions.create(interpolatedArgs);
          const result = resp.choices[0].message.content;
          
          state[`result_step_${step.step}`] = result;
          state[`content_from_step_${step.step}`] = result;
          console.log(`✅ OpenAI response received (${result.length} chars)`);
        } else {
          throw new Error(`Unknown OpenAI action: ${step.action}`);
        }
      } else {
        // Handle MCP tool calls
        const toolConfig = toolManifest[step.tool];
        if (!toolConfig) {
          throw new Error(`Unknown tool: ${step.tool}`);
        }

        if (!toolConfig.actions[step.action]) {
          throw new Error(`Unknown action ${step.action} for tool ${step.tool}`);
        }

        const result = await executeMCPTool(toolConfig, step.action, interpolatedArgs, state);
        
        // Store results in state
        state[`result_step_${step.step}`] = result;
        if (result && !result.error) {
          // Store the complete result
          state[`result_step_${step.step}`] = result;
          
          // If it's an object with nested structure, extract useful fields
          if (typeof result === 'object' && !Array.isArray(result)) {
            // Store individual fields
            Object.entries(result).forEach(([key, value]) => {
              state[`${key}_from_step_${step.step}`] = value;
            });
            
            // Special handling for common patterns
            if (result.results && Array.isArray(result.results)) {
              state[`items_from_step_${step.step}`] = result.results;
              state[`count_from_step_${step.step}`] = result.results.length;
            }
          }
          
          // If result is directly an array
          if (Array.isArray(result)) {
            state[`items_from_step_${step.step}`] = result;
            state[`count_from_step_${step.step}`] = result.length;
            console.log(`📊 Stored array with ${result.length} items`);
          }
        }
      }
    } catch (error) {
      console.error(`\n❌ Step ${step.step} failed:`, error.message);
      state[`error_from_step_${step.step}`] = error.message;
      
      // Decide whether to continue or stop
      if (step.tool === "Square" || step.tool === "HubSpot") {
        console.log(`⚠️ Continuing despite error (non-critical tool)`);
      } else {
        throw error;
      }
    }
  }

  // Calculate execution time
  state._executionTime = Date.now() - state._startTime;
  console.log(`\n⏱️ Total execution time: ${state._executionTime}ms`);

  // Step 3: Present the results
  return await presentResults(state);
}

/**
 * Helper function to interpolate arguments with state values
 */
function interpolateArgs(args, state) {
  const argsString = JSON.stringify(args);
  const interpolated = argsString.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    
    // Handle array indexing like items_from_step_1[0]
    const arrayMatch = trimmedKey.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, baseKey, index] = arrayMatch;
      if (state[baseKey] && Array.isArray(state[baseKey])) {
        return JSON.stringify(state[baseKey][parseInt(index)]);
      }
    }
    
    // Handle dot notation like items_from_step_1.0.name
    if (trimmedKey.includes('.')) {
      const parts = trimmedKey.split('.');
      let value = state;
      for (const part of parts) {
        if (value && typeof value === 'object') {
          value = value[part];
        } else {
          console.warn(`⚠️ Warning: Cannot access "${part}" in path "${trimmedKey}"`);
          return '""';
        }
      }
      return JSON.stringify(value);
    }
    
    // Regular key access
    if (!(trimmedKey in state)) {
      console.warn(`⚠️ Warning: Key "${trimmedKey}" not found in state, using empty string`);
      return '""';
    }
    return JSON.stringify(state[trimmedKey]);
  });
  
  try {
    return JSON.parse(interpolated);
  } catch (error) {
    throw new Error(`Failed to parse interpolated args: ${error.message}`);
  }
}

/**
 * Present results to the user
 */
async function presentResults(state) {
  // Remove internal fields from state before presenting
  const cleanState = Object.entries(state).reduce((acc, [key, value]) => {
    if (!key.startsWith('_')) {
      acc[key] = value;
    }
    return acc;
  }, {});

  // Check if there are any auth URLs to present
  let authUrls = [];
  Object.entries(cleanState).forEach(([key, value]) => {
    if (value && typeof value === 'object' && value.requiresAuth && value.authUrl) {
      authUrls.push({
        tool: key.replace('result_step_', 'Step '),
        url: value.authUrl,
        app: value.message.match(/connect your (\w+) account/i)?.[1] || 'service'
      });
    }
  });

  const presenterPrompt = `
You are B, a helpful business assistant. Convert the workflow results into a user-friendly message.

Use these XML tags for formatting:
- <summary>...</summary>: High-level summary
- <list>...</list>: Container for lists  
- <item>...</item>: List items
- <strong>...</strong>: Emphasis
- <suggestion>...</suggestion>: Next steps

Important:
- If there are errors in the results, acknowledge them gracefully
- If there are authUrl fields with requiresAuth: true, present them as clickable links for the user to connect their accounts
- Focus on what was successful
- Be conversational and friendly
- Keep the response concise`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: presenterPrompt },
      { role: "user", content: `Present these results to the user:\n${JSON.stringify(cleanState, null, 2)}` }
    ],
    temperature: 0.2
  });

  let finalResponse = response.choices[0].message.content;

  // If there are auth URLs, append them in a clear format
  if (authUrls.length > 0) {
    finalResponse += "\n\n<summary><strong>Action Required:</strong> Please connect your accounts</summary>\n<list>";
    authUrls.forEach(auth => {
      finalResponse += `\n<item>Connect ${auth.app}: ${auth.url}</item>`;
    });
    finalResponse += "\n</list>\n<suggestion>After connecting your accounts, please try your request again.</suggestion>";
  }

  return finalResponse;
}

// Express server setup
const app = express();
app.use(cors({ origin: "*" })); // Configure appropriately for production
app.use(express.json());

// Main workflow endpoint
app.post("/workflow", async (req, res) => {
  const { userRequest, externalUserId } = req.body;
  if (!userRequest) {
    return res.status(400).json({ error: "userRequest is required" });
  }

  try {
    const result = await runWorkflow(userRequest, externalUserId || 'test-user-123');
    return res.status(200).json({ response: result });
  } catch (error) {
    console.error("🔥 Workflow error:", error);
    return res.status(500).json({ 
      error: error.message || "Internal Server Error",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Debug endpoint to test tool listing
app.post("/debug/list-tools", async (req, res) => {
  const { appSlug, externalUserId } = req.body;
  if (!appSlug) {
    return res.status(400).json({ error: "appSlug is required" });
  }

  try {
    const accessToken = await pd.rawAccessToken();
    const tools = await debugListTools(appSlug, accessToken, externalUserId || 'test-user-123');
    return res.status(200).json({ tools });
  } catch (error) {
    console.error("🔥 Debug error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check connected accounts
app.post("/debug/check-connection", async (req, res) => {
  const { appSlug, externalUserId } = req.body;
  if (!appSlug) {
    return res.status(400).json({ error: "appSlug is required" });
  }

  try {
    const credentials = await getConnectedAccountCredentials(appSlug, externalUserId || 'test-user-123');
    
    if (credentials) {
      // Don't expose sensitive data, just confirm connection
      return res.status(200).json({ 
        connected: true,
        hasAccessToken: !!credentials.access_token,
        appSlug: appSlug
      });
    } else {
      return res.status(200).json({ 
        connected: false,
        appSlug: appSlug
      });
    }
  } catch (error) {
    console.error("🔥 Connection check error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    environment: process.env.PIPEDREAM_PROJECT_ENVIRONMENT,
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check Pinecone index stats
app.get("/debug/pinecone-stats", async (req, res) => {
  try {
    const { Pinecone } = await import('@pinecone-database/pinecone');
    const pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    const indexName = process.env.PINECONE_INDEX_NAME || 'beya-context';
    console.log(`🔍 Checking Pinecone index: ${indexName}`);
    
    const pineconeIndex = pineconeClient.index(indexName);
    const stats = await pineconeIndex.describeIndexStats();
    
    res.json({
      indexName,
      stats,
      envVars: {
        PINECONE_API_KEY: process.env.PINECONE_API_KEY ? '✓ Set' : '✗ Missing',
        PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME || 'Using default: beya-context',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing'
      }
    });
  } catch (error) {
    console.error('❌ Pinecone debug error:', error);
    res.status(500).json({ 
      error: error.message,
      indexName: process.env.PINECONE_INDEX_NAME || 'beya-context',
      envVars: {
        PINECONE_API_KEY: process.env.PINECONE_API_KEY ? '✓ Set' : '✗ Missing',
        PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME || 'Using default: beya-context',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing'
      }
    });
  }
});

// Debug endpoint to fetch specific vectors and see their metadata
app.get("/debug/vector-metadata", async (req, res) => {
  try {
    const { Pinecone } = await import('@pinecone-database/pinecone');
    const pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    const indexName = process.env.PINECONE_INDEX_NAME || 'beya-context';
    const pineconeIndex = pineconeClient.index(indexName);
    
    // First, do a query to get actual vectors with metadata
    const queryResult = await pineconeIndex.query({
      vector: new Array(1536).fill(0), // dummy vector
      topK: 10,
      includeMetadata: true,
      includeValues: false
    });
    
    console.log('Query result:', JSON.stringify(queryResult, null, 2));
    
    // Also try to fetch specific vectors
    const vectorIds = [
      "32d9a9f4-d179-4386-8bd0-b2eda9f06bd6-0",
      "ab911b29-b5bc-4260-a1e6-3b26660db37d-0"
    ];
    
    let fetchResult = null;
    try {
      fetchResult = await pineconeIndex.fetch(vectorIds);
    } catch (fetchError) {
      console.log('Fetch error:', fetchError.message);
    }
    
    res.json({
      indexName,
      queryResults: queryResult.matches.map(match => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata,
        metadataKeys: Object.keys(match.metadata || {})
      })),
      fetchAttempt: {
        vectorIds,
        success: !!fetchResult,
        vectors: fetchResult?.vectors || null,
        error: fetchResult ? null : 'Fetch failed'
      }
    });
  } catch (error) {
    console.error('❌ Vector metadata debug error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack,
      indexName: process.env.PINECONE_INDEX_NAME || 'beya-context'
    });
  }
});

// Shopify Connect endpoints
app.post("/shopify/connect", async (req, res) => {
  await handleShopifyConnect(req, res);
});

// Business Central Connect endpoints
app.post("/business-central/connect", async (req, res) => {
  await handleBusinessCentralConnect(req, res);
});

app.post("/klaviyo/connect", async (req, res) => {
  await handleKlaviyoConnect(req, res);
});

app.post("/square/connect", async (req, res) => {
  await handleKlaviyoConnect(req, res);
});

// ===== SEMANTIC SEARCH & CONTEXT ENGINE ROUTES =====

// Semantic search endpoint
app.post("/api/v1/search-context", async (req, res) => {
  const { query, filters = {}, topK = 5, userId = null } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: "query is required" });
  }

  try {
    const results = await semanticSearch(query, filters, topK, userId);
    return res.status(200).json(results);
  } catch (error) {
    console.error("🔥 Semantic search error:", error);
    return res.status(500).json({ 
      error: error.message || "Semantic search failed",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// AI-powered context query endpoint
app.post("/api/v1/query-with-ai", async (req, res) => {
  const { 
    query, 
    filters = {}, 
    topK = 5, 
    userId = null, 
    responseType = 'summary',
    conversationHistory = []
  } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: "query is required" });
  }

  try {
    const result = await queryWithAI(query, { filters, topK, userId, responseType, conversationHistory });
    return res.status(200).json(result);
  } catch (error) {
    console.error("🔥 AI query error:", error);
    return res.status(500).json({ 
      error: error.message || "AI query failed",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Customer context summary endpoint
app.get("/api/v1/customer-context/:threadId", async (req, res) => {
  const { threadId } = req.params;
  const { userId = null } = req.query;
  
  if (!threadId) {
    return res.status(400).json({ error: "threadId is required" });
  }

  try {
    const context = await getCustomerContext(threadId, userId);
    return res.status(200).json(context);
  } catch (error) {
    console.error("🔥 Customer context error:", error);
    return res.status(500).json({ 
      error: error.message || "Customer context retrieval failed",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Search all emails in a specific thread
app.get("/api/v1/thread/:threadId", async (req, res) => {
  const { threadId } = req.params;
  const { topK = 20 } = req.query;
  
  if (!threadId) {
    return res.status(400).json({ error: "threadId is required" });
  }

  try {
    const results = await searchByThreadId(threadId, parseInt(topK));
    return res.status(200).json(results);
  } catch (error) {
    console.error("🔥 Thread search error:", error);
    return res.status(500).json({ 
      error: error.message || "Thread search failed",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Semantic search within a specific thread
app.post("/api/v1/thread/:threadId/search", async (req, res) => {
  const { threadId } = req.params;
  const { query, topK = 10 } = req.body;
  
  if (!threadId || !query) {
    return res.status(400).json({ error: "threadId and query are required" });
  }

  try {
    const results = await searchWithinThread(query, threadId, topK);
    return res.status(200).json(results);
  } catch (error) {
    console.error("🔥 Thread semantic search error:", error);
    return res.status(500).json({ 
      error: error.message || "Thread semantic search failed",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Draft coaching endpoint - analyze draft messages before sending
app.post("/api/v1/analyze-draft", async (req, res) => {
  const { 
    draftText, 
    threadId = null, 
    userId = null,
    context = null 
  } = req.body;
  
  if (!draftText) {
    return res.status(400).json({ error: "draftText is required" });
  }

  try {
    // Build search query based on available context
    let searchQuery = `draft message analysis: ${draftText}`;
    let filters = {};
    
    if (threadId) {
      searchQuery = `conversation context for thread ${threadId}: ${draftText}`;
      filters.threadId = threadId;
    }
    
    if (userId) {
      filters.userId = userId;
    }

    const result = await queryWithAI(searchQuery, { 
      filters, 
      topK: 3, 
      userId, 
      responseType: 'coaching' 
    });
    
    // Add draft-specific analysis
    const response = {
      ...result,
      draftText,
      threadId,
      recommendations: {
        toneAssessment: "Based on conversation history",
        suggestedImprovements: "See AI response for details",
        riskLevel: "low", // Could be calculated based on sentiment patterns
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error("🔥 Draft analysis error:", error);
    return res.status(500).json({ 
      error: error.message || "Draft analysis failed",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Reply suggestions endpoint
app.post("/api/v1/suggest-reply", async (req, res) => {
  const { 
    incomingMessage, 
    threadId, 
    userId = null,
    tone = 'professional' 
  } = req.body;
  
  if (!incomingMessage || !threadId) {
    return res.status(400).json({ error: "incomingMessage and threadId are required" });
  }

  try {
    const searchQuery = `reply suggestion for: ${incomingMessage}`;
    const filters = { threadId };
    if (userId) filters.userId = userId;

    const result = await queryWithAI(searchQuery, { 
      filters, 
      topK: 5, 
      userId, 
      responseType: 'draft' 
    });
    
    const response = {
      ...result,
      incomingMessage,
      threadId,
      suggestedTone: tone,
      alternatives: [
        // Could generate multiple response options
        result.aiResponse
      ]
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error("🔥 Reply suggestion error:", error);
    return res.status(500).json({ 
      error: error.message || "Reply suggestion failed",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Add error handling for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('🔥 Uncaught Exception:', error);
  process.exit(1);
});

const PORT = process.env.PORT || 2074;

const server = app.listen(PORT, () => {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 MCP WORKFLOW SERVER STARTED");
  console.log("=".repeat(60));
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📋 Environment: ${process.env.PIPEDREAM_PROJECT_ENVIRONMENT}`);
  console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✓ Loaded' : '✗ Missing'}`);
  console.log(`🔑 Pipedream Client ID: ${process.env.PIPEDREAM_CLIENT_ID ? '✓ Loaded' : '✗ Missing'}`);
  console.log(`🔑 Pipedream Project ID: ${process.env.PIPEDREAM_PROJECT_ID ? '✓ Loaded' : '✗ Missing'}`);
  console.log("\nEndpoints:");
  console.log("  POST /workflow - Execute a workflow");
  console.log("  POST /debug/list-tools - List available tools for an app");
  console.log("  POST /shopify/connect - Shopify Connect integration");
  console.log("  GET /health - Health check");
  console.log("\nContext Engine API:");
  console.log("  POST /api/v1/search-context - Semantic search");
  console.log("  POST /api/v1/query-with-ai - AI-powered context queries");
  console.log("  GET /api/v1/customer-context/:threadId - Customer 360 view");
  console.log("  GET /api/v1/thread/:threadId - Get all emails in thread");
  console.log("  POST /api/v1/thread/:threadId/search - Semantic search within thread");
  console.log("  POST /api/v1/analyze-draft - Draft message coaching");
  console.log("  POST /api/v1/suggest-reply - AI reply suggestions");
  console.log("=".repeat(60) + "\n");
  console.log("✨ Server is running and waiting for requests...");
});

server.on('error', (error) => {
  console.error('🔥 Server error:', error);
});

server.on('close', () => {
  console.log('🔴 Server closed');
});

// Keep the process alive
setInterval(() => {
  // Do nothing, just keep the event loop alive
}, 10000);
// meta-create-template/handlers/metaCreateTemplate.js

const https = require("https");
const { createBackendClient } = require("@pipedream/sdk/server");

// Helper function to make HTTPS requests
const makeHttpsRequest = (options, postData = null) =>
  new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch (e) {
          return reject({ statusCode: 502, error: "Invalid JSON from API" });
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject({ statusCode: res.statusCode, error: json.error || "API error" });
        }
        return resolve(json);
      });
    });

    req.on("error", (err) => reject({ statusCode: 502, error: "Network error: " + err.message }));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });

// Function to get WhatsApp credentials from Pipedream (same approach as beya-inbox-send)
const getWhatsAppCredentials = async (userId) => {
  try {
    // Initialize Pipedream client (same as beya-inbox-send)
    const pd = createBackendClient({
      environment: process.env.PIPEDREAM_PROJECT_ENVIRONMENT || "production",
      credentials: {
        clientId: process.env.PIPEDREAM_CLIENT_ID,
        clientSecret: process.env.PIPEDREAM_CLIENT_SECRET,
      },
      projectId: process.env.PIPEDREAM_PROJECT_ID,
    });

    // Check if user has connected WhatsApp account (same as beya-inbox-send)
    const accounts = await pd.getAccounts({
      external_user_id: userId,
      app: "whatsapp_business",
      include_credentials: true,
    });
    
    console.log(`📱 WhatsApp accounts for user ${userId}:`, JSON.stringify(accounts, null, 2));
    
    if (!accounts || !accounts.data || accounts.data.length === 0) {
      throw new Error('No WhatsApp Business account connected. Please connect your WhatsApp Business account through Pipedream first.');
    }

    const whatsappAccount = accounts.data[0];
    console.log(`📱 Found WhatsApp account: ${whatsappAccount.name || whatsappAccount.external_id}`);
    
    // Get credentials (same logic as beya-inbox-send)
    const businessAccountId = whatsappAccount.credentials?.business_account_id;
    const accessToken = whatsappAccount.credentials?.permanent_access_token || whatsappAccount.auth?.access_token;
    
    if (businessAccountId && accessToken) {
      // Get phone number ID from the business account (same as beya-inbox-send)
      try {
        const phoneNumbersResponse = await makeHttpsRequest({
          hostname: "graph.facebook.com",
          port: 443,
          path: `/v17.0/${businessAccountId}/phone_numbers?access_token=${accessToken}`,
          method: "GET",
          headers: { "Content-Type": "application/json" }
        });
        
        console.log(`📱 Phone numbers response:`, JSON.stringify(phoneNumbersResponse, null, 2));
        
        const phoneNumberId = phoneNumbersResponse.data?.[0]?.id;
        
        if (phoneNumberId) {
          return {
            token: accessToken,
            phoneNumberId: phoneNumberId,
            businessAccountId: businessAccountId,
            accountName: whatsappAccount.name || whatsappAccount.external_id
          };
        } else {
          console.error('❌ No phone numbers found for this WhatsApp Business account');
          throw new Error('No phone numbers found for this WhatsApp Business account');
        }
      } catch (error) {
        console.error('❌ Error fetching phone number ID:', error);
        throw new Error(`Error fetching phone number ID: ${error.message}`);
      }
    } else {
      // Fallback logic (same as beya-inbox-send)
      return {
        token: accessToken,
        phoneNumberId: whatsappAccount.auth?.phone_number_id || whatsappAccount.auth?.whatsapp_business_account_id,
        accountName: whatsappAccount.name || whatsappAccount.external_id
      };
    }
  } catch (error) {
    console.error('❌ Failed to fetch WhatsApp credentials from Pipedream:', error.message);
    throw new Error(`Failed to get WhatsApp credentials: ${error.message}`);
  }
};

// Function to list WhatsApp message templates
const listTemplates = async (credentials) => {
  const options = {
    hostname: "graph.facebook.com",
    port: 443,
    path: `/v17.0/${credentials.businessAccountId}/message_templates?access_token=${credentials.token}`,
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };

  try {
    const result = await makeHttpsRequest(options);
    console.log('📋 Templates fetched successfully:', result.data?.length || 0, 'templates');
    return result;
  } catch (error) {
    console.error('❌ Error fetching templates:', error);
    throw error;
  }
};

// Function to create a WhatsApp message template
const createTemplate = async (credentials, templateData) => {
  const { name, language, category, components } = templateData;
  
  const graphPayload = { name, language, category, components };
  const postData = JSON.stringify(graphPayload);

  const options = {
    hostname: "graph.facebook.com",
    port: 443,
    path: `/v17.0/${credentials.businessAccountId}/message_templates?access_token=${credentials.token}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  try {
    const result = await makeHttpsRequest(options, postData);
    console.log('✅ Template created successfully:', result.id);
    return result;
  } catch (error) {
    console.error('❌ Error creating template:', error);
    throw error;
  }
};

// This is the Lambda entry point:
exports.handler = async (event) => {
  const method = event.requestContext?.http?.method;
  
  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle OPTIONS for CORS preflight
  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  // Only allow GET and POST
  if (method !== "GET" && method !== "POST") {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, Allow: "GET, POST, OPTIONS" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  // Extract userId from query parameters or body
  let userId;
  if (method === "GET") {
    userId = event.queryStringParameters?.userId;
  } else {
    try {
      const body = JSON.parse(event.body || "{}");
      userId = body.userId;
    } catch (parseErr) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid JSON payload" }),
      };
    }
  }

  if (!userId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "userId is required" }),
    };
  }

  try {
    // Get WhatsApp credentials from Pipedream
    console.log(`📱 Getting WhatsApp credentials for user: ${userId}`);
    const credentials = await getWhatsAppCredentials(userId);
    console.log(`✅ WhatsApp credentials retrieved for user: ${userId}`);

    if (method === "GET") {
      // List templates
      console.log(`📋 Listing WhatsApp templates for user: ${userId}`);
      const result = await listTemplates(credentials);
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          templates: result.data || [],
          totalCount: result.data?.length || 0
        }),
      };
    } else {
      // Create template (POST)
      const body = JSON.parse(event.body);
      const { name, language, category, components } = body;
      
      if (
        typeof name !== "string" ||
        typeof language !== "string" ||
        typeof category !== "string" ||
        !Array.isArray(components)
      ) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: "Missing or invalid fields: name, language, category, components",
          }),
        };
      }

      console.log(`📝 Creating WhatsApp template for user: ${userId}`);
      const result = await createTemplate(credentials, { name, language, category, components });
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: "Template submitted for review",
          templateId: result.id,
        }),
      };
    }
  } catch (error) {
    console.error('❌ Lambda error:', error);
    const statusCode = error.statusCode || 500;
    const errorMsg = error.error || error.message || "Unknown error";
    
    return {
      statusCode,
      headers: corsHeaders,
      body: JSON.stringify({ error: errorMsg }),
    };
  }
};
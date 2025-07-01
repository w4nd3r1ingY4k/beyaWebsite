// meta-create-template/handlers/metaCreateTemplate.js

const https = require("https");

// This is the Lambda entry point:
exports.handler = async (event) => {
  // Only allow POST
    // 1) Only allow POST under HTTP API v2
    const method = event.requestContext?.http?.method;
    if (method !== "POST") {
      return {
        statusCode: 405,
        headers: { Allow: "POST" },
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (parseErr) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON payload" }),
    };
  }

  const { name, language, category, components } = body;
  if (
    typeof name !== "string" ||
    typeof language !== "string" ||
    typeof category !== "string" ||
    !Array.isArray(components)
  ) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing or invalid fields: name, language, category, components",
      }),
    };
  }

  const PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID;
  const ACCESS_TOKEN = process.env.WA_MANAGEMENT_TOKEN;
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.error("Missing required env vars WA_PHONE_NUMBER_ID or WA_MANAGEMENT_TOKEN");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server misconfiguration" }),
    };
  }

  // Build Graph API payload
  const graphPayload = { name, language, category, components };
  const postData = JSON.stringify(graphPayload);

  // Prepare HTTPS request options
  const options = {
    hostname: "graph.facebook.com",
    port: 443,
    path: `/v17.0/${PHONE_NUMBER_ID}/message_templates?access_token=${ACCESS_TOKEN}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  // Wrap HTTPS request in a promise
  const makeGraphRequest = () =>
    new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let json;
          try {
            json = JSON.parse(data);
          } catch (e) {
            return reject({ statusCode: 502, error: "Invalid JSON from Graph API" });
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject({ statusCode: res.statusCode, error: json.error || "Graph API error" });
          }
          return resolve(json);
        });
      });

      req.on("error", (err) => reject({ statusCode: 502, error: "Network error: " + err.message }));
      req.write(postData);
      req.end();
    });

  // Call Meta’s Graph API
  try {
    const graphResult = await makeGraphRequest();
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Template submitted for review",
        templateId: graphResult.id,
      }),
    };
  } catch (err) {
    console.error("Error from Graph API:", err);
    const statusCode = err.statusCode || 500;
    const errorMsg = err.error || "Unknown error";
    return {
      statusCode,
      body: JSON.stringify({ error: errorMsg }),
    };
  }
};
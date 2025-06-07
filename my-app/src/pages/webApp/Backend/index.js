import express from "express";
import OpenAI from "openai";
import { createBackendClient } from "@pipedream/sdk/server";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

/**
 * runWorkflow: 1) Ask the LLM to produce a JSON plan, then 2) execute each step.
 */
export async function runWorkflow(userRequest, externalUserId) {
  const presenterSystemPrompt = `
You are B, a helpful and friendly business assistant. Your role is to interpret a JSON object containing the results of a completed workflow and present it to the user in a clear, conversational, and structured way.

**Your Task:**
Convert the final JSON state into a user-facing message. Use the following custom XML tags to format your response. Do not use any other tags.

**Available Tags:**
* \`<summary>\`...\`</summary>\`: For a high-level summary of the results.
* \`<list>\`...\`</list>\`: To contain a list of items.
* \`<item>\`...\`</item>\`: For each individual item in a list.
* \`<strong>\`...\`</strong>\`: To emphasize important text, like key metrics or names.
* \`<suggestion>\`...\`</suggestion>\`: To suggest a next logical step or question for the user.
* \`<chart>\`...\`</chart>\`: To indicate a chart should be displayed with a title inside the tags.

**Example:**
If the final state is \`{ "locations_from_step_1": { "locations": [{"name": "Downtown"}, {"name": "Uptown"}] } }\`, a good response would be:

<summary>I found <strong>2</strong> locations for you.</summary>
<list>
  <item>Downtown</item>
  <item>Uptown</item>
</list>
<suggestion>Would you like to see recent sales for one of these locations?</suggestion>


**IMPORTANT:**
*   You MUST use the provided tags for formatting.
*   Your output should be a single block of this XML-style text. No markdown, no JSON.
*   Be friendly and conversational in your tone. The user is interacting with 'B', not a raw data feed.
`;

  // Define the single source of truth for tool details.
  // This maps the planner's friendly names to exact technical details.
  const toolManifest = {
    Square: {
      app_slug: "square",
      app_label: "Square",
    },
    Slack: {
      app_slug: "slack",
      app_label: "Slack",
    },
    Google_Sheets: {
      app_slug: "google_sheets",
      app_label: "Google_Sheets",
    },
    HubSpot: {
      app_slug: "hubspot",
      app_label: "HubSpot",
    },
    Notion: {
      app_slug: "notion",
      app_label: "Notion",
    },
    Shopify: {
      app_slug: "shopify",
      app_label: "Shopify",
    }
  };

  // 1) Initialize both SDKs once:
  const pd = createBackendClient({
    environment: process.env.PIPEDREAM_PROJECT_ENVIRONMENT,
    credentials: {
      clientId: process.env.PIPEDREAM_CLIENT_ID,
      clientSecret: process.env.PIPEDREAM_CLIENT_SECRET,
    },
    projectId: process.env.PIPEDREAM_PROJECT_ID,
  });
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // 2) Ask the LLM to produce a pure-JSON plan
  const systemPrompt = `
You are a methodical Planner Agent. Your sole purpose is to convert a user's request into a precise, step-by-step execution plan in JSON format.

**Your task:** Given the user's request, produce ONLY a JSON array of sequential steps.

**Output Constraints:**
*   You MUST output a valid JSON array and nothing else. No explanatory text, no markdown formatting.
*   Each object in the array represents a single step and MUST contain exactly these four fields:
    1.  \`step\`: An integer, starting sequentially from 1.
    2.  \`tool\`: The name of the tool to use for this step. **You MUST choose a tool name from the \`AVAILABLE_TOOLS\` list provided below.**
    3.  \`action\`: The specific action to perform with the chosen tool (e.g., \`list_locations\`, \`send_message\`).
    4.  \`args\`: A JSON object of the arguments required for that action.

**Reasoning Process:**
1.  **Deconstruct Request:** Break down the user's request into a series of logical, sequential actions required to fulfill the goal.
2.  **Tool Selection:** For each action, look at the \`AVAILABLE_TOOLS\` list and select the single most appropriate tool for that specific action.
3.  **Action Identification:** Before deciding on an action, you MUST review the list of available actions for the selected tool. From that list, choose the one action that best fits the current step.
4.  **Argument Formulation:** Determine the necessary arguments for the chosen action. To use an output from a previous step, use the format \`{{key_from_step_N}}\`.
5.  **JSON Construction:** Assemble the step into the final JSON object format. Repeat for all actions.

---

**\`AVAILABLE_TOOLS\`:**
*   **\`Square\`**: A point-of-sale and payment processing service for businesses. Use for managing transactions, customers, and business locations. Key actions include:
    *   \`create_customer\`: Creates a new customer profile.
    *   \`list_customers\`: Retrieves a list of customers.
    *   \`create_payment\`: Creates a payment.
    *   \`list_payments\`: Retrieves a list of payments.
*   **\`Slack\`**: A business communication platform. Use for sending messages to channels or users, and managing team communications. Key actions include:
    *   \`send_message\`: Sends a message to a channel or user.
    *   \`create_channel\`: Creates a new public or private channel.
    *   \`list_users\`: Retrieves a list of all users in the workspace.
*   **\`Google_Sheets\`**: A spreadsheet application. Use for creating, reading, and updating data in spreadsheets. Key actions include:
    *   \`add_single_row\`: Adds a single row of data to a sheet.
    *   \`get_sheet_values\`: Retrieves values from a range of cells.
    *   \`update_single_row\`: Updates a specific row in a sheet.
    *   \`create-spreadsheet\`: Creates a new spreadsheet.
*   **\`HubSpot\`**: A CRM platform for managing customer relationships, sales, and marketing. Key actions include:
    *   \`search_crm_objects\`: Search for companies, contacts, deals, and more.
    *   \`update_objects\`: Update leads, deals, custom objects, contacts, and companies.
    *   \`retrieve_objects\`: Get specific meetings, deals, contacts, companies, and associated meetings.
    *   \`create_objects\`: Create tickets, tasks, contacts, meetings, leads, deals, custom objects, companies, and communications.
    *   \`enroll_contacts\`: Add contacts to a specific workflow.
    *   \`create_associations\`: Create associations between various objects.
    *   \`batch_operations\`: Create or update batches of contacts.
    *   \`add_contacts_to_lists\`: Add a contact to a specific static list.
*   **\`Notion\`**: A workspace for notes, tasks, and databases. Use for managing pages and database items. Key actions include:
    *   \`list_databases\`: Retrieves a list of all databases.
    *   \`get_database_items\`: Retrieves items from a specific database.
    *   \`create_page\`: Creates a new page in a workspace, page, or database.
    *   \`update_page\`: Updates the properties of an existing page.
*   **\`Shopify\`**: An ecommerce platform for managing products, orders, and customers. Key actions include:
    *   \`update_product\`: Update an existing product. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/productUpdate) IMPORTANT: The arguments have specific formats. Please follow the instructions below: - images: Return JSON in this format: string[] - tags: Return JSON in this format: string[] - metafields: Return JSON in this format: string[]
    *   \`update_product_variant\`: Update an existing product variant. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/productVariantsBulkUpdate) IMPORTANT: The arguments have specific formats. Please follow the instructions below: - optionIds: Return JSON in this format: string[] - metafields: Return JSON in this format: string[]
    *   \`update_page\`: Update an existing page. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/pageUpdate)
    *   \`update_metaobject\`: Updates a metaobject. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metaobjectUpdate)
    *   \`update_metafield\`: Updates a metafield belonging to a resource. [See the documentation]()
    *   \`update_inventory_level\`: Sets the inventory level for an inventory item at a location. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/inventorySetOnHandQuantities)
    *   \`update_article\`: Update a blog article. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/articleUpdate) IMPORTANT: The arguments have specific formats. Please follow the instructions below: - tags: Return JSON in this format: string[]
    *   \`search_products\`: Search for products. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/queries/products) IMPORTANT: The arguments have specific formats. Please follow the instructions below: - productIds: Return JSON in this format: string[]
    *   \`search_product_variant\`: Search for product variants or create one if not found. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/queries/productVariants)
    *   \`search_custom_collection_by_name\`: Search for a custom collection by name/title. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/queries/collections)
    *   \`get_pages\`: Retrieve a list of all pages. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/queries/pages)
    *   \`get_metaobjects\`: Retrieves a list of metaobjects. [See the documentation](https://shopify.dev/docs/api/admin-graphql/unstable/queries/metaobjects)
    *   \`get_metafields\`: Retrieves a list of metafields that belong to a resource. [See the documentation](https://shopify.dev/docs/api/admin-graphql/unstable/queries/metafields) IMPORTANT: The arguments have specific formats. Please follow the instructions below: - namespace: Return JSON in this format: string[] - key: Return JSON in this format: string[]
    *   \`get_articles\`: Retrieve a list of all articles from a blog. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/queries/articles)
    *   \`delete_page\`: Delete an existing page. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/pageDelete)
    *   \`delete_metafield\`: Deletes a metafield belonging to a resource. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metafieldsDelete)
    *   \`delete_blog\`: Delete an existing blog. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/blogDelete)
    *   \`delete_article\`: Delete an existing blog article. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/articleDelete)
    *   \`create_smart_collection\`: Creates a smart collection. You can fill in any number of rules by selecting more than one option in each prop.[See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/collectionCreate)
    *   \`create_product\`: Create a new product. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate) IMPORTANT: The arguments have specific formats. Please follow the instructions below: - images: Return JSON in this format: string[] - options: Return JSON in this format: string[] - tags: Return JSON in this format: string[]
    *   \`create_product_variant\`: Create a new product variant. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/productVariantsBulkCreate) IMPORTANT: The arguments have specific formats. Please follow the instructions below: - optionIds: Return JSON in this format: string[] - metafields: Return JSON in this format: string[]
    *   \`create_page\`: Create a new page. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/pageCreate)
    *   \`create_metaobject\`: Creates a metaobject. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metaobjectCreate)
    *   \`create_metafield\`: Creates a metafield belonging to a resource. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metafieldDefinitionCreate)
    *   \`create_custom_collection\`: Create a new custom collection. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/collectionCreate) IMPORTANT: The arguments have specific formats. Please follow the instructions below: - products: Return JSON in this format: string[] - metafields: Return JSON in this format: string[]
    *   \`create_blog\`: Create a new blog. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/blogCreate)
    *   \`create_article\`: Create a new blog article. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/articleCreate) IMPORTANT: The arguments have specific formats. Please follow the instructions below: - tags: Return JSON in this format: string[]
    *   \`bulk_import\`: Execute bulk mutations by uploading a JSONL file containing mutation variables. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/bulkoperationrunmutation)
    *   \`add_tags\`: Add tags. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/tagsAdd) IMPORTANT: The arguments have specific formats. Please follow the instructions below: - tags: Return JSON in this format: string[]
    *   \`add_product_to_custom_collection\`: Adds a product or products to a custom collection. [See the documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/collectionAddProductsV2) IMPORTANT: The arguments have specific formats. Please follow the instructions below: - productIds: Return JSON in this format: string[]

---

**Example for a request "Use AI to write a haiku about business and post it to the #general channel in Slack":**
\`\`\`json
[
  {
    "step": 1,
    "tool": "OpenAI",
    "action": "chat.completions.create",
    "args": {
      "model": "gpt-4o-mini",
      "messages": [
        {
          "role": "user",
          "content": "Write a haiku about business."
        }
      ]
    }
  },
  {
    "step": 2,
    "tool": "Slack",
    "action": "send_message",
    "args": {
      "channel": "#general",
      "text": "{{result_step_1}}"
    }
  }
]
\`\`\`
`;
  const planResponse = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      { role: "user", content: userRequest },
    ],
    temperature: 0.0,
  });
  console.log("📝 planResponse =", JSON.stringify(planResponse, null, 2));

  // 3) Parse that JSON into an array of step-objects
  let plan;
  try {
    plan = JSON.parse(planResponse.choices[0].message.content);
  } catch (e) {
    throw new Error(
      "Planner did not return valid JSON. Response was:\n" +
        planResponse.choices[0].message.content
    );
  }
  if (!Array.isArray(plan)) {
    throw new Error(
      "Planner returned a JSON but not an array. Got:\n" +
        JSON.stringify(plan, null, 2)
    );
  }

  // 4) Shared state: store every step's result so later steps can reference them
  const state = { externalUserId };

  // 5) Define an internal recursive executor. It runs step #i, then calls itself for i+1.
  async function executeStepAtIndex(i) {
    if (i >= plan.length) return;

    const { step, tool, action, args } = plan[i];

    // 5a) Interpolate any placeholders in args using state
    const rawArgsString = JSON.stringify(args);
    const interpolatedArgsString = rawArgsString.replace(
      /\{\{([^}]+)\}\}/g,
      (_, key) => {
        const k = key.trim();
        if (typeof state[k] === "undefined") {
          throw new Error(`Cannot resolve placeholder "{{${k}}}" in step ${step}`);
        }
        return state[k];
      }
    );
    const interpolatedArgs = JSON.parse(interpolatedArgsString);

    console.log(
      `🚀 Executing Step ${step}: ${tool}.${action} with args ${JSON.stringify(
        interpolatedArgs
      )}`
    );
    let result;

    // 5b) If the tool is "openai", call LLM directly
    if (tool.toLowerCase() === "openai") {
      if (action === "chat.completions.create") {
        const resp = await openai.chat.completions.create(interpolatedArgs);
        result = resp.choices[0].message.content;
        state[`result_step_${step}`] = result;
      } else {
        throw new Error(`Unsupported OpenAI action: ${action}`);
      }
    } else {
      // 5c) It's an MCP connector. Look up its details from the manifest.
      const toolDetails = toolManifest[tool];
      if (!toolDetails || !toolDetails.app_slug) {
        throw new Error(
          `Execution error: Tool "${tool}" from the plan is not a valid, recognized MCP connector in the tool manifest.`
        );
      }
      const appSlug = toolDetails.app_slug;
      const appLabel = toolDetails.app_label;

      // 5d) Get a fresh access token
      const accessToken = await pd.rawAccessToken();

      // 5e) Build the "tools" array for a single-tool MCP call:
      const mcpToolSpec = {
        type: "mcp",
        server_label: appLabel,
        server_url: "https://remote.mcp.pipedream.net",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-pd-project-id": process.env.PIPEDREAM_PROJECT_ID,
          "x-pd-environment": process.env.PIPEDREAM_PROJECT_ENVIRONMENT,
          "x-pd-external-user-id": externalUserId,
          "x-pd-app-slug": appSlug,
        },
        require_approval: "never",
      };

      // 5f) Call OpenAI's "responses" endpoint with one MCP tool
      const mcpInput = {
        action,
        arguments: interpolatedArgs,
      };
      const resp = await openai.responses.create({
        model: "gpt-4o-mini",
        tools: [mcpToolSpec],
        input: JSON.stringify(mcpInput),
      });

      console.log(
        `🔍 MCP response for step ${step} (${tool}.${action}):`,
        JSON.stringify(resp, null, 2)
      );

      const toolCalls = Array.isArray(resp.output)
        ? resp.output.filter((o) => o.type === "mcp_call" && o.output !== null)
        : [];

      // 1) If the MCP call returned something in `output`, try to parse it as JSON first:
      if (toolCalls.length > 0) {
        const raw = toolCalls[0].output;
        try {
          result = JSON.parse(raw);
        } catch (parseErr) {
          result = { output_text: raw };
        }
        // 2) Otherwise, if there's a plain-text fallback in `resp.output_text`, use that:
      } else if (
        typeof resp.output_text === "string" &&
        resp.output_text.trim().length > 0
      ) {
        result = { output_text: resp.output_text };
        // 3) If neither exists, it truly failed:
      } else {
        const fallback = JSON.stringify(resp, null, 2);
        throw new Error(
          `Step ${step} (${tool}.${action}) failed with no output:\n${fallback}`
        );
      }

      // 5h) Save any fields from result into state
      Object.keys(result).forEach((key) => {
        state[`${key}_from_step_${step}`] = result[key];
      });
    }

    console.log(
      `✅ Step ${step} (${tool}.${action}) completed. Result stored in state.`
    );
    await executeStepAtIndex(i + 1);
  }

  // 6) Kick off the recursion at index 0
  await executeStepAtIndex(0);

  // 7) Once recursion unwinds, use a "Presenter" LLM to format the state for the user
  console.log("🎁 Final state for Presenter:", JSON.stringify(state, null, 2));

  const presenterResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: presenterSystemPrompt },
      {
        role: "user",
        content: `Here is the final state JSON from the workflow that you need to present to the user:\n${JSON.stringify(
          state,
          null,
          2
        )}`,
      },
    ],
    temperature: 0.2,
  });

  const formattedOutput = presenterResponse.choices[0].message.content;
  console.log("🎨 Formatted output from Presenter:", formattedOutput);

  // 8) Return the formatted string instead of the raw state object
  return (
    formattedOutput ||
    "<summary>I've completed the task, but I'm not sure how to describe it. You can check your server logs for the full details.</summary>"
  );
}

// ---------------------
// Express server setup

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

app.post("/workflow", async (req, res) => {
  const { userRequest, externalUserId } = req.body;
  if (!userRequest || !externalUserId) {
    return res
      .status(400)
      .json({ error: "`userRequest` and `externalUserId` are required in the body." });
  }

  try {
    const formattedResponse = await runWorkflow(userRequest, externalUserId);
    return res.status(200).json({ response: formattedResponse });
  } catch (err) {
    console.error("🔥 Error running workflow:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 2074;
app.listen(PORT, () => {
  // ← log the correct env var here
  console.log("Pipedream env =", process.env.PIPEDREAM_PROJECT_ENVIRONMENT);
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});



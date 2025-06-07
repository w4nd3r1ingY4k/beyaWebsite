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
      app_label: "Google Sheets",
    },
    Notion: {
      app_slug: "notion",
      app_label: "Notion",
    },
    OpenAI: {
      // Internal tool, doesn't have an app_slug
      app_slug: null,
      app_label: "OpenAI",
    },
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
1.  Analyze the user's request to understand the ultimate goal.
2.  For each step required to achieve the goal, consult the \`AVAILABLE_TOOLS\` list.
3.  Read the description for each tool to select the one that is most appropriate for the current step.
4.  Formulate the step with the chosen tool, action, and arguments.

---

**\`AVAILABLE_TOOLS\`:**
*   **http**: A generic tool for making any HTTP request. Use this to interact with any API endpoint. Key action is http-custom-request.
*   **\`Square\`**: A point-of-sale and payment processing service for businesses. Use for managing transactions, customers, and business locations.
*   **\`Slack\`**: A business communication platform. Use for sending messages to channels or users, and managing team communications.
*   **\`Google_Sheets\`**: A spreadsheet application. Use for creating, reading, and updating data in spreadsheets.
*   **\`Notion\`**: A workspace for notes, tasks, and databases. Use for managing pages and database items.
*   **\`OpenAI\`**: The direct AI model. Use for tasks that involve language processing, summarization, or generation without needing external data.

---

**Example for a request "Find the top 3 projects in my Notion workspace and post the summary to the #general channel in Slack":**
\`\`\`json
[
  {
    "step": 1,
    "tool": "Notion",
    "action": "list_databases",
    "args": {}
  },
  {
    "step": 2,
    "tool": "Notion",
    "action": "get_database_items",
    "args": {
      "database_id": "step1.output.database_id",
      "page_size": 3
    }
  },
  {
    "step": 3,
    "tool": "OpenAI",
    "action": "summarize",
    "args": {
      "text": "step2.output.items"
    }
  },
  {
    "step": 4,
    "tool": "Slack",
    "action": "send_message",
    "args": {
      "channel": "#general",
      "text": "step3.output.summary"
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

  // 4) Shared state: store every step’s result so later steps can reference them
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

    // 5b) If the tool is “openai”, call LLM directly
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

      // 5e) Build the “tools” array for a single-tool MCP call:
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

      // 5f) Call OpenAI’s “responses” endpoint with one MCP tool
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
        // 2) Otherwise, if there's a plain‐text fallback in `resp.output_text`, use that:
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

  // 7) Once recursion unwinds, “state” holds every step’s outputs.
  return state;
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
    const finalState = await runWorkflow(userRequest, externalUserId);
    return res.status(200).json({ state: finalState });
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



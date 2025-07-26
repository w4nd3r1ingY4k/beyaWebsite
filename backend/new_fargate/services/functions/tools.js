/**
 * OpenAI Function Calling Tool Definitions for Email Search
 */

export const emailSearchTools = [
  {
    type: "function",
    function: {
      name: "clear_conversation_context",
      description: "Clear stored conversation context and email memory. Use when user wants to start fresh or when context becomes confusing.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Reason for clearing context (optional)" }
        },
        required: ["reason"],
        additionalProperties: false
      },
      strict: true
    }
  },

  {
    type: "function",
    function: {
      name: "search_emails_by_subject",
      description: "Search Messages table directly by email subject line. Use when thread context fails or you need to find specific emails by subject.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Full or partial email subject to search for" },
          exact_match: { type: "boolean", description: "Whether to search for exact match or partial match" },
          limit: { type: "number", default: 10, description: "Max results to return" }
        },
        required: ["subject", "exact_match", "limit"],
        additionalProperties: false
      },
      strict: true
    }
  },
  
  {
    type: "function",
    function: {
      name: "search_emails_by_sender",
      description: "Find emails from or to specific people/companies",
      parameters: {
        type: "object", 
        properties: {
          participant: { type: "string", description: "Email address, name, or company" },
          direction: { type: "string", enum: ["sent", "received", "both"], description: "Email direction" },
          limit: { type: "number", default: 10, description: "Max results to return" }
        },
        required: ["participant", "direction", "limit"],
        additionalProperties: false
      },
      strict: true
    }
  },
  
  {
    type: "function", 
    function: {
      name: "search_emails_by_timeframe",
      description: "Find emails from specific time periods",
      parameters: {
        type: "object",
        properties: {
          timeframe: { type: "string", enum: ["today", "yesterday", "this_week", "last_week", "this_month"], description: "Time period" },
          direction: { type: "string", enum: ["sent", "received", "both"], description: "Email direction" },
          limit: { type: "number", default: 10, description: "Max results to return" }
        },
        required: ["timeframe", "direction", "limit"],
        additionalProperties: false
      },
      strict: true
    }
  },

  {
    type: "function",
    function: {
      name: "search_emails_by_sentiment", 
      description: "Find emails with specific emotional tone or urgency",
      parameters: {
        type: "object",
        properties: {
          sentiment: { type: "string", enum: ["positive", "negative", "neutral", "urgent"], description: "Emotional tone to find" },
          confidence_threshold: { type: "number", minimum: 0, maximum: 1, default: 0.7, description: "Minimum confidence for sentiment" },
          limit: { type: "number", default: 10, description: "Max results to return" }
        },
        required: ["sentiment", "confidence_threshold", "limit"],
        additionalProperties: false
      },
      strict: true
    }
  },

  {
    type: "function",
    function: {
      name: "search_emails_semantic",
      description: "Search email content for topics, keywords, or concepts", 
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "What to search for in email content" },
          limit: { type: "number", default: 5, description: "Max results to return" }
        },
        required: ["query", "limit"],
        additionalProperties: false  
      },
      strict: true
    }
  }
]; 
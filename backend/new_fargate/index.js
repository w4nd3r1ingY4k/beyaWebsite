// Environment variables are loaded from AWS Secrets Manager in production
// Only use dotenv for local development
import dotenv from "dotenv";
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: "./.env" });
}

import express from "express";
import OpenAI from "openai";
import cors from "cors";
import { semanticSearch, queryWithAI, getCustomerContext, searchByThreadId, searchWithinThread } from './services/semantic-search.js';
import { ContextManager } from './services/context-manager.js';

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize Context Manager with error handling
let contextManager;
try {
  contextManager = new ContextManager();
  console.log("✅ Context Manager initialized");
  } catch (error) {
  console.error("❌ Failed to initialize Context Manager:", error);
  contextManager = null;
}

// Create Express app
const app = express();

// Middleware
app.use(cors({ 
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-requested-with"],
  credentials: false
}));
app.use(express.json({ limit: '50mb' }));

const port = process.env.PORT || 2075;

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    service: "beya-ai-service",
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint: Pinecone stats
app.get("/debug/pinecone-stats", async (req, res) => {
  try {
    const { Pinecone } = await import('@pinecone-database/pinecone');
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index('beya-production');
    const stats = await index.describeIndexStats();
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Error getting Pinecone stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Debug endpoint: Vector metadata
app.get("/debug/vector-metadata", async (req, res) => {
  try {
    const { userId, limit = 10 } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: "userId is required" 
      });
    }

    const { Pinecone } = await import('@pinecone-database/pinecone');
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index('beya-production');
    
    const queryResponse = await index.query({
      vector: new Array(1536).fill(0),
      topK: parseInt(limit),
      includeMetadata: true,
      filter: { userId: userId }
    });

    const metadata = queryResponse.matches.map(match => ({
        id: match.id,
        score: match.score,
      metadata: match.metadata
    }));

    res.json({
      success: true,
      count: metadata.length,
      metadata: metadata
    });
  } catch (error) {
    console.error('Error getting vector metadata:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// AI Endpoint: Semantic search with context
app.post("/api/v1/search-context", async (req, res) => {
  try {
    const { query, userId, conversationHistory = [] } = req.body;
    
    if (!query || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: "query and userId are required" 
      });
    }

    // Add conversation to context (if context manager is available)
    if (contextManager && conversationHistory.length > 0) {
      try {
        await contextManager.addAIResponse(userId, query, "User query received");
      } catch (error) {
        console.warn('⚠️ Context manager error:', error.message);
      }
    }

    const result = await semanticSearch(query, userId, conversationHistory);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error in semantic search:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// AI Endpoint: Query with AI processing
app.post("/api/v1/query-with-ai", async (req, res) => {
  try {
    const { query, userId, conversationHistory = [] } = req.body;
    
    if (!query || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: "query and userId are required" 
      });
    }

    // Get context for AI (if context manager is available)
    let context = "";
    if (contextManager) {
      try {
        context = await contextManager.getContextForPrompt(userId);
  } catch (error) {
        console.warn('⚠️ Context manager error:', error.message);
        context = "";
      }
    }

    const result = await queryWithAI(query, userId, conversationHistory, context);
    
    // Store AI response in context (if context manager is available)
    if (contextManager && result.response) {
      try {
        await contextManager.addAIResponse(userId, query, result.response);
  } catch (error) {
        console.warn('⚠️ Context manager error:', error.message);
      }
    }

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error in AI query:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// AI Endpoint: Get customer context for a thread
app.get("/api/v1/customer-context/:threadId", async (req, res) => {
  try {
    const { threadId } = req.params;
    const { userId } = req.query;
    
    if (!threadId || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: "threadId and userId are required" 
      });
    }

    const context = await getCustomerContext(threadId, userId);
    
    res.json({
      success: true,
      context: context
    });
  } catch (error) {
    console.error('Error getting customer context:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// AI Endpoint: Search by thread ID
app.get("/api/v1/thread/:threadId", async (req, res) => {
  try {
    const { threadId } = req.params;
    const { userId } = req.query;
    
    if (!threadId || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: "threadId and userId are required" 
      });
    }

    const result = await searchByThreadId(threadId, userId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error searching by thread ID:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

// AI Endpoint: Search within a specific thread
app.post("/api/v1/thread/:threadId/search", async (req, res) => {
  try {
    const { threadId } = req.params;
    const { query, userId } = req.body;
    
    if (!threadId || !query || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: "threadId, query, and userId are required" 
      });
    }

    const result = await searchWithinThread(threadId, query, userId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error searching within thread:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// AI Endpoint: Analyze email draft
app.post("/api/v1/analyze-draft", async (req, res) => {
  try {
    const { content, context, userId } = req.body;
    
    if (!content || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: "content and userId are required" 
      });
    }

    let userContext = "";
    if (contextManager) {
      try {
        userContext = await contextManager.getContextForPrompt(userId);
  } catch (error) {
        console.warn('⚠️ Context manager error:', error.message);
        userContext = "";
      }
    }

    const prompt = `
Analyze this email draft and provide suggestions for improvement:

Draft Content:
${content}

${context ? `Context: ${context}` : ''}

User Context:
${userContext}

Please provide:
1. Tone analysis
2. Clarity suggestions
3. Professional recommendations
4. Missing information alerts

Respond in JSON format:
{
  "tone": "professional/casual/formal",
  "clarity_score": 1-10,
  "suggestions": ["suggestion1", "suggestion2"],
  "missing_info": ["item1", "item2"],
  "overall_assessment": "brief summary"
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert email writing assistant." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3
    });

    const analysis = JSON.parse(completion.choices[0].message.content);
    
    res.json({
      success: true,
      analysis: analysis
    });
  } catch (error) {
    console.error('Error analyzing draft:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// AI Endpoint: Suggest email reply
app.post("/api/v1/suggest-reply", async (req, res) => {
  try {
    const { originalEmail, context, tone = "professional", userId } = req.body;
    
    if (!originalEmail || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: "originalEmail and userId are required" 
      });
    }

    let userContext = "";
    if (contextManager) {
      try {
        userContext = await contextManager.getContextForPrompt(userId);
  } catch (error) {
        console.warn('⚠️ Context manager error:', error.message);
        userContext = "";
      }
    }

    const prompt = `
Generate a professional email reply suggestion:

Original Email:
${originalEmail}

${context ? `Additional Context: ${context}` : ''}

User Context:
${userContext}

Tone: ${tone}

Please provide 3 different reply options:
1. Brief and direct
2. Detailed and thorough  
3. Diplomatic and careful

Format as JSON:
{
  "suggestions": [
    {
      "type": "brief",
      "subject": "suggested subject",
      "body": "email body"
    },
    {
      "type": "detailed", 
      "subject": "suggested subject",
      "body": "email body"
    },
    {
      "type": "diplomatic",
      "subject": "suggested subject", 
      "body": "email body"
    }
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert email writing assistant." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    });

    const suggestions = JSON.parse(completion.choices[0].message.content);
    
    res.json({
      success: true,
      ...suggestions
    });
  } catch (error) {
    console.error('Error suggesting reply:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Debug endpoint: Intent classification test
app.post("/debug/intent-classification", async (req, res) => {
  try {
    const { query, userId } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: "query is required" 
      });
    }

    // This would use the intent classification from semantic-search
    const { semanticSearch } = await import('./services/semantic-search.js');
    const result = await semanticSearch(query, userId || "debug-user", []);
    
    res.json({
      success: true,
      query: query,
      intent: result.intent || "unknown",
      classification_details: result.debug || {}
    });
  } catch (error) {
    console.error('Error in intent classification:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Environment validation
const requiredEnvVars = ['OPENAI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.warn(`⚠️  Missing environment variables: ${missingEnvVars.join(', ')}`);
  console.warn(`🔧 Service will start but some features may not work`);
}

// Add error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit in development, just log
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in development, just log
  if (process.env.NODE_ENV === 'production') {
  process.exit(1);
  }
});

// Start server
const server = app.listen(port, () => {
  console.log(`🤖 Beya AI Service running on port ${port}`);
  console.log(`🔍 Semantic search and AI processing ready`);
  console.log(`💾 Context management active`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

export default app; 
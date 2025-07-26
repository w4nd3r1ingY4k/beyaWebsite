import OpenAI from "openai";
import { ContextManager } from '../services/context-manager.js';

// Global clients
let openaiClient = null;
let contextManager = null;

/**
 * Initialize all clients (OpenAI, ContextManager)
 * Called once during server startup
 */
export async function initializeClients() {
  console.log("🔧 Initializing clients...");
  
  try {
    // Initialize OpenAI
    if (!openaiClient) {
      openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      console.log("✅ OpenAI client initialized");
    }

    // Initialize Context Manager with error handling
    if (!contextManager) {
      try {
        contextManager = new ContextManager();
        console.log("✅ Context Manager initialized");
      } catch (error) {
        console.error("❌ Failed to initialize Context Manager:", error);
        contextManager = null;
      }
    }

    console.log("🎉 All clients initialized successfully");
  } catch (error) {
    console.error("❌ Client initialization failed:", error);
    throw error;
  }
}

/**
 * Get the OpenAI client instance
 */
export function getOpenAIClient() {
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Call initializeClients() first.");
  }
  return openaiClient;
}

/**
 * Get the Context Manager instance
 */
export function getContextManager() {
  return contextManager; // Can be null if initialization failed
}

/**
 * Validate required environment variables
 */
export function validateEnvironment() {
  const requiredEnvVars = ['OPENAI_API_KEY'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missingEnvVars.join(', ')}`);
    console.warn(`🔧 Service will start but some features may not work`);
  }

  return missingEnvVars.length === 0;
} 
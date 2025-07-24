import dotenv from "dotenv";
import express from "express";
import { createBackendClient } from "@pipedream/sdk/server";
import OpenAI from "openai";
import cors from "cors";
import { MultiServicePollingManager } from './services/multi-user-polling.js';
import { normalizeNumber } from './services/normalizePhone.js';
import square from 'square';
import { handler as tasksHandler } from './lambdas/functions/tasks/beya-tasks-crud/handlers/tasksHandler.js';

// =========================
// Environment Setup
// =========================
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: "./.env" });
}

// =========================
// Service/Manager Initializations
// =========================
const pd = createBackendClient({
  environment: process.env.PIPEDREAM_PROJECT_ENVIRONMENT,
  credentials: {
    clientId: process.env.PIPEDREAM_CLIENT_ID,
    clientSecret: process.env.PIPEDREAM_CLIENT_SECRET,
  },
  projectId: process.env.PIPEDREAM_PROJECT_ID,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const { Client } = square;
const multiServicePollingManager = new MultiServicePollingManager();

export {
  pd,
  openai,
  Client,
  multiServicePollingManager,
  getConnectedAccountCredentials,
  getSquareClient,
  normalizeNumber,
  tasksHandler
};

/**
 * Get connected account credentials from Pipedream
 */
async function getConnectedAccountCredentials(appSlug, externalUserId) {
  try {
    // Get the connected account for this user
    const accounts = await pd.getAccounts({
      app: appSlug,
      external_user_id: externalUserId,
      include_credentials: 1, // Required to get OAuth credentials
    });
    
    if (accounts && accounts.data && accounts.data.length > 0) {
      // Return the first connected account's credentials
      return accounts.data[0].credentials;
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
import cors from "cors";
import express from "express";
import { requestLogging } from './logging.js';

/**
 * Setup all middleware for the Express app
 * @param {Express} app - Express application instance
 */
export function setupMiddleware(app) {
  console.log("🔧 Setting up middleware...");

  // Request logging middleware
  app.use(requestLogging());

  // CORS middleware - keeping * as requested
  app.use(cors({ 
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-requested-with", "X-PD-External-User-ID"],
    credentials: false,
    optionsSuccessStatus: 200
  }));

  // JSON parsing middleware
  app.use(express.json({ limit: '50mb' }));

  console.log("✅ Middleware setup complete");
} 
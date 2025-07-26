// Environment variables are loaded from AWS Secrets Manager in production
// Only use dotenv for local development
import dotenv from "dotenv";
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: "./.env" });
}

import express from "express";
import { initializeClients, validateEnvironment } from './config/clients.js';
import { setupMiddleware } from './middleware/index.js';
import aiRoutes from './routes/aiRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

/**
 * Main application setup and initialization
 */
async function startServer() {
  console.log("🚀 Starting Beya AI Service...");
  
  // Validate environment variables
  validateEnvironment();
  
  // Initialize clients (OpenAI, ContextManager)
  await initializeClients();
  
  // Create Express app
  const app = express();
  const port = process.env.PORT || 2075;
  
  // Setup middleware (logging, CORS, JSON parsing)
  setupMiddleware(app);
  
  // Setup routes
  app.use('/api/v1', aiRoutes);
  app.use('/', healthRoutes);
  
  // Global error handling for uncaught exceptions - improved stability
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('📍 Stack:', error.stack);
    // Log but don't exit to prevent service disruption
    // Let health checks handle service recovery if needed
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Log but don't exit to prevent service disruption
    // Let health checks handle service recovery if needed
  });

  // Start server
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`🤖 Beya AI Service running on port ${port}`);
    console.log(`🔍 Semantic search and AI processing ready`);
    console.log(`💾 Context management active`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Server listening on 0.0.0.0:${port}`);
    console.log(`✨ Modular architecture initialized successfully`);
  });

  server.on('error', (error) => {
    console.error('❌ Server error:', error);
  });

  // Graceful shutdown handlers - clear contexts on exit
  const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 ${signal} received - starting graceful shutdown...`);
    
    try {
      // Clear all contexts on shutdown
      console.log('🗑️ Clearing all conversation contexts...');
      const { getContextManager } = await import('./config/clients.js');
      const contextManager = getContextManager();
      
      if (contextManager) {
        // Clear contexts for all users (this removes all context files)
        const fs = await import('fs');
        const path = await import('path');
        const contextDir = '/tmp/beya-contexts';
        
        try {
          const files = await fs.promises.readdir(contextDir);
          const contextFiles = files.filter(file => file.endsWith('.json'));
          
          for (const file of contextFiles) {
            await fs.promises.unlink(path.join(contextDir, file));
          }
          
          console.log(`✅ Cleared ${contextFiles.length} context files`);
        } catch (dirError) {
          console.log('📄 No context files to clear');
        }
      }
      
    } catch (error) {
      console.error('❌ Error during shutdown cleanup:', error);
    }
    
    // Close server
    server.close(() => {
      console.log('🏁 Server closed successfully');
      process.exit(0);
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      console.log('⏰ Force exit after timeout');
      process.exit(1);
    }, 10000);
  };

  // Handle various shutdown signals
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));   // Ctrl+C
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Docker/PM2 stop
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Nodemon restart

  return server;
}

// Start the server
try {
  await startServer();
} catch (error) {
  console.error('🔥 Failed to start server:', error);
  process.exit(1);
} 
import { Router } from 'express';
import { getOpenAIClient, getContextManager } from '../config/clients.js';
import { semanticSearch, queryWithAI } from '../services/semantic-search.js';

const router = Router();

/**
 * AI Endpoint: Semantic search with context
 */
router.post("/search-context", async (req, res) => {
  const startTime = Date.now();
  console.log(`🔍 SEMANTIC SEARCH started`);
  
  try {
    const { query, userId, conversationHistory = [] } = req.body;
    
    console.log(`🔍 Search Query: "${query}"`);
    console.log(`👤 User ID: ${userId}`);
    console.log(`💬 Conversation History: ${conversationHistory.length} items`);
    
    if (!query || !userId) {
      console.log(`❌ Missing required fields - query: ${!!query}, userId: ${!!userId}`);
      return res.status(400).json({ 
        success: false, 
        error: "query and userId are required" 
      });
    }

    const contextManager = getContextManager();
    
    // Add conversation to context (if context manager is available)
    if (contextManager && conversationHistory.length > 0) {
      try {
        console.log(`💾 Adding context to context manager...`);
        await contextManager.addAIResponse(userId, query, "User query received");
        console.log(`✅ Context added successfully`);
      } catch (error) {
        console.warn('⚠️ Context manager error:', error.message);
      }
    }

    console.log(`🔄 Executing semantic search...`);
    const result = await semanticSearch(query, {}, 5, userId);
    
    const duration = Date.now() - startTime;
    console.log(`✅ SEMANTIC SEARCH completed in ${duration}ms`);
    console.log(`📊 Search Results: ${result.results?.length || 0} items found`);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ SEMANTIC SEARCH failed after ${duration}ms:`, error.message);
    console.error('📍 Stack trace:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * AI Endpoint: Query with AI processing
 */
router.post("/query-with-ai", async (req, res) => {
  const startTime = Date.now();
  console.log(`🤖 AI QUERY started`);
  
  try {
    const { query, userId, conversationHistory = [] } = req.body;
    
    console.log(`🤖 AI Query: "${query}"`);
    console.log(`👤 User ID: ${userId}`);
    console.log(`💬 Conversation History: ${conversationHistory.length} items`);
    
    if (!query || !userId) {
      console.log(`❌ Missing required fields - query: ${!!query}, userId: ${!!userId}`);
      return res.status(400).json({ 
        success: false, 
        error: "query and userId are required" 
      });
    }

    const contextManager = getContextManager();

    // Get context for AI (if context manager is available)
    let context = "";
    if (contextManager) {
      try {
        console.log(`💾 Getting context from context manager...`);
        context = await contextManager.getContextForPrompt(userId);
        console.log(`✅ Context retrieved: ${context.length} characters`);
      } catch (error) {
        console.warn('⚠️ Context manager error:', error.message);
        context = "";
      }
    }

    console.log(`🔄 Executing AI query processing...`);
    const result = await queryWithAI(query, {
      userId,
      conversationHistory,
      responseType: 'summary',
      contextManagerContent: context  // Pass the context manager content with stored emails
    });
    
    // Store AI response in context (if context manager is available)
    if (contextManager && result.aiResponse) {
      try {
        console.log(`💾 Storing AI response in context...`);
        
        // Extract email content by merging DynamoDB results with Pinecone metadata
        let emailsDiscussed = [];
        
        if (result.contextUsed && result.contextUsed.length > 0) {
          console.log(`📧 Processing ${result.contextUsed.length} search results for context storage...`);
          
          emailsDiscussed = result.contextUsed.map(pineconeResult => {
            // Try to find matching thread content from DynamoDB
            let threadMessages = [];
            if (result.threadContext && result.threadContext.threads) {
              const matchingThread = result.threadContext.threads.find(thread => 
                thread.messages.some(msg => 
                  msg.ThreadId === pineconeResult.threadId || 
                  msg.MessageId === pineconeResult.messageId
                )
              );
              threadMessages = matchingThread ? matchingThread.messages : [];
            }
            
            // Use DynamoDB content if available, otherwise fallback to Pinecone metadata
            if (threadMessages.length > 0) {
              // Success case: we have full content from DynamoDB
              return threadMessages.map(msg => ({
                Subject: msg.Subject || pineconeResult.subject || '(no subject)',
                From: msg.From || pineconeResult.emailParticipant || '(unknown sender)', 
                Body: msg.Body || '',
                HtmlBody: msg.HtmlBody || '',
                Timestamp: msg.Timestamp || pineconeResult.timestamp,
                ThreadId: msg.ThreadId || pineconeResult.threadId,
                MessageId: msg.MessageId || pineconeResult.messageId,
                contentSource: 'dynamodb_full'
              }));
            } else {
              // Fallback case: preserve Pinecone metadata even if DynamoDB fetch failed
              return [{
                Subject: pineconeResult.subject || '(no subject)',
                From: pineconeResult.emailParticipant || '(unknown sender)',
                Body: 'Full content not available - only metadata from search results',
                HtmlBody: '',
                Timestamp: pineconeResult.timestamp,
                ThreadId: pineconeResult.threadId,
                MessageId: pineconeResult.messageId,
                contentSource: 'pinecone_metadata_only'
              }];
            }
          }).flat();
          
          console.log(`📧 Preserving ${emailsDiscussed.length} email entries for future queries (including metadata for failed fetches)`);
        }
        
        await contextManager.addAIResponse(userId, query, result.aiResponse, emailsDiscussed);
        console.log(`✅ AI response stored successfully`);
      } catch (error) {
        console.warn('⚠️ Context manager error:', error.message);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ AI QUERY completed in ${duration}ms`);
    console.log(`📊 AI Response length: ${result.aiResponse?.length || 0} characters`);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ AI QUERY failed after ${duration}ms:`, error.message);
    console.error('📍 Stack trace:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Clear Context Endpoint: Clear stored conversation context
 */
router.post("/clear-context", async (req, res) => {
  const startTime = Date.now();
  console.log(`🗑️ CLEAR CONTEXT started`);
  
  try {
    const { userId, sessionId = 'default' } = req.body;
    
    console.log(`👤 User ID: ${userId}`);
    console.log(`🆔 Session ID: ${sessionId}`);
    
    if (!userId) {
      console.log(`❌ Missing required field - userId: ${!!userId}`);
      return res.status(400).json({ 
        success: false, 
        error: "userId is required" 
      });
    }

    const contextManager = getContextManager();
    
    if (contextManager) {
      await contextManager.clearContext(userId, sessionId);
      console.log(`✅ Context cleared successfully for user ${userId}`);
    } else {
      console.log(`⚠️ Context manager not available`);
    }

    const endTime = Date.now();
    console.log(`🗑️ CLEAR CONTEXT completed in ${endTime - startTime}ms`);

    res.json({
      success: true,
      message: "Context cleared successfully",
      userId,
      sessionId,
      processingTime: endTime - startTime
    });

  } catch (error) {
    const endTime = Date.now();
    console.error(`❌ CLEAR CONTEXT failed in ${endTime - startTime}ms:`, error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      processingTime: endTime - startTime
    });
  }
});

export default router; 
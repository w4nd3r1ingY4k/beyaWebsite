import { Router } from 'express';

const router = Router();

/**
 * Health check endpoint with enhanced logging
 */
router.get("/health", (req, res) => {
  console.log(`💚 Health check requested`);
  const healthData = { 
    status: "healthy", 
    service: "beya-ai-service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development'
  };
  console.log(`💚 Health check response:`, healthData);
  res.json(healthData);
});

/**
 * Debug endpoint: Pinecone stats
 */
router.get("/debug/pinecone-stats", async (req, res) => {
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

/**
 * Debug endpoint: Vector metadata
 */
router.get("/debug/vector-metadata", async (req, res) => {
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

/**
 * Debug endpoint: Intent classification test
 */
router.post("/debug/intent-classification", async (req, res) => {
  try {
    const { query, userId } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: "query is required" 
      });
    }

    // This would use the intent classification from semantic-search
    const { semanticSearch } = await import('../services/semantic-search.js');
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

export default router; 
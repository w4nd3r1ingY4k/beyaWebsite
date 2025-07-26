/**
 * Search emails by sentiment
 * @param {Object} args - Function arguments
 * @param {string} userId - User ID for filtering
 * @param {Function} semanticSearch - Semantic search function
 */
export async function searchEmailsBySentiment(args, userId, semanticSearch) {
  const { sentiment, confidence_threshold = 0.7, limit = 10 } = args;
  
  const filters = { 
    userId,
    sentiment: sentiment.toUpperCase(),
    sentimentConfidence: { $gte: confidence_threshold }
  };
  
  const query = `${sentiment} emails`;
  const searchResults = await semanticSearch(query, filters, limit, userId);
  
  return {
    searchType: 'sentiment',
    sentiment,
    confidence_threshold,
    emails: searchResults.results,
    totalResults: searchResults.totalResults
  };
} 
/**
 * Search emails semantically by content
 * @param {Object} args - Function arguments  
 * @param {string} userId - User ID for filtering
 * @param {Function} semanticSearch - Semantic search function
 */
export async function searchEmailsSemantic(args, userId, semanticSearch) {
  const { query, limit = 5 } = args;
  
  const filters = { userId };
  const searchResults = await semanticSearch(query, filters, limit, userId);
  
  return {
    searchType: 'semantic',
    query,
    emails: searchResults.results,
    totalResults: searchResults.totalResults
  };
} 
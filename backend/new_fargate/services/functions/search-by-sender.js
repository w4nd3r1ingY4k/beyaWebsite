/**
 * Search emails by sender/recipient
 * @param {Object} args - Function arguments
 * @param {string} userId - User ID for filtering
 * @param {Function} semanticSearch - Semantic search function
 */
export async function searchEmailsBySender(args, userId, semanticSearch) {
  const { participant, direction = 'both', limit = 10 } = args;
  
  const filters = { userId };
  
  // Add direction filter
  if (direction === 'sent') {
    filters.emailDirection = 'sent';
  } else if (direction === 'received') {
    filters.emailDirection = 'received';
  }
  
  // Search for emails with this participant
  const query = `emails from ${participant}`;
  const searchResults = await semanticSearch(query, filters, limit, userId);
  
  return {
    searchType: 'sender',
    participant,
    direction,
    emails: searchResults.results,
    totalResults: searchResults.totalResults
  };
} 
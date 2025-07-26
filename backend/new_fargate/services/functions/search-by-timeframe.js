/**
 * Convert timeframe string to timestamp
 * @param {string} timeframe - Timeframe enum value
 * @returns {number|null} - Timestamp or null
 */
function getTimeframeTimestamp(timeframe) {
  switch (timeframe) {
    case 'today':
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      return startOfToday.getTime();
    case 'yesterday':
      const startOfYesterday = new Date();
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      startOfYesterday.setHours(0, 0, 0, 0);
      return startOfYesterday.getTime();
    case 'this_week':
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return startOfWeek.getTime();
    case 'last_week':
      const startOfLastWeek = new Date();
      startOfLastWeek.setDate(startOfLastWeek.getDate() - startOfLastWeek.getDay() - 7);
      startOfLastWeek.setHours(0, 0, 0, 0);
      return startOfLastWeek.getTime();
    case 'this_month':
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      return startOfMonth.getTime();
    default:
      return null;
  }
}

/**
 * Search emails by timeframe
 * @param {Object} args - Function arguments
 * @param {string} userId - User ID for filtering
 * @param {Function} semanticSearch - Semantic search function
 */
export async function searchEmailsByTimeframe(args, userId, semanticSearch) {
  const { timeframe, direction = 'both', limit = 10 } = args;
  
  const filters = { userId };
  
  // Add direction filter
  if (direction === 'sent') {
    filters.emailDirection = 'sent';
  } else if (direction === 'received') {
    filters.emailDirection = 'received';
  }
  
  // Convert timeframe to timestamp filter
  const timeFilter = getTimeframeTimestamp(timeframe);
  if (timeFilter) {
    filters.timestamp = { $gte: timeFilter };
  }
  
  // Use a generic query since we're mainly filtering by metadata
  const query = `recent emails ${timeframe}`;
  const searchResults = await semanticSearch(query, filters, limit, userId);
  
  return {
    searchType: 'timeframe',
    timeframe,
    direction,
    emails: searchResults.results,
    totalResults: searchResults.totalResults
  };
} 
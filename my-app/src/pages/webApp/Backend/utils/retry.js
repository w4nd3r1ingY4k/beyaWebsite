/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxAttempts - Maximum number of attempts (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {Function} options.shouldRetry - Function to determine if error should be retried (default: retry all errors)
 * @returns {Promise<any>} - Result of the function
 */
export async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = () => true
  } = options;

  let lastError;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt++;

      // Don't retry if we've hit max attempts or if shouldRetry returns false
      if (attempt >= maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        initialDelay * Math.pow(2, attempt - 1) * (0.5 + Math.random()),
        maxDelay
      );

      console.log(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms due to:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Common error types for retry logic
 */
export const RetryableErrors = {
  // Network errors
  isNetworkError: (error) => {
    return error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT' ||
           error.code === 'ECONNREFUSED' ||
           error.message?.includes('network') ||
           error.message?.includes('timeout');
  },

  // Rate limit errors
  isRateLimitError: (error) => {
    return error.status === 429 ||
           error.message?.includes('rate limit') ||
           error.message?.includes('too many requests');
  },

  // Server errors
  isServerError: (error) => {
    return error.status >= 500 ||
           error.message?.includes('internal server error');
  },

  // OAuth token errors
  isTokenError: (error) => {
    return error.status === 401 ||
           error.message?.includes('invalid token') ||
           error.message?.includes('token expired');
  }
}; 
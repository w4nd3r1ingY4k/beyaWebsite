/**
 * Request logging middleware
 * Logs incoming requests and outgoing responses with detailed information
 */
export function requestLogging() {
  return (req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    console.log(`\n🌐 [${timestamp}] ${method} ${url}`);
    console.log(`📱 User-Agent: ${userAgent.substring(0, 100)}${userAgent.length > 100 ? '...' : ''}`);
    
    if (Object.keys(req.query).length > 0) {
      console.log(`❓ Query Params:`, req.query);
    }
    
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`📦 Request Body:`, JSON.stringify(req.body, null, 2).substring(0, 500));
    }
    
    // Log response
    const originalSend = res.send;
    res.send = function(data) {
      console.log(`✅ [${timestamp}] Response ${res.statusCode} for ${method} ${url}`);
      if (res.statusCode >= 400) {
        console.log(`❌ Error Response:`, data ? data.substring(0, 200) : 'No data');
      }
      originalSend.call(this, data);
    };
    
    next();
  };
} 
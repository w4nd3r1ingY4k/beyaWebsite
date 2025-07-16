// API Configuration
// Handles different API endpoints for different environments

interface APIConfig {
  API_GATEWAY_URL: string;
  AI_SERVICE_URL: string;
}

// Helper to get env variable or fallback
const env = (key: string, fallback: string) =>
  (typeof process !== 'undefined' && process.env[key]) ? process.env[key] as string : fallback;

// Environment-based configuration using .env variables
const config: APIConfig = {
  // Integration service (port 2074)
  API_GATEWAY_URL: env('REACT_APP_API_GATEWAY_URL', 'http://beya-polling-nlb-3031d63a230444c0.elb.us-east-1.amazonaws.com:2074'),
  // AI service (port 2075)
  AI_SERVICE_URL: env('REACT_APP_AI_SERVICE_URL', 'http://beya-polling-nlb-3031d63a230444c0.elb.us-east-1.amazonaws.com:2075'),
};

// Export individual endpoints for easy importing
export const API_ENDPOINTS = {
  // Integration service endpoints (port 2074)
  WORKFLOW: `${config.API_GATEWAY_URL}/workflow`,
  WHATSAPP_CONNECT: `${config.API_GATEWAY_URL}/whatsapp/connect`,
  GMAIL_CONNECT: `${config.API_GATEWAY_URL}/gmail/connect`,
  INTEGRATIONS_SETUP: `${config.API_GATEWAY_URL}/api/integrations/setup-polling`,
  BACKEND_URL: config.API_GATEWAY_URL, // Export base URL for components that need it

  // AI service endpoints (port 2075)
  QUERY_AI: `${config.AI_SERVICE_URL}/api/v1/query-with-ai`,
  SEARCH_CONTEXT: `${config.AI_SERVICE_URL}/api/v1/search-context`,
  CUSTOMER_CONTEXT: `${config.AI_SERVICE_URL}/api/v1/customer-context`,
  ANALYZE_DRAFT: `${config.AI_SERVICE_URL}/api/v1/analyze-draft`,
  SUGGEST_REPLY: `${config.AI_SERVICE_URL}/api/v1/suggest-reply`,
  AI_HEALTH: `${config.AI_SERVICE_URL}/health`,

  // Lambda Function URLs (from .env or fallback)
  GET_USER: env('REACT_APP_GET_USER_URL', ''),
  CREATE_USER: env('REACT_APP_CREATE_USER_URL', ''),
  UPDATE_USER: env('REACT_APP_UPDATE_USER_URL', ''),
  GMAIL_WORKFLOW_MANAGER: env('REACT_APP_GMAIL_WORKFLOW_MANAGER_URL', ''),
  FLOW_COMMENTS: env('REACT_APP_FLOW_COMMENTS_URL', ''),
  DISCUSSIONS: env('REACT_APP_DISCUSSIONS_URL', ''),
  FLOW_STATUS_UPDATE: env('REACT_APP_FLOW_STATUS_UPDATE_URL', ''),

  // API Gateway endpoints for inbox/messaging services
  INBOX_API_BASE: env('REACT_APP_INBOX_API_BASE', ''),
  CONTACTS_API_BASE: env('REACT_APP_CONTACTS_API_BASE', ''),
  SCHEDULE_API_BASE: env('REACT_APP_SCHEDULE_API_BASE', ''),

  // Specific endpoints
  TEMPLATES: env('REACT_APP_TEMPLATES_URL', ''),
  REMINDERS: env('REACT_APP_REMINDERS_URL', ''),
} as const;

export default config; 
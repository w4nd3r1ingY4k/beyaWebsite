// API Configuration
// Handles different API endpoints for different environments

interface APIConfig {
  API_GATEWAY_URL: string;
}

// Helper to get env variable or fallback
const env = (key: string, fallback: string) =>
  (typeof process !== 'undefined' && process.env[key]) ? process.env[key] as string : fallback;

// Environment-based configuration using .env variables
const config: APIConfig = {
  API_GATEWAY_URL: env('REACT_APP_API_GATEWAY_URL', 'http://localhost:2074'),
};

// Export individual endpoints for easy importing
export const API_ENDPOINTS = {
  // Main backend endpoints via API Gateway
  WORKFLOW: `${config.API_GATEWAY_URL}/workflow`,
  QUERY_AI: `${config.API_GATEWAY_URL}/api/v1/query-with-ai`,
  WHATSAPP_CONNECT: `${config.API_GATEWAY_URL}/whatsapp/connect`,
  GMAIL_CONNECT: `${config.API_GATEWAY_URL}/gmail/connect`,
  INTEGRATIONS_SETUP: `${config.API_GATEWAY_URL}/api/integrations/setup-polling`,
  BACKEND_URL: config.API_GATEWAY_URL, // Export base URL for components that need it

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
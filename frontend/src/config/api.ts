// API Configuration
// Handles different API endpoints for different environments

interface APIConfig {
  BACKEND_URL: string;
  FARGATE_SERVICE_URL: string;
  // Add other API endpoints here
}

// Force production URLs for testing (set to true to test production endpoints locally)
const FORCE_PRODUCTION_URLS = true;

// Detect environment
const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
const isProduction = process.env.NODE_ENV === 'production';

// Environment-based configuration
const config: APIConfig = {
  BACKEND_URL: (isDevelopment && !FORCE_PRODUCTION_URLS)
    ? 'http://localhost:2074' 
    : 'https://t3p58b0b30.execute-api.us-east-1.amazonaws.com', // New API Gateway endpoint
  
  FARGATE_SERVICE_URL: (isDevelopment && !FORCE_PRODUCTION_URLS)
    ? 'http://localhost:2074'
    : 'https://t3p58b0b30.execute-api.us-east-1.amazonaws.com', // New API Gateway endpoint
};

// Export individual endpoints for easy importing
export const API_ENDPOINTS = {
  // Main backend endpoints via API Gateway
  WORKFLOW: `${config.BACKEND_URL}/workflow`,
  QUERY_AI: `${config.BACKEND_URL}/api/v1/query-with-ai`,
  WHATSAPP_CONNECT: `${config.FARGATE_SERVICE_URL}/whatsapp/connect`,
  GMAIL_CONNECT: `${config.FARGATE_SERVICE_URL}/gmail/connect`,
  INTEGRATIONS_SETUP: `${config.FARGATE_SERVICE_URL}/api/integrations/setup-polling`,
  BACKEND_URL: config.BACKEND_URL, // Export base URL for components that need it
  
  // Lambda Function URLs (these remain direct Lambda URLs)
  GET_USER: 'https://qyb7x6hp2fhypw5gf7kjk3hf7a0hmoev.lambda-url.us-east-1.on.aws',
  CREATE_USER: 'https://qfk6yjyzg6utzok6gpels4cyhy0vhrmg.lambda-url.us-east-1.on.aws',
  UPDATE_USER: 'https://srt2mvwqmhos6pbp5kbj6vbsfy0aycvl.lambda-url.us-east-1.on.aws', // Updated to correct beya-update-user URL
  GMAIL_WORKFLOW_MANAGER: 'https://4it3sblmdni33lnj6no3ptsglu0yahsw.lambda-url.us-east-1.on.aws',
  FLOW_COMMENTS: 'https://pndg7ad6xttoa2qm645ryd6bii0cugff.lambda-url.us-east-1.on.aws',
  DISCUSSIONS: 'https://45lcjloxwa2wt2hfmbltw42dqm0kiaue.lambda-url.us-east-1.on.aws',
  FLOW_STATUS_UPDATE: 'https://spizyylamz3oavcuay5a3hrmsi0eairh.lambda-url.us-east-1.on.aws',
  
  // API Gateway endpoints for inbox/messaging services
  INBOX_API_BASE: 'https://8zsaycb149.execute-api.us-east-1.amazonaws.com/prod',
  CONTACTS_API_BASE: 'https://4enjn4ruh9.execute-api.us-east-1.amazonaws.com/prod',
  SCHEDULE_API_BASE: 'https://4enjn4ruh9.execute-api.us-east-1.amazonaws.com/prod',
  
  // Specific endpoints
  TEMPLATES: 'https://8zsaycb149.execute-api.us-east-1.amazonaws.com/templates',
  REMINDERS: 'https://8zsaycb149.execute-api.us-east-1.amazonaws.com/reminders',
} as const;

export default config; 
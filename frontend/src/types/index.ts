/**
 * Beya Types Index
 * Central export point for all TypeScript type definitions
 */

// Database schema types
export * from './database';

// Re-export the most commonly used types for convenience
export type {
  // Core messaging
  Message,
  MessageThread,
  Flow,
  FlowComment,
  
  // Team collaboration
  Discussion,
  DiscussionMessage,
  
  // User management
  User,
  Contact,
  
  // Integrations
  IntegrationSession,
  GmailWorkflow,
  Reminder,
  
  // Utility types
  Status,
  Channel,
  MessageDirection,
  ServiceType,
  ApiResponse,
  PaginatedResponse,
  
  // Filters
  MessageFilter,
  FlowFilter,
  ContactFilter,
} from './database'; 
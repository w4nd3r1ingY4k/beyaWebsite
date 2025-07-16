/**
 * Comprehensive TypeScript Types for Beya Database Schemas
 * Generated from AWS DynamoDB table analysis
 * 
 * Tables analyzed:
 * - Messages (218 items) - Core messaging system
 * - Flows (61 items) - Conversation flows/threads
 * - Discussions (2 items) - Team discussions
 * - DiscussionMessages (5 items) - Messages within discussions
 * - FlowComments (7 items) - Comments on flows
 * - Users (4 items) - User accounts
 * - Contacts (27,722 items) - Customer contact database
 * - ThreadToFlow (0 items) - Mapping table
 * - FlowTags (0 items) - Flow tagging system
 * - beya-integration-sessions (4 items) - Service integrations
 * - beya-reminders (5 items) - Reminder system
 * - beya-gmail-workflows (4 items) - Gmail workflow management
 * - AuthStateTable (0 items) - Authentication state
 */

// =============================================================================
// CORE MESSAGING SYSTEM
// =============================================================================

/**
 * Messages Table Schema
 * Primary Key: ThreadId (HASH) + Timestamp (RANGE)
 * GSI: User-Messages-Index (userId + ThreadIdTimestamp)
 */
export interface Message {
  // Primary Keys
  ThreadId: string;
  Timestamp: number;
  
  // GSI Key
  ThreadIdTimestamp: string; // Format: "ThreadId#Timestamp"
  userId: string;
  
  // Core Message Data
  MessageId: string;
  Body: string;
  Direction: 'incoming' | 'outgoing';
  Channel: 'whatsapp' | 'email' | 'sms';
  
  // Email Participants (NEW for CC/BCC support)
  To?: string[];           // Primary recipients
  CC?: string[];           // CC recipients
  BCC?: string[];          // BCC recipients (only visible to sender)
  From?: string;           // Sender email
  
  // Email-specific fields
  Subject?: string;        // Email subject
  HtmlBody?: string;       // HTML content
  Headers?: Record<string, any>; // Email headers
  
  // Optional Template Information (for outgoing messages)
  TemplateInfo?: {
    name: string;
    language: string;
  };
  
  // Optional Result Information (API response data)
  Result?: {
    MessageId?: string;
    [key: string]: any;
  };
  
  // Additional fields
  IsUnread?: boolean;
  Provider?: string;       // 'ses' | 'gmail-mcp'
  InReplyTo?: string;      // For threading
}

/**
 * Thread-based message grouping
 */
export interface MessageThread {
  threadId: string;
  messages: Message[];
  lastMessageAt: number;
  messageCount: number;
  participants: string[];
  channel: string;
}

// =============================================================================
// FLOWS SYSTEM (Conversation Management)
// =============================================================================

/**
 * Flows Table Schema
 * Primary Key: contactId (HASH) + flowId (RANGE)
 */
export interface Flow {
  // Primary Keys
  contactId: string;
  flowId: string;
  
  // Flow Metadata
  subject?: string;
  normalizedSubject?: string;
  status: 'open' | 'closed' | 'pending' | 'resolved';
  createdAt: number;
  lastMessageAt: number | string; // Can be number or email string
  messageCount: number;
  
  // Contact & Threading Information
  contactIdentifier: string; // Email, phone, etc.
  threadingKey?: string; // For email: "email#subject"
  threadingType?: 'email-subject' | 'phone-number' | 'user-id';
  
  // Enhanced Participant Support (NEW for CC/BCC)
  participants: string[];     // All email addresses involved in thread
  primaryContact: string;     // Main contact (for threading)
  participantHistory: {       // Track participant changes over time
    [messageId: string]: {
      To: string[];
      CC?: string[];
      BCC?: string[];  // Only visible to thread owner
      timestamp: number;
    };
  };
  
  // Tags and Organization
  tags: string[]; // Default includes "all"
}

/**
 * FlowComments Table Schema
 * Primary Key: flowId (HASH) + createdAt (RANGE)
 */
export interface FlowComment {
  // Primary Keys
  flowId: string;
  createdAt: string; // ISO timestamp
  
  // Comment Data
  commentId: string;
  text: string;
  authorId: string;
  authorName: string;
}

/**
 * FlowTags Table Schema (Many-to-Many relationship)
 * Primary Key: flowId (HASH) + tag (RANGE)
 * GSI: TagIndex (tag + flowId)
 */
export interface FlowTag {
  flowId: string;
  tag: string;
}

/**
 * ThreadToFlow Mapping Table Schema
 * Primary Key: threadId (HASH)
 */
export interface ThreadToFlow {
  threadId: string;
  flowId?: string;
  contactId?: string;
  createdAt?: number;
}

// =============================================================================
// DISCUSSIONS SYSTEM (Team Collaboration)
// =============================================================================

/**
 * Discussions Table Schema
 * Primary Key: discussionId (HASH)
 */
export interface Discussion {
  // Primary Key
  discussionId: string;
  
  // Discussion Metadata
  title: string;
  status: 'open' | 'closed';
  createdAt: number;
  createdBy: string;
  lastMessageAt: number;
  messageCount: number;
  
  // Participants and Organization
  participants: string[]; // Array of userIds
  primaryTag: string;
  tags: string[]; // Additional tags
  secondaryTags: string[]; // Secondary classification
}

/**
 * DiscussionMessages Table Schema
 * Primary Key: discussionId (HASH) + createdAt (RANGE)
 */
export interface DiscussionMessage {
  // Primary Keys
  discussionId: string;
  createdAt: number;
  
  // Message Data
  messageId: string;
  content: string;
  authorId: string;
  authorName: string;
}

// =============================================================================
// USER MANAGEMENT
// =============================================================================

/**
 * Users Table Schema
 * Primary Key: userId (HASH)
 * GSI: EmailIndex (subscriber_email)
 */
export interface User {
  // Primary Key
  userId: string;
  
  // User Profile
  displayName: string;
  subscriber_email: string; // GSI key
  createdAt: string; // ISO timestamp
  lastLoginAt: string; // ISO timestamp
  
  // Optional Profile Data
  companyId?: string | null;
  timezone?: string | null;
  
  // Connected Services
  connectedAccounts: {
    gmail?: string; // Status or account identifier
    whatsappBusiness?: string; // Phone number
    [service: string]: string | undefined;
  };
}

// =============================================================================
// CONTACTS SYSTEM
// =============================================================================

/**
 * Contacts Table Schema - Comprehensive Customer Database
 * Primary Key: GoldenContactID (HASH)
 * GSI: ByEmail (PRIMARY_EMAIL), ByLastName (LAST_NAME)
 */
export interface Contact {
  // Primary Key
  GoldenContactID: string;
  
  // Core Contact Information
  FIRST_NAME: string;
  LAST_NAME: string;
  PRIMARY_EMAIL: string;
  
  // Contact Methods
  EMAIL_1?: string;
  EMAIL_2?: string;
  EMAIL_3?: string;
  EMAIL_4?: string;
  EMAIL_5?: string;
  
  PHONE1_1?: string;
  PHONE1_2?: string;
  PHONE1_3?: string;
  PHONE1_4?: string;
  PHONE1_5?: string;
  
  // Address Information
  "PRIMARY_CITY_\r\n_(Updated_with_proper_format)"?: string;
  "BILLING\r\n_PRIMARY_ADDRESS\r\n__(Updated_with_proper_format)"?: string;
  "BILLING\r\n_PRIMARY_ZIP_CODE_(Default)"?: string;
  "BILLING\r\n_PRIMARY_PROVINCE\r\n__(Default)"?: string;
  "BILLING`\r\n_PRIMARY_COUNTRY_(Default)"?: string;
  "BILLING\r\n_PRIMARY_COUNTRY_CODE\r\n__(Default)"?: string;
  "BILLING\r\n_PRIMARY_PROVINCE_CODE\r\n_(default)"?: string;
  
  // Shipping Information
  "SHIPPING_ADDRESS_(ORDER_ADDRESS)"?: string;
  "SHIPPING_(ORDER_CITY)_(PROPER)"?: string;
  "SHIPPING_(ORDER_ZIP_CODE)"?: string;
  "SHIPPING_(ORDER_PROVINCE)"?: string;
  "SHIPPING_(ORDER_COUNTRY)"?: string;
  "SHIPPING_PHONE_(ORDER_ADDRESS)"?: string;
  
  // Order & Sales Data
  ORDER_COUNT: string;
  ORDER_COUNT_1?: string;
  ORDER_COUNT_2?: string;
  ORDER_COUNT_3?: string;
  ORDER_COUNT_4?: string;
  ORDER_COUNT_5?: string;
  
  TOTAL_SPEND: string;
  TOTAL_SPEND_1?: string;
  TOTAL_SPEND_2?: string;
  TOTAL_SPEND_3?: string;
  TOTAL_SPEND_4?: string;
  TOTAL_SPEND_5?: string;
  
  LAST_ORDER_DATE: string;
  LAST_ORDER_DATE_1?: string;
  LAST_ORDER_DATE_2?: string;
  LAST_ORDER_DATE_3?: string;
  LAST_ORDER_DATE_4?: string;
  LAST_ORDER_DATE_5?: string;
  
  // Shopify Integration
  ShopifyID_1?: string;
  ShopifyID_2?: string;
  ShopifyID_3?: string;
  ShopifyID_4?: string;
  ShopifyID_5?: string;
  All_Merged_ShopifyIDs?: string;
  
  // Data Quality & Deduplication
  email_dupe_count: number;
  phone_dupe_count: number;
  email_is_dupe: boolean;
  phone_is_dupe: boolean;
  cluster_size: number;
  cluster_id: number;
  Records_Merged: number;
  dup_status: string;
  
  // Store & Business Data
  STORE: string;
  EXTRAPOLATED_COUNTRY: string;
  Country_Code: string;
  Recently_ordered: boolean;
  
  // Hubspot Integration Fields
  "PRIMARY ARCHETYPE (from hubspot)"?: string;
  "SECONDARY ARCHETYPE \r\n(from hubspot)"?: string;
  "SAFIYAA REGION (from Hubspot)"?: string;
  "SALES CHANNEL \r\n(from Hubspot which is from Power BI)"?: string;
  "HIGHEST SALES CHANNEL (from hubspot)"?: string;
  "CLIENT INNER TIER \r\n(from hubspot)"?: string;
  "FRIENDS OF HOUSE (from Hubspot)"?: string;
  "DANIELA PERSONAL (from Hubspot)"?: string;
  "EVENT PREFRENCES (from Hubspot)"?: string;
  "EVENT OUTREACH\r\n (from Hubspot)"?: string;
  "RELEVANT DETAILS (from Hubspot - from all clients list)"?: string;
  "RECENT CLOSED ORDER DATE (from Hubspot)"?: string;
  
  // Computed Fields
  email_norm: string;
  phone_list: string; // JSON array as string
  Phone1_worked?: string;
  Phone2_Worked?: string;
  Phone3_Worked?: string;
  normalized_last_order: string;
  last_order_dt: number;
  
  // Additional Fields
  has_courier_info: boolean;
  "Default.company"?: string;
  match_type_formula: string;
  "match_type_formula.1": string;
  Email_match_count?: string;
  Phone_Match_Count?: string;
  
  // Address Variants
  "SECONDARY_ADDRESS_\r\n_(Default)"?: string;
  "BILLING+SHIP_Country"?: string;
  SHIPPING_ADDRESS_1?: string;
  SHIPPING_ADDRESS_2?: string;
  SHIPPING_ADDRESS_3?: string;
  SHIPPING_ADDRESS_4?: string;
  SHIPPING_ADDRESS_5?: string;
  
  // Phone Variants
  "BILLING\r\n_PRIMARY_PHONE"?: string;
  "BILLING\r\n_SECONDARY_PHONE"?: string;
  "BILLING\r\n_TERITIARY_PHONE"?: string;
  
  // Additional Order Data
  ORDER_ADDRESSES?: string;
  "normalized_last_order.1"?: string;
}

// =============================================================================
// INTEGRATION SYSTEM
// =============================================================================

/**
 * Integration Sessions Table Schema
 * Primary Key: userId (HASH) + serviceType (RANGE)
 * GSI: ServiceType-Index, Active-Sessions-Index
 */
export interface IntegrationSession {
  // Primary Keys
  userId: string;
  serviceType: 'gmail' | 'whatsapp' | 'shopify' | 'business-central';
  
  // Session Management
  sessionId: string; // Format: "userId#serviceType"
  isActive: string; // "true" | "false" (DynamoDB stores as string)
  createdAt: string; // ISO timestamp
  lastPollAt: string; // ISO timestamp
  
  // Polling Configuration
  pollingIntervalMs: number;
  errorCount: number;
  
  // Service-Specific Configuration
  webhookUrl?: string;
  serviceState?: {
    emailAddress?: string;
    lastHistoryId?: string;
    [key: string]: any;
  };
}

/**
 * Gmail Workflows Table Schema
 * Primary Key: userId (HASH)
 */
export interface GmailWorkflow {
  // Primary Key
  userId: string;
  
  // Workflow Data
  workflowId: string;
  status: 'created_from_template' | 'active' | 'paused' | 'error';
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  
  // Gmail Integration
  userEmail: string;
  gmailAccountId: string; // Pipedream account ID (e.g., "apn_MGh0xoa")
  webhook_url: string; // Pipedream webhook URL
}

// =============================================================================
// REMINDERS SYSTEM
// =============================================================================

/**
 * Reminders Table Schema
 * Primary Key: reminderID (HASH)
 * GSI: userID-scheduledTime-index
 */
export interface Reminder {
  // Primary Key
  reminderID: string;
  
  // User & Contact Information
  userID: string;
  userEmail: string;
  contactEmail: string;
  
  // Reminder Details
  reminderType: 'follow_up' | 'appointment' | 'task' | 'deadline';
  note: string;
  scheduledTime: string; // ISO timestamp
  status: 'pending' | 'sent' | 'cancelled' | 'failed';
  
  // Thread Context
  threadID: string;
  threadTitle: string;
  
  // Audit Fields
  createdAt: string; // ISO timestamp
  sentAt?: string; // ISO timestamp when sent
}

// =============================================================================
// AUTHENTICATION
// =============================================================================

/**
 * AuthStateTable Schema (Currently empty but defined for OAuth flows)
 * Primary Key: TBD (likely state token or user session)
 */
export interface AuthState {
  [key: string]: any; // Structure TBD based on usage
}

// =============================================================================
// UTILITY TYPES & ENUMS
// =============================================================================

/**
 * Common status types across the system
 */
export type Status = 'open' | 'closed' | 'pending' | 'resolved' | 'active' | 'inactive';

/**
 * Communication channels supported
 */
export type Channel = 'whatsapp' | 'email' | 'sms' | 'voice';

/**
 * Message direction
 */
export type MessageDirection = 'incoming' | 'outgoing';

/**
 * Service types for integrations
 */
export type ServiceType = 'gmail' | 'whatsapp' | 'shopify' | 'business-central' | 'klaviyo' | 'square';

/**
 * Reminder types
 */
export type ReminderType = 'follow_up' | 'appointment' | 'task' | 'deadline';

/**
 * User connection status for services
 */
export interface ConnectedService {
  status: 'connected' | 'disconnected' | 'error';
  identifier?: string; // Phone number, email, account ID, etc.
  lastSync?: string;
  metadata?: Record<string, any>;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated response for list endpoints
 */
export interface PaginatedResponse<T> {
  items: T[];
  count: number;
  lastEvaluatedKey?: Record<string, any>;
  hasMore: boolean;
}

/**
 * DynamoDB scan/query response structure
 */
export interface DynamoDBResponse<T> {
  Items: T[];
  Count: number;
  ScannedCount: number;
  LastEvaluatedKey?: Record<string, any>;
}

// =============================================================================
// SEARCH & FILTERING
// =============================================================================

/**
 * Search filters for messages
 */
export interface MessageFilter {
  threadId?: string;
  userId?: string;
  channel?: Channel;
  direction?: MessageDirection;
  startDate?: number;
  endDate?: number;
  searchText?: string;
}

/**
 * Search filters for flows
 */
export interface FlowFilter {
  contactId?: string;
  status?: Status;
  tags?: string[];
  startDate?: number;
  endDate?: number;
  searchText?: string;
}

/**
 * Search filters for contacts
 */
export interface ContactFilter {
  email?: string;
  lastName?: string;
  country?: string;
  recentlyOrdered?: boolean;
  minSpend?: number;
  maxSpend?: number;
}

// =============================================================================
// EMAIL PARTICIPANT TYPES (CC/BCC Support)
// =============================================================================

/**
 * Email participant with role
 */
export interface EmailParticipant {
  email: string;
  name?: string;
  role: 'to' | 'cc' | 'bcc';
}

/**
 * Participant selection for replies
 */
export interface ParticipantSelection {
  to: string[];
  cc: string[];
  bcc: string[];
  keepInThread: string[]; // Participants to keep in future replies
}

/**
 * Thread participant management
 */
export interface ThreadParticipants {
  all: string[];           // All participants who have been in the thread
  current: string[];       // Participants in the latest message
  primary: string;         // Main contact for threading
  canEdit: boolean;        // Whether user can modify participants
}

/**
 * Compose/Reply email data
 */
export interface EmailComposition {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  isReply: boolean;
  originalMessageId?: string;
  threadId?: string;
  replyToAll?: boolean;
}

// All types are already exported above with their interface/type declarations
// No need for additional export statements 
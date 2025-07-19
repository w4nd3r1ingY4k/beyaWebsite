/**
 * Comprehensive Task Management System Types for Beya
 * 
 * Features:
 * - Spaces & Boards organization
 * - SLA Builder & Enforcement
 * - Automations & Escalations
 * - Flexible Views (Kanban, List, Calendar)
 * - Sub-Tasks & Issue Linking
 * - Threaded Collaboration
 * - Audit Trail & Reporting
 */

// =============================================================================
// CORE TASK MANAGEMENT TYPES
// =============================================================================

export interface Space {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isActive: boolean;
  settings: {
    defaultSLA?: string;
    autoAssignment?: boolean;
    requireApproval?: boolean;
  };
}

export interface Board {
  id: string;
  spaceId: string;
  name: string;
  description?: string;
  type: 'kanban' | 'list' | 'calendar' | 'timeline';
  columns: BoardColumn[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isActive: boolean;
  settings: {
    allowSubTasks: boolean;
    allowLinking: boolean;
    requireDueDate: boolean;
    defaultAssignee?: string;
    defaultPriority: 'low' | 'medium' | 'high' | 'urgent';
  };
}

export interface BoardColumn {
  id: string;
  name: string;
  color: string;
  status: string;
  order: number;
  wipLimit?: number; // Work in progress limit
  isDefault?: boolean;
}

export interface Task {
  id: string;
  boardId: string;
  spaceId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  
  // Assignment & Ownership
  assignee?: string;
  reporter: string;
  watchers: string[];
  
  // Dates & Timing
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  startDate?: string;
  completedAt?: string;
  
  // SLA & Escalation
  slaId?: string;
  slaStatus: SLAStatus;
  responseDueAt?: string;
  resolutionDueAt?: string;
  escalatedAt?: string;
  escalationLevel: number;
  
  // Organization
  tags: string[];
  labels: string[];
  category?: string;
  
  // Relationships
  parentTaskId?: string;
  subTasks: string[];
  linkedTasks: LinkedTask[];
  
  // Custom Fields (extensible)
  customFields: Record<string, any>;
  
  // Metadata
  estimatedHours?: number;
  actualHours?: number;
  storyPoints?: number;
  
  // Attachments
  attachments: Attachment[];
  
  // Audit
  version: number;
  lastModifiedBy: string;
}

export interface SubTask {
  id: string;
  parentTaskId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignee?: string;
  dueDate?: string;
  completedAt?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedTask {
  taskId: string;
  relationship: 'blocks' | 'blocked_by' | 'duplicates' | 'related_to' | 'parent_of' | 'child_of';
  createdAt: string;
  createdBy: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  content: string;
  isInternal: boolean;
  mentions: string[];
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  editedBy?: string;
}

export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

// =============================================================================
// SLA MANAGEMENT TYPES
// =============================================================================

export interface SLA {
  id: string;
  name: string;
  description?: string;
  spaceId?: string; // If null, applies to all spaces
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  
  // Response & Resolution Targets
  responseTime: SLATime;
  resolutionTime: SLATime;
  
  // Business Hours
  businessHours: BusinessHours;
  
  // Escalation Rules
  escalationRules: EscalationRule[];
  
  // Conditions (when this SLA applies)
  conditions: SLACondition[];
}

export interface SLATime {
  value: number;
  unit: 'minutes' | 'hours' | 'days' | 'business_days';
  startFrom: 'creation' | 'first_response' | 'assignment';
}

export interface BusinessHours {
  timezone: string;
  workingDays: number[]; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  holidays: string[]; // ISO date strings
}

export interface EscalationRule {
  level: number;
  timeAfterBreach: SLATime;
  actions: EscalationAction[];
  notifyUsers: string[];
}

export interface EscalationAction {
  type: 'assign' | 'notify' | 'change_priority' | 'change_status' | 'create_automation';
  target: string;
  value: any;
}

export interface SLACondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface SLAStatus {
  slaId: string;
  responseBreached: boolean;
  resolutionBreached: boolean;
  responseTimeRemaining?: number; // seconds
  resolutionTimeRemaining?: number; // seconds
  lastEscalationAt?: string;
  escalationLevel: number;
}

// =============================================================================
// AUTOMATION & WORKFLOW TYPES
// =============================================================================

export interface Automation {
  id: string;
  name: string;
  description?: string;
  spaceId?: string;
  boardId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  
  // Trigger
  trigger: AutomationTrigger;
  
  // Conditions
  conditions: AutomationCondition[];
  
  // Actions
  actions: AutomationAction[];
  
  // Settings
  settings: {
    runOnce: boolean;
    delay?: number; // seconds
    maxRuns?: number;
  };
}

export interface AutomationTrigger {
  type: 'task_created' | 'task_updated' | 'task_status_changed' | 'task_assigned' | 'sla_breached' | 'due_date_approaching' | 'comment_added' | 'schedule';
  config: Record<string, any>;
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'is_empty' | 'is_not_empty';
  value: any;
  logicalOperator?: 'and' | 'or';
}

export interface AutomationAction {
  type: 'assign_task' | 'change_status' | 'change_priority' | 'add_comment' | 'add_label' | 'set_due_date' | 'notify_user' | 'create_subtask' | 'link_task' | 'webhook';
  config: Record<string, any>;
}

// =============================================================================
// VIEW & DISPLAY TYPES
// =============================================================================

export interface View {
  id: string;
  name: string;
  type: 'kanban' | 'list' | 'calendar' | 'timeline' | 'gantt';
  boardId?: string;
  spaceId?: string;
  isDefault: boolean;
  isShared: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // View Configuration
  config: ViewConfig;
  
  // Filters & Sorting
  filters: ViewFilter[];
  sortBy: SortOption[];
  groupBy?: string;
}

export interface ViewConfig {
  columns?: string[];
  showSubTasks: boolean;
  showLinkedTasks: boolean;
  showSLA: boolean;
  showTimeTracking: boolean;
  compactMode: boolean;
  autoRefresh: boolean;
  refreshInterval?: number;
}

export interface ViewFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'is_empty' | 'is_not_empty';
  value: any;
  logicalOperator?: 'and' | 'or';
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

// =============================================================================
// REPORTING & ANALYTICS TYPES
// =============================================================================

export interface Report {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  spaceId?: string;
  boardId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isShared: boolean;
  
  // Configuration
  config: ReportConfig;
  
  // Schedule
  schedule?: ReportSchedule;
}

export interface ReportConfig {
  metrics: ReportMetric[];
  filters: ViewFilter[];
  groupBy?: string[];
  timeRange: TimeRange;
  chartType?: 'bar' | 'line' | 'pie' | 'table' | 'gauge';
}

export interface ReportMetric {
  name: string;
  type: 'count' | 'sum' | 'average' | 'percentage' | 'sla_compliance';
  field: string;
  calculation?: string;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:mm format
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv';
}

export interface TimeRange {
  type: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year' | 'custom';
  startDate?: string;
  endDate?: string;
}

// =============================================================================
// AUDIT TRAIL TYPES
// =============================================================================

export interface AuditLog {
  id: string;
  entityType: 'task' | 'comment' | 'sla' | 'automation' | 'space' | 'board';
  entityId: string;
  action: string;
  userId: string;
  userName: string;
  timestamp: string;
  changes: AuditChange[];
  metadata: Record<string, any>;
}

export interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
}

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type TaskStatus = 'open' | 'in_progress' | 'under_review' | 'waiting_for_customer' | 'waiting_for_third_party' | 'resolved' | 'closed' | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskType = 'bug' | 'feature' | 'task' | 'incident' | 'request' | 'question' | 'improvement';

export type ReportType = 'sla_compliance' | 'ticket_volume' | 'resolution_time' | 'assignee_performance' | 'customer_satisfaction' | 'custom';

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface TaskManagementResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TaskFilter {
  spaceId?: string;
  boardId?: string;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assignee?: string;
  reporter?: string;
  tags?: string[];
  labels?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
  createdDateFrom?: string;
  createdDateTo?: string;
  search?: string;
  slaBreached?: boolean;
  hasSubTasks?: boolean;
  parentTaskId?: string;
}

export interface TaskBulkUpdate {
  taskIds: string[];
  updates: Partial<Task>;
  comment?: string;
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export interface TaskNotification {
  id: string;
  userId: string;
  taskId: string;
  type: 'assignment' | 'mention' | 'comment' | 'status_change' | 'due_date' | 'sla_breach' | 'escalation';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata: Record<string, any>;
}

// =============================================================================
// TEMPLATE TYPES
// =============================================================================

export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  spaceId?: string;
  boardId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Template Data
  title: string;
  templateDescription: string;
  priority: TaskPriority;
  type: TaskType;
  tags: string[];
  labels: string[];
  customFields: Record<string, any>;
  
  // Default Values
  defaultAssignee?: string;
  defaultDueDate?: number; // days from creation
  defaultSLA?: string;
  
  // Sub-tasks
  subTasks: SubTaskTemplate[];
}

export interface SubTaskTemplate {
  title: string;
  description?: string;
  order: number;
  estimatedHours?: number;
} 
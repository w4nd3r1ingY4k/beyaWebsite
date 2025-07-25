// services/tasksService.ts

const API_BASE = process.env.REACT_APP_TASKS_API_URL;

export interface Task {
  taskId: string;
  boardId: string;
  spaceId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'review' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string;
  reporterId: string;
  slaId?: string;
  slaStatus?: {
    responseTime?: number;
    resolutionTime?: number;
    isOverdue: boolean;
    escalationLevel: number;
  };
  tags: string[];
  followers: string[];
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
}

export interface Space {
  spaceId: string;
  name: string;
  description: string;
  ownerId: string;
  userId?: string; // For creation
  settings: {
    defaultSLA?: string;
    businessHours: {
      [key: string]: { start: string; end: string };
    };
    autoAssignment?: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  boardId: string;
  spaceId: string;
  name: string;
  type: 'kanban' | 'list' | 'calendar';
  columns: Array<{
    id: string;
    name: string;
    order: number;
  }>;
  settings: {
    workflow: any;
    automations: any[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  commentId: string;
  taskId: string;
  authorId: string;
  content: string;
  type: 'public' | 'internal';
  mentions: string[];
  attachments: string[];
  parentCommentId?: string;
  createdAt: string;
}

export interface SubTask {
  subTaskId: string;
  taskId: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigneeId?: string;
  order: number;
  createdAt: string;
}

export interface SLAPolicy {
  id: string;
  name: string;
  spaceId: string;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  businessHours: {
    [key: string]: { start: string; end: string };
  };
  escalationRules: Array<{
    level: number;
    triggerMinutes: number;
    action: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Helper for POST requests with error handling
async function postToLambda(route: string, body: any) {
  try {
    const response = await fetch(`${API_BASE}/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }
    return data.result || data;
  } catch (err: any) {
    return Promise.reject({ message: err.message || 'Unknown error', status: err.status || 500 });
  }
}

class TasksService {
  async createSpace(payload: Partial<Space>) {
    return postToLambda('createSpace', { operation: 'createSpace', payload });
  }
  async createBoard(payload: Partial<Board>) {
    return postToLambda('createBoard', { operation: 'createBoard', payload });
  }
  async createTask(payload: Partial<Task>) {
    return postToLambda('createTask', { operation: 'createTask', payload });
  }
  async getTasksByBoard(boardId: string, userId: string) {
    const result = await postToLambda('getTasksByBoard', { operation: 'getTasksByBoard', payload: { boardId, userId } });
    return result.tasks; // Return the array directly
  }
  async getTask(taskId: string, userId: string) {
    return postToLambda('getTask', { operation: 'getTask', payload: { taskId, userId } });
  }
  async updateTask(taskId: string, userId: string, updates: Partial<Task>) {
    return postToLambda('updateTask', { operation: 'updateTask', payload: { taskId, userId, updates } });
  }
  async createComment(payload: Partial<Comment>) {
    return postToLambda('createComment', { operation: 'createComment', payload });
  }
  async getCommentsByTask(taskId: string, userId: string) {
    return postToLambda('getCommentsByTask', { operation: 'getCommentsByTask', payload: { taskId, userId } });
  }
  async createSubTask(payload: Partial<SubTask>) {
    return postToLambda('createSubTask', { operation: 'createSubTask', payload });
  }
  async getSubTasksByTask(taskId: string, userId: string) {
    return postToLambda('getSubTasksByTask', { operation: 'getSubTasksByTask', payload: { taskId, userId } });
  }
  async followTask(taskId: string, userId: string) {
    return postToLambda('followTask', { operation: 'followTask', payload: { taskId, userId } });
  }
  async unfollowTask(taskId: string, userId: string) {
    return postToLambda('unfollowTask', { operation: 'unfollowTask', payload: { taskId, userId } });
  }
  async deleteTask(taskId: string, userId: string) {
    return postToLambda('deleteTask', { operation: 'deleteTask', payload: { taskId, userId } });
  }
}

export const tasksService = new TasksService();
export default tasksService; 
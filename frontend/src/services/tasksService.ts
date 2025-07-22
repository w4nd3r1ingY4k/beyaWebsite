// services/tasksService.ts

import { API_ENDPOINTS } from '@/config/api';

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

class TasksService {
  private baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:2074';

  // Spaces
  async createSpace(spaceData: Partial<Space>): Promise<Space> {
    const response = await fetch(`${this.baseUrl}/api/v1/tasks/spaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(spaceData),
    });

    if (!response.ok) {
      throw new Error('Failed to create space');
    }

    const result = await response.json();
    return result.result;
  }

  // Boards
  async createBoard(boardData: Partial<Board>): Promise<Board> {
    const response = await fetch(`${this.baseUrl}/api/v1/tasks/boards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(boardData),
    });

    if (!response.ok) {
      throw new Error('Failed to create board');
    }

    const result = await response.json();
    return result.result;
  }

  // Tasks
  async createTask(taskData: Partial<Task>): Promise<Task> {
    const response = await fetch(`${this.baseUrl}/api/v1/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData),
    });

    if (!response.ok) {
      throw new Error('Failed to create task');
    }

    const result = await response.json();
    return result.result;
  }

  async getTasksByBoard(boardId: string, userId: string): Promise<Task[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/tasks/board/${boardId}?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get tasks');
    }

    const result = await response.json();
    return result.result.tasks;
  }

  async getTask(taskId: string, userId: string): Promise<Task> {
    const response = await fetch(`${this.baseUrl}/api/v1/tasks/${taskId}?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get task');
    }

    const result = await response.json();
    return result.result;
  }

  async updateTask(taskId: string, userId: string, updates: Partial<Task>): Promise<Task> {
    const response = await fetch(`${this.baseUrl}/api/v1/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, ...updates }),
    });

    if (!response.ok) {
      throw new Error('Failed to update task');
    }

    const result = await response.json();
    return result.result;
  }

  // Comments
  async createComment(commentData: Partial<Comment>): Promise<Comment> {
    const response = await fetch(`${this.baseUrl}/api/v1/tasks/${commentData.taskId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commentData),
    });

    if (!response.ok) {
      throw new Error('Failed to create comment');
    }

    const result = await response.json();
    return result.result;
  }

  async getCommentsByTask(taskId: string, userId: string): Promise<Comment[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/tasks/${taskId}/comments?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get comments');
    }

    const result = await response.json();
    return result.result.comments;
  }

  // SubTasks
  async createSubTask(subTaskData: Partial<SubTask>): Promise<SubTask> {
    const response = await fetch(`${this.baseUrl}/api/v1/tasks/${subTaskData.taskId}/subtasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subTaskData),
    });

    if (!response.ok) {
      throw new Error('Failed to create subtask');
    }

    const result = await response.json();
    return result.result;
  }

  async getSubTasksByTask(taskId: string, userId: string): Promise<SubTask[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/tasks/${taskId}/subtasks?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get subtasks');
    }

    const result = await response.json();
    return result.result.subTasks;
  }

  // Follow/Unfollow
  async followTask(taskId: string, userId: string): Promise<Task> {
    const response = await fetch(`${this.baseUrl}/api/v1/tasks/${taskId}/follow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to follow task');
    }

    const result = await response.json();
    return result.result;
  }

  async unfollowTask(taskId: string, userId: string): Promise<Task> {
    const response = await fetch(`${this.baseUrl}/api/v1/tasks/${taskId}/follow`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to unfollow task');
    }

    const result = await response.json();
    return result.result;
  }

  // SLA
  async createSLAPolicy(slaData: Partial<SLAPolicy>): Promise<SLAPolicy> {
    const response = await fetch(`${this.baseUrl}/api/v1/sla/policies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slaData),
    });

    if (!response.ok) {
      throw new Error('Failed to create SLA policy');
    }

    const result = await response.json();
    return result.result;
  }

  async startSLATimer(taskId: string, slaId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/sla/timers/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId, slaId }),
    });

    if (!response.ok) {
      throw new Error('Failed to start SLA timer');
    }

    const result = await response.json();
    return result.result;
  }

  async checkSLACompliance(taskId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/sla/timers/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId }),
    });

    if (!response.ok) {
      throw new Error('Failed to check SLA compliance');
    }

    const result = await response.json();
    return result.result;
  }

  async pauseSLATimer(taskId: string, reason?: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/sla/timers/pause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId, reason }),
    });

    if (!response.ok) {
      throw new Error('Failed to pause SLA timer');
    }

    const result = await response.json();
    return result.result;
  }

  async resumeSLATimer(taskId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/sla/timers/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId }),
    });

    if (!response.ok) {
      throw new Error('Failed to resume SLA timer');
    }

    const result = await response.json();
    return result.result;
  }
}

export const tasksService = new TasksService();
export default tasksService; 
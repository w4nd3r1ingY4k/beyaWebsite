// discussionsService.ts

const DISCUSSIONS_API_URL = 'https://45lcjloxwa2wt2hfmbltw42dqm0kiaue.lambda-url.us-east-1.on.aws/';

export interface Discussion {
  discussionId: string;
  title: string;
  createdBy: string;
  createdAt: number;
  lastMessageAt: number;
  participants: string[];
  tags: string[];
  status: string;
  primaryTag?: string;
  secondaryTags?: string[];
  messageCount: number;
}

export interface DiscussionMessage {
  messageId: string;
  discussionId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: number;
  editedAt?: number;
}

export interface CreateDiscussionPayload {
  title: string;
  participants?: string[];
  tags?: string[];
}

export interface CreateMessagePayload {
  discussionId: string;
  content: string;
}

export interface UpdateDiscussionPayload {
  title?: string;
  participants?: string[];
  tags?: string[];
}

export interface UpdateDiscussionStatusPayload {
  status?: 'open' | 'waiting' | 'resolved' | 'overdue';
  primaryTag?: string;
  secondaryTags?: string[];
}

class DiscussionsService {
  private async makeRequest(operation: string, payload: any): Promise<any> {
    try {
      const response = await fetch(DISCUSSIONS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation,
          ...payload,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error in ${operation}:`, error);
      throw error;
    }
  }

  async listDiscussions(userId: string): Promise<Discussion[]> {
    const result = await this.makeRequest('listDiscussions', { userId });
    return result.discussions || [];
  }

  async createDiscussion(userId: string, payload: CreateDiscussionPayload): Promise<Discussion> {
    return await this.makeRequest('createDiscussion', {
      userId,
      ...payload,
    });
  }

  async getDiscussion(discussionId: string, userId: string): Promise<Discussion> {
    return await this.makeRequest('getDiscussion', { discussionId, userId });
  }

  async updateDiscussion(
    discussionId: string,
    userId: string,
    updates: UpdateDiscussionPayload
  ): Promise<{ success: boolean; discussionId: string }> {
    return await this.makeRequest('updateDiscussion', {
      discussionId,
      userId,
      updates,
    });
  }

  async updateDiscussionStatus(
    discussionId: string,
    userId: string,
    updates: UpdateDiscussionStatusPayload
  ): Promise<Discussion> {
    return await this.makeRequest('updateDiscussionStatus', {
      discussionId,
      userId,
      updates,
    });
  }

  async archiveDiscussion(discussionId: string, userId: string): Promise<{ success: boolean; discussionId: string }> {
    return await this.makeRequest('archiveDiscussion', { discussionId, userId });
  }

  async createMessage(userId: string, payload: CreateMessagePayload): Promise<DiscussionMessage> {
    return await this.makeRequest('createMessage', {
      userId,
      ...payload,
    });
  }

  async getMessages(discussionId: string, userId: string, limit = 50): Promise<DiscussionMessage[]> {
    const result = await this.makeRequest('getMessages', {
      discussionId,
      userId,
      limit,
    });
    return result.messages || [];
  }
}

export const discussionsService = new DiscussionsService(); 
/**
 * Context Manager - Maintains persistent conversation context
 * This solves the problem of lost context between follow-up questions
 */

import { promises as fs } from 'fs';
import path from 'path';

class ContextManager {
  constructor() {
    this.contextDir = '/tmp/beya-contexts'; // Use /tmp for AWS Lambda
    this.ensureContextDir();
  }

  async ensureContextDir() {
    try {
      await fs.mkdir(this.contextDir, { recursive: true });
    } catch (error) {
      console.error('❌ Failed to create context directory:', error);
    }
  }

  getContextFilePath(userId, sessionId = 'default') {
    return path.join(this.contextDir, `${userId}-${sessionId}.json`);
  }

  async getContext(userId, sessionId = 'default') {
    try {
      const filePath = this.getContextFilePath(userId, sessionId);
      const data = await fs.readFile(filePath, 'utf8');
      const context = JSON.parse(data);
      
      // Check if context is too old (more than 4 hours)
      const fourHoursAgo = Date.now() - (4 * 60 * 60 * 1000);
      if (new Date(context.lastUpdated).getTime() < fourHoursAgo) {
        console.log(`🧹 Context expired for user ${userId}, starting fresh`);
        return this.createFreshContext(userId, sessionId);
      }
      
      return context;
    } catch (error) {
      // File doesn't exist or is corrupted, create fresh context
      console.log(`📄 Creating fresh context for user ${userId}`);
      return this.createFreshContext(userId, sessionId);
    }
  }

  createFreshContext(userId, sessionId = 'default') {
    return {
      userId,
      sessionId,
      lastUpdated: new Date().toISOString(),
      context: {
        currentTopics: [],
        recentEmails: [],
        activeQuestions: [],
        keyFacts: {},
        lastAIResponse: null,
        conversationSummary: ""
      }
    };
  }

  async updateContext(userId, sessionId = 'default', updates) {
    try {
      const currentContext = await this.getContext(userId, sessionId);
      
      // Merge updates intelligently
      const updatedContext = {
        ...currentContext,
        lastUpdated: new Date().toISOString(),
        context: {
          ...currentContext.context,
          ...updates
        }
      };

      // Clean up old data (keep only last 10 items in arrays)
      if (updatedContext.context.currentTopics?.length > 10) {
        updatedContext.context.currentTopics = updatedContext.context.currentTopics.slice(-10);
      }
      if (updatedContext.context.recentEmails?.length > 10) {
        updatedContext.context.recentEmails = updatedContext.context.recentEmails.slice(-10);
      }
      if (updatedContext.context.activeQuestions?.length > 5) {
        updatedContext.context.activeQuestions = updatedContext.context.activeQuestions.slice(-5);
      }

      // Save to file
      const filePath = this.getContextFilePath(userId, sessionId);
      await fs.writeFile(filePath, JSON.stringify(updatedContext, null, 2));
      
      return updatedContext;
    } catch (error) {
      console.error('❌ Failed to update context:', error);
      return this.createFreshContext(userId, sessionId);
    }
  }

  async addEmailToContext(userId, email, userInteraction = null) {
    const emailEntry = {
      subject: email.Subject || email.subject || '(no subject)',
      sender: email.sender || this.extractSender(email),
      timeAgo: this.getTimeAgo(email.Timestamp || email.timestamp),
      userInteraction: userInteraction,
      addedAt: new Date().toISOString()
    };

    const currentContext = await this.getContext(userId);
    const recentEmails = [...(currentContext.context.recentEmails || []), emailEntry];
    
    // Extract topics from email subject
    const topics = this.extractTopics(emailEntry.subject);
    const currentTopics = [...new Set([...currentContext.context.currentTopics, ...topics])];

    return await this.updateContext(userId, 'default', {
      recentEmails,
      currentTopics
    });
  }

  async addAIResponse(userId, userQuery, aiResponse, emailsDiscussed = []) {
    const currentContext = await this.getContext(userId);
    
    // Extract new topics and facts from the conversation
    const newTopics = this.extractTopics(userQuery + ' ' + aiResponse);
    const currentTopics = [...new Set([...currentContext.context.currentTopics, ...newTopics])];
    
    // Update conversation summary
    const conversationSummary = this.buildConversationSummary(currentContext, userQuery, aiResponse);
    
    // Add any emails that were discussed
    let recentEmails = currentContext.context.recentEmails || [];
    for (const email of emailsDiscussed) {
      recentEmails.push({
        subject: email.Subject || email.subject || '(no subject)',
        sender: this.extractSender(email),
        timeAgo: this.getTimeAgo(email.Timestamp || email.timestamp),
        userInteraction: "discussed in conversation",
        addedAt: new Date().toISOString()
      });
    }

    return await this.updateContext(userId, 'default', {
      currentTopics,
      recentEmails,
      lastAIResponse: {
        query: userQuery,
        response: aiResponse,
        timestamp: new Date().toISOString()
      },
      conversationSummary
    });
  }

  buildConversationSummary(currentContext, userQuery, aiResponse) {
    // Keep a running summary of key points
    const previous = currentContext.context.conversationSummary || "";
    const newEntry = `User asked: "${userQuery}" → AI discussed: ${this.extractKeyPoints(aiResponse)}`;
    
    // Keep summary concise (last 3 exchanges)
    const entries = previous ? previous.split('\n').concat(newEntry) : [newEntry];
    return entries.slice(-3).join('\n');
  }

  extractKeyPoints(text) {
    // Extract key subjects, offers, events, etc.
    const points = [];
    
    if (text.includes('WWE') || text.includes('SummerSlam')) {
      points.push('WWE SummerSlam event');
    }
    if (text.includes('DoorDash') || text.includes('60%')) {
      points.push('DoorDash 60% off deal');
    }
    if (text.includes('Joe Jonas') || text.includes('Zelle')) {
      points.push('Joe Jonas dining/Zelle tips');
    }
    
    return points.length > 0 ? points.join(', ') : 'general email discussion';
  }

  extractTopics(text) {
    const topics = [];
    const lowerText = text.toLowerCase();
    
    // Common email topics to track
    const topicPatterns = [
      { pattern: /wwe|summerslam|wrestling/i, topic: 'WWE' },
      { pattern: /doordash|dashpass|food/i, topic: 'DoorDash' },
      { pattern: /joe jonas|dining|zelle/i, topic: 'Joe Jonas' },
      { pattern: /chase|bank/i, topic: 'Chase' },
      { pattern: /american express|amex/i, topic: 'American Express' },
      { pattern: /event|concert|show/i, topic: 'Events' },
      { pattern: /offer|deal|discount|%/i, topic: 'Offers' }
    ];

    for (const { pattern, topic } of topicPatterns) {
      if (pattern.test(text)) {
        topics.push(topic);
      }
    }

    return topics;
  }

  extractSender(email) {
    if (email.sender) return email.sender;
    if (email.Sender) return email.Sender;
    
    // Try to extract from headers or other fields
    const headers = email.Headers || email.headers || {};
    if (headers.From) return headers.From;
    if (headers.from) return headers.from;
    
    return 'Unknown sender';
  }

  getTimeAgo(timestamp) {
    if (!timestamp) return 'unknown time';
    
    const now = Date.now();
    const emailTime = new Date(timestamp).getTime();
    const diffMs = now - emailTime;
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'just now';
  }

  async getContextForPrompt(userId, sessionId = 'default') {
    const context = await this.getContext(userId, sessionId);
    
    if (!context.context.currentTopics.length && !context.context.recentEmails.length) {
      return "No previous conversation context.";
    }

    const sections = [];
    
    if (context.context.conversationSummary) {
      sections.push(`**Recent Conversation:**\n${context.context.conversationSummary}`);
    }

    if (context.context.currentTopics.length > 0) {
      sections.push(`**Current Topics:** ${context.context.currentTopics.join(', ')}`);
    }

    if (context.context.recentEmails.length > 0) {
      const emailList = context.context.recentEmails.slice(-5).map(email => 
        `• "${email.subject}" from ${email.sender} (${email.timeAgo})`
      ).join('\n');
      sections.push(`**Recently Discussed Emails:**\n${emailList}`);
    }

    if (context.context.activeQuestions.length > 0) {
      sections.push(`**Active Questions:** ${context.context.activeQuestions.join(', ')}`);
    }

    return sections.join('\n\n');
  }

  async clearContext(userId, sessionId = 'default') {
    try {
      const filePath = this.getContextFilePath(userId, sessionId);
      await fs.unlink(filePath);
      console.log(`🗑️ Cleared context for user ${userId}`);
    } catch (error) {
      // File might not exist, which is fine
      console.log(`📄 No context file to clear for user ${userId}`);
    }
  }
}

// Export both the class and singleton instance
export { ContextManager };
export const contextManager = new ContextManager();
export default contextManager; 
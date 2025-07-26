/**
 * Clear Conversation Context Function
 * Allows AI to clear stored conversation context
 */

import { getContextManager } from '../../config/clients.js';

export async function clearConversationContext(reason, userId) {
  try {
    console.log(`🗑️ AI is clearing conversation context. Reason: ${reason}`);
    
    const contextManager = getContextManager();
    
    if (contextManager) {
      await contextManager.clearContext(userId);
      console.log(`✅ Context cleared successfully for user ${userId}`);
      
      return {
        success: true,
        message: `Context cleared successfully. ${reason}`,
        userId,
        clearedAt: new Date().toISOString()
      };
    } else {
      console.log(`⚠️ Context manager not available`);
      return {
        success: false,
        message: "Context manager not available",
        userId
      };
    }
    
  } catch (error) {
    console.error(`❌ Failed to clear context:`, error);
    return {
      success: false,
      message: `Failed to clear context: ${error.message}`,
      userId
    };
  }
} 
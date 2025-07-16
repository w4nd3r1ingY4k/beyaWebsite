/**
 * Test the new persistent context system
 * This demonstrates how context is maintained across follow-up questions
 */

import { contextManager } from './services/context-manager.js';

async function testContextManager() {
  console.log('🧪 Testing Persistent Context Manager\n');
  
  const userId = 'test-user-123';
  
  // Clean start
  await contextManager.clearContext(userId);
  
  // Simulate first query: "what emails did I receive recently from chase?"
  console.log('👤 User: "what emails did I receive recently from chase?"');
  
  // Add some emails to context (simulating what tools would do)
  const mockChaseEmails = [
    {
      Subject: "Join us at WWE SummerSlam at MetLife Stadium this August 2025",
      sender: "Chase",
      Timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
    },
    {
      Subject: "Akbar, enjoy 60% off 2 DoorDash orders during Summer of DashPass",  
      sender: "Chase",
      Timestamp: new Date(Date.now() - 11 * 60 * 60 * 1000) // 11 hours ago
    }
  ];
  
  await contextManager.addAIResponse(
    userId,
    "what emails did I receive recently from chase?",
    "Hey Akbar! You've got some exciting emails from Chase. The first one invites you to WWE SummerSlam at MetLife Stadium in August 2025. The second offers a sweet deal of 60% off two DoorDash orders with a free DashPass membership.",
    mockChaseEmails
  );
  
  console.log('🤖 AI: Responded with Chase emails including WWE and DoorDash info\n');
  
  // Get context for next query
  const context1 = await contextManager.getContextForPrompt(userId);
  console.log('📝 Context after first query:');
  console.log(context1);
  console.log('\n---\n');
  
  // Simulate follow-up: "tell me more about the WWE one"
  console.log('👤 User: "tell me more about the WWE one"');
  
  await contextManager.addAIResponse(
    userId,
    "tell me more about the WWE one",
    "The WWE SummerSlam invitation is for August 2025 at MetLife Stadium. This is a big wrestling event! You'd need to check the email for specific ticket information and how to get seats.",
    []
  );
  
  console.log('🤖 AI: Provided WWE details based on context\n');
  
  // Get final context
  const context2 = await contextManager.getContextForPrompt(userId);
  console.log('📝 Context after follow-up:');
  console.log(context2);
  console.log('\n---\n');
  
  // Show how this solves the "wee" problem
  console.log('👤 User: "how do I join them at wwe in august that sounds fun"');
  console.log('🤖 With persistent context, AI now knows:');
  console.log('   - "wwe" refers to WWE SummerSlam');
  console.log('   - "them" refers to the event/Chase invitation');
  console.log('   - "august" connects to August 2025 at MetLife Stadium');
  console.log('   - Can provide specific helpful information about joining');
  
  console.log('\n✅ Context Manager Test Complete!');
}

// Run the test
testContextManager().catch(console.error); 
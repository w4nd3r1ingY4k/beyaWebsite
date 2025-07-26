/**
 * Email Search Functions - Main Orchestrator
 */

import { emailSearchTools } from './tools.js';
import { searchEmailsBySender } from './search-by-sender.js';
import { searchEmailsByTimeframe } from './search-by-timeframe.js';
import { searchEmailsBySentiment } from './search-by-sentiment.js';
import { searchEmailsSemantic } from './search-semantic.js';
import { searchEmailsBySubject } from './search-by-subject.js';
import { clearConversationContext } from './clear-context.js';
import { 
  shouldFetchThreadContext, 
  fetchMultipleThreads, 
  buildThreadContext 
} from './fetch-thread-context.js';

/**
 * Execute email search using AI function calling
 * @param {string} userQuery - The user's question
 * @param {string} userId - User ID for filtering
 * @param {Array} conversationHistory - Previous conversation context
 * @param {Object} clients - OpenAI and other clients
 * @param {Function} semanticSearch - Semantic search function
 */
export async function executeEmailSearchFunctions(userQuery, userId, conversationHistory, clients, semanticSearch) {
  try {
    const { openaiClient } = clients;
    
    if (!openaiClient) {
      console.error('❌ OpenAI client not provided to function calling');
      return { success: false, error: 'OpenAI client not initialized' };
    }
    
    console.log(`🤖 Using AI function calling for query: "${userQuery}"`);
    
    // Step 1: Call OpenAI with function definitions
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are B, your personal email assistant! 🔍 I'm here to help you find exactly what you're looking for in your inbox. 

I can search through your emails in different ways - by sender, timeframe, sentiment, content, or specific subject lines. Just tell me what you need and I'll use the best approach to find it for you.

**Special capability**: If you mention a specific email subject (like "You won't understand… yet" or "AI domain drop"), I can search directly by subject line to find the full email content, even when other search methods don't return complete results.

Be conversational, helpful, and show enthusiasm when I find relevant results. If I'm calling multiple search functions, explain what I'm doing so you know I'm working hard for you!`
        },
        {
          role: 'user', 
          content: userQuery
        }
      ],
      tools: emailSearchTools,
      tool_choice: 'auto'
    });
    
    const message = response.choices[0].message;
    
    // Step 2: Check if AI wants to call functions
    if (!message.tool_calls || message.tool_calls.length === 0) {
      console.log('🤷 AI decided not to use any search functions');
      return { success: false, reason: 'No function calls made' };
    }
    
    console.log(`🛠️ AI wants to call ${message.tool_calls.length} function(s)`);
    
    // Step 3: Execute each function call
    const functionResults = [];
    for (const toolCall of message.tool_calls) {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);
      
      console.log(`🔧 Executing function: ${functionName} with args:`, functionArgs);
      
      let result;
      switch (functionName) {
        case 'search_emails_by_sender':
          result = await searchEmailsBySender(functionArgs, userId, semanticSearch);
          break;
        case 'search_emails_by_timeframe':
          result = await searchEmailsByTimeframe(functionArgs, userId, semanticSearch);
          break;
        case 'search_emails_by_sentiment':
          result = await searchEmailsBySentiment(functionArgs, userId, semanticSearch);
          break;
        case 'search_emails_semantic':
          result = await searchEmailsSemantic(functionArgs, userId, semanticSearch);
          break;
        case 'search_emails_by_subject':
          result = await searchEmailsBySubject(functionArgs, userId);
          break;
        case 'clear_conversation_context':
          result = await clearConversationContext(functionArgs.reason, userId);
          break;
        default:
          result = { error: `Unknown function: ${functionName}` };
      }
      
      functionResults.push({
        tool_call_id: toolCall.id,
        name: functionName,
        result: result
      });
    }
    
    // Step 4: Send results back to AI for final response
    const contextMessages = [
      {
        role: 'system',
                  content: `You are B, your personal email assistant! I just searched through your emails and found some results. 

Review the search results I found and provide a helpful, conversational summary. Be specific about what I found, mention key details like senders, dates, or topics that might be relevant. 

If the results are exactly what they were looking for, be enthusiastic! If they're partial matches, explain what I found and suggest how they might refine their search.

**Formatting Guidelines:**
- Use **bold text** for important details like sender names, subject lines, or key findings
- Use *italics* for dates, times, or emphasis  
- Use bullet points for lists:
  - Like this for multiple items
  - Make it easy to scan
- Keep it conversational but well-formatted!`
      },
      {
        role: 'user',
        content: userQuery
      },
      message, // Include the AI's function calls
      ...functionResults.map(fr => ({
        role: 'tool',
        tool_call_id: fr.tool_call_id,
        content: JSON.stringify(fr.result)
      }))
    ];
    
    const finalResponse = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: contextMessages,
      max_tokens: 300,
      temperature: 0.7
    });
    
    // Combine all search results for context
    const allResults = functionResults.flatMap(fr => fr.result.emails || []);
    
    // Check if we should fetch thread context automatically
    const contextCheck = shouldFetchThreadContext(allResults);
    
    if (contextCheck.shouldFetch) {
      console.log(`🔍 Auto-fetching thread context: ${contextCheck.reason}`);
      console.log(`📋 Pinecone results sample:`, allResults.slice(0, 2).map(r => ({
        threadId: r.threadId,
        messageId: r.messageId,
        subject: r.subject,
        emailParticipant: r.emailParticipant
      })));
      
      // Send intermediate "thinking" response
      const thinkingMessage = {
        userQuery,
        aiResponse: "Let me take a deeper look... 🔍",
        isThinking: true,
                   subtext: `Fetching full context for ${contextCheck.threadData.length} email threads...`,
        contextUsed: allResults,
        responseType: 'thinking'
      };
      
                     // Fetch thread contexts using thread data with user context
        const threadData = await fetchMultipleThreads(contextCheck.threadData, 5);
       
       // Check if we have thread context data
       const hasThreadData = threadData.threads.some(thread => thread.messageCount > 0);
       
       if (!hasThreadData) {
         console.log(`⚠️ No thread context found - likely threadId format mismatch`);
         // Fall back to regular response without thread context
         return {
           success: true,
           userQuery,
           aiResponse: finalResponse.choices[0].message.content,
           contextUsed: allResults,
           responseType: 'function_calling',
           functionCalls: functionResults.map(fr => ({
             name: fr.name,
             resultCount: fr.result.emails?.length || 0
           })),
           warning: 'Thread context unavailable due to data format mismatch'
         };
       }
       
       // Build enriched context
       let enrichedContext = `${contextCheck.resultCount} emails found in search results.\n\n`;
       
       threadData.threads.forEach((thread, index) => {
         enrichedContext += buildThreadContext(thread);
         if (index < threadData.threads.length - 1) {
           enrichedContext += '\n\n=== NEXT THREAD ===\n\n';
         }
       });
      
      // Generate final response with enriched context
      const enrichedMessages = [
        {
          role: 'system',
          content: `You are B, your personal email assistant! I just searched through your emails and found some results, then fetched the FULL THREAD CONTEXT from your email database.

Review both the search results AND the detailed thread context I fetched. Provide a comprehensive, helpful summary using all this rich information.

**Formatting Guidelines:**
- Use **bold text** for important details like sender names, subject lines, or key findings
- Use *italics* for dates, times, or emphasis  
- Use bullet points for lists:
  - Like this for multiple items
  - Make it easy to scan
- Be conversational but well-formatted!

You now have the complete picture - use it to give an amazing answer!`
        },
        {
          role: 'user',
          content: `ORIGINAL QUERY: ${userQuery}

SEARCH RESULTS SUMMARY:
${allResults.map(r => `- Subject: ${r.subject || 'N/A'}, From: ${r.emailParticipant || 'N/A'}, ${r.emailDirection || 'N/A'}`).join('\n')}

FULL THREAD CONTEXT:
${enrichedContext}

Based on all this information, provide a comprehensive response to the user's query.`
        }
      ];
      
      const enrichedResponse = await openaiClient.chat.completions.create({
        model: 'gpt-4o',
        messages: enrichedMessages,
        max_tokens: 500,
        temperature: 0.7
      });
      
      return {
        success: true,
        userQuery,
        aiResponse: enrichedResponse.choices[0].message.content,
        contextUsed: allResults,
        threadContext: threadData,
        responseType: 'function_calling_with_threads',
        functionCalls: functionResults.map(fr => ({
          name: fr.name,
          resultCount: fr.result.emails?.length || 0
        })),
        thinkingMessage // Include for frontend handling
      };
    }
    
    return {
      success: true,
      userQuery,
      aiResponse: finalResponse.choices[0].message.content,
      contextUsed: allResults,
      responseType: 'function_calling',
      functionCalls: functionResults.map(fr => ({
        name: fr.name,
        resultCount: fr.result.emails?.length || 0
      }))
    };
    
  } catch (error) {
    console.error('❌ Function calling failed:', error);
    return { success: false, error: error.message };
  }
}

// Export individual functions for testing
export {
  emailSearchTools,
  searchEmailsBySender,
  searchEmailsByTimeframe, 
  searchEmailsBySentiment,
  searchEmailsSemantic
}; 
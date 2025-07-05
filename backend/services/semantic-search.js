import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

// Initialize clients (will use environment variables from main app)
let pineconeClient = null;
let openaiClient = null;
let pineconeIndex = null;

/**
 * Initialize the semantic search clients
 */
function initializeClients() {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    pineconeIndex = pineconeClient.index(process.env.PINECONE_INDEX_NAME || 'beya-context');
  }
  
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
}

/**
 * Perform semantic search on conversation context
 * @param {string} query - The search query
 * @param {Object} filters - Optional metadata filters
 * @param {number} topK - Number of results to return
 * @param {string} userId - User ID for filtering results
 */
export async function semanticSearch(query, filters = {}, topK = 5, userId = null) {
  try {
    initializeClients();
    
    console.log(`🔍 Semantic search: "${query}"`);
    
    // Step 1: Analyze email direction intent
    const emailIntent = analyzeEmailDirectionIntent(query);
    console.log(`📧 Email direction analysis:`, emailIntent);
    
    // Step 2: Convert query to embedding
    const embeddingResponse = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    // Step 3: Build search request with smart filtering
    const searchRequest = {
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      includeValues: false,
    };
    
    // Add user filter if provided
    if (userId) {
      filters.userId = userId;
    }
    
    // Apply email direction filter if detected
    if (emailIntent.isPersonalEmailQuery && emailIntent.suggestedFilter) {
      filters = { ...filters, ...emailIntent.suggestedFilter };
      console.log(`🎯 Applied email direction filter:`, emailIntent.suggestedFilter);
    }
    
    // Add filters if provided
    if (Object.keys(filters).length > 0) {
      searchRequest.filter = filters;
    }
    
    // Step 3: Search Pinecone
    const searchResults = await pineconeIndex.query(searchRequest);
    
    // Step 4: Format results
    const formattedResults = searchResults.matches.map(match => ({
      id: match.id,
      score: match.score,
      threadId: match.metadata.threadId,
      eventId: match.metadata.eventId,
      eventType: match.metadata.eventType,
      timestamp: match.metadata.timestamp,
      sentiment: match.metadata.sentiment,
      sentimentConfidence: match.metadata.sentimentConfidence,
      sentimentPositive: match.metadata.sentimentPositive,
      sentimentNegative: match.metadata.sentimentNegative,
      sentimentNeutral: match.metadata.sentimentNeutral,
      sentimentMixed: match.metadata.sentimentMixed,
      chunkIndex: match.metadata.chunkIndex,
      chunkCount: match.metadata.chunkCount,
      // Add the actual content fields
      content: match.metadata.content || match.metadata.chunkableContent || match.metadata.naturalLanguageDescription,
      originalText: match.metadata.originalText || match.metadata.bodyText,
      subject: match.metadata.subject,
      messageId: match.metadata.messageId,
      // Add sender/recipient information
      emailDirection: match.metadata.emailDirection,
      emailParticipant: match.metadata.emailParticipant,
    }));
    
    console.log(`📊 Found ${formattedResults.length} relevant results`);
    
    return {
      query,
      results: formattedResults,
      totalResults: searchResults.matches.length,
      filters: filters,
      emailIntent: emailIntent, // Include email direction analysis
    };
    
  } catch (error) {
    console.error('❌ Semantic search failed:', error);
    throw new Error(`Semantic search failed: ${error.message}`);
  }
}

/**
 * Analyze user intent to determine the best response type
 * @param {string} userQuery - The user's question
 */
function analyzeUserIntent(userQuery) {
  const query = userQuery.toLowerCase();
  
  // Intent patterns
  const intentPatterns = {
    draft: [
      'write', 'draft', 'compose', 'reply', 'respond', 'suggest response', 
      'how should i respond', 'what should i say', 'help me write'
    ],
    analysis: [
      'analyze', 'trends', 'patterns', 'insights', 'data', 'metrics', 
      'what does this mean', 'summary', 'overview', 'breakdown'
    ],
    coaching: [
      'improve', 'better', 'advice', 'coach', 'help me', 'how can i', 
      'what should i do', 'recommend', 'suggest', 'guidance'
    ]
  };
  
  // Check for specific intent patterns
  for (const [intent, patterns] of Object.entries(intentPatterns)) {
    if (patterns.some(pattern => query.includes(pattern))) {
      return intent;
    }
  }
  
  // Default to general (coaching) for most queries
  return 'general';
}

/**
 * Use LLM to intelligently determine if query would benefit from email context
 * @param {string} userQuery - The user's question
 */
async function shouldUseEmailContext(userQuery) {
  try {
    initializeClients();
    
    // First check if this is a personal email query - these always need email context
    const emailIntent = analyzeEmailDirectionIntent(userQuery);
    if (emailIntent.isPersonalEmailQuery) {
      console.log(`✅ Personal email query detected, using email context`);
      return true;
    }
    
    const prompt = `Analyze this user query and determine if it would benefit from searching email/business context.

    User Query: "${userQuery}"

    Consider:
    - Is this asking about business information, emails, customers, or work-related topics?
    - Would searching email history help answer this question?
    - Or is this just casual conversation that doesn't need business context?

    Respond with only "YES" if it needs email context, or "NO" if it's casual/doesn't need business data.`;

    const response = await openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 10,
      temperature: 0.1,
    });

    const decision = response.choices[0].message.content.trim().toUpperCase();
    return decision === 'YES';
    
  } catch (error) {
    console.error('❌ Context decision failed, defaulting to search:', error);
    // If LLM call fails, default to searching (better to over-search than miss relevant context)
    return true;
  }
}

/**
 * Filter search results by relevance score
 * @param {Array} searchResults - Raw search results from Pinecone
 * @param {number} minScore - Minimum relevance score (default 0.7)
 */
function filterByRelevance(searchResults, minScore = 0.7) {
  return searchResults.filter(result => result.score >= minScore);
}

/**
 * Analyze user query to detect email direction intent
 * @param {string} userQuery - The user's question
 * @returns {Object} - Intent analysis with direction filter
 */
function analyzeEmailDirectionIntent(userQuery) {
  const query = userQuery.toLowerCase();
  
  // Patterns for sent emails (emails the user sent)
  const sentPatterns = [
    'my emails', 'emails i sent', 'emails i wrote', 'emails i composed',
    'messages i sent', 'my sent emails', 'emails from me', 'my outgoing emails',
    'what did i send', 'emails i\'ve sent', 'my outbound emails'
  ];
  
  // Patterns for received emails (emails sent to the user)
  const receivedPatterns = [
    'emails i received', 'emails sent to me', 'incoming emails', 'emails i got',
    'messages i received', 'my received emails', 'emails to me', 'my inbox',
    'what emails did i get', 'emails i\'ve received', 'my inbound emails'
  ];
  
  // Check for specific direction patterns
  const isSentQuery = sentPatterns.some(pattern => query.includes(pattern));
  const isReceivedQuery = receivedPatterns.some(pattern => query.includes(pattern));
  
  // General "my emails" patterns that could be either direction
  const generalMyEmailsPatterns = [
    'my emails', 'my messages', 'my correspondence', 'my email history'
  ];
  const isGeneralMyEmails = generalMyEmailsPatterns.some(pattern => query.includes(pattern)) && !isSentQuery && !isReceivedQuery;
  
  return {
    isSentQuery,
    isReceivedQuery,
    isGeneralMyEmails,
    isPersonalEmailQuery: isSentQuery || isReceivedQuery || isGeneralMyEmails,
    suggestedFilter: isSentQuery ? { emailDirection: 'sent' } : 
                    isReceivedQuery ? { emailDirection: 'received' } : 
                    isGeneralMyEmails ? {} : null // No filter for general queries, show both
  };
}

/**
 * Generate AI response using search results as context
 * @param {string} userQuery - The user's question
 * @param {Array} searchResults - Results from semantic search
 * @param {string} responseType - Type of response (summary, analysis, coaching, etc.)
 */
export async function generateContextualResponse(userQuery, searchResults, responseType = 'summary', conversationHistory = []) {
  try {
    initializeClients();
    
    // Check if this query would benefit from email context
    const useEmailContext = await shouldUseEmailContext(userQuery);
    console.log(`🔍 Context check for "${userQuery}":`, {
      useEmailContext,
      totalResults: searchResults?.length || 0
    });
    
    // Filter results by relevance score (only keep high-relevance matches)
    const relevantResults = filterByRelevance(searchResults, 0.25);
    console.log(`📊 Relevance filtering:`, {
      originalResults: searchResults?.length || 0,
      relevantResults: relevantResults.length,
      threshold: 0.25,
      scores: searchResults?.map(r => r.score) || []
    });
    
    // Check if we have conversation history to use as context
    const hasConversationHistory = conversationHistory && conversationHistory.length > 0;
    
    // If no relevant email context OR query doesn't need email context, check conversation history
    if (!useEmailContext || relevantResults.length === 0) {
      console.log(`❌ No email context available because:`, {
        useEmailContext,
        relevantResultsCount: relevantResults.length,
        hasConversationHistory,
        reason: !useEmailContext ? 'Query doesn\'t require email context' : 'No relevant results after filtering'
      });
      
      // If we have conversation history, use it instead of going contextless
      if (hasConversationHistory) {
        console.log(`✅ Using conversation history context with ${conversationHistory.length} messages`);
        
        // Build conversation context
        const conversationContext = conversationHistory
          .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
          .join('\n');
        
        let systemPrompt = `You are B, an expert business analyst assistant. Your primary job is to analyze a list of recent events and synthesize a concise, actionable summary for the user. Do not just list the events.

Your analysis process is as follows:
1.  **Review the timeline:** Look at the timestamps of all provided context events.
2.  **Identify the User's last action:** Find the most recent event where the user acted (e.g., eventType: 'email.sent').
3.  **Search for a reaction:** Look for any subsequent events from other parties (e.g., eventType: 'email.received', eventType: 'payment.received').
4.  **Form a conclusion:**
    - If you find a reaction, summarize it (e.g., "They replied on...")
    - If you find NO reaction after the user's last action, explicitly state that there has been no response. This is a critical insight.
5.  **Suggest a next step:** Based on your conclusion, suggest a logical next step. Since you don't have access to an org chart, suggest actions the user can take themselves, like "sending a follow-up" or "marking it for review." Frame it as a question.

CRITICAL: The user is busy. Give them the bottom line first. Be direct and proactive.`;
        
        let userPrompt = `RECENT CONVERSATION:
          ${conversationContext}

          CURRENT USER QUERY: ${userQuery}

          Based on what was actually discussed above, provide a direct response. Only reference information that was explicitly mentioned.

          RESPONSE:`;
        
        console.log(`🤖 Generating conversation-aware response for: ${userQuery}`);
        const completion = await openaiClient.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 400,
          temperature: 0.7,
        });
        
        return {
          userQuery,
          aiResponse: completion.choices[0].message.content,
          contextUsed: [],
          responseType: 'conversation',
          detectedIntent: 'conversation',
          totalContextResults: 0,
          contextFiltered: true,
          reason: 'Using conversation history context',
          conversationHistoryUsed: conversationHistory.length
        };
      }
      
      // No email context AND no conversation history - truly contextless response
      console.log(`🤖 Generating truly contextless response for: ${userQuery}`);
      
      // Analyze user intent for contextless response
      let detectedIntent = responseType;
      if (responseType === 'auto' || responseType === 'summary') {
        detectedIntent = analyzeUserIntent(userQuery);
      }
      
      let systemPrompt = `You are B, a helpful business assistant. Respond naturally and helpfully to the user's query without forcing business context when it's not needed.`;
      let userPrompt = `USER QUERY: ${userQuery}

Respond naturally and appropriately to the user's query. If it's a casual greeting, respond warmly. If it's a business question but you don't have specific context, offer to help and suggest what kinds of information you can provide.

RESPONSE:`;
      
      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 300,
        temperature: 0.7,
      });
      
      return {
        userQuery,
        aiResponse: completion.choices[0].message.content,
        contextUsed: [],
        responseType: detectedIntent,
        detectedIntent,
        totalContextResults: 0,
        contextFiltered: true,
        reason: useEmailContext ? 'Low relevance scores' : 'Query doesn\'t require email context'
      };
    }
    
    console.log(`✅ Using context response with ${relevantResults.length} relevant results`);
    
    // Build context from relevant search results (use top 3 most relevant)
    const topResults = relevantResults.slice(0, 3);
    const contextChunks = topResults.map((result, idx) => {
      const hasContent = result.content || result.naturalLanguageDescription || result.bodyText;
      const contentText = result.content || result.naturalLanguageDescription || result.bodyText || 'Content not available in stored metadata';
      
      // Determine email direction and participants
      let directionInfo = '';
      if (result.emailDirection === 'sent') {
        directionInfo = `Direction: Email SENT by you to ${result.emailParticipant || 'unknown recipient'}`;
      } else if (result.emailDirection === 'received') {
        directionInfo = `Direction: Email RECEIVED from ${result.emailParticipant || 'unknown sender'}`;
      } else if (result.eventType === 'email.sent') {
        directionInfo = `Direction: Email SENT by you`;
      } else if (result.eventType === 'email.received') {
        directionInfo = `Direction: Email RECEIVED`;
      }
      
      return `Context ${idx + 1} (Relevance: ${result.score.toFixed(2)}):
Event ID: ${result.eventId}
Event Type: ${result.eventType}
${directionInfo}
Timestamp: ${result.timestamp}
Thread: ${result.threadId || 'N/A'}
Subject: ${result.subject || 'N/A'}
Content: ${contentText}
${result.sentiment ? `Sentiment: ${result.sentiment} (${(result.sentimentConfidence * 100).toFixed(1)}% confidence)` : ''}
${result.sentimentPositive ? `Positive: ${(result.sentimentPositive * 100).toFixed(1)}% | Negative: ${(result.sentimentNegative * 100).toFixed(1)}% | Neutral: ${(result.sentimentNeutral * 100).toFixed(1)}%` : ''}
---`;
    }).join('\n');
    
    // Analyze user intent dynamically if responseType is 'auto' or 'summary'
    let detectedIntent = responseType;
    if (responseType === 'auto' || responseType === 'summary') {
      detectedIntent = analyzeUserIntent(userQuery);
    }
    
    // Define prompt templates to avoid DRY violations
    const promptTemplates = {
      draft: {
        system: `You are B, a friendly customer service writing assistant. Help craft warm, empathetic responses based on conversation context. Keep responses CONCISE (2-3 sentences max).`,
        user: `CONVERSATION CONTEXT:
${contextChunks}

USER QUERY: ${userQuery}

Craft a natural, helpful response that:
- Feels warm and personal, like you're talking to a friend
- Takes into account the conversation history and sentiment
- Addresses the customer's needs with empathy
- Maintains professionalism while being approachable

IMPORTANT: Keep your response SHORT and CONCISE (2-3 sentences max).

SUGGESTED RESPONSE:`
      },
      
      analysis: {
        system: `You are B, a friendly business insights analyst. Analyze conversation patterns and provide helpful insights in a conversational way. Keep responses CONCISE (2-3 sentences max).`,
        user: `CONVERSATION CONTEXT:
${contextChunks}

USER QUERY: ${userQuery}

Provide friendly analysis that:
- Identifies key trends in customer sentiment
- Highlights common themes or issues
- Gives actionable insights for business improvement
- Suggests helpful metrics to track

Share your insights like you're explaining them to a friend over coffee.

IMPORTANT: Keep your response SHORT and CONCISE (2-3 sentences max).

ANALYSIS:`
      },
      
      coaching: {
        system: `You are B, a supportive business coach. Provide encouraging advice based on email patterns in a warm, helpful way. Keep responses CONCISE (2-3 sentences max).`,
        user: `EMAIL CONTEXT:
${contextChunks}

USER QUERY: ${userQuery}

Provide supportive coaching advice based on the email patterns. Be encouraging and conversational - like you're giving friendly advice to a friend who's trying to improve their business communication.

IMPORTANT: Keep your response SHORT and CONCISE (2-3 sentences max).

COACHING ADVICE:`
      },
      
      general: {
        system: `You are B, a friendly and helpful business assistant. Be conversational and natural - like you're chatting with a friend about their emails. 

IMPORTANT: 
- Keep responses CONCISE and to the point (max 2-3 sentences)
- Pay attention to email direction:
  - "emailDirection: sent" = emails YOU sent (outgoing)
  - "emailDirection: received" = emails sent TO you (incoming)
  - "email.sent" eventType = emails YOU sent
  - "email.received" eventType = emails sent TO you

When users ask about "my emails", be clear about whether they're asking about emails they sent or received. Don't confuse who sent what. Be accurate about email direction.`,
        user: `EMAIL CONTEXT:
${contextChunks}

USER QUERY: ${userQuery}

Analyze the email context carefully. Look at both the emailDirection field and eventType to determine if these are emails you sent or received. 

If the user asked about "my emails" or similar personal queries, be specific about what you found:
- If showing sent emails, say "Here are emails you sent..."
- If showing received emails, say "Here are emails you received..."
- If showing both, clarify the direction for each email

Respond naturally and conversationally - like you're helping a friend look through their emails. Be helpful and friendly, not robotic.

IMPORTANT: Keep your response SHORT and CONCISE (2-3 sentences max).

RESPONSE:`
      }
    };
    
    // Get the appropriate template or default to general
    const template = promptTemplates[detectedIntent] || promptTemplates.general;
    const systemPrompt = template.system;
    const userPrompt = template.user;
    
    console.log(`🤖 Generating AI response with intent: ${detectedIntent} and ${topResults.length} relevant context items...`);
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 150, // Reduced from 500 to enforce shorter responses
      temperature: 0.7,
    });
    
    const aiResponse = completion.choices[0].message.content;
    console.log('✅ AI Response generated');
    
    return {
      userQuery,
      aiResponse,
      contextUsed: topResults,
      responseType: detectedIntent,
      detectedIntent,
      totalContextResults: searchResults.length,
      relevantContextResults: relevantResults.length,
      contextFiltered: false
    };
    
  } catch (error) {
    console.error('❌ AI response generation failed:', error);
    throw new Error(`AI response generation failed: ${error.message}`);
  }
}

/**
 * Complete semantic search + AI response pipeline
 * @param {string} userQuery - The user's question
 * @param {Object} options - Search and response options
 */
export async function queryWithAI(userQuery, options = {}) {
  try {
    const {
      filters = {},
      topK = 5,
      userId = null,
      responseType = 'summary',
      conversationHistory = []
    } = options;
    
    console.log('🚀 Starting semantic search + AI pipeline...');
    
    // Step 1: Semantic search
    const searchResults = await semanticSearch(userQuery, filters, topK, userId);
    
    // Step 2: Generate AI response
    const aiResult = await generateContextualResponse(userQuery, searchResults.results, responseType, conversationHistory);
    
    return {
      ...aiResult,
      searchMetadata: {
        totalResults: searchResults.totalResults,
        filters: searchResults.filters,
        topK,
      }
    };
    
  } catch (error) {
    console.error('❌ Complete pipeline failed:', error);
    throw error;
  }
}

/**
 * Get customer context summary for a specific thread
 * @param {string} threadId - The thread/customer ID
 * @param {string} userId - User ID for filtering
 */
export async function getCustomerContext(threadId, userId = null) {
  try {
    const filters = { threadId };
    if (userId) filters.userId = userId;
    
    const searchResults = await semanticSearch(
      `conversation history for ${threadId}`, 
      filters, 
      10, 
      userId
    );
    
    if (searchResults.results.length === 0) {
      return {
        threadId,
        summary: "No conversation history found for this customer.",
        sentimentTrend: null,
        recentActivity: [],
        totalInteractions: 0,
      };
    }
    
    // Analyze sentiment trends
    const sentiments = searchResults.results.map(r => ({
      sentiment: r.sentiment,
      confidence: r.sentimentConfidence,
      timestamp: r.timestamp,
      positive: r.sentimentPositive,
      negative: r.sentimentNegative,
      neutral: r.sentimentNeutral,
    }));
    
    // Calculate average sentiment scores
    const avgSentiment = {
      positive: sentiments.reduce((sum, s) => sum + s.positive, 0) / sentiments.length,
      negative: sentiments.reduce((sum, s) => sum + s.negative, 0) / sentiments.length,
      neutral: sentiments.reduce((sum, s) => sum + s.neutral, 0) / sentiments.length,
    };
    
    // Get recent activity (last 5 interactions)
    const recentActivity = searchResults.results
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5)
      .map(r => ({
        eventType: r.eventType,
        sentiment: r.sentiment,
        timestamp: r.timestamp,
        confidence: r.sentimentConfidence,
      }));
    
    return {
      threadId,
      totalInteractions: searchResults.results.length,
      sentimentTrend: avgSentiment,
      recentActivity,
      searchResults: searchResults.results,
    };
    
  } catch (error) {
    console.error('❌ Customer context retrieval failed:', error);
    throw error;
  }
}

/**
 * Search for all emails in a specific thread
 * @param {string} threadId - The thread ID to search for
 * @param {number} topK - Maximum number of results to return
 * @returns {Object} - Search results for the thread
 */
export async function searchByThreadId(threadId, topK = 20) {
  try {
    initializeClients();
    
    console.log(`🧵 Searching for all emails in thread: ${threadId}`);
    
    // Use a dummy vector for metadata-only search
    const dummyVector = new Array(1536).fill(0);
    
    const searchRequest = {
      vector: dummyVector,
      topK,
      includeMetadata: true,
      includeValues: false,
      filter: {
        threadId: threadId
      }
    };
    
    const searchResults = await pineconeIndex.query(searchRequest);
    
    // Format results
    const formattedResults = searchResults.matches.map(match => ({
      id: match.id,
      score: match.score,
      threadId: match.metadata.threadId,
      eventId: match.metadata.eventId,
      eventType: match.metadata.eventType,
      timestamp: match.metadata.timestamp,
      sentiment: match.metadata.sentiment,
      sentimentConfidence: match.metadata.sentimentConfidence,
      chunkIndex: match.metadata.chunkIndex,
      chunkCount: match.metadata.chunkCount,
      content: match.metadata.content || match.metadata.chunkableContent || match.metadata.naturalLanguageDescription,
      originalText: match.metadata.originalText || match.metadata.bodyText,
      subject: match.metadata.subject,
      messageId: match.metadata.messageId,
      emailDirection: match.metadata.emailDirection,
      emailParticipant: match.metadata.emailParticipant,
    }));
    
    // Sort by timestamp (newest first)
    formattedResults.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    console.log(`📧 Found ${formattedResults.length} emails in thread ${threadId}`);
    
    return {
      threadId,
      results: formattedResults,
      totalResults: searchResults.matches.length,
      filters: { threadId }
    };
    
  } catch (error) {
    console.error('❌ Thread search failed:', error);
    throw new Error(`Thread search failed: ${error.message}`);
  }
}

/**
 * Search within a specific thread with semantic query
 * @param {string} query - The search query
 * @param {string} threadId - The thread ID to search within
 * @param {number} topK - Maximum number of results to return
 * @returns {Object} - Semantic search results within the thread
 */
export async function searchWithinThread(query, threadId, topK = 10) {
  try {
    initializeClients();
    
    console.log(`🔍 Semantic search within thread ${threadId}: "${query}"`);
    
    // Convert query to embedding
    const embeddingResponse = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    const searchRequest = {
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      includeValues: false,
      filter: {
        threadId: threadId
      }
    };
    
    const searchResults = await pineconeIndex.query(searchRequest);
    
    // Format results
    const formattedResults = searchResults.matches.map(match => ({
      id: match.id,
      score: match.score,
      threadId: match.metadata.threadId,
      eventId: match.metadata.eventId,
      eventType: match.metadata.eventType,
      timestamp: match.metadata.timestamp,
      sentiment: match.metadata.sentiment,
      sentimentConfidence: match.metadata.sentimentConfidence,
      chunkIndex: match.metadata.chunkIndex,
      chunkCount: match.metadata.chunkCount,
      content: match.metadata.content || match.metadata.chunkableContent || match.metadata.naturalLanguageDescription,
      originalText: match.metadata.originalText || match.metadata.bodyText,
      subject: match.metadata.subject,
      messageId: match.metadata.messageId,
      emailDirection: match.metadata.emailDirection,
      emailParticipant: match.metadata.emailParticipant,
    }));
    
    console.log(`🎯 Found ${formattedResults.length} relevant results in thread`);
    
    return {
      query,
      threadId,
      results: formattedResults,
      totalResults: searchResults.matches.length,
      filters: { threadId }
    };
    
  } catch (error) {
    console.error('❌ Thread semantic search failed:', error);
    throw new Error(`Thread semantic search failed: ${error.message}`);
  }
} 
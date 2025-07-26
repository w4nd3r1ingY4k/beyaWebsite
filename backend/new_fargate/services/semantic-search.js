import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

// Import modular email search functions
import { executeEmailSearchFunctions } from './functions/index.js';
import { 
  shouldFetchThreadContext, 
  fetchMultipleThreads, 
  buildThreadContext 
} from './functions/fetch-thread-context.js';

// Initialize clients (will use environment variables from main app)
let pineconeClient = null;
let openaiClient = null;
let pineconeIndex = null;
let docClient = null;

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
  
  // DynamoDB client will be initialized when needed in fetchEmailContent function
}

/**
 * Fetch full email content from database using threadId/messageId
 * @param {Array} searchResults - Results from Pinecone with threadId/messageId
 * @returns {Array} - Search results enriched with full email content
 */
async function fetchEmailContent(searchResults) {
  try {
    if (!docClient) {
      const { DynamoDBDocumentClient } = await import('@aws-sdk/lib-dynamodb');
      const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
      
      const ddbClient = new DynamoDBClient({ region: 'us-east-1' });
      docClient = DynamoDBDocumentClient.from(ddbClient, {
        marshallOptions: { removeUndefinedValues: true }
      });
    }

    // Extract unique event IDs to fetch
    const eventIds = [...new Set(searchResults.map(r => r.eventId).filter(Boolean))];
    
    if (eventIds.length === 0) {
      console.warn('No event IDs to fetch from database');
      return searchResults.map(r => ({ ...r, fullContent: null }));
    }

    console.log(`📊 Fetching full content for ${eventIds.length} emails from database`);

    // Batch get emails from database
    const { BatchGetCommand } = await import('@aws-sdk/lib-dynamodb');
    
    const batchRequest = {
      RequestItems: {
        [process.env.MSG_TABLE || 'Messages']: {
          Keys: eventIds.map(id => ({ EventId: id }))
        }
      }
    };

    const result = await docClient.send(new BatchGetCommand(batchRequest));
    const emails = result.Responses?.[process.env.MSG_TABLE || 'Messages'] || [];
    
    console.log(`📧 Retrieved ${emails.length} full emails from database`);

    // Merge search results with full email content
    return searchResults.map(searchResult => {
      const fullEmail = emails.find(email => 
        email.EventId === searchResult.eventId ||
        email.MessageId === searchResult.messageId
      );
      
      return {
        ...searchResult,
        fullContent: fullEmail ? {
          bodyText: fullEmail.Body || fullEmail.bodyText || '',
          htmlBody: fullEmail.BodyHtml || fullEmail.bodyHtml || '',
          subject: fullEmail.Subject || searchResult.subject,
          from: fullEmail.From || fullEmail.from,
          to: fullEmail.To || fullEmail.to,
          timestamp: fullEmail.Timestamp || searchResult.timestamp,
          headers: fullEmail.Headers || {},
        } : null
      };
    });

  } catch (error) {
    console.error('❌ Database fetch failed:', error);
    // Return original results without full content
    return searchResults.map(r => ({ ...r, fullContent: null }));
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
    console.log(`👤 Search userId: "${userId}" (type: ${typeof userId})`);
    
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
      console.log(`🔒 Filtering by userId: ${userId}`);
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
    
    // Step 4: Format results (no more chunk fields, content will be fetched from DB)
    const formattedResults = searchResults.matches.map(match => ({
      id: match.id,
      score: match.score,
      threadId: match.metadata.threadId,
      eventId: match.metadata.eventId,
      messageId: match.metadata.messageId,
      userId: match.metadata.userId, // ✅ Include userId from Pinecone metadata
      eventType: match.metadata.eventType,
      timestamp: match.metadata.timestamp,
      sentiment: match.metadata.sentiment,
      sentimentConfidence: match.metadata.sentimentConfidence,
      sentimentPositive: match.metadata.sentimentPositive,
      sentimentNegative: match.metadata.sentimentNegative,
      sentimentNeutral: match.metadata.sentimentNeutral,
      sentimentMixed: match.metadata.sentimentMixed,
      // Email metadata (lightweight)
      subject: match.metadata.subject,
      emailDirection: match.metadata.emailDirection,
      emailParticipant: match.metadata.emailParticipant,
      // Note: content will be fetched from database using threadId/messageId
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
  // Always use email context - user wants all queries to search emails
  console.log(`✅ Always using email context for all queries`);
  return true;
}

/**
 * Filter search results by relevance score
 * @param {Array} searchResults - Raw search results from Pinecone
 * @param {number} minScore - Minimum relevance score (default 0.7)
 */
function filterByRelevance(searchResults, minScore = 0.7, query = '') {
  // Check if query contains email address - use lower threshold for exact matches
  const hasEmailAddress = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(query);
  const effectiveThreshold = hasEmailAddress ? Math.min(minScore, 0.35) : minScore;
  
  const filtered = searchResults.filter(result => result.score >= effectiveThreshold);
  
  console.log(`📊 Relevance filtering: {
    originalResults: ${searchResults.length},
    relevantResults: ${filtered.length},
    threshold: ${effectiveThreshold}${hasEmailAddress ? ' (lowered for email query)' : ''},
    scores: [${searchResults.map(r => r.score || 0).slice(0, 5).join(', ')}],
    emailQuery: ${hasEmailAddress}
  }`);
  
  return filtered;
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
    'my emails', 'my messages', 'my correspondence', 'my email history',
    'my recent emails', 'recent emails', 'show me emails', 'show me my emails',
    'show emails', 'list emails', 'get emails', 'find emails', 'emails'
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
export async function generateContextualResponse(userQuery, searchResults, responseType = 'summary', conversationHistory = [], contextManagerContent = '') {
  try {
    initializeClients();
    
    // Check if this query would benefit from email context
    const useEmailContext = await shouldUseEmailContext(userQuery);
    console.log(`🔍 Context check for "${userQuery}":`, {
      useEmailContext,
      totalResults: searchResults?.length || 0
    });
    
    // Filter results by relevance score (only keep high-relevance matches)
    const relevantResults = filterByRelevance(searchResults, 0.48, userQuery);
    console.log(`📊 Relevance filtering:`, {
      originalResults: searchResults?.length || 0,
      relevantResults: relevantResults.length,
      threshold: 0.48,
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
      
      // Prioritize context manager content (with stored emails) over conversation history
      if (contextManagerContent && contextManagerContent.length > 0) {
        console.log(`✅ Using context manager content with stored email context (${contextManagerContent.length} characters)`);
        
        let systemPrompt = `You are B, a personal assistant!

        I've found relevant information from our previous conversation and the emails we discussed. Here's what I have:

        **Context from Previous Queries:**
        ${contextManagerContent}

        **Guidelines:**
        - Answer directly using the information above
        - Reference specific details from the emails when relevant  
        - Be conversational and helpful
        - If the answer is in the context, provide it confidently
        - Format nicely with **bold** and *italics* where appropriate`;
        
        let userPrompt = `Based on the context above, please answer: ${userQuery}`;
        
        const completion = await openaiClient.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 300,
          temperature: 0.7,
        });

        const aiResponse = completion.choices[0].message.content;
        
        return {
          userQuery,
          aiResponse,
          contextUsed: [],
          responseType: 'context_manager',
          contextSource: 'stored_emails',
          contextLength: contextManagerContent.length
        };
      }
      
      // Fallback to conversation history if no context manager content
      else if (hasConversationHistory) {
        console.log(`✅ Using conversation history context with ${conversationHistory.length} messages`);
        
        // Build conversation context
        const conversationContext = conversationHistory
          .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
          .join('\n');
        
        let systemPrompt = `You are B, a personal assistant!

        Here's what I'll do:
        **Review our conversation** to remember what we discussed
        **Answer your question** with all the context from our chat
        **Be specific and helpful** - no generic responses here!
        **Keep it natural** - we're just having a conversation!

        I remember everything we talked about, so feel free to reference emails, details, or anything else we discussed. I'm here to help you get exactly what you need!

        **Please format your response nicely:**
        - Use **bold** for important details
        - Use *italics* for emphasis or dates
        - Use bullet points when listing things
        - Keep it conversational but well-formatted!`;
        
        let userPrompt = `RECENT CONVERSATION:
          ${conversationContext}

          CURRENT USER QUERY: ${userQuery}

          Based on what was actually discussed above, provide a direct response. Only reference information that was explicitly mentioned.

          RESPONSE:`;
        
        console.log(`🤖 Generating conversation-aware response for: ${userQuery}`);
        const completion = await openaiClient.chat.completions.create({
          model: 'gpt-4o',
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
      
      let systemPrompt = `You are B, a helpful business assistant. Respond in a friendly and personable manner to the user's request without forcing business context when it's not needed.

**Format your responses nicely:**
- Use **bold** for key points or important info
- Use *italics* for emphasis
- Use bullet points for lists when helpful
- Keep it friendly and conversational!`;
      let userPrompt = `USER QUERY: ${userQuery}

Respond naturally and appropriately to the user's query. If it's a casual greeting, respond warmly. If it's a business question but you don't have specific context, offer to help and suggest what kinds of information you can provide.

RESPONSE:`;
      
      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o',
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
    
    // DEBUG: Log what context is being sent to AI
    console.log(`🔍 DEBUG: Context chunks being sent to AI:`);
    console.log(contextChunks.substring(0, 500) + '...');
    
    // Analyze user intent dynamically if responseType is 'auto' or 'summary'
    let detectedIntent = responseType;
    if (responseType === 'auto' || responseType === 'summary') {
      detectedIntent = analyzeUserIntent(userQuery);
    }
    
    // Define prompt templates to avoid DRY violations
    const promptTemplates = {
      draft: {
        system: `You are B, a friendly customer service writing assistant. Help craft warm, empathetic responses based on conversation context. Keep responses CONCISE (2-3 sentences max).

**Format with markdown:**
- Use **bold** for important points  
- Use *italics* for emphasis`,
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
        system: `You are B, a friendly business insights analyst. Analyze conversation patterns and provide helpful insights in a conversational way. Keep responses CONCISE (2-3 sentences max).

**Format with markdown:**
- Use **bold** for key insights
- Use *italics* for metrics/numbers  
- Use bullet points for lists`,
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
        system: `You are B, a supportive business coach. Provide encouraging advice based on email patterns in a warm, helpful way. Keep responses CONCISE (2-3 sentences max).

**Format with markdown:**
- Use **bold** for key advice
- Use *italics* for encouragement`,
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

When users ask about "my emails", be clear about whether they're asking about emails they sent or received. Don't confuse who sent what. Be accurate about email direction.

**Format your responses with markdown:**
- Use **bold** for sender names, subjects, key findings
- Use *italics* for dates, times, emphasis
- Use bullet points for lists:
  - Like this for multiple items
  - Make it easy to scan`,
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
    
        // Check if we should fetch thread context automatically  
    const contextCheck = shouldFetchThreadContext(topResults);
    
    if (contextCheck.shouldFetch) {
      console.log(`🔍 Auto-fetching thread context: ${contextCheck.reason}`);
      
      // Fetch thread contexts
      const threadData = await fetchMultipleThreads(contextCheck.threadData, 5);
      
      // Check if we actually got thread data
      const hasThreadData = threadData.threads.some(thread => thread.messageCount > 0);
      
      if (!hasThreadData) {
        console.log(`⚠️ No thread context found - continuing without thread enhancement`);
        // Continue with regular response without thread context
      } else {
        // Build enriched context
        let enrichedContext = contextChunks + '\n\n--- FULL THREAD CONTEXT ---\n\n';
        
        threadData.threads.forEach((thread, index) => {
          enrichedContext += buildThreadContext(thread);
          if (index < threadData.threads.length - 1) {
            enrichedContext += '\n\n=== NEXT THREAD ===\n\n';
          }
        });
        
        // Update user prompt with enriched context
        const enrichedUserPrompt = userPrompt.replace(contextChunks, enrichedContext);
        
        console.log(`🤖 Generating AI response with intent: ${detectedIntent}, ${topResults.length} relevant context items, and ${threadData.totalMessages} thread messages...`);
        
        const completion = await openaiClient.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: enrichedUserPrompt }
          ],
          max_tokens: 300, // Increased for thread context
          temperature: 0.7,
        });

        const aiResponse = completion.choices[0].message.content;
        console.log('✅ AI Response generated with thread context');

        return {
          userQuery,
          aiResponse,
          contextUsed: topResults,
          threadContext: threadData,
          responseType: `${detectedIntent}_with_threads`,
          detectedIntent,
          totalContextResults: searchResults.length,
          relevantContextResults: relevantResults.length,
          contextFiltered: false,
          thinkingMessage: {
            userQuery,
            aiResponse: "Let me take a deeper look... 🔍",
            isThinking: true,
            subtext: `Analyzing full context for ${contextCheck.threadData.length} email threads...`,
            responseType: 'thinking'
          }
        };
      }
    }
    
    console.log(`🤖 Generating AI response with intent: ${detectedIntent} and ${topResults.length} relevant context items...`);
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
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
 * Complete semantic search + AI response pipeline with function calling
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
      conversationHistory = [],
      contextManagerContent = ''
    } = options;
    
    initializeClients();
    console.log('🚀 Starting AI pipeline...');
    
    // Step 1: Check context manager first for stored email content
    if (contextManagerContent && contextManagerContent.length > 50) {
      console.log(`🧠 Checking if query can be answered from stored context (${contextManagerContent.length} characters)...`);
      
      // Use a simple heuristic: if query refers to previous context, use stored content
      const contextualKeywords = ['that', 'this', 'the email', 'those', 'from the email', 'what', 'how much', 'details'];
      const hasContextualReference = contextualKeywords.some(keyword => 
        userQuery.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (hasContextualReference) {
        console.log('✅ Query appears to reference previous context - using stored email content');
        
        let systemPrompt = `You are B, a personal assistant!

        The user is asking a follow-up question about information from our previous conversation. I have the relevant email content and context available:

        **Previous Context:**
        ${contextManagerContent}

        **Guidelines:**
        - Answer directly using the information above
        - Extract specific details from the email content when asked
        - Be conversational and helpful
        - If you find the answer in the context, provide it confidently
        - Format nicely with **bold** and *italics* where appropriate`;
        
        let userPrompt = `Based on the context above, please answer: ${userQuery}`;
        
        const completion = await openaiClient.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 400,
          temperature: 0.7,
        });

        const aiResponse = completion.choices[0].message.content;
        
        return {
          userQuery,
          aiResponse,
          contextUsed: [],
          responseType: 'context_manager_priority',
          contextSource: 'stored_emails',
          contextLength: contextManagerContent.length,
          method: 'context_manager_first'
        };
      } else {
        console.log('🔍 Query doesn\'t appear to reference previous context - proceeding with fresh search');
      }
    }
    
    // Step 2: Use AI function calling to determine search strategy
    console.log('🚀 Using function calling for fresh search...');
    const functionCallResult = await executeEmailSearchFunctions(
      userQuery, 
      userId, 
      conversationHistory,
      { openaiClient },
      semanticSearch
    );
    
    if (functionCallResult.success) {
      console.log('✅ Function calling search completed');
      return {
        ...functionCallResult,
        method: 'function_calling'
      };
    }
    
    // Step 3: Fallback to regular semantic search if function calling fails
    console.log('🔄 Falling back to regular semantic search...');
    
    const searchResults = await semanticSearch(userQuery, filters, topK, userId);
    const aiResult = await generateContextualResponse(userQuery, searchResults.results, responseType, conversationHistory, contextManagerContent);
    
    console.log('✅ Fallback search completed');
    return {
      ...aiResult,
      searchMetadata: {
        totalResults: searchResults.totalResults,
        filters: searchResults.filters,
        topK,
      },
      method: 'fallback_semantic_search'
    };
    
  } catch (error) {
    console.error('❌ AI pipeline failed:', error);
    
    return {
      userQuery,
      aiResponse: "I'm having trouble searching through your emails right now. Please try again in a moment.",
      contextUsed: [],
      responseType: 'error',
      method: 'error_fallback',
      error: error.message
    };
  }
}

/**
 * Use AI to extract and normalize company names from user queries
 * @param {string} companyName - Raw company name from user query
 * @returns {Promise<Object>} - Normalized variations for searching
 */
async function normalizeCompanyName(companyName) {
  if (!companyName) return { primary: '', variations: [] };
  
  try {
    initializeClients();
    
    const prompt = `Extract the company name and provide common variations for email searching.

User mentioned: "${companyName}"

Return a JSON object with:
{
  "primary": "main company name",
  "variations": ["variation1", "variation2", "variation3"]
}

For example:
- "American Express" → {"primary": "american express", "variations": ["amex", "americanexpress", "american express"]}
- "Bank of America" → {"primary": "bank of america", "variations": ["bofa", "bankofamerica", "bank of america"]}
- "MealPal" → {"primary": "mealpal", "variations": ["mealpal", "meal pal"]}

Include common abbreviations, domain names, and spacing variations. Keep it under 5 variations.`;

    const response = await openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      primary: result.primary.toLowerCase(),
      variations: result.variations.map(v => v.toLowerCase()),
      canonical: result.primary.toLowerCase()
    };
    
  } catch (error) {
    console.error('❌ AI company name normalization failed, using fallback:', error);
    
    // Fallback: simple text processing
    const name = companyName.toLowerCase().trim();
    const nospaces = name.replace(/\s+/g, '');
    const variations = [name, nospaces];
    
    return {
      primary: name,
      variations: variations,
      canonical: name
    };
  }
}

/**
 * AI-based intent classifier using OpenAI
 * This replaces the rigid regex patterns with flexible AI understanding
 * @param {string} query - User's query
 * @param {string} userId - User ID for context
 * @returns {Promise<Object>} - Classification result
 */
async function classifyUserIntent(query, userId) {
  try {
    initializeClients();
    
    console.log(`🎯 AI classifying user intent for: "${query}"`);
    
    const prompt = `You are an intent classifier for an email AI assistant. Analyze the user's query and determine the best intent and parameters.

Available intents:
- list_emails: Show recent emails (params: direction - "sent"|"received"|null, timeframe - "today"|"yesterday"|null)
- search_emails: Search for emails from/to someone or containing something (params: searchTerm, direction - "sent"|"received"|null, useSemantic - true|false)
- count_emails: Count emails (params: direction, timeframe)
- email_details_followup: Follow-up on a specific email (params: reference - "that"|"this"|"the first one" etc.)
- greeting: Simple hello/greeting
- complex_query: Anything else that needs full AI processing

User Query: "${query}"

Respond with JSON:
{
  "intent": "search_emails",
  "canUseDatabase": true,
  "filters": { "direction": "received", "sender": "experian" },
  "confidence": 0.9,
  "searchTerm": "experian",
  "reason": "Brief explanation"
}`;
    
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(response.choices[0].message.content);
    console.log(`🎯 AI classification result:`, result);
    return result;
  } catch (error) {
    console.error('❌ AI intent classification failed:', error);
    return {
      intent: 'complex_query',
      canUseDatabase: false,
      confidence: 0.5,
      reason: 'Fallback due to classification error'
    };
  }
}

/**
 * Handle simple queries with database-only operations
 * @param {string} userQuery - Original user query
 * @param {Object} intentResult - Classification result
 * @param {string} userId - User ID
 * @param {Array} conversationHistory - Previous conversation
 * @returns {Object} - Response object
 */
async function handleDatabaseQuery(userQuery, intentResult, userId, conversationHistory) {
  try {
    switch (intentResult.intent) {
      case 'list_emails':
        return await getRecentEmailsFromDB(userId, intentResult.filters, userQuery, conversationHistory, intentResult.tone);
      
      case 'search_emails':
        // Use paginated search for company queries to handle older emails that might be beyond the first 50-200 results
    return await searchEmailsFromDBWithPagination(userId, intentResult.filters, userQuery, conversationHistory, intentResult.searchTerm);
      
      case 'count_emails':
        return await getEmailCountFromDB(userId, intentResult.filters, userQuery);
      
      case 'email_status':
        return await getEmailStatusFromDB(userId, intentResult.filters, userQuery);
      
      case 'email_details_followup':
        return await handleEmailDetailsFollowUp(userQuery, userId, conversationHistory);
      
      case 'greeting':
        return handleGreeting(userQuery, conversationHistory);
      
      default:
        throw new Error(`Unhandled database intent: ${intentResult.intent}`);
    }
  } catch (error) {
    console.error(`❌ Database query handler failed for intent ${intentResult.intent}:`, error);
    
    // Fallback to semantic search on database errors
    console.log('🔄 Falling back to semantic search due to database error...');
    const searchResults = await semanticSearch(userQuery, intentResult.filters, 5, userId);
    return await generateContextualResponse(userQuery, searchResults.results, 'summary', conversationHistory);
  }
}

/**
 * Get recent emails directly from database (no vector search needed)
 * @param {string} userId - User ID
 * @param {Object} filters - Query filters
 * @param {string} userQuery - Original query
 * @param {Array} conversationHistory - Conversation context
 * @param {string} tone - Response tone (casual, professional)
 */
async function getRecentEmailsFromDB(userId, filters, userQuery, conversationHistory, tone = 'professional') {
  try {
    initializeClients();
    console.log(`📊 Fetching recent emails from database with filters:`, filters);
    
    // Build DynamoDB query using the User-Messages-Index GSI
    const dbQuery = {
      TableName: process.env.MSG_TABLE || 'Messages',
      IndexName: 'User-Messages-Index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ScanIndexForward: false, // Get newest first
      Limit: 20 // Get more than we need so we can filter
    };
    
    // Build filter expressions
    let filterParts = [];
    let expressionAttributeNames = {};
    
    // Always filter for email channel
    filterParts.push('Channel = :channel');
    dbQuery.ExpressionAttributeValues[':channel'] = 'email';
    
    // Add email direction filter
    if (filters.emailDirection === 'sent') {
      filterParts.push('Direction = :direction');
      dbQuery.ExpressionAttributeValues[':direction'] = 'outgoing';
    } else if (filters.emailDirection === 'received') {
      filterParts.push('Direction = :direction');
      dbQuery.ExpressionAttributeValues[':direction'] = 'incoming';
    }
    
    // Add timeframe filter
    if (filters.timeframe) {
      const timeFilter = getTimeframeFilter(filters.timeframe);
      if (timeFilter) {
        filterParts.push('#timestamp >= :startTime');
        expressionAttributeNames['#timestamp'] = 'Timestamp';
        dbQuery.ExpressionAttributeValues[':startTime'] = timeFilter.startTime;
      }
    }
    
    // Add unread filter
    if (filters.isUnread) {
      filterParts.push('IsUnread = :unread');
      dbQuery.ExpressionAttributeValues[':unread'] = true;
    }
    
    // Combine filter expressions
    if (filterParts.length > 0) {
      dbQuery.FilterExpression = filterParts.join(' AND ');
    }
    
    if (Object.keys(expressionAttributeNames).length > 0) {
      dbQuery.ExpressionAttributeNames = expressionAttributeNames;
    }
    
    console.log(`🔍 DynamoDB Query:`, JSON.stringify(dbQuery, null, 2));
    
    // Execute the actual DynamoDB query
    const { DynamoDBDocumentClient, QueryCommand } = await import('@aws-sdk/lib-dynamodb');
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    
    const ddbClient = new DynamoDBClient({ region: 'us-east-1' });
    const docClient = DynamoDBDocumentClient.from(ddbClient, {
      marshallOptions: { removeUndefinedValues: true }
    });
    
    const result = await docClient.send(new QueryCommand(dbQuery));
    const emails = result.Items || [];
    
    console.log(`📧 Found ${emails.length} emails from database`);
    
    // Take only the first 10 for response
    const limitedEmails = emails.slice(0, 10);
    
    const aiResponse = formatEmailListResponse(limitedEmails, filters, tone);
    
    return {
      userQuery,
      aiResponse,
      contextUsed: limitedEmails,
      responseType: 'list',
      source: 'database',
      fast: true,
      intentClassification: {
        intent: 'list_emails',
        confidence: 0.95,
        method: 'database_query'
      },
      dbStats: {
        totalFound: emails.length,
        returned: limitedEmails.length,
        query: dbQuery
      }
    };
    
  } catch (error) {
    console.error('❌ Database email query failed:', error);
    throw error;
  }
}

/**
 * Search for emails from/to specific people
 * @param {string} userId - User ID
 * @param {Object} filters - Query filters
 * @param {string} userQuery - Original query
 * @param {Array} conversationHistory - Conversation context
 * @param {string} searchTerm - The sender/recipient to search for
 */
async function searchEmailsFromDB(userId, filters, userQuery, conversationHistory, searchTerm) {
  try {
    initializeClients();
    console.log(`📊 Searching emails for sender/recipient: "${searchTerm}" with filters:`, filters);
    
    // Simple search term without AI normalization
    const companyToSearch = filters.sender || filters.recipient || searchTerm;
    console.log(`🔍 Searching for: "${companyToSearch}"`);
    
    // Build DynamoDB query using the User-Messages-Index GSI
    const dbQuery = {
      TableName: process.env.MSG_TABLE || 'Messages',
      IndexName: 'User-Messages-Index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':channel': 'email'
      },
      ScanIndexForward: false, // Get newest first
      Limit: 200 // Increased from 50 to search more emails for company matching
    };
    
    // Build filter expressions
    let filterParts = ['Channel = :channel'];
    let expressionAttributeNames = {};
    
    // Add direction filter (we'll do smart filtering in post-processing)
    if (filters.emailDirection === 'received') {
      filterParts.push('Direction = :direction');
      dbQuery.ExpressionAttributeValues[':direction'] = 'incoming';
    } else if (filters.emailDirection === 'sent') {
      filterParts.push('Direction = :direction');
      dbQuery.ExpressionAttributeValues[':direction'] = 'outgoing';
    }
    
    // Combine filter expressions
    if (filterParts.length > 0) {
      dbQuery.FilterExpression = filterParts.join(' AND ');
    }
    
    if (Object.keys(expressionAttributeNames).length > 0) {
      dbQuery.ExpressionAttributeNames = expressionAttributeNames;
    }
    
    console.log(`🔍 DynamoDB Search Query:`, JSON.stringify(dbQuery, null, 2));
    
    // Execute the actual DynamoDB query
    const { DynamoDBDocumentClient, QueryCommand } = await import('@aws-sdk/lib-dynamodb');
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    
    const ddbClient = new DynamoDBClient({ region: 'us-east-1' });
    const docClient = DynamoDBDocumentClient.from(ddbClient, {
      marshallOptions: { removeUndefinedValues: true }
    });
    
    const result = await docClient.send(new QueryCommand(dbQuery));
    const allEmails = result.Items || [];
    
    console.log(`📧 Found ${allEmails.length} total emails, now filtering for "${searchTerm}"`);
    
    // Use smart matching with scoring instead of complex filtering
    const emailsWithScores = allEmails.map(email => {
      const matchResult = smartEmailMatcher(email, companyToSearch, filters.emailDirection || 'any');
      return {
        email,
        ...matchResult
      };
    });
    
    // Filter and sort by score
    const matchingEmails = emailsWithScores
      .filter(item => item.matches)
      .sort((a, b) => b.score - a.score)
      .map(item => item.email);
    
    console.log(`📧 After smart filtering: ${matchingEmails.length} emails match "${searchTerm}"`);
    
    // Store email IDs for follow-up references
    const emailIds = matchingEmails.map(email => email.MessageId || email.messageId || email.id).filter(Boolean);
    console.log(`📝 Tracking email IDs for follow-ups:`, emailIds.slice(0, 3));
    
    // If we found no matches and haven't searched enough, automatically try the paginated search
    if (matchingEmails.length === 0 && allEmails.length === (parseInt(limit) || 200)) {
      console.log(`⚠️ No matches found in first ${allEmails.length} emails, falling back to paginated search...`);
      
      // Use the paginated search function which searches up to 500 emails
      try {
        const paginatedResult = await searchEmailsFromDBWithPagination(
          userId, 
          filters, 
          userQuery, 
          conversationHistory, 
          searchTerm,
          500 // Search up to 500 emails
        );
        
        return paginatedResult;
      } catch (paginationError) {
        console.error('❌ Paginated search also failed:', paginationError);
        // Continue with empty results
      }
    }
    
    // If we still have no results, provide comprehensive debugging
    if (matchingEmails.length === 0) {
      console.log(`\n🔍 DEBUG: No emails found for "${searchTerm}"`);
      console.log(`📊 Search stats:`);
      console.log(`  - Total emails searched: ${allEmails.length}`);
      console.log(`  - Search term: "${searchTerm}"`);
      console.log(`  - Direction filter: ${filters.emailDirection || 'any'}`);
      
      // Sample some emails to show what we're searching through
      console.log(`\n📧 Sample of emails searched (first 5):`);
      allEmails.slice(0, 5).forEach((email, idx) => {
        console.log(`  ${idx + 1}. From: ${email.From || 'N/A'}, To: ${email.To || 'N/A'}, Subject: ${(email.Subject || 'N/A').substring(0, 50)}...`);
      });
      
      // Check if there might be emails with the search term but in a different format
      const potentialMatches = allEmails.filter(email => {
        const allText = JSON.stringify(email).toLowerCase();
        return searchTerm.toLowerCase().split(' ').some(word => 
          word.length > 2 && allText.includes(word)
        );
      });
      
      if (potentialMatches.length > 0) {
        console.log(`\n⚠️ Found ${potentialMatches.length} emails that might be related but didn't match our criteria:`);
        potentialMatches.slice(0, 3).forEach((email, idx) => {
          console.log(`  ${idx + 1}. From: ${email.From}, Subject: ${email.Subject}`);
        });
      }
    }
    
    // Take only the first 10 for response
    const limitedEmails = matchingEmails.slice(0, 10);
    
    // Format response specifically for search results
    const aiResponse = formatSearchEmailResponse(limitedEmails, searchTerm, filters);
    
    return {
      userQuery,
      aiResponse,
      contextUsed: limitedEmails,
      responseType: 'search',
      source: 'database',
      fast: true,
      emailIds: emailIds, // Track email IDs for follow-ups
      lastSearchedEmails: limitedEmails, // Store emails for "that email" references
      intentClassification: {
        intent: 'search_emails',
        confidence: 0.9,
        method: 'database_search'
      },
      dbStats: {
        totalScanned: allEmails.length,
        actualMatches: matchingEmails.length,
        returned: limitedEmails.length,
        searchTerm: searchTerm,
        query: dbQuery
      }
    };
    
  } catch (error) {
    console.error('❌ Database email search failed:', error);
    throw error;
  }
}

/**
 * Search emails from DB with automatic pagination to find older emails
 * @param {string} userId - User ID
 * @param {Object} filters - Query filters
 * @param {string} userQuery - Original query
 * @param {Array} conversationHistory - Conversation context
 * @param {string} searchTerm - The sender/recipient to search for
 * @param {number} maxEmailsToSearch - Maximum emails to search through (default 500)
 */
async function searchEmailsFromDBWithPagination(userId, filters, userQuery, conversationHistory, searchTerm, maxEmailsToSearch = 500) {
  try {
    initializeClients();
    console.log(`📊 Searching emails with pagination for: "${searchTerm}"`);
    
    // Use AI to normalize the company name and get variations
    const companyToSearch = filters.sender || filters.recipient || searchTerm;
    const normalizedCompany = await normalizeCompanyName(companyToSearch);
    console.log(`🤖 AI normalized "${companyToSearch}" to:`, normalizedCompany);
    
    // Import DynamoDB clients
    const { DynamoDBDocumentClient, QueryCommand } = await import('@aws-sdk/lib-dynamodb');
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    
    const ddbClient = new DynamoDBClient({ region: 'us-east-1' });
    const docClient = DynamoDBDocumentClient.from(ddbClient, {
      marshallOptions: { removeUndefinedValues: true }
    });

    let allEmails = [];
    let lastEvaluatedKey = null;
    let totalSearched = 0;
    const batchSize = 100;

    // Keep paginating until we find enough matches or hit the max search limit
    do {
      const dbQuery = {
        TableName: process.env.MSG_TABLE || 'Messages',
        IndexName: 'User-Messages-Index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':channel': 'email'
        },
        FilterExpression: 'Channel = :channel',
        ScanIndexForward: false, // Get newest first
        Limit: batchSize
      };

      // Add direction filter if specified
      if (filters.emailDirection === 'received') {
        dbQuery.FilterExpression += ' AND Direction = :direction';
        dbQuery.ExpressionAttributeValues[':direction'] = 'incoming';
      } else if (filters.emailDirection === 'sent') {
        dbQuery.FilterExpression += ' AND Direction = :direction';
        dbQuery.ExpressionAttributeValues[':direction'] = 'outgoing';
      }

      // Add pagination token if we have one
      if (lastEvaluatedKey) {
        dbQuery.ExclusiveStartKey = lastEvaluatedKey;
      }

      console.log(`📖 Paginated query batch (searched ${totalSearched}/${maxEmailsToSearch} so far)...`);
      
      const result = await docClient.send(new QueryCommand(dbQuery));
      const batchEmails = result.Items || [];
      
      totalSearched += batchEmails.length;
      allEmails.push(...batchEmails);
      lastEvaluatedKey = result.LastEvaluatedKey;
      
      // Use smart matcher for batch filtering too
      const batchMatches = batchEmails.filter(email => {
        const matchResult = smartEmailMatcher(email, companyToSearch, filters.emailDirection || 'any');
        return matchResult.matches;
      });

      console.log(`📧 Batch ${Math.ceil(totalSearched/batchSize)}: Found ${batchMatches.length} matches in ${batchEmails.length} emails`);
      
      // If we found some matches and have searched a reasonable amount, we can stop early
      // This prevents excessive searching when we have enough results
      if (batchMatches.length >= 5 && totalSearched >= 200) {
        console.log(`✅ Found sufficient matches (${batchMatches.length}), stopping early after searching ${totalSearched} emails`);
        break;
      }

    } while (lastEvaluatedKey && totalSearched < maxEmailsToSearch);

    console.log(`📧 Pagination complete: Searched ${totalSearched} emails total`);
    
    // Use smart matching with scoring
    const emailsWithScores = allEmails.map(email => {
      const matchResult = smartEmailMatcher(email, companyToSearch, filters.emailDirection || 'any');
      return {
        email,
        ...matchResult
      };
    });
    
    // Filter and sort by score
    const matchingEmails = emailsWithScores
      .filter(item => item.matches)
      .sort((a, b) => b.score - a.score)
      .map(item => {
        // Add debug info to email for troubleshooting
        item.email._matchScore = item.score;
        item.email._matchDetails = item.matchDetails;
        return item.email;
      });
    
    // Log best matches for debugging with better field handling
    if (matchingEmails.length > 0) {
      console.log(`🎯 Top matches for "${companyToSearch}":`);
      matchingEmails.slice(0, 3).forEach((email, idx) => {
        const participants = extractEmailParticipants(email);
        const sender = participants.sender || 'Unknown Sender';
        const subject = (email.Subject || email.subject || '(no subject)').substring(0, 50);
        console.log(`  ${idx + 1}. Score ${email._matchScore}: ${sender}`);
        console.log(`     Subject: ${subject}...`);
        console.log(`     Matches: ${email._matchDetails.join(', ')}`);
        if (!participants.sender) {
          console.log(`     ⚠️ Sender field: ${participants.senderField || 'NOT FOUND'} from fields: ${participants.allFields.slice(0, 10).join(', ')}`);
        }
      });
    }

    console.log(`📧 Final result: ${matchingEmails.length} emails match "${searchTerm}" out of ${totalSearched} searched`);
    
    // Take only the first 10 for response
    const limitedEmails = matchingEmails.slice(0, 10);
    
    // Store email IDs for follow-up references
    const emailIds = limitedEmails.map(email => email.MessageId || email.messageId || email.id).filter(Boolean);
    
    // Format response specifically for search results
    const aiResponse = formatSearchEmailResponse(limitedEmails, searchTerm, filters);
    
    return {
      searchTerm,
      totalEmailsSearched: totalSearched,
      matchingEmailsFound: matchingEmails.length,
      emailsReturned: limitedEmails.length,
      aiResponse,
      rawResults: limitedEmails,
      emailIds: emailIds, // Track email IDs for follow-ups
      lastSearchedEmails: limitedEmails, // Store emails for "that email" references
      usedDatabaseQuery: true,
      searchMethod: 'paginated_database_search'
    };

  } catch (error) {
    console.error('❌ Paginated database search failed:', error);
    throw error;
  }
}

/**
 * Get email count from database
 */
async function getEmailCountFromDB(userId, filters, userQuery) {
  try {
    initializeClients();
    console.log(`📊 Counting emails with filters:`, filters);
    
    // Build DynamoDB query for counting
    const dbQuery = {
      TableName: process.env.MSG_TABLE || 'Messages',
      IndexName: 'User-Messages-Index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Select: 'COUNT' // Only return count, not items
    };
    
    // Build filter expressions
    let filterParts = ['Channel = :channel'];
    dbQuery.ExpressionAttributeValues[':channel'] = 'email';
    
    // Add direction filter
    if (filters.emailDirection === 'sent') {
      filterParts.push('Direction = :direction');
      dbQuery.ExpressionAttributeValues[':direction'] = 'outgoing';
    } else if (filters.emailDirection === 'received') {
      filterParts.push('Direction = :direction');
      dbQuery.ExpressionAttributeValues[':direction'] = 'incoming';
    }
    
    if (filterParts.length > 0) {
      dbQuery.FilterExpression = filterParts.join(' AND ');
    }
    
    console.log(`🔍 DynamoDB Count Query:`, JSON.stringify(dbQuery, null, 2));
    
    // Execute the actual DynamoDB query
    const { DynamoDBDocumentClient, QueryCommand } = await import('@aws-sdk/lib-dynamodb');
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    
    const ddbClient = new DynamoDBClient({ region: 'us-east-1' });
    const docClient = DynamoDBDocumentClient.from(ddbClient, {
      marshallOptions: { removeUndefinedValues: true }
    });
    
    const result = await docClient.send(new QueryCommand(dbQuery));
    const count = result.Count || 0;
    
    console.log(`📧 Found ${count} emails matching criteria`);
    
    const direction = filters.emailDirection;
    const aiResponse = direction === 'sent' ? `You've sent ${count} emails recently.` :
                      direction === 'received' ? `You've received ${count} emails recently.` :
                      `You have ${count} emails in total.`;
    
    return {
      userQuery,
      aiResponse,
      contextUsed: [],
      responseType: 'count',
      source: 'database',
      fast: true,
      count: count,
      dbStats: {
        query: dbQuery,
        resultCount: count
      }
    };
    
  } catch (error) {
    console.error('❌ Email count query failed:', error);
    throw error;
  }
}

/**
 * Get email status (unread, new, etc.)
 */
async function getEmailStatusFromDB(userId, filters, userQuery) {
  try {
    initializeClients();
    console.log(`📊 Checking email status with filters:`, filters);
    
    // Build DynamoDB query for unread emails
    const dbQuery = {
      TableName: process.env.MSG_TABLE || 'Messages',
      IndexName: 'User-Messages-Index',
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: 'Channel = :channel AND IsUnread = :unread',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':channel': 'email',
        ':unread': true
      },
      Select: 'COUNT'
    };
    
    console.log(`🔍 DynamoDB Status Query:`, JSON.stringify(dbQuery, null, 2));
    
    // Execute the actual DynamoDB query
    const { DynamoDBDocumentClient, QueryCommand } = await import('@aws-sdk/lib-dynamodb');
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    
    const ddbClient = new DynamoDBClient({ region: 'us-east-1' });
    const docClient = DynamoDBDocumentClient.from(ddbClient, {
      marshallOptions: { removeUndefinedValues: true }
    });
    
    const result = await docClient.send(new QueryCommand(dbQuery));
    const unreadCount = result.Count || 0;
    
    console.log(`📧 Found ${unreadCount} unread emails`);
    
    const aiResponse = unreadCount > 0 ? 
      `You have ${unreadCount} unread emails.` :
      `All caught up! No unread emails.`;
    
    return {
      userQuery,
      aiResponse,
      contextUsed: [],
      responseType: 'status',
      source: 'database',
      fast: true,
      unreadCount: unreadCount,
      dbStats: {
        query: dbQuery,
        unreadCount: unreadCount
      }
    };
    
  } catch (error) {
    console.error('❌ Email status query failed:', error);
    throw error;
  }
}

/**
 * Handle follow-up requests for email details using AI to identify reference
 */
async function handleEmailDetailsFollowUp(userQuery, userId, conversationHistory) {
  try {
    console.log(`📧 Handling email details follow-up: "${userQuery}"`);
    
    // Use AI to analyze history and identify the referenced email
    const recentHistory = conversationHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n');
    
    const prompt = `Analyze this conversation history and user query to identify which email is being referred to in the follow-up.

RECENT CONVERSATION:
${recentHistory}

FOLLOW-UP QUERY: "${userQuery}"

Extract:
- Referenced subject or keywords
- Sender if mentioned
- Any identifying details

Respond with JSON:
{
  "referencedSubject": "Your debt shift offers have improved",
  "referencedSender": "email@eml.experian.co.uk",
  "referenceDescription": "the Experian email about debt shift",
  "confidence": 0.9
}`;
    
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    
    const reference = JSON.parse(response.choices[0].message.content);
    console.log(`🎯 AI identified reference:`, reference);
    
    if (reference.confidence < 0.5 || !reference.referencedSubject) {
      return {
        userQuery,
        aiResponse: "I'm not sure which email you're referring to. Could you be more specific?",
        contextUsed: [],
        responseType: 'error',
        source: 'followup_handler'
      };
    }
    
    // Search for the referenced email
    const searchResult = await searchSpecificEmail(userId, reference.referencedSender, reference.referencedSubject);
    
    if (searchResult.length === 0) {
      return {
        userQuery,
        aiResponse: `I understood you're asking about the email "${reference.referencedSubject}" from ${reference.referencedSender}, but I couldn't find the full details in my search. Based on what we discussed, it's about ${reference.referenceDescription}. What specific part do you want to know more about?`,
        contextUsed: [],
        responseType: 'partial',
        source: 'followup_handler'
      };
    }
    
    const email = searchResult[0];
    const detailedResponse = formatEmailDetails(email, reference.referencedSubject, reference.referencedSender);
    
    return {
      userQuery,
      aiResponse: detailedResponse,
      contextUsed: [email],
      responseType: 'email_details',
      source: 'followup_handler',
      aiReference: reference
    };
    
  } catch (error) {
    console.error('❌ AI follow-up handler failed:', error);
    return {
      userQuery,
      aiResponse: "Sorry, I had trouble understanding which email you're referring to. Could you quote the subject or sender?",
      contextUsed: [],
      responseType: 'error',
      source: 'followup_handler'
    };
  }
}

/**
 * Search for a specific email by sender and subject
 */
async function searchSpecificEmail(userId, sender, subject) {
  try {
    console.log(`🔍 Searching for specific email: sender="${sender}", subject="${subject}"`);
    
    const { DynamoDBDocumentClient, QueryCommand } = await import('@aws-sdk/lib-dynamodb');
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    
    const ddbClient = new DynamoDBClient({ region: 'us-east-1' });
    const docClient = DynamoDBDocumentClient.from(ddbClient, {
      marshallOptions: { removeUndefinedValues: true }
    });

    const dbQuery = {
      TableName: process.env.MSG_TABLE || 'Messages',
      IndexName: 'User-Messages-Index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':channel': 'email'
      },
      FilterExpression: 'Channel = :channel',
      ScanIndexForward: false,
      Limit: 50
    };

    const result = await docClient.send(new QueryCommand(dbQuery));
    const emails = result.Items || [];
    
    // Find emails that match both sender and subject
    const matchingEmails = emails.filter(email => {
      const emailSender = (email.From || email.Sender || '').toLowerCase();
      const emailSubject = (email.Subject || '').toLowerCase();
      const searchSender = sender.toLowerCase().trim();
      const searchSubject = subject.toLowerCase().trim();
      
      const senderMatch = emailSender.includes(searchSender) || searchSender.includes(emailSender);
      const subjectMatch = emailSubject.includes(searchSubject) || searchSubject.includes(emailSubject);
      
      return senderMatch && subjectMatch;
    });
    
    console.log(`📧 Found ${matchingEmails.length} matching emails for sender="${sender}" and subject="${subject}"`);
    return matchingEmails;
    
  } catch (error) {
    console.error('❌ Specific email search failed:', error);
    return [];
  }
}

/**
 * Format detailed email information
 */
function formatEmailDetails(email, fallbackSubject, fallbackSender) {
  const subject = email.Subject || fallbackSubject || '(no subject)';
  const sender = email.From || email.Sender || fallbackSender || 'Unknown sender';
  const timestamp = email.Timestamp || email.timestamp;
  const body = email.Body || email.content || '';
  
  let timeDescription = 'unknown time';
  if (timestamp) {
    const emailDate = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now - emailDate) / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      timeDescription = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      timeDescription = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      timeDescription = 'recently';
    }
  }
  
  // Extract key information from email body
  let bodyPreview = '';
  if (body) {
    // Clean up HTML and get first few sentences
    const cleanBody = body.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    bodyPreview = cleanBody.length > 300 ? cleanBody.substring(0, 300) + '...' : cleanBody;
  }
  
  let response = `Here are the details for that email:\n\n`;
  response += `**Subject:** "${subject}"\n`;
  response += `**From:** ${sender}\n`;
  response += `**Received:** ${timeDescription}\n\n`;
  
  if (bodyPreview) {
    response += `**Content:**\n${bodyPreview}`;
  } else {
    response += `**Content:** The email content is not available in my records, but the subject and sender information above should help you locate it in your email client.`;
  }
  
  return response;
}

/**
 * Handle greeting messages
 */
function handleGreeting(userQuery, conversationHistory) {
  const greetings = [
    "Hi! I can help you with your emails and business insights. What would you like to know?",
    "Hello! I'm here to help you manage your emails and find important information. How can I assist you?",
    "Hey there! Ready to dive into your emails or need help with something specific?"
  ];
  
  // Pick a greeting based on time of day or randomly
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  
  return {
    userQuery,
    aiResponse: greeting,
    contextUsed: [],
    responseType: 'greeting',
    source: 'template',
    fast: true
  };
}

/**
 * Format email list response based on tone and filters
 */
function formatEmailListResponse(emails, filters, tone = 'professional') {
  if (emails.length === 0) {
    const emptyMessage = filters.emailDirection === 'sent' ? 
      "You haven't sent any emails recently." :
      filters.emailDirection === 'received' ? 
      "You haven't received any emails recently." :
      "No recent emails found.";
    
    return tone === 'casual' ? 
      emptyMessage.replace("You haven't", "You haven't fucking") + " 🤷‍♂️" :
      emptyMessage;
  }
  
  const direction = filters.emailDirection === 'sent' ? 'sent' : 
                   filters.emailDirection === 'received' ? 'received' : '';
  
  const timeframe = filters.timeframe ? ` from ${filters.timeframe}` : '';
  
  const emailList = emails.slice(0, 3).map(email => {
    // Handle your actual database schema
    let participant = 'unknown';
    
    if (email.Direction === 'incoming') {
      // For incoming emails, show the sender
      participant = email.From || 'unknown sender';
    } else {
      // For outgoing emails, show the primary recipient
      if (email.To && Array.isArray(email.To)) {
        participant = email.To[0] || 'unknown recipient';
      } else if (typeof email.To === 'string') {
        participant = email.To;
      } else {
        participant = 'unknown recipient';
      }
    }
    
    // Format timestamp for display
    const timeAgo = getTimeAgo(email.Timestamp);
    
    return `• **${email.Subject || '(no subject)'}** - ${email.Direction === 'incoming' ? 'from' : 'to'} ${participant} (${timeAgo})`;
  }).join('\n');
  
  const intro = tone === 'casual' ? 
    `Here are your ${direction ? direction + ' ' : ''}emails${timeframe}:` :
    `Here are your recent ${direction ? direction + ' ' : ''}emails${timeframe}:`;
  
  const moreText = emails.length > 3 ? `\n\n...and ${emails.length - 3} more.` : '';
  
  return `${intro}\n\n${emailList}${moreText}`;
}

/**
 * Format emails for display with rich sender/recipient information
 */
function formatEmailsForDisplay(emails, userQuery = '') {
  if (!emails || emails.length === 0) {
    return {
      formatted: "I couldn't find any emails matching your request. This could mean:\n• The emails are older than what I searched\n• The sender name might be spelled differently\n• You might not have emails from this sender\n\nTry being more specific or checking the exact sender name from your inbox.",
      emails: [],
      metadata: {
        totalFound: 0,
        query: userQuery
      }
    };
  }
  
  const formattedEmails = emails.map(email => {
    const timeAgo = getTimeAgo(email.Timestamp || email.timestamp);
    
    // Get proper sender/recipient info
    let participant = '';
    let participantType = '';
    
    if (email.Direction === 'incoming' || email.direction === 'incoming') {
      // For incoming emails, show the sender
      participant = email.From || email.from || 'Unknown sender';
      participantType = 'from';
    } else {
      // For outgoing emails, show the recipient
      const recipients = email.To || email.to;
      if (Array.isArray(recipients)) {
        participant = recipients.join(', ');
      } else {
        participant = recipients || 'Unknown recipient';
      }
      participantType = 'to';
    }
    
    // Clean up email formatting
    const cleanParticipant = participant
      .replace(/^"/, '')
      .replace(/"$/, '')
      .replace(/<[^>]+>/g, '') // Remove email addresses in angle brackets
      .trim();
    
    const subject = email.Subject || email.subject || '(no subject)';
    const preview = email.Body || email.body || '';
    const previewText = preview.substring(0, 100).replace(/\n/g, ' ').trim();
    
    return {
      subject,
      participant: cleanParticipant,
      participantType,
      timeAgo,
      preview: previewText ? `${previewText}...` : '',
      timestamp: email.Timestamp || email.timestamp,
      eventId: email.eventId || email.EventId,
      threadId: email.ThreadId || email.threadId,
      direction: email.Direction || email.direction
    };
  });
  
  // Create a natural language summary
  const summary = formattedEmails.slice(0, 5).map(email => {
    return `• **"${email.subject}"** - ${email.participantType} ${email.participant} (${email.timeAgo})`;
  }).join('\n');
  
  const intro = emails.length === 1 ? 
    `Found 1 email:` :
    `Found ${emails.length} emails:`;
  
  const moreText = emails.length > 5 ? `\n\n...and ${emails.length - 5} more emails.` : '';
  
  return {
    formatted: `${intro}\n\n${summary}${moreText}`,
    emails: formattedEmails,
    metadata: {
      totalFound: emails.length,
      query: userQuery
    }
  };
}

/**
 * Format search-specific email response with enhanced UX
 */
function formatSearchEmailResponse(emails, searchTerm, filters) {
  const direction = filters.emailDirection === 'received' ? 'from' : 
                   filters.emailDirection === 'sent' ? 'to' : 
                   'from/to';
  
  // Use the enhanced formatter
  const result = formatEmailsForDisplay(emails, `emails ${direction} ${searchTerm}`);
  
  if (emails.length === 0) {
    return `I searched your email history but couldn't find any emails ${direction} "${searchTerm}".\n\n` +
           `**What I searched for:**\n` +
           `• Sender/recipient names containing: ${searchTerm}\n` +
           `• Common variations like: ${searchTerm.toLowerCase().replace(/\s+/g, '')}, ${searchTerm.toLowerCase()}\n` +
           `• Email domains related to: ${searchTerm}\n\n` +
           `**Suggestions:**\n` +
           `• Check if the company sends emails from a different address\n` +
           `• Try searching for just part of the name (e.g., "Express" instead of "American Express")\n` +
           `• The emails might be older than what I searched - let me know if you'd like me to search further back`;
  }
  
  // Add context about what was searched
  const searchContext = `\n\n_Searched ${direction} emails containing "${searchTerm}"_`;
  
  return result.formatted + searchContext;
}

/**
 * Convert timestamp to human-readable time ago
 */
function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Convert timeframe strings to timestamp filters
 */
function getTimeframeFilter(timeframe) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (timeframe) {
    case 'today':
      return { startTime: startOfDay.getTime() };
    
    case 'yesterday':
      const yesterday = new Date(startOfDay);
      yesterday.setDate(yesterday.getDate() - 1);
      return { startTime: yesterday.getTime() };
    
    case 'thisWeek':
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      return { startTime: startOfWeek.getTime() };
    
    default:
      return null;
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
      userId: match.metadata.userId, // ✅ Include userId from Pinecone metadata
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
      userId: match.metadata.userId, // ✅ Include userId from Pinecone metadata
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

// Export for debugging
export const classifyUserIntentDebug = classifyUserIntent; 

/**
 * Generalized smart email search with fuzzy matching
 * @param {Object} email - Email object to check
 * @param {string} searchTerm - What the user is searching for
 * @param {string} direction - 'received' or 'sent'
 * @returns {Object} Match result with score and details
 */
function smartEmailMatcher(email, searchTerm, direction) {
  const searchLower = searchTerm.toLowerCase();
  const searchWords = searchLower.split(/\s+/).filter(w => w.length > 2);
  
  // Extract participants dynamically
  const participants = extractEmailParticipants(email);
  
  // Get the field to check based on direction
  let fieldToCheck = '';
  if (direction === 'received') {
    fieldToCheck = (participants.sender || '').toLowerCase();
  } else if (direction === 'sent') {
    const recipient = participants.recipient;
    fieldToCheck = Array.isArray(recipient) ? recipient.join(' ').toLowerCase() : (recipient || '').toLowerCase();
  } else {
    // Check both directions
    const sender = (participants.sender || '').toLowerCase();
    const recipient = participants.recipient;
    const recipientStr = Array.isArray(recipient) ? recipient.join(' ').toLowerCase() : (recipient || '').toLowerCase();
    fieldToCheck = `${sender} ${recipientStr}`;
  }
  
  // Also check subject and body for company names
  const subject = (email.Subject || email.subject || email['Subject'] || '').toLowerCase();
  const body = (email.Body || email.body || email.content || email.bodyText || email['Body'] || '').toLowerCase().substring(0, 500);
  const fullText = `${fieldToCheck} ${subject} ${body}`;
  
  // Calculate match score
  let score = 0;
  let matchDetails = [];
  
  // Exact match gets highest score
  if (fullText.includes(searchLower)) {
    score += 100;
    matchDetails.push(`exact match: "${searchLower}"`);
  }
  
  // Check each word (but give partial credit if not all words match)
  let matchedWords = 0;
  searchWords.forEach(word => {
    if (fullText.includes(word)) {
      matchedWords++;
      matchDetails.push(`word match: "${word}"`);
    }
  });
  
  // Give proportional score based on how many words matched
  if (matchedWords > 0) {
    score += (50 * matchedWords) / searchWords.length;
  }
  
  // Check for common company domain patterns
  const commonDomains = ['.com', '.org', '.net', '.io', '.co', '.edu'];
  commonDomains.forEach(domain => {
    searchWords.forEach(word => {
      if (fullText.includes(`@${word}${domain}`) || fullText.includes(`.${word}${domain}`)) {
        score += 30;
        matchDetails.push(`domain match: "${word}${domain}"`);
      }
    });
  });
  
  // Check for company name variations (removing spaces, adding hyphens, etc.)
  const variations = [
    searchLower.replace(/\s+/g, ''),  // nospaces
    searchLower.replace(/\s+/g, '-'), // with-hyphens
    searchLower.replace(/\s+/g, '_'), // with_underscores
    searchLower.replace(/\s+/g, '.'), // with.dots
  ];
  
  variations.forEach(variant => {
    if (fullText.includes(variant) && variant !== searchLower) {
      score += 20;
      matchDetails.push(`variation match: "${variant}"`);
    }
  });
  

  
  return {
    matches: score > 0,
    score,
    matchDetails,
    debugInfo: {
      searchTerm: searchLower,
      checkedField: fieldToCheck.substring(0, 100) + (fieldToCheck.length > 100 ? '...' : ''),
      subject: subject.substring(0, 100) + (subject.length > 100 ? '...' : ''),
      direction,
      emailStructure: {
        hasFrom: !!(email.From || email.from),
        hasTo: !!(email.To || email.to),
        hasSubject: !!(email.Subject || email.subject),
        hasBody: !!(email.Body || email.body || email.content || email.bodyText),
        availableKeys: Object.keys(email).filter(k => !k.startsWith('_')).slice(0, 15)
      }
    }
  };
}

/**
 * Dynamically extract email participants (sender/recipient) from various email structures
 * @param {Object} email - Email object with unknown structure
 * @returns {Object} Extracted sender and recipient information
 */
function extractEmailParticipants(email) {
  const result = {
    sender: '',
    recipient: '',
    senderField: null,
    recipientField: null,
    allFields: Object.keys(email).filter(k => !k.startsWith('_'))
  };
  
  // Common patterns for sender fields
  const senderPatterns = ['from', 'sender', 'sendfrom', 'mailfrom', 'email_from', 'from_email', 'fromaddress'];
  const recipientPatterns = ['to', 'recipient', 'sendto', 'mailto', 'email_to', 'to_email', 'toaddress'];
  
  // Check each field in the email object
  Object.entries(email).forEach(([key, value]) => {
    if (!key || key.startsWith('_')) return;
    
    const keyLower = key.toLowerCase();
    
    // Check if this is a sender field
    if (senderPatterns.some(pattern => keyLower.includes(pattern))) {
      result.sender = value || '';
      result.senderField = key;
    }
    
    // Check if this is a recipient field
    if (recipientPatterns.some(pattern => keyLower.includes(pattern))) {
      result.recipient = value || '';
      result.recipientField = key;
    }
    
    // If the value contains an email address and we haven't found sender/recipient yet
    if (typeof value === 'string' && value.includes('@')) {
      if (!result.sender && keyLower.includes('from')) {
        result.sender = value;
        result.senderField = key;
      } else if (!result.recipient && keyLower.includes('to')) {
        result.recipient = value;
        result.recipientField = key;
      } else if (!result.sender && !keyLower.includes('to')) {
        // Fallback - any email field that's not "to" could be sender
        result.sender = value;
        result.senderField = key;
      }
    }
  });
  
  // Log what we found for debugging
  if (!result.sender && !result.recipient) {
    console.log(`⚠️ Could not find sender/recipient in email. Available fields: ${result.allFields.join(', ')}`);
  }
  
  return result;
}
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { ComprehendClient, DetectSentimentCommand } = require('@aws-sdk/client-comprehend');
const OpenAI = require('openai/index.js');

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });
const comprehendClient = new ComprehendClient({ region: process.env.AWS_REGION || 'us-east-1' });
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// SQS Queue URL for sending processed events to the chunker
const CHUNKER_QUEUE_URL = process.env.CHUNKER_QUEUE_URL;

exports.handler = async (event) => {
    console.log('Pre-processor Lambda triggered');
    console.log('Event:', JSON.stringify(event, null, 2));

    const results = [];

    try {
        // Process each Kinesis record
        for (const record of event.Records) {
            try {
                // Decode the Kinesis data
                const payload = Buffer.from(record.kinesis.data, 'base64').toString('utf-8');
                const rawEvent = JSON.parse(payload);
                
                console.log('Processing rawEvent:', JSON.stringify(rawEvent, null, 2));

                // Enhance the event with natural language description and sentiment analysis
                const enhancedEvent = await enhanceEventWithNL(rawEvent);
                
                // Send to chunker queue
                await sendToChunkerQueue(enhancedEvent);
                
                results.push({
                    eventId: rawEvent.detail?.eventId || rawEvent.id || 'unknown',
                    status: 'success',
                    sequenceNumber: record.kinesis.sequenceNumber
                });

            } catch (recordError) {
                console.error('Error processing record:', recordError);
                results.push({
                    eventId: 'unknown',
                    status: 'error',
                    error: recordError.message,
                    sequenceNumber: record.kinesis.sequenceNumber
                });
            }
        }

        console.log('Processing complete. Results:', results);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Pre-processing completed',
                processed: results.length,
                results: results
            })
        };

    } catch (error) {
        console.error('Lambda execution error:', error);
        throw error;
    }
};

/**
 * Enhance rawEvent with natural language description and sentiment analysis
 */
async function enhanceEventWithNL(rawEvent) {
    // Extract text content for sentiment analysis
    const textContent = extractTextContent(rawEvent);
    
    // Extract threadId from various possible locations in the event
    const threadId = extractThreadId(rawEvent);
    
    // Run both analyses in parallel for efficiency
    const [naturalLanguageDescription, comprehendSentiment] = await Promise.all([
        generateNaturalLanguageDescription(rawEvent),
        analyzeSentimentWithComprehend(textContent)
    ]);
    
    const enhancedEvent = {
        ...rawEvent,
        processedAt: new Date().toISOString(),
        naturalLanguageDescription: naturalLanguageDescription,
        comprehendSentiment: comprehendSentiment,
        chunkableContent: naturalLanguageDescription, // Use the AI-generated description as chunkable content
        // Ensure threadId is included in the enhanced event
        detail: {
            ...rawEvent.detail,
            threadId: threadId
        }
    };

    console.log('📧 ThreadId extraction:', {
        extractedThreadId: threadId,
        hasThreadId: !!threadId,
        eventId: rawEvent.detail?.eventId || rawEvent.id
    });

    return enhancedEvent;
}

/**
 * Generate natural language description using OpenAI with embedded sentiment context
 */
async function generateNaturalLanguageDescription(rawEvent) {
    try {
        const prompt = `Analyze this event and provide a concise, prescriptive one-sentence description that would be useful for semantic search and context retrieval. Include tone, emotion, and urgency naturally in the description when relevant:

Event JSON:
${JSON.stringify(rawEvent, null, 2)}

Provide only the one-sentence description with embedded emotional context, no additional text:`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are an expert at analyzing events and creating concise, descriptive summaries optimized for semantic search and context retrieval. Include emotional tone, urgency, and sentiment naturally in your descriptions when relevant. Always respond with exactly one descriptive sentence that captures both the action and emotional context."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 150,
            temperature: 0.3
        });

        const description = completion.choices[0].message.content.trim();
        console.log('Generated AI description:', description);
        return description;

    } catch (error) {
        console.error('Error generating AI description:', error);
        
        // Fallback to basic description if AI fails
        const eventType = rawEvent.detail?.eventType || rawEvent.eventType || 'unknown';
        const timestamp = rawEvent.detail?.timestamp || rawEvent.timestamp || new Date().toISOString();
        const date = new Date(timestamp).toLocaleString();
        return `${eventType} event occurred on ${date}.`;
    }
}

/**
 * Send enhanced event to SQS queue for chunker processing
 */
async function sendToChunkerQueue(enhancedEvent) {
    if (!CHUNKER_QUEUE_URL) {
        console.warn('CHUNKER_QUEUE_URL not configured, skipping SQS send');
        return;
    }

    try {
        // Log the complete enhanced event structure
        console.log('📋 Complete Enhanced Event Structure:', JSON.stringify(enhancedEvent, null, 2));
        console.log('🔍 Natural Language Description:', enhancedEvent.naturalLanguageDescription);
        if (enhancedEvent.comprehendSentiment) {
            console.log('📊 Comprehend Sentiment Analysis:', JSON.stringify(enhancedEvent.comprehendSentiment, null, 2));
        }
        
        const messageBody = JSON.stringify(enhancedEvent);
        
        const command = new SendMessageCommand({
            QueueUrl: CHUNKER_QUEUE_URL,
            MessageBody: messageBody,
            MessageAttributes: {
                eventType: {
                    DataType: 'String',
                    StringValue: enhancedEvent.detail?.eventType || 'unknown'
                },
                userId: {
                    DataType: 'String',
                    StringValue: enhancedEvent.detail?.userId || 'unknown'
                },
                eventId: {
                    DataType: 'String',
                    StringValue: enhancedEvent.detail?.eventId || enhancedEvent.id || 'unknown'
                },
                processedAt: {
                    DataType: 'String',
                    StringValue: enhancedEvent.processedAt
                }
            },
            MessageDeduplicationId: enhancedEvent.detail?.eventId || enhancedEvent.id || 'unknown', // For FIFO queues
            MessageGroupId: enhancedEvent.detail?.userId || 'default-group' // For FIFO queues - group by user
        });

        const result = await sqsClient.send(command);
        console.log('Successfully sent to chunker queue:', {
            messageId: result.MessageId,
            eventId: enhancedEvent.detail?.eventId || enhancedEvent.id || 'unknown',
            eventType: enhancedEvent.detail?.eventType || 'unknown'
        });
        
        return result;

    } catch (error) {
        console.error('Error sending to chunker queue:', error);
        throw error;
    }
}

/**
 * Extract threadId from various possible locations in the event
 */
function extractThreadId(rawEvent) {
    // Try multiple possible locations for threadId
    const threadId = 
        rawEvent.detail?.threadId ||           // Direct in detail
        rawEvent.detail?.data?.threadId ||     // In data section
        rawEvent.threadId ||                   // Direct in root
        rawEvent.detail?.data?.messageId ||    // Use messageId as threadId fallback
        rawEvent.detail?.data?.conversationId || // Alternative field name
        rawEvent.detail?.data?.thread ||       // Alternative field name
        null;
    
    console.log('🔍 ThreadId search in event:', {
        'detail.threadId': rawEvent.detail?.threadId,
        'detail.data.threadId': rawEvent.detail?.data?.threadId,
        'root.threadId': rawEvent.threadId,
        'detail.data.messageId': rawEvent.detail?.data?.messageId,
        'detail.data.conversationId': rawEvent.detail?.data?.conversationId,
        'detail.data.thread': rawEvent.detail?.data?.thread,
        'finalThreadId': threadId
    });
    
    return threadId;
}

/**
 * Extract text content from rawEvent for sentiment analysis
 */
function extractTextContent(rawEvent) {
    const { data } = rawEvent.detail || rawEvent;
    const textParts = [];
    
    // Add subject if available
    if (data?.subject) {
        textParts.push(data.subject);
    }
    
    // Add main text content
    if (data?.bodyText) {
        textParts.push(data.bodyText);
    } else if (data?.bodyHtml) {
        // Strip basic HTML tags for sentiment analysis
        const cleanText = data.bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        textParts.push(cleanText);
    } else if (data?.text) {
        textParts.push(data.text);
    }
    
    return textParts.join(' ').trim() || 'No text content available';
}

/**
 * Analyze sentiment using AWS Comprehend
 */
async function analyzeSentimentWithComprehend(textContent) {
    try {
        // Comprehend requires at least 1 character and max 5000 bytes
        if (!textContent || textContent.trim().length === 0) {
            return {
                sentiment: "NEUTRAL",
                confidence: 0.0,
                scores: {
                    positive: 0.33,
                    negative: 0.33,
                    neutral: 0.34,
                    mixed: 0.0
                }
            };
        }
        
        // Truncate if too long (Comprehend limit is 5000 bytes)
        const truncatedText = textContent.length > 4000 ? 
            textContent.substring(0, 4000) + '...' : textContent;
        
        const command = new DetectSentimentCommand({
            Text: truncatedText,
            LanguageCode: 'en' // Assuming English for now
        });
        
        const result = await comprehendClient.send(command);
        console.log('Comprehend sentiment:', result.Sentiment, 'confidence:', Math.max(...Object.values(result.SentimentScore)));
        
        return {
            sentiment: result.Sentiment,
            confidence: Math.max(...Object.values(result.SentimentScore)),
            scores: {
                positive: result.SentimentScore.Positive,
                negative: result.SentimentScore.Negative,
                neutral: result.SentimentScore.Neutral,
                mixed: result.SentimentScore.Mixed
            }
        };
        
    } catch (error) {
        console.error('Error analyzing sentiment with Comprehend:', error);
        
        // Fallback sentiment analysis
        return {
            sentiment: "NEUTRAL",
            confidence: 0.0,
            scores: {
                positive: 0.33,
                negative: 0.33,
                neutral: 0.34,
                mixed: 0.0
            },
            error: error.message
        };
    }
} 
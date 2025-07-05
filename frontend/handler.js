import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';

// ──────────────────────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────────────────────

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });
const CHUNKER_QUEUE_URL = process.env.CHUNKER_QUEUE_URL || 'https://sqs.us-east-1.amazonaws.com/575108947335/beya-chunker-queue';

// ──────────────────────────────────────────────────────────────────────────────
// Natural Language Description Generator
// ──────────────────────────────────────────────────────────────────────────────

function generateNLDescription(rawEvent) {
  const { eventType, data } = rawEvent;
  
  try {
    switch(eventType) {
      case 'email.sent':
        return `User sent an email to ${data.to?.join?.(', ') || data.to} with subject "${data.subject || 'no subject'}". Message content: ${data.bodyText || data.bodyHtml || 'empty message'}`;
      
      case 'whatsapp.sent':
        return `User sent a WhatsApp message to ${data.to} saying: ${data.text || 'empty message'}`;
      
      case 'email.received':
        return `User received an email from ${data.from || 'unknown sender'} with subject "${data.subject || 'no subject'}". Message content: ${data.bodyText || data.bodyHtml || 'empty message'}`;
      
      case 'whatsapp.received':
        return `User received a WhatsApp message from ${data.from || 'unknown sender'} saying: ${data.text || 'empty message'}`;
        
      default:
        return `User performed action of type ${eventType} with data: ${JSON.stringify(data)}`;
    }
  } catch (error) {
    console.error('Error generating NL description:', error);
    return `User performed action of type ${eventType}`;
  }
}

function generateChunkableContent(rawEvent, nlDescription) {
  const { data } = rawEvent;
  
  const contentParts = [
    nlDescription,
    '', // Empty line for separation
    `Thread Context: This action was part of thread "${data.threadId || 'unknown'}"`,
    `Timestamp: ${rawEvent.timestamp}`,
    `Event ID: ${rawEvent.eventId}`
  ];
  
  // Add original content if available
  if (data.bodyText) {
    contentParts.push('', 'Original Message:', data.bodyText);
  } else if (data.bodyHtml) {
    contentParts.push('', 'Original Message (HTML):', data.bodyHtml);
  }
  
  return contentParts.join('\n');
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Handler
// ──────────────────────────────────────────────────────────────────────────────

export async function handler(event) {
  console.log('🔧 Pre-processor invoked with', event.Records?.length || 0, 'Kinesis records');
  
  const results = [];
  
  try {
    for (const record of event.Records || []) {
      try {
        // 1. Decode Kinesis record
        const kinesisData = Buffer.from(record.kinesis.data, 'base64').toString('utf-8');
        const eventBridgeEvent = JSON.parse(kinesisData);
        
        console.log('📥 Processing EventBridge event:', {
          id: eventBridgeEvent.id,
          source: eventBridgeEvent.source,
          detailType: eventBridgeEvent['detail-type']
        });
        
        // 2. Extract rawEvent from EventBridge detail
        const rawEvent = eventBridgeEvent.detail;
        
        // 3. Generate natural language description
        const nlDescription = generateNLDescription(rawEvent);
        
        // 4. Generate chunkable content
        const chunkableContent = generateChunkableContent(rawEvent, nlDescription);
        
        // 5. Create enhanced event for chunking
        const enhancedEvent = {
          enhancedEventId: uuidv4(),
          originalEventId: rawEvent.eventId,
          timestamp: new Date().toISOString(),
          nlDescription,
          chunkableContent,
          metadata: {
            source: rawEvent.source,
            eventType: rawEvent.eventType,
            userId: rawEvent.userId,
            threadId: rawEvent.data?.threadId,
            subject: rawEvent.data?.subject,
            kinesisSequenceNumber: record.kinesis.sequenceNumber
          },
          originalEvent: rawEvent
        };
        
        console.log('✨ Enhanced event created:', {
          enhancedEventId: enhancedEvent.enhancedEventId,
          originalEventId: enhancedEvent.originalEventId,
          nlDescription: nlDescription.substring(0, 100) + '...',
          contentLength: chunkableContent.length
        });
        
        // 6. Send to SQS for chunking
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: CHUNKER_QUEUE_URL,
          MessageBody: JSON.stringify(enhancedEvent),
          MessageGroupId: enhancedEvent.metadata.threadId || 'default', // For FIFO queues
          MessageDeduplicationId: enhancedEvent.enhancedEventId
        }));
        
        console.log('📤 Enhanced event sent to chunker queue:', enhancedEvent.enhancedEventId);
        
        results.push({
          success: true,
          originalEventId: rawEvent.eventId,
          enhancedEventId: enhancedEvent.enhancedEventId
        });
        
      } catch (recordError) {
        console.error('❌ Error processing record:', recordError);
        results.push({
          success: false,
          error: recordError.message,
          record: record.kinesis?.sequenceNumber
        });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Pre-processing complete: ${successful} successful, ${failed} failed`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        processed: results.length,
        successful,
        failed,
        results
      })
    };
    
  } catch (error) {
    console.error('❌ Pre-processor error:', error);
    throw error; // This will cause Lambda to retry
  }
} 
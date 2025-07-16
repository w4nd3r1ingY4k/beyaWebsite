// Debug script to understand reply threading issues
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const MSG_TABLE = 'Messages';
const FLOWS_TABLE = 'Flows';

async function debugReplyThreading() {
  try {
    console.log('🔍 Debugging reply threading issues...\n');
    
    // 1. Find recent messages (last 24 hours)
    console.log('1️⃣ Searching for recent messages...');
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentMessages = await docClient.send(new ScanCommand({
      TableName: MSG_TABLE,
      FilterExpression: '#ts > :timestamp',
      ExpressionAttributeNames: {
        '#ts': 'Timestamp'
      },
      ExpressionAttributeValues: {
        ':timestamp': oneDayAgo
      }
    }));
    
    console.log(`Found ${recentMessages.Items?.length || 0} recent messages`);
    
    // Group by subject to find potential threading issues
    const messagesBySubject = {};
    recentMessages.Items?.forEach(msg => {
      // Check multiple possible locations for subject
      const subject = msg.Subject || 
                     (msg.Headers && msg.Headers.Subject && msg.Headers.Subject.S) ||
                     (msg.Headers && msg.Headers.Subject) ||
                     'No Subject';
      if (!messagesBySubject[subject]) {
        messagesBySubject[subject] = [];
      }
      messagesBySubject[subject].push(msg);
    });
    
    // Show subjects with multiple messages (potential threading candidates)
    console.log('\n📋 Messages grouped by subject:');
    Object.keys(messagesBySubject).forEach(subject => {
      const messages = messagesBySubject[subject];
      if (messages.length > 1) {
        console.log(`\n  🔄 Subject: "${subject}" (${messages.length} messages)`);
        messages.forEach(msg => {
          console.log(`    📧 ThreadId: ${msg.ThreadId} | Direction: ${msg.Direction} | MessageId: ${msg.MessageId}`);
        });
      }
    });
    
    // 2. Find flows for these threads
    console.log('\n2️⃣ Searching for related flows...');
    const threadIds = [...new Set(recentMessages.Items?.map(msg => msg.ThreadId) || [])];
    
    for (const threadId of threadIds) {
      const flows = await docClient.send(new ScanCommand({
        TableName: FLOWS_TABLE,
        FilterExpression: 'flowId = :flowId',
        ExpressionAttributeValues: {
          ':flowId': threadId
        }
      }));
      
      console.log(`\n  🧵 ThreadId: ${threadId}`);
      flows.Items?.forEach(flow => {
        console.log(`    📁 Flow: contactId=${flow.contactId}, subject="${flow.subject}", participants=${JSON.stringify(flow.participants)}`);
      });
    }
    
    // 3. Check Gmail Message-IDs in headers for messages with threading issues
    console.log('\n3️⃣ Checking Gmail Message-IDs in headers...');
    Object.keys(messagesBySubject).forEach(subject => {
      const messages = messagesBySubject[subject];
      if (messages.length > 1) {
        console.log(`\n  🔍 Subject: "${subject}"`);
        messages.forEach(msg => {
          console.log(`    📧 Direction: ${msg.Direction} | ThreadId: ${msg.ThreadId}`);
          console.log(`      Headers: ${JSON.stringify(msg.Headers || {})}`);
          console.log(`      Result: ${JSON.stringify(msg.Result || {})}`);
          console.log(`      InReplyTo: ${msg.InReplyTo || 'none'}`);
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Error debugging:', error);
  }
}

debugReplyThreading(); 
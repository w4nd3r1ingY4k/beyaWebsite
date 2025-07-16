// Debug script for specific reply thread
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const MSG_TABLE = 'Messages';
const FLOWS_TABLE = 'Flows';

async function debugSpecificReplyThread() {
  try {
    console.log('🔍 Debugging Specific Reply Thread\n');
    
    const originalThreadId = 'a6bd1a45-dc0c-4f8e-89c9-e09ce95a6414';
    const replyThreadId = '4e10e81d-fcc5-493a-8ad0-03cd7c177369';
    
    console.log(`Original thread: ${originalThreadId}`);
    console.log(`Reply thread: ${replyThreadId}\n`);
    
    // Get messages from both threads
    console.log('1️⃣ Getting messages from original thread...');
    const originalMessages = await docClient.send(new QueryCommand({
      TableName: MSG_TABLE,
      KeyConditionExpression: 'ThreadId = :tid',
      ExpressionAttributeValues: {
        ':tid': originalThreadId
      }
    }));
    
    console.log('2️⃣ Getting messages from reply thread...');
    const replyMessages = await docClient.send(new QueryCommand({
      TableName: MSG_TABLE,
      KeyConditionExpression: 'ThreadId = :tid',
      ExpressionAttributeValues: {
        ':tid': replyThreadId
      }
    }));
    
    console.log(`\n📊 Results:`);
    console.log(`Original thread: ${originalMessages.Items?.length || 0} messages`);
    console.log(`Reply thread: ${replyMessages.Items?.length || 0} messages`);
    
    // Analyze original thread
    console.log('\n📧 ORIGINAL THREAD ANALYSIS:');
    originalMessages.Items?.forEach((msg, index) => {
      console.log(`\n--- Original Message ${index + 1} ---`);
      console.log(`Direction: ${msg.Direction}`);
      console.log(`Subject: ${msg.Subject || 'undefined'}`);
      console.log(`Headers.Subject: ${msg.Headers?.Subject || 'undefined'}`);
      console.log(`Body: "${(msg.Body || '').substring(0, 100)}..."`);
      console.log(`Timestamp: ${new Date(msg.Timestamp).toISOString()}`);
      console.log(`Headers.Message-ID: ${msg.Headers?.['Message-ID'] || 'undefined'}`);
      console.log(`Headers.In-Reply-To: ${msg.Headers?.['In-Reply-To'] || 'undefined'}`);
      console.log(`Result.MessageId: ${msg.Result?.MessageId || 'undefined'}`);
    });
    
    // Analyze reply thread
    console.log('\n📧 REPLY THREAD ANALYSIS:');
    replyMessages.Items?.forEach((msg, index) => {
      console.log(`\n--- Reply Message ${index + 1} ---`);
      console.log(`Direction: ${msg.Direction}`);
      console.log(`Subject: ${msg.Subject || 'undefined'}`);
      console.log(`Headers.Subject: ${msg.Headers?.Subject || 'undefined'}`);
      console.log(`Body: "${(msg.Body || '').substring(0, 100)}..."`);
      console.log(`Timestamp: ${new Date(msg.Timestamp).toISOString()}`);
      console.log(`Headers.Message-ID: ${msg.Headers?.['Message-ID'] || 'undefined'}`);
      console.log(`Headers.In-Reply-To: ${msg.Headers?.['In-Reply-To'] || 'undefined'}`);
      console.log(`Result.MessageId: ${msg.Result?.MessageId || 'undefined'}`);
    });
    
    // Check flows for both threads
    console.log('\n🧵 FLOW ANALYSIS:');
    
    console.log('\n--- Original Thread Flow ---');
    const originalFlow = await docClient.send(new ScanCommand({
      TableName: FLOWS_TABLE,
      FilterExpression: 'flowId = :flowId',
      ExpressionAttributeValues: {
        ':flowId': originalThreadId
      }
    }));
    
    originalFlow.Items?.forEach(flow => {
      console.log(`contactId: ${flow.contactId}`);
      console.log(`subject: ${flow.subject}`);
      console.log(`threadingKey: ${flow.threadingKey || 'undefined'}`);
      console.log(`participants: ${JSON.stringify(flow.participants)}`);
      console.log(`threadingType: ${flow.threadingType || 'undefined'}`);
    });
    
    console.log('\n--- Reply Thread Flow ---');
    const replyFlow = await docClient.send(new ScanCommand({
      TableName: FLOWS_TABLE,
      FilterExpression: 'flowId = :flowId',
      ExpressionAttributeValues: {
        ':flowId': replyThreadId
      }
    }));
    
    replyFlow.Items?.forEach(flow => {
      console.log(`contactId: ${flow.contactId}`);
      console.log(`subject: ${flow.subject}`);
      console.log(`threadingKey: ${flow.threadingKey || 'undefined'}`);
      console.log(`participants: ${JSON.stringify(flow.participants)}`);
      console.log(`threadingType: ${flow.threadingType || 'undefined'}`);
    });
    
    // Compare threading keys
    if (originalFlow.Items?.[0] && replyFlow.Items?.[0]) {
      console.log('\n🔍 THREADING KEY COMPARISON:');
      console.log(`Original: "${originalFlow.Items[0].threadingKey}"`);
      console.log(`Reply:    "${replyFlow.Items[0].threadingKey}"`);
      console.log(`Match: ${originalFlow.Items[0].threadingKey === replyFlow.Items[0].threadingKey}`);
    }
    
    // Analyze Message-ID correlation
    const originalMsg = originalMessages.Items?.[0];
    const replyMsg = replyMessages.Items?.[0];
    
    if (originalMsg && replyMsg) {
      console.log('\n🔗 MESSAGE-ID CORRELATION:');
      console.log(`Original stored Message-ID: ${originalMsg.Headers?.['Message-ID']}`);
      console.log(`Reply In-Reply-To: ${replyMsg.Headers?.['In-Reply-To']}`);
      
      const originalId = originalMsg.Headers?.['Message-ID'];
      const replyTo = replyMsg.Headers?.['In-Reply-To'];
      
      if (originalId && replyTo) {
        console.log(`Direct match: ${originalId === replyTo}`);
        console.log(`Contains test: ${replyTo.includes(originalId.replace(/^<|>$/g, ''))}`);
        console.log(`Reverse contains: ${originalId.includes(replyTo.replace(/^<|>$/g, ''))}`);
        
        // Test various format variations
        const cleanOriginal = originalId.replace(/^<|>$/g, '');
        const cleanReply = replyTo.replace(/^<|>$/g, '');
        console.log(`Clean match: ${cleanOriginal === cleanReply}`);
        console.log(`Core ID match: ${cleanOriginal.split('@')[0] === cleanReply.split('@')[0]}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugSpecificReplyThread(); 
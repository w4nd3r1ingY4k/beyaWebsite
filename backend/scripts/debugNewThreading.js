// Debug script for the specific "test threading fix 123" messages
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const MSG_TABLE = 'Messages';
const FLOWS_TABLE = 'Flows';

async function debugNewThreading() {
  try {
    console.log('🔍 Debugging "test threading fix 123" messages...\n');
    
    // Find messages with the test subject - check all possible locations
    console.log('1️⃣ Searching for "test threading fix 123" messages...');
    const testMessages = await docClient.send(new ScanCommand({
      TableName: MSG_TABLE,
      FilterExpression: 'contains(#subject, :subject) OR contains(Headers.#headerSubject, :subject) OR contains(Headers.#headerSubject.#s, :subject) OR contains(#body, :subject)',
      ExpressionAttributeNames: {
        '#subject': 'Subject',
        '#headerSubject': 'Subject', 
        '#s': 'S',
        '#body': 'Body'
      },
      ExpressionAttributeValues: {
        ':subject': 'test threading fix 123'
      }
    }));
    
    console.log(`Found ${testMessages.Items?.length || 0} messages with "test threading fix 123"`);
    
    if (testMessages.Items && testMessages.Items.length > 0) {
      testMessages.Items.forEach((msg, index) => {
        console.log(`\n📧 Message ${index + 1}:`);
        console.log(`   ThreadId: ${msg.ThreadId}`);
        console.log(`   Direction: ${msg.Direction}`);
        console.log(`   Subject: ${msg.Subject || 'undefined'}`);
        console.log(`   Headers.Subject: ${msg.Headers?.Subject || 'undefined'}`);
        console.log(`   Headers.Message-ID: ${msg.Headers?.['Message-ID'] || 'undefined'}`);
        console.log(`   Headers.In-Reply-To: ${msg.Headers?.['In-Reply-To'] || 'undefined'}`);
        console.log(`   InReplyTo: ${msg.InReplyTo || 'undefined'}`);
        console.log(`   Result: ${JSON.stringify(msg.Result || {})}`);
        console.log(`   Timestamp: ${new Date(msg.Timestamp).toISOString()}`);
      });
      
      // Check flows for these threads
      console.log('\n2️⃣ Checking corresponding flows...');
      const threadIds = [...new Set(testMessages.Items.map(msg => msg.ThreadId))];
      
      for (const threadId of threadIds) {
        const flows = await docClient.send(new ScanCommand({
          TableName: FLOWS_TABLE,
          FilterExpression: 'flowId = :flowId',
          ExpressionAttributeValues: {
            ':flowId': threadId
          }
        }));
        
        console.log(`\n🧵 ThreadId: ${threadId}`);
        flows.Items?.forEach(flow => {
          console.log(`   📁 Flow:`);
          console.log(`      contactId: ${flow.contactId}`);
          console.log(`      subject: ${flow.subject}`);
          console.log(`      participants: ${JSON.stringify(flow.participants)}`);
          console.log(`      threadingKey: ${flow.threadingKey || 'undefined'}`);
          console.log(`      threadingType: ${flow.threadingType || 'undefined'}`);
        });
      }
      
      // Check if Message-ID based threading should have worked
      console.log('\n3️⃣ Analyzing Message-ID threading...');
      const outgoingMessages = testMessages.Items.filter(msg => msg.Direction === 'outgoing');
      const incomingMessages = testMessages.Items.filter(msg => msg.Direction === 'incoming');
      
      if (outgoingMessages.length > 0 && incomingMessages.length > 0) {
        console.log('📤 Outgoing message Message-IDs:');
        outgoingMessages.forEach(msg => {
          console.log(`   ${msg.Headers?.['Message-ID'] || 'none'}`);
        });
        
        console.log('📥 Incoming message In-Reply-To headers:');
        incomingMessages.forEach(msg => {
          console.log(`   ${msg.Headers?.['In-Reply-To'] || 'none'}`);
        });
        
        // Check if any In-Reply-To matches any Message-ID
        const outgoingMessageIds = outgoingMessages.map(msg => msg.Headers?.['Message-ID']).filter(Boolean);
        const incomingReplyTos = incomingMessages.map(msg => msg.Headers?.['In-Reply-To']).filter(Boolean);
        
        console.log('\n🔗 Threading analysis:');
        console.log(`   Outgoing Message-IDs: ${outgoingMessageIds.length}`);
        console.log(`   Incoming In-Reply-To: ${incomingReplyTos.length}`);
        
        const matches = incomingReplyTos.filter(replyTo => 
          outgoingMessageIds.some(msgId => msgId === replyTo)
        );
        
        if (matches.length > 0) {
          console.log(`   ✅ Found ${matches.length} Message-ID matches - should be in same thread`);
        } else {
          console.log(`   ❌ No Message-ID matches found - explains separate threads`);
          console.log('   📋 Outgoing IDs:', outgoingMessageIds);
          console.log('   📋 Incoming Reply-To:', incomingReplyTos);
        }
      }
         } else {
       console.log('❌ No messages found with "test threading fix 123"');
       console.log('🔍 Searching for recent messages instead...');
       
       const recentMessages = await docClient.send(new ScanCommand({
         TableName: MSG_TABLE,
         FilterExpression: '#ts > :timestamp',
         ExpressionAttributeNames: {
           '#ts': 'Timestamp'
         },
         ExpressionAttributeValues: {
           ':timestamp': Date.now() - (30 * 60 * 1000) // Last 30 minutes
         }
       }));
       
       console.log(`Found ${recentMessages.Items?.length || 0} recent messages in last 30 minutes`);
       recentMessages.Items?.slice(0, 10).forEach((msg, index) => {
         console.log(`\n   ${index + 1}. Message details:`);
         console.log(`      Subject: "${msg.Subject || 'undefined'}"`);
         console.log(`      Headers.Subject: "${msg.Headers?.Subject || 'undefined'}"`);
         console.log(`      Headers.Subject.S: "${msg.Headers?.Subject?.S || 'undefined'}"`);
         console.log(`      Body preview: "${(msg.Body || '').substring(0, 50)}..."`);
         console.log(`      Direction: ${msg.Direction}`);
         console.log(`      Timestamp: ${new Date(msg.Timestamp).toISOString()}`);
       });
     }
    
  } catch (error) {
    console.error('❌ Error debugging:', error);
  }
}

debugNewThreading(); 
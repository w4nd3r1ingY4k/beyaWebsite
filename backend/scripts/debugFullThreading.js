// Comprehensive threading debug script
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const MSG_TABLE = 'Messages';
const FLOWS_TABLE = 'Flows';

async function debugFullThreading() {
  try {
    console.log('🔍 Comprehensive Email Threading Debug\n');
    
    // Find messages with "Trying Again" in subject or "Thank you for trying again" in body
    console.log('1️⃣ Searching for messages related to "Trying Again"...');
    const messages = await docClient.send(new ScanCommand({
      TableName: MSG_TABLE,
      FilterExpression: 'contains(#subject, :subject1) OR contains(Headers.#headerSubject, :subject1) OR contains(#body, :subject1) OR contains(#body, :body1) OR contains(#subject, :subject2) OR contains(Headers.#headerSubject, :subject2)',
      ExpressionAttributeNames: {
        '#subject': 'Subject',
        '#headerSubject': 'Subject',
        '#body': 'Body'
      },
      ExpressionAttributeValues: {
        ':subject1': 'Trying Again',
        ':subject2': 'Re: Trying Again',
        ':body1': 'Thank you for trying again'
      }
    }));
    
    console.log(`Found ${messages.Items?.length || 0} messages related to "Trying Again"`);
    
    if (messages.Items && messages.Items.length > 0) {
      // Sort by timestamp
      const sortedMessages = messages.Items.sort((a, b) => (a.Timestamp || 0) - (b.Timestamp || 0));
      
      console.log('\n📧 Message Analysis:');
      sortedMessages.forEach((msg, index) => {
        console.log(`\n--- Message ${index + 1} ---`);
        console.log(`Direction: ${msg.Direction}`);
        console.log(`ThreadId: ${msg.ThreadId}`);
        console.log(`Subject: ${msg.Subject || 'undefined'}`);
        console.log(`Headers.Subject: ${msg.Headers?.Subject || 'undefined'}`);
        console.log(`Body preview: "${(msg.Body || '').substring(0, 100)}..."`);
        console.log(`Timestamp: ${new Date(msg.Timestamp).toISOString()}`);
        console.log(`Headers.Message-ID: ${msg.Headers?.['Message-ID'] || 'undefined'}`);
        console.log(`Headers.In-Reply-To: ${msg.Headers?.['In-Reply-To'] || 'undefined'}`);
        console.log(`InReplyTo field: ${msg.InReplyTo || 'undefined'}`);
        console.log(`Result.MessageId: ${msg.Result?.MessageId || 'undefined'}`);
      });
      
      // Check if we have both outgoing and incoming
      const outgoing = sortedMessages.filter(m => m.Direction === 'outgoing');
      const incoming = sortedMessages.filter(m => m.Direction === 'incoming');
      
      console.log(`\n📊 Summary: ${outgoing.length} outgoing, ${incoming.length} incoming`);
      
      if (outgoing.length > 0 && incoming.length > 0) {
        console.log('\n🔍 Threading Analysis:');
        
        outgoing.forEach((out, i) => {
          console.log(`\n--- Outgoing Message ${i + 1} ---`);
          console.log(`Stored Message-ID: ${out.Headers?.['Message-ID'] || 'none'}`);
          console.log(`Result.MessageId: ${out.Result?.MessageId || 'none'}`);
          
          incoming.forEach((inc, j) => {
            console.log(`\n  Checking against Incoming Message ${j + 1}:`);
            console.log(`    In-Reply-To: ${inc.Headers?.['In-Reply-To'] || 'none'}`);
            console.log(`    InReplyTo field: ${inc.InReplyTo || 'none'}`);
            
            // Check various matching scenarios
            const storedMsgId = out.Headers?.['Message-ID'];
            const inReplyTo = inc.Headers?.['In-Reply-To'];
            const inReplyToField = inc.InReplyTo;
            
            console.log('    Match tests:');
            console.log(`      Exact match: ${storedMsgId === inReplyTo}`);
            console.log(`      Field match: ${storedMsgId === inReplyToField}`);
            if (storedMsgId && inReplyTo) {
              console.log(`      Contains test: ${inReplyTo.includes(storedMsgId.replace(/^<|>$/g, ''))}`);
              console.log(`      Reverse contains: ${storedMsgId.includes(inReplyTo.replace(/^<|>$/g, ''))}`);
            }
          });
        });
      }
      
      // Check flows for these threads
      console.log('\n2️⃣ Analyzing corresponding flows...');
      const threadIds = [...new Set(sortedMessages.map(msg => msg.ThreadId))];
      
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
          console.log(`  📁 Flow Details:`);
          console.log(`     contactId: ${flow.contactId}`);
          console.log(`     subject: ${flow.subject}`);
          console.log(`     threadingKey: ${flow.threadingKey || 'undefined'}`);
          console.log(`     participants: ${JSON.stringify(flow.participants)}`);
          console.log(`     threadingType: ${flow.threadingType || 'undefined'}`);
        });
      }
      
      // Test what our search should find
      if (incoming.length > 0) {
        console.log('\n3️⃣ Testing Message-ID search logic...');
        
        for (const incMsg of incoming) {
          const inReplyTo = incMsg.Headers?.['In-Reply-To'];
          if (inReplyTo) {
            console.log(`\nTesting search for In-Reply-To: ${inReplyTo}`);
            const cleanMessageId = inReplyTo.replace(/^<|>$/g, '');
            console.log(`Cleaned: ${cleanMessageId}`);
            
            // Test our current search parameters
            const searchParams = {
              TableName: MSG_TABLE,
              FilterExpression: 'userId = :userId AND (Headers.#msgId = :messageId OR Headers.#msgId = :messageIdWithBrackets OR Headers.#msgId = :messageIdGmailFormat OR contains(Headers.#msgId, :messageIdCore))',
              ExpressionAttributeNames: {
                '#msgId': 'Message-ID'
              },
              ExpressionAttributeValues: {
                ':userId': incMsg.userId,
                ':messageId': cleanMessageId,
                ':messageIdWithBrackets': `<${cleanMessageId}>`,
                ':messageIdGmailFormat': `<${cleanMessageId}@mail.gmail.com>`,
                ':messageIdCore': cleanMessageId.split('@')[0]
              }
            };
            
            console.log('Search parameters:');
            console.log(`  userId: ${incMsg.userId}`);
            console.log(`  messageId: ${cleanMessageId}`);
            console.log(`  messageIdCore: ${cleanMessageId.split('@')[0]}`);
            
            const searchResult = await docClient.send(new ScanCommand(searchParams));
            console.log(`  Search result: ${searchResult.Items?.length || 0} matches found`);
            
            if (searchResult.Items && searchResult.Items.length > 0) {
              searchResult.Items.forEach((match, idx) => {
                console.log(`    Match ${idx + 1}: ThreadId=${match.ThreadId}, Direction=${match.Direction}`);
              });
            }
          }
        }
      }
      
    } else {
      console.log('❌ No "Trying Again" messages found');
      
      // Fallback: show most recent messages
      console.log('\n🔍 Showing most recent messages instead...');
      const recent = await docClient.send(new ScanCommand({
        TableName: MSG_TABLE,
        FilterExpression: '#ts > :timestamp',
        ExpressionAttributeNames: {
          '#ts': 'Timestamp'
        },
        ExpressionAttributeValues: {
          ':timestamp': Date.now() - (20 * 60 * 1000) // Last 20 minutes
        }
      }));
      
      console.log(`Found ${recent.Items?.length || 0} recent messages`);
      recent.Items?.slice(0, 5).forEach((msg, idx) => {
        console.log(`${idx + 1}. ${msg.Direction} | ${msg.Subject || msg.Headers?.Subject || 'No subject'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugFullThreading(); 
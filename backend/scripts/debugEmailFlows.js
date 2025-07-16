// Script to debug flows and messages for a specific email
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const REGION = process.env.AWS_REGION || 'us-east-1';
const FLOWS_TABLE = process.env.FLOWS_TABLE || 'Flows';
const MESSAGES_TABLE = process.env.MSG_TABLE || 'Messages';

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

const EMAIL_TO_CHECK = 'akbar_shamji@brown.edu';

async function debugEmailFlows() {
  console.log(`🔍 Debugging flows and messages for: ${EMAIL_TO_CHECK}`);
  console.log('');

  try {
    // Step 1: Find ALL flows that might be related to this email
    console.log('📋 Step 1: Scanning ALL flows in the table...');
    const allFlowsScan = {
      TableName: FLOWS_TABLE
    };

    const allFlowsResult = await docClient.send(new ScanCommand(allFlowsScan));
    const allFlows = allFlowsResult.Items || [];
    
    // Filter flows that might be related to the email
    const relatedFlows = allFlows.filter(flow => {
      return (
        flow.contactIdentifier === EMAIL_TO_CHECK ||
        flow.contactEmail === EMAIL_TO_CHECK ||
        flow.fromEmail === EMAIL_TO_CHECK ||
        flow.flowId === EMAIL_TO_CHECK ||
        (flow.threadingKey && flow.threadingKey.includes(EMAIL_TO_CHECK))
      );
    });

    console.log(`\n📊 Found ${relatedFlows.length} flows related to ${EMAIL_TO_CHECK}:`);
    
    for (const flow of relatedFlows) {
      console.log('\n-----------------------------------');
      console.log(`FlowId: ${flow.flowId}`);
      console.log(`ContactId (userId): ${flow.contactId}`);
      console.log(`ContactIdentifier: ${flow.contactIdentifier}`);
      console.log(`ThreadingKey: ${flow.threadingKey}`);
      console.log(`Subject: ${flow.subject}`);
      console.log(`Status: ${flow.status}`);
      console.log(`Created: ${new Date(flow.createdAt).toISOString()}`);
      console.log(`Last Message: ${new Date(flow.lastMessageAt).toISOString()}`);
      console.log(`Message Count: ${flow.messageCount}`);
      
      // Step 2: For each flow, get all messages
      console.log('\n  📧 Messages in this flow:');
      const messageQuery = {
        TableName: MESSAGES_TABLE,
        KeyConditionExpression: 'ThreadId = :threadId',
        ExpressionAttributeValues: {
          ':threadId': flow.flowId
        },
        ScanIndexForward: true // Sort by timestamp ascending
      };

      const messagesResult = await docClient.send(new QueryCommand(messageQuery));
      const messages = messagesResult.Items || [];
      
      if (messages.length === 0) {
        console.log('    No messages found!');
      } else {
        for (const msg of messages) {
          const timestamp = new Date(msg.Timestamp).toISOString();
          const direction = msg.Direction;
          const subject = msg.Subject || '(no subject)';
          const preview = (msg.Body || '').substring(0, 50) + '...';
          
          console.log(`    ${timestamp} | ${direction.padEnd(8)} | ${subject}`);
          console.log(`      Preview: ${preview}`);
          console.log(`      MessageId: ${msg.MessageId}`);
          console.log(`      ThreadId: ${msg.ThreadId}`);
          console.log('');
        }
      }
    }

    // Step 3: Also check if there are any messages with the email as ThreadId (legacy)
    console.log('\n📋 Step 3: Checking for legacy messages with email as ThreadId...');
    const legacyQuery = {
      TableName: MESSAGES_TABLE,
      KeyConditionExpression: 'ThreadId = :threadId',
      ExpressionAttributeValues: {
        ':threadId': EMAIL_TO_CHECK
      }
    };

    const legacyResult = await docClient.send(new QueryCommand(legacyQuery));
    const legacyMessages = legacyResult.Items || [];
    
    if (legacyMessages.length > 0) {
      console.log(`\n⚠️  Found ${legacyMessages.length} LEGACY messages using email as ThreadId!`);
      for (const msg of legacyMessages) {
        console.log(`  - ${new Date(msg.Timestamp).toISOString()} | ${msg.Direction} | ${msg.Subject || '(no subject)'}`);
      }
    } else {
      console.log('  No legacy messages found.');
    }

  } catch (error) {
    console.error('\n❌ Error during debugging:', error);
    throw error;
  }
}

// Run the script
debugEmailFlows().catch(console.error); 
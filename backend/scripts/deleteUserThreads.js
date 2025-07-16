// Script to delete all threads, flows, and messages for a specific email address
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const REGION = process.env.AWS_REGION || 'us-east-1';
const FLOWS_TABLE = process.env.FLOWS_TABLE || 'Flows';
const MESSAGES_TABLE = process.env.MSG_TABLE || 'Messages';

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

const EMAIL_TO_DELETE = 'akbar_shamji@brown.edu';

async function deleteUserThreads() {
  console.log(`🗑️  Starting deletion process for email: ${EMAIL_TO_DELETE}`);
  console.log(`📊 Tables: Flows=${FLOWS_TABLE}, Messages=${MESSAGES_TABLE}`);
  console.log('⚠️  This will permanently delete all data associated with this email!');
  console.log('');

  try {
    // Step 1: Find all flows related to this email
    console.log('🔍 Step 1: Scanning Flows table for related flows...');
    const flowScanParams = {
      TableName: FLOWS_TABLE,
      FilterExpression: 'contactIdentifier = :email OR contactEmail = :email OR fromEmail = :email',
      ExpressionAttributeValues: {
        ':email': EMAIL_TO_DELETE
      }
    };

    const flowsResult = await docClient.send(new ScanCommand(flowScanParams));
    const flows = flowsResult.Items || [];
    console.log(`📋 Found ${flows.length} flows related to ${EMAIL_TO_DELETE}`);

    if (flows.length === 0) {
      console.log('✅ No flows found for this email. Exiting.');
      return;
    }

    // Display flows to be deleted
    console.log('\n📝 Flows to be deleted:');
    flows.forEach((flow, index) => {
      console.log(`  ${index + 1}. FlowId: ${flow.flowId}, ContactId: ${flow.contactId}`);
    });

    // Step 2: For each flow, find and delete all associated messages
    console.log('\n🔍 Step 2: Finding messages for each flow...');
    let totalMessages = 0;
    const messagesByFlow = {};

    for (const flow of flows) {
      const messageQueryParams = {
        TableName: MESSAGES_TABLE,
        KeyConditionExpression: 'ThreadId = :threadId',
        ExpressionAttributeValues: {
          ':threadId': flow.flowId
        }
      };

      const messagesResult = await docClient.send(new QueryCommand(messageQueryParams));
      const messages = messagesResult.Items || [];
      messagesByFlow[flow.flowId] = messages;
      totalMessages += messages.length;
      console.log(`  - Flow ${flow.flowId}: ${messages.length} messages`);
    }

    console.log(`\n📊 Total messages to delete: ${totalMessages}`);

    // Confirmation prompt
    console.log('\n⚠️  WARNING: This action cannot be undone!');
    console.log(`You are about to delete:`);
    console.log(`  - ${flows.length} flows`);
    console.log(`  - ${totalMessages} messages`);
    console.log(`\nPress Ctrl+C to cancel, or wait 5 seconds to proceed...`);
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 3: Delete messages
    console.log('\n🗑️  Step 3: Deleting messages...');
    let deletedMessages = 0;

    for (const [flowId, messages] of Object.entries(messagesByFlow)) {
      for (const message of messages) {
        try {
          await docClient.send(new DeleteCommand({
            TableName: MESSAGES_TABLE,
            Key: {
              ThreadId: message.ThreadId,
              Timestamp: message.Timestamp
            }
          }));
          deletedMessages++;
          if (deletedMessages % 10 === 0) {
            console.log(`  - Deleted ${deletedMessages}/${totalMessages} messages...`);
          }
        } catch (error) {
          console.error(`  ❌ Error deleting message ${message.MessageId}:`, error.message);
        }
      }
    }

    console.log(`✅ Deleted ${deletedMessages} messages`);

    // Step 4: Delete flows
    console.log('\n🗑️  Step 4: Deleting flows...');
    let deletedFlows = 0;

    for (const flow of flows) {
      try {
        await docClient.send(new DeleteCommand({
          TableName: FLOWS_TABLE,
          Key: {
            contactId: flow.contactId,
            flowId: flow.flowId
          }
        }));
        deletedFlows++;
        console.log(`  - Deleted flow ${flow.flowId}`);
      } catch (error) {
        console.error(`  ❌ Error deleting flow ${flow.flowId}:`, error.message);
      }
    }

    console.log(`\n✅ Deleted ${deletedFlows} flows`);

    // Summary
    console.log('\n📊 Deletion Summary:');
    console.log(`  - Email: ${EMAIL_TO_DELETE}`);
    console.log(`  - Flows deleted: ${deletedFlows}/${flows.length}`);
    console.log(`  - Messages deleted: ${deletedMessages}/${totalMessages}`);
    console.log('\n✅ Deletion process complete!');

  } catch (error) {
    console.error('\n❌ Error during deletion process:', error);
    throw error;
  }
}

// Run the script
deleteUserThreads().catch(console.error); 
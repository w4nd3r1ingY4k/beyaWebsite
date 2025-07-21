// Script to delete all threads, flows, and messages for a specific user ID
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

const USER_ID_TO_DELETE = 'c4f8c458-c0c1-7073-e9be-c6856b74a3e2';
const EMAIL_TO_DELETE = 'akbar.shamjijr@gmail.com'; // For reference only

async function deleteUserData() {
  console.log(`🗑️  Starting USER ID based deletion process`);
  console.log(`👤 User ID: ${USER_ID_TO_DELETE}`);
  console.log(`📧 Email (reference): ${EMAIL_TO_DELETE}`);
  console.log(`📊 Tables: Flows=${FLOWS_TABLE}, Messages=${MESSAGES_TABLE}`);
  console.log('⚠️  This will permanently delete ALL data for this user!');
  console.log('');

  try {
    // Step 1: Find all flows for this user ID (using contactId = userId)
    console.log('🔍 Step 1: Finding all flows for this user...');
    const flowQueryParams = {
      TableName: FLOWS_TABLE,
      KeyConditionExpression: 'contactId = :userId',
      ExpressionAttributeValues: {
        ':userId': USER_ID_TO_DELETE
      }
    };

    const flowsResult = await docClient.send(new QueryCommand(flowQueryParams));
    const flows = flowsResult.Items || [];
    console.log(`📋 Found ${flows.length} flows for user ${USER_ID_TO_DELETE}`);

    // Display sample flows
    if (flows.length > 0) {
      console.log('\n📝 Sample flows to be deleted:');
      flows.slice(0, 10).forEach((flow, index) => {
        console.log(`  ${index + 1}. FlowId: ${flow.flowId}, ContactIdentifier: ${flow.contactIdentifier || 'N/A'}`);
      });
      if (flows.length > 10) {
        console.log(`  ... and ${flows.length - 10} more flows`);
      }
    }

    // Step 2: Find ALL messages for this user using the User-Messages-Index GSI
    console.log('\n🔍 Step 2: Finding all messages for this user via GSI...');
    
    let allUserMessages = [];
    let lastEvaluatedKey = null;
    
    do {
      const messageQueryParams = {
        TableName: MESSAGES_TABLE,
        IndexName: 'User-Messages-Index', // Using the GSI for efficient user-based queries
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': USER_ID_TO_DELETE
        },
        ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey })
      };

      const messagesResult = await docClient.send(new QueryCommand(messageQueryParams));
      const messages = messagesResult.Items || [];
      allUserMessages.push(...messages);
      lastEvaluatedKey = messagesResult.LastEvaluatedKey;
      
      console.log(`   📧 Found ${messages.length} messages in this batch (total so far: ${allUserMessages.length})`);
    } while (lastEvaluatedKey);

    console.log(`📊 Total messages found for user: ${allUserMessages.length}`);

    // Step 3: Also search for any messages from flows (belt and suspenders approach)
    console.log('\n🔍 Step 3: Cross-checking messages from flows...');
    let flowMessages = [];
    
    if (flows.length > 0) {
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
        flowMessages.push(...messages);
      }
      console.log(`   📧 Found ${flowMessages.length} messages via flow cross-check`);
    }

    // Step 4: Combine and deduplicate all messages
    const allMessages = [...allUserMessages, ...flowMessages];
    const uniqueMessages = new Map();
    
    allMessages.forEach(msg => {
      const key = `${msg.ThreadId}#${msg.Timestamp}`;
      if (!uniqueMessages.has(key)) {
        uniqueMessages.set(key, msg);
      }
    });
    
    const messagesToDelete = Array.from(uniqueMessages.values());
    console.log(`\n📊 Total unique messages to delete: ${messagesToDelete.length}`);

    // Step 5: Show what will be deleted
    if (messagesToDelete.length > 0) {
      console.log('\n📝 Sample messages to be deleted:');
      messagesToDelete.slice(0, 5).forEach((msg, index) => {
        const date = new Date(msg.Timestamp).toISOString();
        const subject = msg.Subject || '(no subject)';
        const direction = msg.Direction || 'unknown';
        const channel = msg.Channel || 'unknown';
        console.log(`  ${index + 1}. ${date} | ${channel} | ${direction} | ${subject}`);
      });
      if (messagesToDelete.length > 5) {
        console.log(`  ... and ${messagesToDelete.length - 5} more messages`);
      }
    }

    // Confirmation prompt
    console.log('\n⚠️  WARNING: This action cannot be undone!');
    console.log(`You are about to delete ALL data for user ${USER_ID_TO_DELETE}:`);
    console.log(`  - ${flows.length} flows`);
    console.log(`  - ${messagesToDelete.length} messages`);
    console.log(`\nPress Ctrl+C to cancel, or wait 5 seconds to proceed...`);
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 6: Delete all messages
    console.log('\n🗑️  Step 4: Deleting messages...');
    let deletedMessages = 0;

    for (const message of messagesToDelete) {
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
          console.log(`  - Deleted ${deletedMessages}/${messagesToDelete.length} messages...`);
        }
      } catch (error) {
        console.error(`  ❌ Error deleting message ${message.MessageId}:`, error.message);
      }
    }

    console.log(`✅ Deleted ${deletedMessages} messages`);

    // Step 7: Delete flows
    console.log('\n🗑️  Step 5: Deleting flows...');
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
        if (deletedFlows % 10 === 0 || deletedFlows === flows.length) {
          console.log(`  - Deleted ${deletedFlows}/${flows.length} flows...`);
        }
      } catch (error) {
        console.error(`  ❌ Error deleting flow ${flow.flowId}:`, error.message);
      }
    }

    console.log(`✅ Deleted ${deletedFlows} flows`);

    // Summary
    console.log('\n📊 USER ID BASED Deletion Summary:');
    console.log(`  - User ID: ${USER_ID_TO_DELETE}`);
    console.log(`  - Email (ref): ${EMAIL_TO_DELETE}`);
    console.log(`  - Flows deleted: ${deletedFlows}/${flows.length}`);
    console.log(`  - Messages deleted: ${deletedMessages}/${messagesToDelete.length}`);
    console.log('  - Search methods used:');
    console.log(`    * User-Messages-Index GSI: ${allUserMessages.length} messages`);
    console.log(`    * Flow-based cross-check: ${flowMessages.length} messages`);
    console.log(`    * Total unique messages: ${messagesToDelete.length}`);
    console.log('\n✅ USER ID BASED deletion process complete!');

  } catch (error) {
    console.error('\n❌ Error during deletion process:', error);
    throw error;
  }
}

// Run the script
deleteUserData().catch(console.error); 
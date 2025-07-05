// delete-thread-messages.js
// Script to delete all messages from a specific thread

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';

const REGION = 'us-east-1';
const MSG_TABLE = 'Messages';
const THREAD_TO_DELETE = 'akbar_shamji@brown.edu';

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true }
});

async function deleteThreadMessages() {
  console.log(`🗑️  Deleting all messages from thread: ${THREAD_TO_DELETE}`);
  
  let deletedCount = 0;
  let lastEvaluatedKey = null;
  
  do {
    try {
      // Query all messages for this thread
      const queryParams = {
        TableName: MSG_TABLE,
        KeyConditionExpression: 'ThreadId = :tid',
        ExpressionAttributeValues: {
          ':tid': THREAD_TO_DELETE
        },
        ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey })
      };
      
      const result = await docClient.send(new QueryCommand(queryParams));
      const messages = result.Items || [];
      
      console.log(`📦 Found ${messages.length} messages to delete in this batch`);
      
      // Delete each message
      for (const message of messages) {
        try {
          await docClient.send(new DeleteCommand({
            TableName: MSG_TABLE,
            Key: {
              ThreadId: message.ThreadId,
              Timestamp: message.Timestamp
            }
          }));
          
          deletedCount++;
          console.log(`✅ Deleted message from ${new Date(message.Timestamp).toISOString()}`);
        } catch (error) {
          console.error(`❌ Error deleting message:`, error.message);
        }
      }
      
      lastEvaluatedKey = result.LastEvaluatedKey;
      
    } catch (error) {
      console.error('❌ Error querying messages:', error.message);
      break;
    }
  } while (lastEvaluatedKey);
  
  console.log(`\n🎉 Deletion completed!`);
  console.log(`📊 Total messages deleted: ${deletedCount}`);
  
  return deletedCount;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting Thread Message Deletion');
  console.log('==================================');
  
  try {
    await deleteThreadMessages();
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  }
}

export { deleteThreadMessages }; 
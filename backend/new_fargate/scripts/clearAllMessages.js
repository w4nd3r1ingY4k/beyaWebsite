// clearAllMessages.js
// Script to clear all message-related data from DynamoDB tables

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  DeleteCommand,
  BatchWriteCommand
} from '@aws-sdk/lib-dynamodb';

const REGION = process.env.AWS_REGION || 'us-east-1';

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true }
});

// Tables to clear
const TABLES_TO_CLEAR = {
  Messages: { pk: 'ThreadId', sk: 'Timestamp' },
  DiscussionMessages: { pk: 'discussionId', sk: 'createdAt' },
  Discussions: { pk: 'discussionId' },
  Flows: { pk: 'contactId', sk: 'flowId' },
  FlowComments: { pk: 'flowId', sk: 'timestamp' },
  ThreadToFlow: { pk: 'threadId' }
};

async function clearTable(tableName, keys) {
  console.log(`\n🗑️  Starting to clear table: ${tableName}`);
  
  let deletedCount = 0;
  let errorCount = 0;
  let lastEvaluatedKey = null;
  
  do {
    try {
      // Scan for items
      const scanParams = {
        TableName: tableName,
        Limit: 25, // Process in smaller batches
        ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey })
      };
      
      const result = await docClient.send(new ScanCommand(scanParams));
      const items = result.Items || [];
      
      if (items.length === 0) {
        console.log(`✅ No items found in ${tableName}`);
        break;
      }
      
      console.log(`📦 Found ${items.length} items to delete in this batch`);
      
      // Delete items using BatchWrite for efficiency
      const deleteRequests = items.map(item => {
        const key = {};
        key[keys.pk] = item[keys.pk];
        if (keys.sk) {
          key[keys.sk] = item[keys.sk];
        }
        return {
          DeleteRequest: {
            Key: key
          }
        };
      });
      
      // BatchWrite can only handle 25 items at a time
      try {
        const batchParams = {
          RequestItems: {
            [tableName]: deleteRequests
          }
        };
        
        await docClient.send(new BatchWriteCommand(batchParams));
        deletedCount += items.length;
        console.log(`✅ Deleted ${items.length} items from ${tableName}`);
        
      } catch (batchError) {
        console.error(`❌ Batch delete error:`, batchError.message);
        
        // Fall back to individual deletes
        for (const item of items) {
          try {
            const key = {};
            key[keys.pk] = item[keys.pk];
            if (keys.sk) {
              key[keys.sk] = item[keys.sk];
            }
            
            await docClient.send(new DeleteCommand({
              TableName: tableName,
              Key: key
            }));
            
            deletedCount++;
          } catch (error) {
            console.error(`❌ Error deleting item:`, error.message);
            errorCount++;
          }
        }
      }
      
      lastEvaluatedKey = result.LastEvaluatedKey;
      
      // Add a small delay to avoid throttling
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error scanning ${tableName}:`, error.message);
      break;
    }
  } while (lastEvaluatedKey);
  
  console.log(`📊 ${tableName} Summary:`);
  console.log(`   - Deleted: ${deletedCount} items`);
  console.log(`   - Errors: ${errorCount} items`);
  
  return { tableName, deletedCount, errorCount };
}

async function confirmClearAll() {
  console.log('⚠️  WARNING: This will DELETE ALL DATA from the following tables:');
  Object.keys(TABLES_TO_CLEAR).forEach(table => {
    console.log(`   - ${table}`);
  });
  console.log('\nThis action cannot be undone!');
  console.log('To proceed, run with: --confirm\n');
  
  if (!process.argv.includes('--confirm')) {
    console.log('❌ Aborted. Add --confirm flag to proceed.');
    process.exit(0);
  }
}

async function main() {
  console.log('🧹 DynamoDB Message Tables Cleanup Script');
  console.log('=========================================');
  
  await confirmClearAll();
  
  console.log('\n🚀 Starting cleanup process...\n');
  
  const results = [];
  
  for (const [tableName, keys] of Object.entries(TABLES_TO_CLEAR)) {
    const result = await clearTable(tableName, keys);
    results.push(result);
  }
  
  // Print summary
  console.log('\n\n📋 FINAL SUMMARY');
  console.log('================');
  
  let totalDeleted = 0;
  let totalErrors = 0;
  
  results.forEach(({ tableName, deletedCount, errorCount }) => {
    console.log(`${tableName}:`);
    console.log(`   Deleted: ${deletedCount}`);
    console.log(`   Errors: ${errorCount}`);
    totalDeleted += deletedCount;
    totalErrors += errorCount;
  });
  
  console.log('\n📊 Total across all tables:');
  console.log(`   Deleted: ${totalDeleted} items`);
  console.log(`   Errors: ${totalErrors} items`);
  
  if (totalErrors > 0) {
    console.log('\n⚠️  Some items could not be deleted. Check the logs above for details.');
  } else {
    console.log('\n✅ All message data has been successfully cleared!');
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
}); 
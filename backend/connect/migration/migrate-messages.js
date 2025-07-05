// migrate-messages.js
// Migration script to backfill existing messages with userId and ThreadIdTimestamp

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
  QueryCommand
} from '@aws-sdk/lib-dynamodb';

const REGION = 'us-east-1';
const MSG_TABLE = 'Messages';
const FLOWS_TABLE = 'Flows';

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true }
});

// Find which user owns a specific threadId by looking in Flows table
async function findMessageOwner(threadId) {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: FLOWS_TABLE,
      FilterExpression: 'flowId = :fid',
      ExpressionAttributeValues: { ':fid': threadId },
      Limit: 1
    }));
    
    return result.Items?.[0]?.contactId || null;
  } catch (error) {
    console.error(`❌ Error finding owner for ${threadId}:`, error.message);
    return null;
  }
}

// Main migration function
async function migrateExistingMessages() {
  console.log('🔄 Starting message migration...');
  console.log('📊 This will add userId and ThreadIdTimestamp to existing messages');
  
  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let lastEvaluatedKey = null;
  
  do {
    try {
      // Scan messages in batches, only those missing userId
      const scanParams = {
        TableName: MSG_TABLE,
        FilterExpression: 'attribute_not_exists(userId)',
        Limit: 25,
        ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey })
      };
      
      console.log('🔍 Scanning for messages without userId...');
      const result = await docClient.send(new ScanCommand(scanParams));
      const messages = result.Items || [];
      
      console.log(`📦 Found ${messages.length} messages to migrate in this batch`);
      
      // Process each message
      for (const message of messages) {
        try {
          // Find the owner of this thread
          const ownerUserId = await findMessageOwner(message.ThreadId);
          
          if (ownerUserId) {
            // Update message with missing fields
            await docClient.send(new UpdateCommand({
              TableName: MSG_TABLE,
              Key: {
                ThreadId: message.ThreadId,
                Timestamp: message.Timestamp
              },
              UpdateExpression: 'SET userId = :uid, ThreadIdTimestamp = :tit',
              ExpressionAttributeValues: {
                ':uid': ownerUserId,
                ':tit': `${message.ThreadId}#${message.Timestamp}`
              },
              ConditionExpression: 'attribute_exists(ThreadId)' // Safety check
            }));
            
            migratedCount++;
            console.log(`✅ Migrated message: ${message.ThreadId} -> ${ownerUserId}`);
          } else {
            skippedCount++;
            console.log(`⚠️  Skipped message (no owner found): ${message.ThreadId}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Error migrating message ${message.ThreadId}:`, error.message);
        }
      }
      
      lastEvaluatedKey = result.LastEvaluatedKey;
      
      // Progress report
      console.log(`📈 Progress: ${migratedCount} migrated, ${skippedCount} skipped, ${errorCount} errors`);
      
    } catch (error) {
      console.error('❌ Error in migration batch:', error.message);
      break;
    }
  } while (lastEvaluatedKey);
  
  console.log('\n🎉 Migration completed!');
  console.log(`📊 Final stats:`);
  console.log(`   ✅ Migrated: ${migratedCount} messages`);
  console.log(`   ⚠️  Skipped: ${skippedCount} messages`);
  console.log(`   ❌ Errors: ${errorCount} messages`);
  
  return { migratedCount, skippedCount, errorCount };
}

// Verification function to check migration results
async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  try {
    // Count messages without userId
    const unmigrated = await docClient.send(new ScanCommand({
      TableName: MSG_TABLE,
      FilterExpression: 'attribute_not_exists(userId)',
      Select: 'COUNT'
    }));
    
    // Count messages with userId
    const migrated = await docClient.send(new ScanCommand({
      TableName: MSG_TABLE,
      FilterExpression: 'attribute_exists(userId)',
      Select: 'COUNT'
    }));
    
    console.log(`📊 Verification results:`);
    console.log(`   ✅ Messages with userId: ${migrated.Count}`);
    console.log(`   ❌ Messages without userId: ${unmigrated.Count}`);
    
    if (unmigrated.Count === 0) {
      console.log('🎉 All messages successfully migrated!');
    } else {
      console.log('⚠️  Some messages still need migration');
    }
    
    return { migrated: migrated.Count, unmigrated: unmigrated.Count };
  } catch (error) {
    console.error('❌ Error verifying migration:', error.message);
    return null;
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting Messages Migration Script');
  console.log('====================================');
  
  try {
    const results = await migrateExistingMessages();
    await verifyMigration();
    
    console.log('\n✅ Migration script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration script failed:', error.message);
    process.exit(1);
  }
}

export { migrateExistingMessages, verifyMigration }; 
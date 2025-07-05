import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate or retrieve a unique flowId for a given user and contact identifier
 * @param {DynamoDBDocumentClient} docClient - DynamoDB document client
 * @param {string} flowsTable - Name of the Flows table
 * @param {string} userId - User ID (contactId in the table)
 * @param {string} contactIdentifier - Email address or phone number
 * @returns {Promise<string>} - Unique flowId
 */
export async function generateOrGetFlowId(docClient, flowsTable, userId, contactIdentifier) {
  // First, check if a flow already exists for this user+contact combination
  const queryParams = {
    TableName: flowsTable,
    KeyConditionExpression: 'contactId = :userId',
    FilterExpression: 'contactIdentifier = :contactIdentifier',
    ExpressionAttributeValues: {
      ':userId': userId,
      ':contactIdentifier': contactIdentifier
    }
  };

  try {
    const result = await docClient.send(new QueryCommand(queryParams));
    
    if (result.Items && result.Items.length > 0) {
      // Found existing flow, return its flowId
      const existingFlow = result.Items[0];
      console.log(`📋 Found existing flow: ${existingFlow.flowId} for ${contactIdentifier}`);
      return existingFlow.flowId;
    }

    // No existing flow found, create a new unique flowId
    const newFlowId = uuidv4();
    console.log(`📋 Generated new flowId: ${newFlowId} for ${contactIdentifier}`);
    
    return newFlowId;
    
  } catch (error) {
    console.error('Error checking for existing flow:', error);
    // Fallback to generating new UUID if query fails
    const fallbackFlowId = uuidv4();
    console.log(`📋 Fallback flowId: ${fallbackFlowId} for ${contactIdentifier}`);
    return fallbackFlowId;
  }
}

/**
 * Update flow metadata with new message count and timestamp
 * @param {DynamoDBDocumentClient} docClient - DynamoDB document client
 * @param {string} flowsTable - Name of the Flows table
 * @param {string} userId - User ID (contactId in the table)
 * @param {string} flowId - Unique flow ID
 * @param {string} contactIdentifier - Email address or phone number
 * @param {number} timestamp - Message timestamp
 */
export async function updateFlowMetadata(docClient, flowsTable, userId, flowId, contactIdentifier, timestamp) {
  await docClient.send(new UpdateCommand({
    TableName: flowsTable,
    Key: {
      contactId: userId,
      flowId: flowId
    },
    UpdateExpression: `
      SET createdAt     = if_not_exists(createdAt, :ts),
          lastMessageAt = :ts,
          tags          = if_not_exists(tags, :tags),
          contactIdentifier = :contactIdentifier
      ADD messageCount :inc
    `,
    ExpressionAttributeValues: {
      ':ts': timestamp,
      ':inc': 1,
      ':tags': ['all'],
      ':contactIdentifier': contactIdentifier
    }
  }));
} 
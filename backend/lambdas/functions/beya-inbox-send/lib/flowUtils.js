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
    FilterExpression: 'contactIdentifier = :contactId',
    ExpressionAttributeValues: {
      ':userId': userId,
      ':contactId': contactIdentifier
    }
  };

  try {
    const result = await docClient.send(new QueryCommand(queryParams));
    
    if (result.Items && result.Items.length > 0) {
      // Flow exists, return the existing flowId
      const existingFlow = result.Items[0];
      console.log(`📋 Found existing flow: ${existingFlow.flowId} for ${contactIdentifier}`);
      return existingFlow.flowId;
    }
    
    // No existing flow found, generate a new one
    const newFlowId = uuidv4();
    console.log(`📋 Generated new flowId: ${newFlowId} for ${contactIdentifier}`);
    
    // Create the flow record with the new flowId
    const timestamp = Date.now();
    await docClient.send(new PutCommand({
      TableName: flowsTable,
      Item: {
        contactId: userId,
        flowId: newFlowId,
        contactIdentifier: contactIdentifier,
        createdAt: timestamp,
        lastMessageAt: timestamp,
        messageCount: 0,
        tags: ['all'],
        status: 'open'
      },
      ConditionExpression: 'attribute_not_exists(flowId)' // Prevent duplicates
    }));
    
    return newFlowId;
    
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      // Race condition - another process created the flow, query again
      console.log('📋 Race condition detected, re-querying for flowId');
      const retryResult = await docClient.send(new QueryCommand(queryParams));
      if (retryResult.Items && retryResult.Items.length > 0) {
        return retryResult.Items[0].flowId;
      }
    }
    console.error('❌ Error in generateOrGetFlowId:', error);
    throw error;
  }
}

/**
 * Update flow metadata (message count, last message timestamp)
 * @param {DynamoDBDocumentClient} docClient - DynamoDB document client
 * @param {string} flowsTable - Name of the Flows table
 * @param {string} userId - User ID (contactId in the table)
 * @param {string} flowId - Unique flow ID
 * @param {number} timestamp - Message timestamp
 */
export async function updateFlowMetadata(docClient, flowsTable, userId, flowId, timestamp) {
  const updateParams = {
    TableName: flowsTable,
    Key: {
      contactId: userId,
      flowId: flowId
    },
    UpdateExpression: 'SET lastMessageAt = :ts ADD messageCount :inc',
    ExpressionAttributeValues: {
      ':ts': timestamp,
      ':inc': 1
    }
  };

  try {
    await docClient.send(new UpdateCommand(updateParams));
    console.log(`📋 Updated flow metadata for flowId: ${flowId}`);
  } catch (error) {
    console.error('❌ Error updating flow metadata:', error);
    throw error;
  }
} 
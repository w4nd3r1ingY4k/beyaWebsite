/**
 * Search Emails by Subject - Direct Messages table search
 * Fallback when thread context fails but we know the subject
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

let docClient = null;

function initializeDynamoDB() {
  if (!docClient) {
    const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
    docClient = DynamoDBDocumentClient.from(dynamoClient);
  }
  return docClient;
}

export async function searchEmailsBySubject(args, userId) {
  try {
    const { subject, exact_match, limit } = args;
    
    console.log(`📧 Searching Messages table by subject: "${subject}" (exact: ${exact_match})`);
    
    const dynamodb = initializeDynamoDB();
    
    // Build filter expression - Subject is a top-level field (match CLI approach)
    let filterExpression;
    let expressionAttributeValues;
    
    if (exact_match) {
      filterExpression = "Subject = :subject";  // Direct access like CLI
      expressionAttributeValues = {
        ":subject": subject
      };
    } else {
      filterExpression = "contains(Subject, :subject)";  // Direct access like CLI
      expressionAttributeValues = {
        ":subject": subject
      };
    }
    
    let scanParams = {
      TableName: 'Messages',
      FilterExpression: filterExpression,
      // Remove ExpressionAttributeNames - not needed for non-reserved words
      ExpressionAttributeValues: expressionAttributeValues
      // No limit - scan entire table with pagination
    };
    
    console.log(`🔍 DynamoDB scan params:`, JSON.stringify(scanParams, null, 2));
    
    let allItems = [];
    let totalScannedCount = 0;
    let lastEvaluatedKey = null;
    
    do {
      if (lastEvaluatedKey) {
        scanParams.ExclusiveStartKey = lastEvaluatedKey;
        console.log(`📄 Continuing scan from:`, lastEvaluatedKey);
      }
      
      const result = await dynamodb.send(new ScanCommand(scanParams));
      
      if (result.Items) {
        allItems = allItems.concat(result.Items);
      }
      
      totalScannedCount += result.ScannedCount || 0;
      lastEvaluatedKey = result.LastEvaluatedKey;
      
      console.log(`📊 This batch: ${result.Items?.length || 0} matches, ${result.ScannedCount} scanned`);
      console.log(`📊 Total so far: ${allItems.length} matches, ${totalScannedCount} scanned`);
      
      // Stop early if we found enough results
      if (allItems.length >= limit) {
        console.log(`✅ Found enough results (${allItems.length}), stopping scan`);
        break;
      }
      
    } while (lastEvaluatedKey);
    
    console.log(`📊 Final totals: ${allItems.length} messages found, ${totalScannedCount} items scanned`);
    
    if (!allItems || allItems.length === 0) {
      return {
        success: false,
        message: `No emails found with subject "${subject}"`,
        results: [],
        searchParams: { subject, exact_match, limit },
        totalScanned: totalScannedCount
      };
    }
    
    // Limit results to requested amount
    const limitedItems = allItems.slice(0, limit);
    
    // Format results - Subject is top-level, other fields may be top-level or in Headers
    const emails = limitedItems.map(item => ({
      ThreadId: item.ThreadId,
      MessageId: item.MessageId,
      Subject: item.Subject || '(no subject)',
      From: item.From || item.Headers?.From || '(unknown sender)',
      To: item.To || item.Headers?.To || '(unknown recipient)', 
      Date: item.Date || item.Headers?.Date || '(no date)',
      Body: item.Body || '(no content)',
      HtmlBody: item.HtmlBody || '',
      Timestamp: item.Timestamp
    }));
    
    console.log(`✅ Successfully found ${emails.length} emails by subject`);
    console.log(`📧 Sample result:`, emails[0]?.Subject);
    
    return {
      success: true,
      message: `Found ${emails.length} emails with subject "${subject}"`,
      results: emails,
      searchParams: { subject, exact_match, limit },
      totalFound: emails.length,
      totalScanned: totalScannedCount
    };
    
  } catch (error) {
    console.error('❌ Error searching emails by subject:', error);
    return {
      success: false,
      error: error.message,
      message: `Failed to search emails by subject: ${error.message}`,
      results: [],
      searchParams: args
    };
  }
} 
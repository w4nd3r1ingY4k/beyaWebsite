import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

const REGION = process.env.AWS_REGION;
const MSG_TABLE = process.env.AWS_MSG_TABLE;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME;

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient, { marshallOptions: { removeUndefinedValues: true } });
const eventBridgeClient = new EventBridgeClient({ region: REGION });

async function scanAllMessages(lastKey) {
  const params = {
    TableName: MSG_TABLE,
    ExclusiveStartKey: lastKey,
  };
  return await docClient.send(new ScanCommand(params));
}

async function replayAll() {
  let lastKey = undefined;
  let count = 0;
  let skipped = 0;
  do {
    const { Items, LastEvaluatedKey } = await scanAllMessages(lastKey);
    for (const item of Items) {
      if (item.MessageId === 'THREAD_SUMMARY') continue;
      
      // Handle invalid timestamps
      let timestamp;
      try {
        timestamp = new Date(item.Timestamp).toISOString();
      } catch (err) {
        console.log(`Skipping item with invalid timestamp: ${item.MessageId}, timestamp: ${item.Timestamp}`);
        skipped++;
        continue;
      }
      
      const rawEvent = {
        eventId: uuidv4(),
        timestamp: timestamp,
        source: 'inbox-service',
        userId: item.ownerUserId,
        eventType: 'email.received',
        data: {
          messageId: item.Headers?.['Message-ID'] || item.MessageId,
          threadId: item.ThreadId,
          subject: item.Subject,
          bodyText: item.Body,
          bodyHtml: item.HtmlBody || '',
          from: item.ThreadId,
          to: item.Headers?.To,
          headers: item.Headers,
          provider: item.Provider,
        },
      };
      
      try {
        await eventBridgeClient.send(new PutEventsCommand({
          Entries: [{
            EventBusName: EVENT_BUS_NAME,
            Source: rawEvent.source,
            DetailType: rawEvent.eventType,
            Time: new Date(rawEvent.timestamp),
            Detail: JSON.stringify(rawEvent),
          }],
        }));
        count++;
        if (count % 100 === 0) console.log(`Replayed ${count} messages...`);
      } catch (err) {
        console.error(`Failed to send event for message ${item.MessageId}:`, err.message);
        skipped++;
      }
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);
  console.log(`Done! Replayed ${count} messages, skipped ${skipped} messages.`);
}

replayAll().catch(console.error); 
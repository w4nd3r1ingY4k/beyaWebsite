import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  GetCommand
} from "@aws-sdk/lib-dynamodb";
import { EventBridgeClient, PutRuleCommand, PutTargetsCommand } from "@aws-sdk/client-eventbridge";
import { v4 as uuidv4 } from "uuid";
import fetch from 'node-fetch';

const REGION = process.env.AWS_REGION;
const REMINDERS_TABLE = process.env.REMINDERS_TABLE;
const REMINDER_SENDER_LAMBDA_ARN = process.env.REMINDER_SENDER_LAMBDA_ARN;

if (!REGION || !REMINDERS_TABLE) {
  throw new Error("Missing required environment variables");
}

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const eventBridgeClient = new EventBridgeClient({ region: REGION });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function handler(event) {
  console.log("🔔 Reminders Handler", JSON.stringify(event));

  // Check if this is an EventBridge event (has reminderID and action)
  if (event.reminderID && event.action === 'send') {
    console.log(`📬 EventBridge trigger detected for reminder: ${event.reminderID}`);
    return await sendScheduledReminder(event);
  }

  // Otherwise, handle as HTTP API Gateway event
  const method = event.requestContext?.http?.method;
  const path = event.requestContext?.http?.path;

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return { statusCode: 200, headers: CORS };
  }

  try {
    // Route based on HTTP method and path
    if (method === "POST" && path === "/reminders") {
      return await createReminder(event);
    } else if (method === "GET" && path.startsWith("/reminders/user/")) {
      return await getUserReminders(event);
    } else if (method === "PUT" && path.startsWith("/reminders/")) {
      return await updateReminder(event);
    } else {
      return {
        statusCode: 404,
        headers: CORS,
        body: JSON.stringify({ error: "Endpoint not found" })
      };
    }
  } catch (error) {
    console.error("❌ Error:", error);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: error.message })
    };
  }
}

async function createReminder(event) {
  const body = JSON.parse(event.body || "{}");
  const {
    threadId,
    userId,
    userEmail,
    recipientEmail, // Optional: if not provided, defaults to userEmail
    reminderType,
    scheduledTime,
    note = "",
    threadTitle = "Conversation",
    contactEmail = ""
  } = body;
  
  // Use recipientEmail if provided, otherwise fall back to userEmail
  const finalRecipientEmail = recipientEmail || userEmail;

  // Validate required fields
  if (!threadId || !userId || !userEmail || !reminderType || !scheduledTime) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: "Missing required fields" })
    };
  }

  // Validate reminder type
  if (!['follow_up', 'deadline', 'callback'].includes(reminderType)) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: "Invalid reminder type" })
    };
  }

  // Validate scheduled time is in the future
  const scheduleDate = new Date(scheduledTime);
  if (scheduleDate <= new Date()) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: "Scheduled time must be in the future" })
    };
  }

  const reminderId = uuidv4();
  const createdAt = new Date().toISOString();

  // Store reminder in DynamoDB
  try {
    await docClient.send(new PutCommand({
      TableName: REMINDERS_TABLE,
      Item: {
        reminderID: reminderId,
        userID: userId,
        userEmail: userEmail,
        threadID: threadId,
        reminderType: reminderType,
        scheduledTime: scheduledTime,
        note: note,
        threadTitle: threadTitle,
        contactEmail: contactEmail,
        status: 'pending',
        createdAt: createdAt
      }
    }));

    console.log(`✅ Reminder stored in DynamoDB: ${reminderId}`);
  } catch (error) {
    console.error("❌ DynamoDB error:", error);
    throw new Error("Failed to store reminder");
  }

  // Schedule EventBridge rule
  try {
    const ruleName = `reminder-${reminderId}`;
    
    // Convert to EventBridge cron format (UTC time)
    // EventBridge uses: cron(minute hour day month day-of-week year)
    const minute = scheduleDate.getUTCMinutes();
    const hour = scheduleDate.getUTCHours();
    const day = scheduleDate.getUTCDate();
    const month = scheduleDate.getUTCMonth() + 1; // getUTCMonth() returns 0-11
    const year = scheduleDate.getUTCFullYear();
    const scheduleExpression = `cron(${minute} ${hour} ${day} ${month} ? ${year})`;
    
    console.log(`📅 Creating EventBridge rule with expression: ${scheduleExpression}`);
    
    // Create EventBridge rule
    await eventBridgeClient.send(new PutRuleCommand({
      Name: ruleName,
      ScheduleExpression: scheduleExpression,
      State: 'ENABLED',
      Description: `Reminder for user ${userId} - ${reminderType}`
    }));

    // Add target to the rule (this same Lambda function with send endpoint)
    if (REMINDER_SENDER_LAMBDA_ARN) {
      await eventBridgeClient.send(new PutTargetsCommand({
        Rule: ruleName,
        Targets: [{
          Id: '1',
          Arn: REMINDER_SENDER_LAMBDA_ARN,
          Input: JSON.stringify({
            reminderID: reminderId,
            action: 'send'
          })
        }]
      }));
    }

    console.log(`✅ EventBridge rule created: ${ruleName}`);
  } catch (error) {
    console.error("❌ EventBridge error:", error);
    // Don't fail the entire request if EventBridge fails
    // The reminder is still stored and can be processed by a cron job
    console.warn("⚠️ EventBridge scheduling failed, reminder stored for manual processing");
  }

  return {
    statusCode: 201,
    headers: CORS,
    body: JSON.stringify({
      message: "Reminder created successfully",
      reminderID: reminderId,
      scheduledTime: scheduledTime
    })
  };
}

async function getUserReminders(event) {
  const pathParts = event.requestContext.http.path.split('/');
  const userId = pathParts[pathParts.length - 1];

  if (!userId) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: "User ID required" })
    };
  }

  try {
    const result = await docClient.send(new QueryCommand({
      TableName: REMINDERS_TABLE,
      IndexName: 'userID-scheduledTime-index', // You'll need to create this GSI
      KeyConditionExpression: 'userID = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ScanIndexForward: false // Most recent first
    }));

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        reminders: result.Items || []
      })
    };
  } catch (error) {
    console.error("❌ Query error:", error);
    throw new Error("Failed to retrieve reminders");
  }
}

async function updateReminder(event) {
  const pathParts = event.requestContext.http.path.split('/');
  const reminderId = pathParts[pathParts.length - 1];
  const body = JSON.parse(event.body || "{}");

  if (!reminderId) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: "Reminder ID required" })
    };
  }

  try {
    // Update reminder status (e.g., to 'cancelled')
    await docClient.send(new UpdateCommand({
      TableName: REMINDERS_TABLE,
      Key: { reminderID: reminderId },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': body.status || 'cancelled',
        ':updatedAt': new Date().toISOString()
      }
    }));

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ message: "Reminder updated successfully" })
    };
  } catch (error) {
    console.error("❌ Update error:", error);
    throw new Error("Failed to update reminder");
  }
}

async function sendScheduledReminder(event) {
  // This function is called by EventBridge when it's time to send the reminder
  const { reminderID } = event;

  if (!reminderID) {
    console.error("❌ No reminderID provided");
    return { statusCode: 400 };
  }

  try {
    // Get reminder details from DynamoDB
    const result = await docClient.send(new GetCommand({
      TableName: REMINDERS_TABLE,
      Key: { reminderID: reminderID }
    }));

    if (!result.Item) {
      console.error(`❌ Reminder not found: ${reminderID}`);
      return { statusCode: 404 };
    }

    const reminder = result.Item;

    // Check if reminder is still pending
    if (reminder.status !== 'pending') {
      console.log(`⏭️ Skipping reminder ${reminderID} - status: ${reminder.status}`);
      return { statusCode: 200 };
    }

    // Send reminder email
    await sendReminderEmail(reminder);

    // Update reminder status to 'sent'
    await docClient.send(new UpdateCommand({
      TableName: REMINDERS_TABLE,
      Key: { reminderID: reminderID },
      UpdateExpression: 'SET #status = :status, sentAt = :sentAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'sent',
        ':sentAt': new Date().toISOString()
      }
    }));

    console.log(`✅ Reminder sent successfully: ${reminderID}`);
    return { statusCode: 200 };

  } catch (error) {
    console.error(`❌ Error sending reminder ${reminderID}:`, error);
    return { statusCode: 500 };
  }
}

async function sendReminderEmail(reminder) {
  const {
    userID,
    userEmail,
    reminderType,
    threadTitle,
    contactEmail,
    note,
    threadID
  } = reminder;

  const typeEmoji = {
    'follow_up': '📞',
    'deadline': '⏰',
    'callback': '📱'
  };

  const typeText = {
    'follow_up': 'Follow Up',
    'deadline': 'Deadline',
    'callback': 'Callback'
  };

  const subject = `${typeEmoji[reminderType]} Reminder: ${typeText[reminderType]} - ${threadTitle}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #DE1785; margin: 0 0 16px 0;">
          ${typeEmoji[reminderType]} ${typeText[reminderType]} Reminder
        </h2>
        
        <div style="background: white; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 12px 0; color: #374151;">Conversation: ${threadTitle}</h3>
          <p style="margin: 0 0 8px 0; color: #6b7280;">
            <strong>Contact:</strong> ${contactEmail}
          </p>
          <p style="margin: 0; color: #6b7280;">
            <strong>Thread ID:</strong> ${threadID}
          </p>
        </div>

        ${note ? `
          <div style="background: #fef3c7; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
            <p style="margin: 0; color: #92400e;">
              <strong>Note:</strong> ${note}
            </p>
          </div>
        ` : ''}

        <div style="text-align: center; margin-top: 20px;">
          <a href="https://usebeya.com/inbox" 
             style="background: #DE1785; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Conversation
          </a>
        </div>
      </div>
      
      <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">
        This reminder was automatically sent by Beya
      </p>
    </div>
  `;

  const textBody = `
${typeEmoji[reminderType]} ${typeText[reminderType]} Reminder

Conversation: ${threadTitle}
Contact: ${contactEmail}
Thread ID: ${threadID}

${note ? `Note: ${note}\n\n` : ''}

View conversation: https://usebeya.com/inbox

---
This reminder was automatically sent by Beya
  `;

  // Use the inbox send API to send email from user to themselves
  const INBOX_SEND_URL = 'https://8zsaycb149.execute-api.us-east-1.amazonaws.com/send/email';
  
  const payload = {
    to: userEmail,
    subject: subject,
    text: textBody,
    html: htmlBody,
    userId: userID
  };

  console.log(`📧 Sending reminder email via inbox API to ${userEmail} for user ${userID}`);

  const response = await fetch(INBOX_SEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send reminder email: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`✅ Reminder email sent successfully via inbox API:`, result);
} 
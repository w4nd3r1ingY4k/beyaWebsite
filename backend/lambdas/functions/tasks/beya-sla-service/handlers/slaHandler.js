// handlers/slaHandler.js

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

// ─── Environment variables ──────────────────────────────────────────────
const REGION = process.env.AWS_REGION;
const TASKS_TABLE = process.env.TASKS_TABLE || 'Tasks';
const SLA_POLICIES_TABLE = process.env.SLA_POLICIES_TABLE || 'SLAPolicies';
const SLA_TIMERS_TABLE = process.env.SLA_TIMERS_TABLE || 'SLATimers';
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'beya-platform-bus';

if (!REGION) {
  throw new Error('Missing required env var: AWS_REGION');
}

// ─── AWS clients ─────────────────────────────────────────────────────────
const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true }
});
const eventBridgeClient = new EventBridgeClient({ region: REGION });

// ─── Helper: Emit rawEvent to EventBridge ───────────────────────────────
async function emitRawEvent(eventType, userId, data) {
  const rawEvent = {
    eventId: uuidv4(),
    timestamp: new Date().toISOString(),
    source: "sla-service",
    userId: userId,
    eventType: eventType,
    data: data
  };

  try {
    await eventBridgeClient.send(new PutEventsCommand({
      Entries: [{
        EventBusName: EVENT_BUS_NAME,
        Source: rawEvent.source,
        DetailType: rawEvent.eventType,
        Time: new Date(rawEvent.timestamp),
        Detail: JSON.stringify(rawEvent)
      }]
    }));
    console.log('✅ RawEvent emitted:', rawEvent.eventId, eventType);
  } catch (eventErr) {
    console.error('❌ Failed to emit rawEvent:', eventErr);
  }
}

// ─── SLA Operations ─────────────────────────────────────────────────────

// Create SLA Policy
async function createSLAPolicy(payload) {
  const { name, spaceId, responseTimeMinutes, resolutionTimeMinutes, businessHours, escalationRules } = payload;
  
  if (!name || !spaceId) {
    throw new Error('Missing required fields: name, spaceId');
  }

  const slaId = uuidv4();
  const timestamp = new Date().toISOString();
  
  const slaPolicy = {
    id: slaId,
    name,
    spaceId,
    responseTimeMinutes: responseTimeMinutes || 60, // Default 1 hour
    resolutionTimeMinutes: resolutionTimeMinutes || 480, // Default 8 hours
    businessHours: businessHours || {
      monday: { start: '09:00', end: '17:00' },
      tuesday: { start: '09:00', end: '17:00' },
      wednesday: { start: '09:00', end: '17:00' },
      thursday: { start: '09:00', end: '17:00' },
      friday: { start: '09:00', end: '17:00' }
    },
    escalationRules: escalationRules || [
      {
        level: 1,
        triggerMinutes: 30,
        action: 'notify_manager'
      },
      {
        level: 2,
        triggerMinutes: 60,
        action: 'escalate_to_senior'
      }
    ],
    createdAt: timestamp,
    updatedAt: timestamp
  };

  await docClient.send(new PutCommand({
    TableName: SLA_POLICIES_TABLE,
    Item: slaPolicy
  }));

  return { operation: 'createSLAPolicy', result: slaPolicy, eventData: { slaId, name, spaceId } };
}

// Start SLA Timer
async function startSLATimer(payload) {
  const { taskId, slaId } = payload;
  
  if (!taskId || !slaId) {
    throw new Error('Missing required fields: taskId, slaId');
  }

  // Get SLA policy
  const slaResult = await docClient.send(new GetCommand({
    TableName: SLA_POLICIES_TABLE,
    Key: { id: slaId }
  }));

  if (!slaResult.Item) {
    throw new Error('SLA policy not found');
  }

  const slaPolicy = slaResult.Item;
  const now = new Date();
  
  // Calculate deadlines based on business hours
  const responseDeadline = calculateDeadline(now, slaPolicy.responseTimeMinutes, slaPolicy.businessHours);
  const resolutionDeadline = calculateDeadline(now, slaPolicy.resolutionTimeMinutes, slaPolicy.businessHours);
  
  const timer = {
    timerId: uuidv4(),
    taskId,
    slaId,
    responseDeadline: responseDeadline.toISOString(),
    resolutionDeadline: resolutionDeadline.toISOString(),
    status: 'active',
    createdAt: now.toISOString(),
    lastChecked: now.toISOString()
  };

  await docClient.send(new PutCommand({
    TableName: SLA_TIMERS_TABLE,
    Item: timer
  }));

  // Update task with SLA info
  await docClient.send(new UpdateCommand({
    TableName: TASKS_TABLE,
    Key: { taskId },
    UpdateExpression: 'SET slaId = :slaId, slaStatus = :slaStatus',
    ExpressionAttributeValues: {
      ':slaId': slaId,
      ':slaStatus': {
        responseTime: slaPolicy.responseTimeMinutes,
        resolutionTime: slaPolicy.resolutionTimeMinutes,
        isOverdue: false,
        escalationLevel: 0
      }
    }
  }));

  // Emit SLA started event
  await emitRawEvent('sla_started', 'system', { taskId, slaId, responseDeadline, resolutionDeadline });

  return { operation: 'startSLATimer', result: timer, eventData: { taskId, slaId } };
}

// Check SLA Compliance
async function checkSLACompliance(payload) {
  const { taskId } = payload;
  
  if (!taskId) {
    throw new Error('Missing required field: taskId');
  }

  // Get SLA timer
  const timerResult = await docClient.send(new QueryCommand({
    TableName: SLA_TIMERS_TABLE,
    IndexName: 'TaskIndex',
    KeyConditionExpression: 'taskId = :taskId',
    ExpressionAttributeValues: {
      ':taskId': taskId
    }
  }));

  if (!timerResult.Items || timerResult.Items.length === 0) {
    throw new Error('SLA timer not found for task');
  }

  const timer = timerResult.Items[0];
  const now = new Date();
  const responseDeadline = new Date(timer.responseDeadline);
  const resolutionDeadline = new Date(timer.resolutionDeadline);
  
  let isResponseOverdue = false;
  let isResolutionOverdue = false;
  let escalationLevel = 0;

  // Check response time
  if (now > responseDeadline) {
    isResponseOverdue = true;
    escalationLevel = Math.max(escalationLevel, 1);
  }

  // Check resolution time
  if (now > resolutionDeadline) {
    isResolutionOverdue = true;
    escalationLevel = Math.max(escalationLevel, 2);
  }

  // Update timer
  await docClient.send(new UpdateCommand({
    TableName: SLA_TIMERS_TABLE,
    Key: { timerId: timer.timerId },
    UpdateExpression: 'SET lastChecked = :lastChecked',
    ExpressionAttributeValues: {
      ':lastChecked': now.toISOString()
    }
  }));

  // Update task SLA status
  await docClient.send(new UpdateCommand({
    TableName: TASKS_TABLE,
    Key: { taskId },
    UpdateExpression: 'SET slaStatus = :slaStatus',
    ExpressionAttributeValues: {
      ':slaStatus': {
        responseTime: Math.max(0, Math.floor((responseDeadline - now) / (1000 * 60))),
        resolutionTime: Math.max(0, Math.floor((resolutionDeadline - now) / (1000 * 60))),
        isOverdue: isResponseOverdue || isResolutionOverdue,
        escalationLevel
      }
    }
  }));

  // Trigger escalation if needed
  if (escalationLevel > 0) {
    await triggerEscalation(taskId, timer.slaId, escalationLevel);
  }

  return { 
    operation: 'checkSLACompliance', 
    result: { 
      isResponseOverdue, 
      isResolutionOverdue, 
      escalationLevel,
      responseTimeRemaining: Math.max(0, Math.floor((responseDeadline - now) / (1000 * 60))),
      resolutionTimeRemaining: Math.max(0, Math.floor((resolutionDeadline - now) / (1000 * 60)))
    }, 
    eventData: { taskId, escalationLevel } 
  };
}

// Pause SLA Timer
async function pauseSLATimer(payload) {
  const { taskId, reason } = payload;
  
  if (!taskId) {
    throw new Error('Missing required field: taskId');
  }

  const timerResult = await docClient.send(new QueryCommand({
    TableName: SLA_TIMERS_TABLE,
    IndexName: 'TaskIndex',
    KeyConditionExpression: 'taskId = :taskId',
    ExpressionAttributeValues: {
      ':taskId': taskId
    }
  }));

  if (!timerResult.Items || timerResult.Items.length === 0) {
    throw new Error('SLA timer not found for task');
  }

  const timer = timerResult.Items[0];
  
  await docClient.send(new UpdateCommand({
    TableName: SLA_TIMERS_TABLE,
    Key: { timerId: timer.timerId },
    UpdateExpression: 'SET status = :status, pausedAt = :pausedAt, pauseReason = :pauseReason',
    ExpressionAttributeValues: {
      ':status': 'paused',
      ':pausedAt': new Date().toISOString(),
      ':pauseReason': reason || 'Manual pause'
    }
  }));

  return { operation: 'pauseSLATimer', result: { taskId, status: 'paused' }, eventData: { taskId, reason } };
}

// Resume SLA Timer
async function resumeSLATimer(payload) {
  const { taskId } = payload;
  
  if (!taskId) {
    throw new Error('Missing required field: taskId');
  }

  const timerResult = await docClient.send(new QueryCommand({
    TableName: SLA_TIMERS_TABLE,
    IndexName: 'TaskIndex',
    KeyConditionExpression: 'taskId = :taskId',
    ExpressionAttributeValues: {
      ':taskId': taskId
    }
  }));

  if (!timerResult.Items || timerResult.Items.length === 0) {
    throw new Error('SLA timer not found for task');
  }

  const timer = timerResult.Items[0];
  
  await docClient.send(new UpdateCommand({
    TableName: SLA_TIMERS_TABLE,
    Key: { timerId: timer.timerId },
    UpdateExpression: 'SET status = :status, resumedAt = :resumedAt',
    ExpressionAttributeValues: {
      ':status': 'active',
      ':resumedAt': new Date().toISOString()
    }
  }));

  return { operation: 'resumeSLATimer', result: { taskId, status: 'active' }, eventData: { taskId } };
}

// ─── Helper Functions ───────────────────────────────────────────────────

function calculateDeadline(startTime, minutes, businessHours) {
  const deadline = new Date(startTime);
  let remainingMinutes = minutes;
  
  while (remainingMinutes > 0) {
    const dayOfWeek = deadline.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const currentTime = deadline.toLocaleTimeString('en-US', { hour12: false });
    
    if (businessHours[dayOfWeek]) {
      const { start, end } = businessHours[dayOfWeek];
      
      if (currentTime >= start && currentTime < end) {
        // Within business hours
        const timeUntilEnd = timeToMinutes(end) - timeToMinutes(currentTime);
        const minutesToAdd = Math.min(remainingMinutes, timeUntilEnd);
        
        deadline.setMinutes(deadline.getMinutes() + minutesToAdd);
        remainingMinutes -= minutesToAdd;
      } else if (currentTime < start) {
        // Before business hours, move to start
        deadline.setHours(parseInt(start.split(':')[0]), parseInt(start.split(':')[1]), 0, 0);
      } else {
        // After business hours, move to next day
        deadline.setDate(deadline.getDate() + 1);
        deadline.setHours(parseInt(start.split(':')[0]), parseInt(start.split(':')[1]), 0, 0);
      }
    } else {
      // Weekend, move to next business day
      deadline.setDate(deadline.getDate() + 1);
    }
  }
  
  return deadline;
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

async function triggerEscalation(taskId, slaId, escalationLevel) {
  // Get escalation rules
  const slaResult = await docClient.send(new GetCommand({
    TableName: SLA_POLICIES_TABLE,
    Key: { id: slaId }
  }));

  if (!slaResult.Item) {
    return;
  }

  const slaPolicy = slaResult.Item;
  const escalationRule = slaPolicy.escalationRules.find(rule => rule.level === escalationLevel);
  
  if (escalationRule) {
    // Emit escalation event
    await emitRawEvent('sla_escalation', 'system', {
      taskId,
      slaId,
      escalationLevel,
      action: escalationRule.action
    });
  }
}

// ─── Main Handler ────────────────────────────────────────────────────────
export async function handler(event) {
  console.log('📥 SLA Handler Event:', JSON.stringify(event, null, 2));

  try {
    const { operation, payload } = event;

    switch (operation) {
      case 'createSLAPolicy':
        return await createSLAPolicy(payload);
      
      case 'startSLATimer':
        return await startSLATimer(payload);
      
      case 'checkSLACompliance':
        return await checkSLACompliance(payload);
      
      case 'pauseSLATimer':
        return await pauseSLATimer(payload);
      
      case 'resumeSLATimer':
        return await resumeSLATimer(payload);
      
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

  } catch (error) {
    console.error('❌ SLA Handler Error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        operation: event.operation
      })
    };
  }
} 
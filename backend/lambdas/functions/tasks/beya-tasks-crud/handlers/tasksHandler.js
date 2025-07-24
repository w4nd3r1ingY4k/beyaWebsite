// handlers/tasksHandler.js

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

// ─── Environment variables ──────────────────────────────────────────────
const REGION = process.env.AWS_REGION;
const TASKS_TABLE = process.env.TASKS_TABLE || 'Tasks';
const SPACES_TABLE = process.env.SPACES_TABLE || 'Spaces';
const BOARDS_TABLE = process.env.BOARDS_TABLE || 'Boards';
const COMMENTS_TABLE = process.env.COMMENTS_TABLE || 'TaskComments';
const SUBTASKS_TABLE = process.env.SUBTASKS_TABLE || 'SubTasks';
const USERS_TABLE = process.env.USERS_TABLE || 'Users';
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

// Helper function to get user display name
async function getUserDisplayName(userId) {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));
    
    if (result.Item) {
      return result.Item.subscriber_email || result.Item.displayName || userId;
    }
    
    return userId;
  } catch (error) {
    console.error('Error fetching user:', error);
    return userId;
  }
}

// ─── Helper: Emit rawEvent to EventBridge ───────────────────────────────
async function emitRawEvent(eventType, userId, data) {
  const rawEvent = {
    eventId: uuidv4(),
    timestamp: new Date().toISOString(),
    source: "tasks-service",
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

// ─── CRUD Operations ─────────────────────────────────────────────────────

// Create Space
async function createSpace(payload) {
  const { name, description, userId, settings = {} } = payload;
  
  if (!name || !userId) {
    throw new Error('Missing required fields: name, userId');
  }

  const spaceId = uuidv4();
  const timestamp = new Date().toISOString();
  
  const space = {
    spaceId,
    name,
    description: description || '',
    ownerId: userId,
    settings: {
      defaultSLA: settings.defaultSLA || null,
      businessHours: settings.businessHours || {
        monday: { start: '09:00', end: '17:00' },
        tuesday: { start: '09:00', end: '17:00' },
        wednesday: { start: '09:00', end: '17:00' },
        thursday: { start: '09:00', end: '17:00' },
        friday: { start: '09:00', end: '17:00' }
      },
      autoAssignment: settings.autoAssignment || null
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };

  await docClient.send(new PutCommand({
    TableName: SPACES_TABLE,
    Item: space
  }));

  return { operation: 'createSpace', result: space, eventData: { spaceId, name, ownerId: userId } };
}

// Create Board
async function createBoard(payload) {
  const { name, spaceId, type = 'kanban', columns = [], settings = {} } = payload;
  
  if (!name || !spaceId) {
    throw new Error('Missing required fields: name, spaceId');
  }

  const boardId = uuidv4();
  const timestamp = new Date().toISOString();
  
  // Default columns for kanban
  const defaultColumns = type === 'kanban' ? [
    { id: 'backlog', name: 'Backlog', order: 1 },
    { id: 'in_progress', name: 'In Progress', order: 2 },
    { id: 'review', name: 'Review', order: 3 },
    { id: 'done', name: 'Done', order: 4 }
  ] : [];
  
  const board = {
    boardId,
    spaceId,
    name,
    type,
    columns: columns.length > 0 ? columns : defaultColumns,
    settings: {
      workflow: settings.workflow || {},
      automations: settings.automations || []
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };

  await docClient.send(new PutCommand({
    TableName: BOARDS_TABLE,
    Item: board
  }));

  return { operation: 'createBoard', result: board, eventData: { boardId, name, spaceId, type } };
}

// Create Task
async function createTask(payload) {
  const { title, description, boardId, spaceId, assigneeId, reporterId, priority = 'medium', tags = [], dueDate } = payload;
  
  if (!title || !boardId || !spaceId || !reporterId) {
    throw new Error('Missing required fields: title, boardId, spaceId, reporterId');
  }

  const taskId = uuidv4();
  const timestamp = new Date().toISOString();
  
  const task = {
    taskId,
    boardId,
    spaceId,
    title,
    description: description || '',
    status: 'pending',
    priority,
    assigneeId: assigneeId || null,
    reporterId,
    slaId: null, // Will be set by SLA service
    slaStatus: {
      responseTime: null,
      resolutionTime: null,
      isOverdue: false,
      escalationLevel: 0
    },
    tags: tags || [],
    followers: [reporterId],
    createdAt: timestamp,
    updatedAt: timestamp,
    dueDate: dueDate || null
  };

  await docClient.send(new PutCommand({
    TableName: TASKS_TABLE,
    Item: task
  }));

  // Emit task created event for SLA service
  await emitRawEvent('task_created', reporterId, { taskId, boardId, spaceId });

  return { operation: 'createTask', result: task, eventData: { taskId, title, boardId, spaceId, assigneeId, priority } };
}

// Get Tasks by Board
async function getTasksByBoard(boardId, userId) {
  if (!boardId) {
    throw new Error('Missing required field: boardId');
  }

  const params = {
    TableName: TASKS_TABLE,
    IndexName: 'BoardIndex',
    KeyConditionExpression: 'boardId = :boardId',
    ExpressionAttributeValues: {
      ':boardId': boardId
    }
  };

  const result = await docClient.send(new QueryCommand(params));
  
  // Sort by createdAt descending
  const tasks = (result.Items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  return { operation: 'getTasksByBoard', result: { tasks }, eventData: { boardId, taskCount: tasks.length } };
}

// Get Task by ID
async function getTask(taskId, userId) {
  if (!taskId) {
    throw new Error('Missing required field: taskId');
  }

  const result = await docClient.send(new GetCommand({
    TableName: TASKS_TABLE,
    Key: { taskId }
  }));

  if (!result.Item) {
    throw new Error('Task not found');
  }

  return { operation: 'getTask', result: result.Item, eventData: { taskId } };
}

// Update Task
async function updateTask(taskId, userId, updates) {
  if (!taskId || !userId) {
    throw new Error('Missing required fields: taskId, userId');
  }

  const allowedUpdates = ['title', 'description', 'status', 'priority', 'assigneeId', 'dueDate', 'tags'];
  const updateFields = [];
  const attributeValues = {};
  const attributeNames = {};

  for (const [key, value] of Object.entries(updates)) {
    if (allowedUpdates.includes(key)) {
      updateFields.push(`#${key} = :${key}`);
      attributeValues[`:${key}`] = value;
      attributeNames[`#${key}`] = key;
    }
  }

  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }

  updateFields.push('updatedAt = :updatedAt');
  attributeValues[':updatedAt'] = new Date().toISOString();

  const result = await docClient.send(new UpdateCommand({
    TableName: TASKS_TABLE,
    Key: { taskId },
    UpdateExpression: 'SET ' + updateFields.join(', '),
    ExpressionAttributeNames: attributeNames,
    ExpressionAttributeValues: attributeValues,
    ReturnValues: 'ALL_NEW'
  }));

  // Emit task updated event
  await emitRawEvent('task_updated', userId, { taskId, updates });

  return { operation: 'updateTask', result: result.Attributes, eventData: { taskId, updates } };
}

// Create Comment
async function createComment(payload) {
  const { taskId, authorId, content, type = 'public', mentions = [], attachments = [], parentCommentId = null } = payload;
  
  if (!taskId || !authorId || !content) {
    throw new Error('Missing required fields: taskId, authorId, content');
  }

  const commentId = uuidv4();
  const timestamp = new Date().toISOString();
  
  const comment = {
    commentId,
    taskId,
    authorId,
    content,
    type,
    mentions: mentions || [],
    attachments: attachments || [],
    parentCommentId,
    createdAt: timestamp
  };

  await docClient.send(new PutCommand({
    TableName: COMMENTS_TABLE,
    Item: comment
  }));

  // Update task's lastActivity
  await docClient.send(new UpdateCommand({
    TableName: TASKS_TABLE,
    Key: { taskId },
    UpdateExpression: 'SET updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':updatedAt': timestamp
    }
  }));

  // Emit comment created event for notifications
  await emitRawEvent('comment_created', authorId, { commentId, taskId, type, mentions });

  return { operation: 'createComment', result: comment, eventData: { commentId, taskId, authorId, type } };
}

// Get Comments by Task
async function getCommentsByTask(taskId, userId) {
  if (!taskId) {
    throw new Error('Missing required field: taskId');
  }

  const params = {
    TableName: COMMENTS_TABLE,
    IndexName: 'TaskIndex',
    KeyConditionExpression: 'taskId = :taskId',
    ExpressionAttributeValues: {
      ':taskId': taskId
    }
  };

  const result = await docClient.send(new QueryCommand(params));
  
  // Sort by createdAt ascending
  const comments = (result.Items || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  
  return { operation: 'getCommentsByTask', result: { comments }, eventData: { taskId, commentCount: comments.length } };
}

// Create SubTask
async function createSubTask(payload) {
  const { taskId, title, assigneeId } = payload;
  
  if (!taskId || !title) {
    throw new Error('Missing required fields: taskId, title');
  }

  const subTaskId = uuidv4();
  const timestamp = new Date().toISOString();
  
  const subTask = {
    subTaskId,
    taskId,
    title,
    status: 'pending',
    assigneeId: assigneeId || null,
    order: 1, // Will be updated based on existing subtasks
    createdAt: timestamp
  };

  await docClient.send(new PutCommand({
    TableName: SUBTASKS_TABLE,
    Item: subTask
  }));

  return { operation: 'createSubTask', result: subTask, eventData: { subTaskId, taskId, title } };
}

// Get SubTasks by Task
async function getSubTasksByTask(taskId, userId) {
  if (!taskId) {
    throw new Error('Missing required field: taskId');
  }

  const params = {
    TableName: SUBTASKS_TABLE,
    IndexName: 'TaskIndex',
    KeyConditionExpression: 'taskId = :taskId',
    ExpressionAttributeValues: {
      ':taskId': taskId
    }
  };

  const result = await docClient.send(new QueryCommand(params));
  
  // Sort by order ascending
  const subTasks = (result.Items || []).sort((a, b) => a.order - b.order);
  
  return { operation: 'getSubTasksByTask', result: { subTasks }, eventData: { taskId, subTaskCount: subTasks.length } };
}

// Follow Task
async function followTask(taskId, userId) {
  if (!taskId || !userId) {
    throw new Error('Missing required fields: taskId, userId');
  }

  const result = await docClient.send(new UpdateCommand({
    TableName: TASKS_TABLE,
    Key: { taskId },
    UpdateExpression: 'ADD followers :userId',
    ExpressionAttributeValues: {
      ':userId': new Set([userId])
    },
    ReturnValues: 'ALL_NEW'
  }));

  return { operation: 'followTask', result: result.Attributes, eventData: { taskId, userId } };
}

// Unfollow Task
async function unfollowTask(taskId, userId) {
  if (!taskId || !userId) {
    throw new Error('Missing required fields: taskId, userId');
  }

  const result = await docClient.send(new UpdateCommand({
    TableName: TASKS_TABLE,
    Key: { taskId },
    UpdateExpression: 'DELETE followers :userId',
    ExpressionAttributeValues: {
      ':userId': new Set([userId])
    },
    ReturnValues: 'ALL_NEW'
  }));

  return { operation: 'unfollowTask', result: result.Attributes, eventData: { taskId, userId } };
}

// Delete Task
async function deleteTask(taskId, userId) {
  if (!taskId) {
    throw new Error('Missing required field: taskId');
  }

  // Delete the task from the table
  await docClient.send(new DeleteCommand({
    TableName: TASKS_TABLE,
    Key: { taskId }
  }));

  // Emit task deleted event
  await emitRawEvent('task_deleted', userId, { taskId });

  return { operation: 'deleteTask', result: { taskId, deleted: true }, eventData: { taskId, userId } };
}

// ─── Main Handler ────────────────────────────────────────────────────────
export async function handler(event) {
  console.log('📥 Tasks Handler Event:', JSON.stringify(event, null, 2));

  try {
    const { operation, payload } = event;

    switch (operation) {
      case 'createSpace':
        return await createSpace(payload);
      
      case 'createBoard':
        return await createBoard(payload);
      
      case 'createTask':
        return await createTask(payload);
      
      case 'getTasksByBoard':
        return await getTasksByBoard(payload.boardId, payload.userId);
      
      case 'getTask':
        return await getTask(payload.taskId, payload.userId);
      
      case 'updateTask':
        return await updateTask(payload.taskId, payload.userId, payload.updates);
      
      case 'createComment':
        return await createComment(payload);
      
      case 'getCommentsByTask':
        return await getCommentsByTask(payload.taskId, payload.userId);
      
      case 'createSubTask':
        return await createSubTask(payload);
      
      case 'getSubTasksByTask':
        return await getSubTasksByTask(payload.taskId, payload.userId);
      
      case 'followTask':
        return await followTask(payload.taskId, payload.userId);
      
      case 'unfollowTask':
        return await unfollowTask(payload.taskId, payload.userId);
      
      case 'deleteTask':
        return await deleteTask(payload.taskId, payload.userId);
      
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

  } catch (error) {
    console.error('❌ Tasks Handler Error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        operation: event.operation
      })
    };
  }
} 
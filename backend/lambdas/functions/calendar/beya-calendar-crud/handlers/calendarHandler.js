// handlers/calendarHandler.js

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  BatchGetCommand
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// ─── Environment variables ──────────────────────────────────────────────
const REGION = process.env.AWS_REGION;
const CALENDAR_TABLE = process.env.CALENDAR_TABLE || 'CalendarV1';
const CONTACTS_API_BASE = process.env.CONTACTS_API_BASE || 'https://bij7as05n4.execute-api.us-east-1.amazonaws.com/prod';

if (!REGION) {
  throw new Error('Missing required env var: AWS_REGION');
}

// ─── AWS clients ─────────────────────────────────────────────────────────
const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true }
});

// ─── CORS Headers ────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with',
  'Content-Type': 'application/json'
};

// ─── Helper Functions ────────────────────────────────────────────────────

function createEventKeys(userId, timestamp, eventId) {
  return {
    PK: `USER#${userId}`,
    SK: `EVT#${timestamp}#${eventId}`
  };
}

function createDailyViewKeys(userId, date) {
  return {
    PK: `USER#${userId}#DATE#${date}`,
    SK: 'VIEW'
  };
}

// Validate contact IDs against ContactsV2 service
async function validateContacts(userId, contactIds) {
  if (!contactIds || contactIds.length === 0) return [];
  
  try {
    // For now, skip validation and allow any contact ID
    // TODO: Implement proper contact validation once contacts API supports it
    console.log(`🔍 Skipping contact validation for user ${userId}, contacts: ${contactIds.join(', ')}`);
    return contactIds;
  } catch (error) {
    console.error('Contact validation error:', error);
    throw new Error('Failed to validate contact IDs');
  }
}

// Update contact metadata (fire-and-forget)
async function updateContactMetadata(userId, contactIds, eventData) {
  if (!contactIds || contactIds.length === 0) return;
  
  const promises = contactIds.map(async (contactId) => {
    try {
      await fetch(`${CONTACTS_API_BASE}/contacts/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          updates: {
            metadata: {
              lastEventId: eventData.eventId,
              lastEventAt: eventData.startTime,
              lastEventType: eventData.eventType,
              lastEventTitle: eventData.title
            }
          }
        })
      });
    } catch (error) {
      console.warn(`Failed to update contact ${contactId} metadata:`, error);
    }
  });
  
  await Promise.allSettled(promises);
}

// ─── CRUD Operations ─────────────────────────────────────────────────────

// Create Event
async function createEvent(payload) {
  const { 
    userId, 
    title, 
    startTime, 
    endTime, 
    contactIds = [],
    eventType = 'appointment',
    description,
    location,
    reminders = []
  } = payload;
  
  if (!userId || !title || !startTime || !endTime) {
    throw new Error('Missing required fields: userId, title, startTime, endTime');
  }

  // Validate contact IDs if provided
  if (contactIds.length > 0) {
    const validContacts = await validateContacts(userId, contactIds);
    if (validContacts.length !== contactIds.length) {
      const validIds = validContacts.map(c => c.contactId);
      const invalidIds = contactIds.filter(id => !validIds.includes(id));
      throw new Error(`Invalid contact IDs: ${invalidIds.join(', ')}`);
    }
  }

  const eventId = uuidv4();
  const timestamp = new Date().toISOString();
  const startDate = new Date(startTime).toISOString().split('T')[0]; // YYYY-MM-DD
  
  const event = {
    ...createEventKeys(userId, startTime, eventId),
    
    // GSI1: Daily view
    GSI1PK: `USER#${userId}#DATE#${startDate}`,
    GSI1SK: `TIME#${new Date(startTime).toTimeString().slice(0, 8)}#${eventId}`,
    
    // GSI2: Contact relationships (if any)
    ...(contactIds.length > 0 && {
      GSI2PK: `CONTACT#${contactIds[0]}`, // Primary contact
      GSI2SK: `EVT#${startTime}#${eventId}`
    }),
    
    // Event data
    eventId,
    userId,
    title,
    description,
    startTime,
    endTime,
    location,
    eventType,
    status: 'scheduled',
    contactIds,
    reminders,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  // Save event
  await docClient.send(new PutCommand({
    TableName: CALENDAR_TABLE,
    Item: event,
    ConditionExpression: 'attribute_not_exists(PK)' // Prevent overwrites
  }));

  // Update contact metadata (async, don't wait)
  updateContactMetadata(userId, contactIds, event).catch(err => {
    console.warn('Failed to update contact metadata:', err);
  });

  // Return clean event data
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...cleanEvent } = event;
  return { operation: 'createEvent', event: cleanEvent };
}

// Get Event
async function getEvent(payload) {
  const { userId, eventId, startTime } = payload;
  
  if (!userId || !eventId || !startTime) {
    throw new Error('Missing required fields: userId, eventId, startTime');
  }

  const keys = createEventKeys(userId, startTime, eventId);
  const result = await docClient.send(new GetCommand({
    TableName: CALENDAR_TABLE,
    Key: keys
  }));

  if (!result.Item) {
    throw new Error('Event not found');
  }

  // Return clean event data
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...cleanEvent } = result.Item;
  return { operation: 'getEvent', event: cleanEvent };
}

// Update Event
async function updateEvent(payload) {
  const { userId, eventId, startTime, updates } = payload;
  
  if (!userId || !eventId || !startTime || !updates) {
    throw new Error('Missing required fields: userId, eventId, startTime, updates');
  }

  // Validate contact IDs if being updated
  if (updates.contactIds && updates.contactIds.length > 0) {
    const validContacts = await validateContacts(userId, updates.contactIds);
    if (validContacts.length !== updates.contactIds.length) {
      const validIds = validContacts.map(c => c.contactId);
      const invalidIds = updates.contactIds.filter(id => !validIds.includes(id));
      throw new Error(`Invalid contact IDs: ${invalidIds.join(', ')}`);
    }
  }

  const keys = createEventKeys(userId, startTime, eventId);
  const timestamp = new Date().toISOString();
  
  // Build update expression
  let updateExpression = 'SET updatedAt = :updatedAt';
  let expressionAttributeValues = { ':updatedAt': timestamp };
  let expressionAttributeNames = {};
  
  // Handle each possible update field
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && key !== 'eventId' && key !== 'userId') {
      updateExpression += `, #${key} = :${key}`;
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }
  });

  const updateParams = {
    TableName: CALENDAR_TABLE,
    Key: keys,
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ConditionExpression: 'attribute_exists(PK)',
    ReturnValues: 'ALL_NEW'
  };

  const result = await docClient.send(new UpdateCommand(updateParams));

  // Update contact metadata if contactIds changed (async)
  if (updates.contactIds) {
    updateContactMetadata(userId, updates.contactIds, {
      eventId,
      startTime: updates.startTime || startTime,
      eventType: updates.eventType || result.Attributes.eventType,
      title: updates.title || result.Attributes.title
    }).catch(err => {
      console.warn('Failed to update contact metadata:', err);
    });
  }

  // Return clean event data
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...cleanEvent } = result.Attributes;
  return { operation: 'updateEvent', event: cleanEvent };
}

// Delete Event
async function deleteEvent(payload) {
  const { userId, eventId, startTime } = payload;
  
  if (!userId || !eventId || !startTime) {
    throw new Error('Missing required fields: userId, eventId, startTime');
  }

  const keys = createEventKeys(userId, startTime, eventId);

  // Get event before deletion for cleanup
  const existingEvent = await docClient.send(new GetCommand({
    TableName: CALENDAR_TABLE,
    Key: keys
  }));

  if (!existingEvent.Item) {
    throw new Error('Event not found');
  }

  // Delete the event
  await docClient.send(new DeleteCommand({
    TableName: CALENDAR_TABLE,
    Key: keys,
    ConditionExpression: 'attribute_exists(PK)'
  }));

  return { operation: 'deleteEvent', eventId, message: 'Event deleted successfully' };
}

// Get Calendar View (Daily) - Filter by contactId only
async function getDayEvents(payload) {
  const { contactId, date } = payload; // date format: YYYY-MM-DD
  
  if (!contactId || !date) {
    throw new Error('Missing required fields: contactId, date');
  }

  // Query by GSI2 (Contact + Date range)
  const gsi2PK = `CONTACT#${contactId}`;
  const startOfDay = `EVT#${date}T00:00:00Z`;
  const endOfDay = `EVT#${date}T23:59:59Z`;
  
  const result = await docClient.send(new QueryCommand({
    TableName: CALENDAR_TABLE,
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :gsi2pk AND GSI2SK BETWEEN :start AND :end',
    ExpressionAttributeValues: {
      ':gsi2pk': gsi2PK,
      ':start': startOfDay,
      ':end': endOfDay
    },
    ScanIndexForward: true // Chronological order
  }));

  const events = (result.Items || []).map(item => {
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...cleanEvent } = item;
    return cleanEvent;
  });

  return { operation: 'getDayEvents', events, cached: false };
}

// Get Week Events
async function getWeekEvents(payload) {
  const { contactId, startDate, endDate } = payload;
  
  if (!contactId || !startDate || !endDate) {
    throw new Error('Missing required fields: contactId, startDate, endDate');
  }

  // Generate date range
  const dates = getDateRange(startDate, endDate);
  
  // Parallel fetch all days in the week
  const dayPromises = dates.map(date => getDayEvents({ contactId, date }));
  const dayResults = await Promise.all(dayPromises);
  
  // Flatten events and sort
  const allEvents = dayResults
    .flatMap(result => result.events)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  return { operation: 'getWeekEvents', events: allEvents, dateRange: { startDate, endDate } };
}

// Get Contact Events
async function getContactEvents(payload) {
  const { contactId, limit = 20, startTime = null } = payload;
  
  if (!contactId) {
    throw new Error('Missing required field: contactId');
  }

  const queryParams = {
    TableName: CALENDAR_TABLE,
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :gsi2pk',
    ExpressionAttributeValues: {
      ':gsi2pk': `CONTACT#${contactId}`
    },
    Limit: limit,
    ScanIndexForward: false // Most recent first
  };

  if (startTime) {
    queryParams.ExclusiveStartKey = {
      GSI2PK: `CONTACT#${contactId}`,
      GSI2SK: startTime
    };
  }

  const result = await docClient.send(new QueryCommand(queryParams));
  
  const events = (result.Items || []).map(item => {
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...cleanEvent } = item;
    return cleanEvent;
  });

  let nextStartTime = null;
  if (result.LastEvaluatedKey) {
    nextStartTime = result.LastEvaluatedKey.GSI2SK;
  }

  return {
    operation: 'getContactEvents',
    contactId,
    events,
    nextStartTime,
    count: events.length
  };
}

// ─── Cache Management ─────────────────────────────────────────────────────

async function getCachedDayView(userId, date) {
  try {
    const keys = createDailyViewKeys(userId, date);
    const result = await docClient.send(new GetCommand({
      TableName: CALENDAR_TABLE,
      Key: keys
    }));

    if (result.Item && result.Item.TTL > Math.floor(Date.now() / 1000)) {
      return result.Item;
    }
  } catch (error) {
    console.log('Cache miss:', error.message);
  }
  return null;
}

async function cacheDayView(userId, date, events) {
  try {
    const keys = createDailyViewKeys(userId, date);
    const ttl = Math.floor(Date.now() / 1000) + 3600; // 1 hour cache
    
    await docClient.send(new PutCommand({
      TableName: CALENDAR_TABLE,
      Item: {
        ...keys,
        events,
        lastUpdated: new Date().toISOString(),
        TTL: ttl
      }
    }));
  } catch (error) {
    console.error('Failed to cache day view:', error);
  }
}

// ─── Utility Functions ────────────────────────────────────────────────────

function getDateRange(startDate, endDate) {
  const dates = [];
  const currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

// ─── Main Handler ────────────────────────────────────────────────────────
export async function handler(event) {
  console.log('📅 Calendar Handler Event:', JSON.stringify(event, null, 2));

  // Handle CORS preflight
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS
    };
  }

  try {
    // Support both direct Lambda invocation and HTTP API Gateway
    let operation, payload;
    
    if (event.operation) {
      // Direct Lambda invocation
      operation = event.operation;
      payload = event.payload || {};
    } else {
      // HTTP API Gateway routing (API Gateway v1 format)
      const method = event.httpMethod;
      let path = event.path;
      const pathParameters = event.pathParameters || {};
      const queryStringParameters = event.queryStringParameters || {};
      
      // Remove stage prefix if present
      if (path && path.startsWith('/prod/')) {
        path = path.substring(5);
      }
      
      console.log('🚀 Processing route:', { method, path, pathParameters, queryStringParameters });
      
      let body = {};
      if (event.body) {
        try {
          body = JSON.parse(event.body);
        } catch (e) {
          throw new Error('Invalid JSON in request body');
        }
      }

      // Route HTTP requests to operations
      if (method === 'POST' && path === '/events') {
        operation = 'createEvent';
        payload = body;
      } else if (method === 'GET' && pathParameters.eventId) {
        operation = 'getEvent';
        payload = { 
          userId: queryStringParameters.userId,
          eventId: pathParameters.eventId,
          startTime: queryStringParameters.startTime
        };
      } else if (method === 'PUT' && pathParameters.eventId) {
        operation = 'updateEvent';
        payload = { 
          userId: body.userId,
          eventId: pathParameters.eventId,
          startTime: body.startTime,
          updates: body.updates
        };
      } else if (method === 'DELETE' && pathParameters.eventId) {
        operation = 'deleteEvent';
        payload = { 
          userId: queryStringParameters.userId,
          eventId: pathParameters.eventId,
          startTime: queryStringParameters.startTime
        };
      } else if (method === 'GET' && path === '/calendar/day') {
        operation = 'getDayEvents';
        payload = { 
          contactId: queryStringParameters.contactId,
          date: queryStringParameters.date
        };
      } else if (method === 'GET' && path === '/calendar/week') {
        operation = 'getWeekEvents';
        payload = { 
          contactId: queryStringParameters.contactId,
          startDate: queryStringParameters.startDate,
          endDate: queryStringParameters.endDate
        };
      } else if (method === 'GET' && path.includes('/contacts/') && path.includes('/events')) {
        operation = 'getContactEvents';
        payload = { 
          contactId: pathParameters.contactId,
          limit: queryStringParameters.limit ? parseInt(queryStringParameters.limit) : 20,
          startTime: queryStringParameters.startTime
        };
      } else {
        throw new Error(`Unsupported route: ${method} ${path}`);
      }
    }

    // Execute operation
    let result;
    switch (operation) {
      case 'createEvent':
        result = await createEvent(payload);
        break;
      case 'getEvent':
        result = await getEvent(payload);
        break;
      case 'updateEvent':
        result = await updateEvent(payload);
        break;
      case 'deleteEvent':
        result = await deleteEvent(payload);
        break;
      case 'getDayEvents':
        result = await getDayEvents(payload);
        break;
      case 'getWeekEvents':
        result = await getWeekEvents(payload);
        break;
      case 'getContactEvents':
        result = await getContactEvents(payload);
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    // Return response
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ Calendar Handler Error:', error);
    
    return {
      statusCode: error.message.includes('not found') ? 404 : 
                 error.message.includes('Missing required') ? 400 : 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: error.message,
        operation: event.operation || 'unknown'
      })
    };
  }
} 
// handlers/contactsHandler.js

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// ─── Environment variables ──────────────────────────────────────────────
const REGION = process.env.AWS_REGION;
const CONTACTS_TABLE = process.env.CONTACTS_TABLE || 'ContactsV2';

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

function normalizePhone(phone) {
  if (!phone) return null;
  // Remove all non-digits and add + prefix
  return '+' + phone.replace(/\D/g, '');
}

function normalizeEmail(email) {
  if (!email) return null;
  return email.toLowerCase().trim();
}

function createContactKeys(userId, contactId) {
  return {
    PK: `USER#${userId}#CONTACT#${contactId}`,
    SK: 'METADATA'
  };
}

function createNoteKeys(userId, contactId, timestamp, noteId) {
  return {
    PK: `USER#${userId}#CONTACT#${contactId}`,
    SK: `NOTE#${timestamp}#${noteId}`
  };
}

// ─── CRUD Operations ─────────────────────────────────────────────────────

// Create Contact
async function createContact(payload) {
  const { userId, name, email, phone, metadata = {} } = payload;
  
  if (!userId || !name) {
    throw new Error('Missing required fields: userId, name');
  }

  const contactId = uuidv4();
  const timestamp = new Date().toISOString();
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  
  const contact = {
    ...createContactKeys(userId, contactId),
    GSI1PK: `USER#${userId}`,
    GSI1SK: `CONTACT#${name.toLowerCase()}`,
    ...(normalizedEmail && {
      GSI2PK: `EMAIL#${normalizedEmail}`,
      GSI2SK: `USER#${userId}`
    }),
    ...(normalizedPhone && {
      GSI3PK: `PHONE#${normalizedPhone}`,
      GSI3SK: `USER#${userId}`
    }),
    
    // Data fields
    contactId,
    userId,
    name,
    ...(normalizedEmail && { email: normalizedEmail }),
    ...(normalizedPhone && { phone: normalizedPhone }),
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: userId,
    metadata
  };

  await docClient.send(new PutCommand({
    TableName: CONTACTS_TABLE,
    Item: contact,
    ConditionExpression: 'attribute_not_exists(PK)' // Prevent overwrites
  }));

  // Return clean contact data (without DynamoDB keys)
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...cleanContact } = contact;
  return { operation: 'createContact', contact: cleanContact };
}

// Get Contact
async function getContact(payload) {
  const { userId, contactId } = payload;
  
  if (!userId || !contactId) {
    throw new Error('Missing required fields: userId, contactId');
  }

  const keys = createContactKeys(userId, contactId);
  const result = await docClient.send(new GetCommand({
    TableName: CONTACTS_TABLE,
    Key: keys
  }));

  if (!result.Item) {
    throw new Error('Contact not found');
  }

  // Get contact notes
  const notesResult = await docClient.send(new QueryCommand({
    TableName: CONTACTS_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': keys.PK,
      ':sk': 'NOTE#'
    },
    ScanIndexForward: false // Most recent notes first
  }));

  const notes = (notesResult.Items || []).map(item => ({
    noteId: item.SK.split('#')[2],
    body: item.body,
    createdAt: item.createdAt,
    createdBy: item.createdBy
  }));

  // Return clean contact data
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...cleanContact } = result.Item;
  return { 
    operation: 'getContact', 
    contact: { ...cleanContact, notes } 
  };
}

// Update Contact
async function updateContact(payload) {
  const { userId, contactId, updates } = payload;
  
  if (!userId || !contactId || !updates) {
    throw new Error('Missing required fields: userId, contactId, updates');
  }

  const keys = createContactKeys(userId, contactId);
  const timestamp = new Date().toISOString();
  
  // Build update expression
  let updateExpression = 'SET updatedAt = :updatedAt';
  let expressionAttributeValues = { ':updatedAt': timestamp };
  let expressionAttributeNames = {};

  // Handle each possible update field
  if (updates.name !== undefined) {
    updateExpression += ', #name = :name, GSI1SK = :gsi1sk';
    expressionAttributeNames['#name'] = 'name';
    expressionAttributeValues[':name'] = updates.name;
    expressionAttributeValues[':gsi1sk'] = `CONTACT#${updates.name.toLowerCase()}`;
  }

  if (updates.email !== undefined) {
    const normalizedEmail = normalizeEmail(updates.email);
    if (normalizedEmail) {
      updateExpression += ', email = :email, GSI2PK = :gsi2pk';
      expressionAttributeValues[':email'] = normalizedEmail;
      expressionAttributeValues[':gsi2pk'] = `EMAIL#${normalizedEmail}`;
    } else {
      updateExpression += ' REMOVE email, GSI2PK, GSI2SK';
    }
  }

  if (updates.phone !== undefined) {
    const normalizedPhone = normalizePhone(updates.phone);
    if (normalizedPhone) {
      updateExpression += ', phone = :phone, GSI3PK = :gsi3pk';
      expressionAttributeValues[':phone'] = normalizedPhone;
      expressionAttributeValues[':gsi3pk'] = `PHONE#${normalizedPhone}`;
    } else {
      updateExpression += ' REMOVE phone, GSI3PK, GSI3SK';
    }
  }

  if (updates.metadata !== undefined) {
    updateExpression += ', metadata = :metadata';
    expressionAttributeValues[':metadata'] = updates.metadata;
  }

  const updateParams = {
    TableName: CONTACTS_TABLE,
    Key: keys,
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ConditionExpression: 'attribute_exists(PK)', // Ensure contact exists
    ReturnValues: 'ALL_NEW'
  };

  if (Object.keys(expressionAttributeNames).length > 0) {
    updateParams.ExpressionAttributeNames = expressionAttributeNames;
  }

  const result = await docClient.send(new UpdateCommand(updateParams));
  
  // Return clean contact data
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...cleanContact } = result.Attributes;
  return { operation: 'updateContact', contact: cleanContact };
}

// Delete Contact
async function deleteContact(payload) {
  const { userId, contactId } = payload;
  
  if (!userId || !contactId) {
    throw new Error('Missing required fields: userId, contactId');
  }

  const keys = createContactKeys(userId, contactId);

  // First, delete all notes for this contact
  const notesResult = await docClient.send(new QueryCommand({
    TableName: CONTACTS_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': keys.PK,
      ':sk': 'NOTE#'
    },
    ProjectionExpression: 'PK, SK'
  }));

  // Delete all notes
  for (const note of notesResult.Items || []) {
    await docClient.send(new DeleteCommand({
      TableName: CONTACTS_TABLE,
      Key: { PK: note.PK, SK: note.SK }
    }));
  }

  // Delete the contact itself
  await docClient.send(new DeleteCommand({
    TableName: CONTACTS_TABLE,
    Key: keys,
    ConditionExpression: 'attribute_exists(PK)' // Ensure contact exists
  }));

  return { operation: 'deleteContact', contactId, message: 'Contact deleted successfully' };
}

// List Contacts for User
async function listContacts(payload) {
  const { userId, limit = 20, startKey = null } = payload;
  
  if (!userId) {
    throw new Error('Missing required field: userId');
  }

  const queryParams = {
    TableName: CONTACTS_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsi1pk',
    ExpressionAttributeValues: {
      ':gsi1pk': `USER#${userId}`
    },
    Limit: limit
  };

  if (startKey) {
    queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(startKey, 'base64').toString());
  }

  const result = await docClient.send(new QueryCommand(queryParams));
  
  const contacts = (result.Items || []).map(item => {
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...cleanContact } = item;
    return cleanContact;
  });

  let nextKey = null;
  if (result.LastEvaluatedKey) {
    nextKey = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
  }

  return {
    operation: 'listContacts',
    contacts,
    nextKey,
    count: contacts.length
  };
}

// Search Contact by Email (for Inbox matching)
async function findContactByEmail(payload) {
  const { email, userId = null } = payload;
  
  if (!email) {
    throw new Error('Missing required field: email');
  }

  const normalizedEmail = normalizeEmail(email);
  console.log(`🔍 Looking for email: ${normalizedEmail}, userId: ${userId}`);
  
  const queryParams = {
    TableName: CONTACTS_TABLE,
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :gsi2pk',
    ExpressionAttributeValues: {
      ':gsi2pk': `EMAIL#${normalizedEmail}`
    }
  };

  // First check if contact exists at all (without userId filter)
  const allResult = await docClient.send(new QueryCommand(queryParams));
  console.log(`🔍 Found ${allResult.Items?.length || 0} contacts with email ${normalizedEmail} (any user)`);
  if (allResult.Items?.length > 0) {
    console.log('🔍 Contact userIds found:', allResult.Items.map(item => item.userId));
  }

  // If userId provided, filter to that user only
  if (userId) {
    queryParams.FilterExpression = 'userId = :userId';
    queryParams.ExpressionAttributeValues[':userId'] = userId;
  }

  const result = await docClient.send(new QueryCommand(queryParams));
  
  const contacts = (result.Items || []).map(item => {
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...cleanContact } = item;
    return cleanContact;
  });

  return {
    operation: 'findContactByEmail',
    email: normalizedEmail,
    contacts,
    count: contacts.length
  };
}

// Search Contact by Phone (for Inbox matching)
async function findContactByPhone(payload) {
  const { phone, userId = null } = payload;
  
  if (!phone) {
    throw new Error('Missing required field: phone');
  }

  const normalizedPhone = normalizePhone(phone);
  const queryParams = {
    TableName: CONTACTS_TABLE,
    IndexName: 'GSI3',
    KeyConditionExpression: 'GSI3PK = :gsi3pk',
    ExpressionAttributeValues: {
      ':gsi3pk': `PHONE#${normalizedPhone}`
    }
  };

  // If userId provided, filter to that user only
  if (userId) {
    queryParams.FilterExpression = 'userId = :userId';
    queryParams.ExpressionAttributeValues[':userId'] = userId;
  }

  const result = await docClient.send(new QueryCommand(queryParams));
  
  const contacts = (result.Items || []).map(item => {
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...cleanContact } = item;
    return cleanContact;
  });

  return {
    operation: 'findContactByPhone',
    phone: normalizedPhone,
    contacts,
    count: contacts.length
  };
}

// Add Note to Contact
async function addNote(payload) {
  const { userId, contactId, body, createdBy } = payload;
  
  if (!userId || !contactId || !body) {
    throw new Error('Missing required fields: userId, contactId, body');
  }

  // Verify contact exists first
  const contactKeys = createContactKeys(userId, contactId);
  const contactResult = await docClient.send(new GetCommand({
    TableName: CONTACTS_TABLE,
    Key: contactKeys,
    ProjectionExpression: 'contactId'
  }));

  if (!contactResult.Item) {
    throw new Error('Contact not found');
  }

  const noteId = uuidv4();
  const timestamp = new Date().toISOString();
  const noteKeys = createNoteKeys(userId, contactId, timestamp, noteId);

  const note = {
    ...noteKeys,
    noteId,
    body,
    createdAt: timestamp,
    createdBy: createdBy || userId
  };

  await docClient.send(new PutCommand({
    TableName: CONTACTS_TABLE,
    Item: note
  }));

  // Return clean note data
  const { PK, SK, ...cleanNote } = note;
  return { operation: 'addNote', note: cleanNote };
}

// Match Contact for Inbox Integration
async function matchContact(payload) {
  const { userId, email, phone } = payload;
  
  if (!userId || (!email && !phone)) {
    throw new Error('Missing required fields: userId and (email or phone)');
  }

  // Try to find by email first
  if (email) {
    const emailResult = await findContactByEmail({ email, userId });
    if (emailResult.contact) {
      return { operation: 'matchContact', contact: emailResult.contact, matchedBy: 'email' };
    }
  }

  // If no email match, try phone
  if (phone) {
    const phoneResult = await findContactByPhone({ phone, userId });
    if (phoneResult.contact) {
      return { operation: 'matchContact', contact: phoneResult.contact, matchedBy: 'phone' };
    }
  }

  // No match found
  return { operation: 'matchContact', contact: null, matchedBy: null };
}

// ─── Main Handler ────────────────────────────────────────────────────────
export async function handler(event) {
  console.log('📥 Contacts Handler Event:', JSON.stringify(event, null, 2));

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
      // HTTP API Gateway
      const method = event.requestContext?.http?.method;
      let path = event.requestContext?.http?.path;
      const pathParameters = event.pathParameters || {};
      const queryStringParameters = event.queryStringParameters || {};
      
      // Remove stage prefix if present (e.g., /prod/contacts -> /contacts)
      if (path && path.startsWith('/prod/')) {
        path = path.substring(5); // Remove '/prod'
      }
      
      let body = {};
      if (event.body) {
        try {
          body = JSON.parse(event.body);
        } catch (e) {
          throw new Error('Invalid JSON in request body');
        }
      }

      // Route HTTP requests to operations
      if (method === 'POST' && path === '/contacts') {
        operation = 'createContact';
        payload = body;
      } else if (method === 'GET' && path === '/contacts' && queryStringParameters.userId) {
        operation = 'listContacts';
        payload = { 
          userId: queryStringParameters.userId,
          limit: queryStringParameters.limit ? parseInt(queryStringParameters.limit) : 20,
          startKey: queryStringParameters.startKey
        };
      } else if (method === 'GET' && pathParameters.contactId) {
        operation = 'getContact';
        payload = { 
          userId: queryStringParameters.userId,
          contactId: pathParameters.contactId 
        };
      } else if (method === 'PUT' && pathParameters.contactId) {
        operation = 'updateContact';
        payload = { 
          userId: body.userId,
          contactId: pathParameters.contactId,
          updates: body.updates
        };
      } else if (method === 'DELETE' && pathParameters.contactId) {
        operation = 'deleteContact';
        payload = { 
          userId: queryStringParameters.userId,
          contactId: pathParameters.contactId 
        };
      } else if (method === 'POST' && path.includes('/notes')) {
        operation = 'addNote';
        payload = { ...body, contactId: pathParameters.contactId };
      } else if (method === 'GET' && path === '/contacts/search/email') {
        operation = 'findContactByEmail';
        payload = { 
          email: queryStringParameters.email,
          userId: queryStringParameters.userId
        };
      } else if (method === 'POST' && path === '/contacts/search/email') {
        operation = 'findContactByEmail';
        payload = { 
          email: body.email,
          userId: body.userId
        };
      } else if (method === 'GET' && path === '/contacts/search/phone') {
        operation = 'findContactByPhone';
        payload = { 
          phone: queryStringParameters.phone,
          userId: queryStringParameters.userId
        };
      } else if (method === 'POST' && path === '/contacts/search/phone') {
        operation = 'findContactByPhone';
        payload = { 
          phone: body.phone,
          userId: body.userId
        };
      } else if (method === 'POST' && path === '/contacts/match') {
        operation = 'matchContact';
        payload = body;
      } else {
        throw new Error(`Unsupported route: ${method} ${path}`);
      }
    }

    // Execute operation
    let result;
    switch (operation) {
      case 'createContact':
        result = await createContact(payload);
        break;
      case 'getContact':
        result = await getContact(payload);
        break;
      case 'updateContact':
        result = await updateContact(payload);
        break;
      case 'deleteContact':
        result = await deleteContact(payload);
        break;
      case 'listContacts':
        result = await listContacts(payload);
        break;
      case 'findContactByEmail':
        result = await findContactByEmail(payload);
        break;
      case 'findContactByPhone':
        result = await findContactByPhone(payload);
        break;
      case 'addNote':
        result = await addNote(payload);
        break;
      case 'matchContact':
        result = await matchContact(payload);
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
    console.error('❌ Contacts Handler Error:', error);
    
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
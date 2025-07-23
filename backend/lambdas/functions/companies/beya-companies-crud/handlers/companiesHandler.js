const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const COMPANIES_TABLE = 'CompaniesV1';

// Helper function to create response
function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    body: JSON.stringify(body)
  };
}

// Create Company
async function createCompany(payload) {
  const { companyName, createdBy } = payload;
  
  if (!companyName || !createdBy) {
    throw new Error('Missing required fields: companyName, createdBy');
  }

  // Check if company name already exists
  const existingCompany = await searchCompaniesByName(companyName);
  if (existingCompany.companies.length > 0) {
    throw new Error('Company name already exists');
  }

  const companyId = uuidv4();
  const timestamp = new Date().toISOString();
  
  const company = {
    companyId,
    companyName: companyName.trim(),
    createdBy,
    createdAt: timestamp,
    updatedAt: timestamp,
    settings: {
      timezone: 'UTC',
      currency: 'USD',
      businessType: 'general'
    },
    memberCount: 1,
    status: 'active'
  };

  const putParams = {
    TableName: COMPANIES_TABLE,
    Item: company,
    ConditionExpression: 'attribute_not_exists(companyId)'
  };

  await docClient.send(new PutCommand(putParams));

  return {
    operation: 'createCompany',
    company
  };
}

// Get Company by ID
async function getCompany(payload) {
  const { companyId } = payload;
  
  if (!companyId) {
    throw new Error('Missing required field: companyId');
  }

  const getParams = {
    TableName: COMPANIES_TABLE,
    Key: { companyId }
  };

  const result = await docClient.send(new GetCommand(getParams));

  if (!result.Item) {
    throw new Error('Company not found');
  }

  return {
    operation: 'getCompany',
    company: result.Item
  };
}

// Search Companies by Name
async function searchCompaniesByName(companyName) {
  if (!companyName) {
    throw new Error('Missing required field: companyName');
  }

  const queryParams = {
    TableName: COMPANIES_TABLE,
    IndexName: 'CompanyNameIndex',
    KeyConditionExpression: 'companyName = :companyName',
    ExpressionAttributeValues: {
      ':companyName': companyName.trim()
    }
  };

  const result = await docClient.send(new QueryCommand(queryParams));

  return {
    operation: 'searchCompaniesByName',
    companies: result.Items || [],
    count: result.Count || 0
  };
}

// Search Companies (fuzzy search)
async function searchCompanies(payload) {
  const { searchTerm, limit = 10 } = payload;
  
  if (!searchTerm) {
    return {
      operation: 'searchCompanies',
      companies: [],
      count: 0
    };
  }

  // For now, do a simple scan with filter
  // In production, you might want to use ElasticSearch or implement a more sophisticated search
  const scanParams = {
    TableName: COMPANIES_TABLE,
    FilterExpression: 'contains(#companyName, :searchTerm) AND #status = :status',
    ExpressionAttributeNames: {
      '#companyName': 'companyName',
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':searchTerm': searchTerm.toLowerCase(),
      ':status': 'active'
    },
    Limit: limit
  };

  const result = await docClient.send(new QueryCommand(scanParams));

  return {
    operation: 'searchCompanies',
    companies: result.Items || [],
    count: result.Count || 0
  };
}

// Update Company Member Count
async function updateMemberCount(payload) {
  const { companyId, increment = 1 } = payload;
  
  if (!companyId) {
    throw new Error('Missing required field: companyId');
  }

  const updateParams = {
    TableName: COMPANIES_TABLE,
    Key: { companyId },
    UpdateExpression: 'ADD memberCount :increment SET updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':increment': increment,
      ':updatedAt': new Date().toISOString()
    },
    ConditionExpression: 'attribute_exists(companyId)',
    ReturnValues: 'ALL_NEW'
  };

  const result = await docClient.send(new UpdateCommand(updateParams));

  return {
    operation: 'updateMemberCount',
    company: result.Attributes
  };
}

// Main Lambda handler
exports.handler = async (event) => {
  console.log('📦 Companies Handler - Event:', JSON.stringify(event, null, 2));

  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, { message: 'CORS preflight successful' });
    }

    // Parse the request
    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError);
      return createResponse(400, { error: 'Invalid JSON in request body' });
    }

    const { operation, ...payload } = body;

    if (!operation) {
      return createResponse(400, { error: 'Missing operation field' });
    }

    console.log(`🔄 Processing operation: ${operation}`, payload);

    let result;

    switch (operation) {
      case 'createCompany':
        result = await createCompany(payload);
        break;

      case 'getCompany':
        result = await getCompany(payload);
        break;

      case 'searchCompaniesByName':
        result = await searchCompaniesByName(payload.companyName);
        break;

      case 'searchCompanies':
        result = await searchCompanies(payload);
        break;

      case 'updateMemberCount':
        result = await updateMemberCount(payload);
        break;

      default:
        return createResponse(400, { error: `Unknown operation: ${operation}` });
    }

    console.log('✅ Operation successful:', result.operation);
    return createResponse(200, result);

  } catch (error) {
    console.error('❌ Companies Handler Error:', error);
    
    // Handle specific error types
    if (error.message.includes('already exists')) {
      return createResponse(409, { error: error.message });
    }
    
    if (error.message.includes('not found')) {
      return createResponse(404, { error: error.message });
    }
    
    if (error.message.includes('Missing required')) {
      return createResponse(400, { error: error.message });
    }

    return createResponse(500, { 
      error: 'Internal server error',
      details: error.message 
    });
  }
}; 
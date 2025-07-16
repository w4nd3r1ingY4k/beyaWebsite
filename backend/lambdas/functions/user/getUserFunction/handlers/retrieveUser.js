// handlers/getUser.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand
} = require("@aws-sdk/lib-dynamodb");
const { ConnectionsService } = require("../lib/connections-service");

// Initialize DocumentClient
const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

const USERS_TABLE = process.env.USERS_TABLE; // ensure this is set in your Lambda env

exports.handler = async (event) => {
  try {
    console.log("Full event object:", JSON.stringify(event, null, 2));
    console.log("Event keys:", Object.keys(event));
    console.log("HTTP method:", event.requestContext?.http?.method || event.httpMethod);
    console.log("Raw path:", event.rawPath);
    console.log("Path parameters:", event.pathParameters);
    console.log("Query string parameters:", event.queryStringParameters);
    
    // Handle both Function URL and API Gateway event formats
    let userId, path;
    
    console.log("DEBUG: event.queryStringParameters:", event.queryStringParameters);
    console.log("DEBUG: event.queryStringParameters type:", typeof event.queryStringParameters);
    console.log("DEBUG: event.queryStringParameters.userId:", event.queryStringParameters?.userId);
    
    // First check for query string parameters (most common case)
    if (event.queryStringParameters && event.queryStringParameters.userId) {
      // Query parameter format: ?userId=value
      userId = event.queryStringParameters.userId;
      path = event.rawPath || '/';
      console.log("Using query parameter userId:", userId);
    } else if (event.pathParameters && event.pathParameters.userId) {
      // API Gateway format
      userId = event.pathParameters.userId;
      path = event.requestContext?.http?.path || event.rawPath;
      console.log("Using path parameter userId:", userId);
    } else if (event.rawPath && event.rawPath !== '/') {
      // Function URL format with path
      path = event.rawPath;
      const pathSegments = path.split('/').filter(Boolean);
      
      console.log("Path segments:", pathSegments);
      
      // Expected format: /users/{userId} or /users/{userId}/connections
      if (pathSegments.length >= 2 && pathSegments[0] === 'users') {
        userId = pathSegments[1];
        console.log("Using path segment userId:", userId);
      }
    }
    
    console.log("Extracted userId:", userId);
    console.log("Extracted path:", path);
    
    if (!userId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          message: "Missing path parameter 'userId'",
          debug: {
            rawPath: event.rawPath,
            pathParameters: event.pathParameters,
            pathSegments: event.rawPath ? event.rawPath.split('/').filter(Boolean) : null
          }
        })
      };
    }

    // Check if this is a connections request
    const isConnectionsRequest = path && path.includes('/connections');
    console.log("Is connections request:", isConnectionsRequest);

    if (isConnectionsRequest) {
      // Handle connections request
      return await handleConnectionsRequest(userId);
    } else {
      // Handle regular user data request
      return await handleUserRequest(userId);
    }
  } catch (err) {
    console.error("Error in user handler:", err);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        message: "Internal server error",
        error: err.message
      })
    };
  }
};

async function handleUserRequest(userId) {
  // Fetch the item from DynamoDB
  const { Item } = await ddb.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId }
  }));

  // If no item found, return 404
  if (!Item) {
    return {
      statusCode: 404,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: "User not found" })
    };
  }

  // Map subscriber_email to email for frontend compatibility
  const userResponse = {
    ...Item,
    email: Item.subscriber_email // Map subscriber_email to email
  };

  // Return the full metadata
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(userResponse)
  };
}

async function handleConnectionsRequest(userId) {
  try {
    console.log("Handling connections request for userId:", userId);
    
    // Get user data first to verify user exists
    const { Item: user } = await ddb.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));

    if (!user) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: "User not found" })
      };
    }

    console.log("User found, fetching connections...");

    // Use ConnectionsService to fetch real connected accounts from Pipedream
    const connectionsService = new ConnectionsService();
    const connectionsData = await connectionsService.getAllConnectedAccounts(userId);

    console.log("Connections data fetched successfully");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId,
        ...connectionsData
      })
    };
  } catch (err) {
    console.error("Error fetching user connections:", err);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        message: "Failed to fetch connections",
        error: err.message 
      })
    };
  }
}
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  UpdateCommand
} = require("@aws-sdk/lib-dynamodb");

// Initialize DocumentClient once
const ddbClient = new DynamoDBClient({});
const ddb       = DynamoDBDocumentClient.from(ddbClient);

const USERS_TABLE = process.env.USERS_TABLE; // e.g. "Users"

/**
 * Lambda handler to update a user record with:
 *   - connectedAccounts (primary use case)
 *   - displayName
 *   - timezone
 *   - lastLoginAt
 */
exports.handler = async (event) => {
  try {
    // parse incoming JSON
    const {
      userId,
      connectedAccounts = null,
      displayName = null,
      timezone = null,
      updateLastLogin = false
    } = JSON.parse(event.body || "{}");

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required field: userId" })
      };
    }

    // Build update expression dynamically
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (connectedAccounts) {
      updateExpressions.push('#ca = :ca');
      expressionAttributeNames['#ca'] = 'connectedAccounts';
      expressionAttributeValues[':ca'] = connectedAccounts;
    }

    if (displayName) {
      updateExpressions.push('displayName = :dn');
      expressionAttributeValues[':dn'] = displayName;
    }

    if (timezone) {
      updateExpressions.push('timezone = :tz');
      expressionAttributeValues[':tz'] = timezone;
    }

    if (updateLastLogin) {
      updateExpressions.push('lastLoginAt = :lla');
      expressionAttributeValues[':lla'] = new Date().toISOString();
    }

    if (updateExpressions.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "No fields to update provided" })
      };
    }

    const updateExpression = 'SET ' + updateExpressions.join(', ');

    // Update the user record
    const updateParams = {
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    if (Object.keys(expressionAttributeNames).length > 0) {
      updateParams.ExpressionAttributeNames = expressionAttributeNames;
    }

    const result = await ddb.send(new UpdateCommand(updateParams));

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: "User updated successfully",
        userId,
        updatedAttributes: result.Attributes
      })
    };
  } catch (err) {
    console.error("Error updating user:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to update user", error: err.message })
    };
  }
}; 
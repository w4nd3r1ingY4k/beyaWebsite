// queryContacts/index.js
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const REGION = process.env.AWS_REGION;
const TABLE  = process.env.CONTACTS_TABLE;
const ddb    = new DynamoDBClient({ region: REGION });
const ddbDoc = DynamoDBDocumentClient.from(ddb, {
  marshallOptions: { removeUndefinedValues: true }
});

export const handler = async (event) => {
  const q = event.queryStringParameters || {};
  let params;

  if (q.email) {
    params = {
      TableName: TABLE,
      IndexName: "ByEmail",
      KeyConditionExpression: "PRIMARY_EMAIL = :e",
      ExpressionAttributeValues: { ":e": q.email },
    };
  } else if (q.lastName) {
    params = {
      TableName: TABLE,
      IndexName: "ByLastName",
      KeyConditionExpression: "LAST_NAME = :l",
      ExpressionAttributeValues: { ":l": q.lastName },
    };
  } else {
    return { statusCode: 400, body: "Must specify ?email= or ?lastName=" };
  }

  const { Items } = await ddbDoc.send(new QueryCommand(params));
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contacts: Items }),
  };
};

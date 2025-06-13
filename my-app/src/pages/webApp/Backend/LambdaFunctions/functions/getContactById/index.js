// getContactById/index.js
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const REGION = process.env.AWS_REGION;
const TABLE  = process.env.CONTACTS_TABLE;
const ddb    = new DynamoDBClient({ region: REGION });
const ddbDoc = DynamoDBDocumentClient.from(ddb, {
  marshallOptions: { removeUndefinedValues: true }
});

export const handler = async (event) => {
  const id = event.pathParameters.id;
  if (!id) {
    return { statusCode: 400, body: "Missing contact ID" };
  }
  const { Item } = await ddbDoc.send(
    new GetCommand({ TableName: TABLE, Key: { GoldenContactID: id } })
  );
  if (!Item) {
    return { statusCode: 404, body: "Not found" };
  }
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Item),
  };
};

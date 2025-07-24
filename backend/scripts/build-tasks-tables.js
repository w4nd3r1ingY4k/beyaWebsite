import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";

const REGION = process.env.AWS_REGION || "us-east-1";
const client = new DynamoDBClient({ region: REGION });

async function createTable(params) {
  try {
    await client.send(new CreateTableCommand(params));
    console.log(`✅ Created table: ${params.TableName}`);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log(`ℹ️ Table already exists: ${params.TableName}`);
    } else {
      console.error(`❌ Error creating table ${params.TableName}:`, err.message);
    }
  }
}

async function main() {
  // Tasks table
  await createTable({
    TableName: "Tasks",
    AttributeDefinitions: [
      { AttributeName: "taskId", AttributeType: "S" },
      { AttributeName: "boardId", AttributeType: "S" }
    ],
    KeySchema: [
      { AttributeName: "taskId", KeyType: "HASH" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "BoardIndex",
        KeySchema: [
          { AttributeName: "boardId", KeyType: "HASH" }
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
      }
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
  });

  // Spaces table
  await createTable({
    TableName: "Spaces",
    AttributeDefinitions: [
      { AttributeName: "spaceId", AttributeType: "S" }
    ],
    KeySchema: [
      { AttributeName: "spaceId", KeyType: "HASH" }
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
  });

  // Boards table
  await createTable({
    TableName: "Boards",
    AttributeDefinitions: [
      { AttributeName: "boardId", AttributeType: "S" }
    ],
    KeySchema: [
      { AttributeName: "boardId", KeyType: "HASH" }
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
  });

  // TaskComments table
  await createTable({
    TableName: "TaskComments",
    AttributeDefinitions: [
      { AttributeName: "commentId", AttributeType: "S" },
      { AttributeName: "taskId", AttributeType: "S" }
    ],
    KeySchema: [
      { AttributeName: "commentId", KeyType: "HASH" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "TaskIndex",
        KeySchema: [
          { AttributeName: "taskId", KeyType: "HASH" }
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
      }
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
  });

  // SubTasks table
  await createTable({
    TableName: "SubTasks",
    AttributeDefinitions: [
      { AttributeName: "subTaskId", AttributeType: "S" },
      { AttributeName: "taskId", AttributeType: "S" }
    ],
    KeySchema: [
      { AttributeName: "subTaskId", KeyType: "HASH" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "TaskIndex",
        KeySchema: [
          { AttributeName: "taskId", KeyType: "HASH" }
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
      }
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
  });

  // Users table
  await createTable({
    TableName: "Users",
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" }
    ],
    KeySchema: [
      { AttributeName: "userId", KeyType: "HASH" }
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
  });
}

main(); 
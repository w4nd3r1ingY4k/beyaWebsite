# Beya Integration Sessions Table Schema

## Table Name: `beya-integration-sessions`

### Primary Key Structure
- **Partition Key**: `userId` (string) - User identifier
- **Sort Key**: `serviceType` (string) - Service type (gmail, whatsapp, slack, etc.)

### Core Attributes
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `userId` | String | User identifier | `"user123"` |
| `serviceType` | String | Integration service type | `"gmail"`, `"whatsapp"`, `"slack"` |
| `sessionId` | String | Composite identifier | `"user123#gmail"` |
| `webhookUrl` | String | Lambda Function URL for processing | `"https://...lambda-url.us-east-1.on.aws/"` |
| `isActive` | Boolean | Whether polling is active | `true`/`false` |
| `pollingIntervalMs` | Number | Polling frequency in milliseconds | `30000` |
| `createdAt` | String | ISO timestamp of creation | `"2024-01-15T10:30:00Z"` |
| `lastPollAt` | String | ISO timestamp of last poll | `"2024-01-15T10:35:00Z"` |
| `errorCount` | Number | Consecutive error count | `0`, `1`, `2`... |
| `serviceState` | Object | Service-specific state data | See below |

### Service-Specific State Examples

#### Gmail (`serviceType: "gmail"`)
```json
{
  "serviceState": {
    "lastHistoryId": "123456789",
    "emailAddress": "user@company.com"
  }
}
```

#### WhatsApp (`serviceType: "whatsapp"`)
```json
{
  "serviceState": {
    "lastMessageId": "wamid.ABC123",
    "phoneNumber": "+1234567890",
    "businessAccountId": "123456789012345"
  }
}
```

#### Slack (`serviceType: "slack"`)
```json
{
  "serviceState": {
    "lastEventTs": "1642249800.123456",
    "teamId": "T1234567",
    "channelIds": ["C1234567", "C7654321"]
  }
}
```

## DynamoDB Table Configuration

### Provisioned Throughput
- **Read Capacity**: 5 units (adjust based on user count)
- **Write Capacity**: 5 units (adjust based on polling frequency)

### Global Secondary Indexes

#### GSI-1: ServiceType-Index
- **Partition Key**: `serviceType`
- **Sort Key**: `lastPollAt`
- **Purpose**: Query all active sessions by service type
- **Use Case**: "Get all Gmail sessions" or "Get all WhatsApp sessions"

#### GSI-2: Active-Sessions-Index
- **Partition Key**: `isActive`
- **Sort Key**: `lastPollAt`
- **Purpose**: Query all active sessions across services
- **Use Case**: Health monitoring and status dashboards

### Example Queries

#### Get all active Gmail sessions
```javascript
const params = {
  TableName: 'beya-integration-sessions',
  IndexName: 'ServiceType-Index',
  KeyConditionExpression: 'serviceType = :serviceType',
  FilterExpression: 'isActive = :active',
  ExpressionAttributeValues: {
    ':serviceType': 'gmail',
    ':active': true
  }
};
```

#### Get specific user's Gmail session
```javascript
const params = {
  TableName: 'beya-integration-sessions',
  Key: {
    userId: 'user123',
    serviceType: 'gmail'
  }
};
```

#### Get all integrations for a user
```javascript
const params = {
  TableName: 'beya-integration-sessions',
  KeyConditionExpression: 'userId = :userId',
  ExpressionAttributeValues: {
    ':userId': 'user123'
  }
};
```

## Scalability Benefits

### Multi-Service Support
- ✅ Single table handles all integrations
- ✅ Consistent polling patterns across services
- ✅ Unified error handling and monitoring
- ✅ Shared configuration management

### Easy Service Addition
```javascript
// Adding a new service is just:
// 1. Add case in pollServiceForUser()
// 2. Implement service-specific polling logic
// 3. Define serviceState structure
// No table changes needed!
```

### Cost Efficiency
- ✅ Single table vs multiple tables = lower AWS costs
- ✅ Shared GSIs for cross-service queries
- ✅ Better resource utilization

### Operational Simplicity
- ✅ One table to monitor and backup
- ✅ Consistent access patterns
- ✅ Unified security policies
- ✅ Single point of truth for all integrations 
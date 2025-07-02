# Gmail Integration Setup Guide

## Overview
This guide documents the Gmail integration architecture for Beya, which uses a 4-phase process to connect Gmail accounts, poll for new emails, and process them through AI.

## Architecture Overview

### Phase 1: Connection & Activation
1. User connects Gmail through OAuth in the frontend (`IntegrationsPanel.tsx`)
2. Gmail Workflow Manager Lambda creates a user-specific Pipedream workflow
3. Fargate service starts polling Gmail for new messages

### Phase 2: Data Ingestion & Standardization
1. Fargate polls Gmail every 30 seconds
2. New emails are sent to Pipedream webhook
3. Pipedream workflow forwards to Email Receive Lambda
4. Lambda publishes standardized events to EventBridge

### Phase 3: Vectorization
1. Chunk & Embed Lambda processes email events
2. Creates vector embeddings
3. Stores in Pinecone for semantic search

### Phase 4: Insight Generation
1. User queries trigger semantic search
2. Context retrieved from Pinecone
3. AI generates responses based on email content

## Key Components

### Infrastructure
- **Fargate Service**: `http://3.234.215.178:2074` - Always-on polling engine
- **Gmail Workflow Manager Lambda**: `https://4it3sblmdni33lnj6no3ptsglu0yahsw.lambda-url.us-east-1.on.aws/`
- **DynamoDB Tables**:
  - `beya-integration-sessions`: Stores active polling sessions
  - `beya-gmail-workflows`: Tracks created Pipedream workflows
  - `beya-oauth-tokens`: Stores user OAuth credentials

### Important IDs
- **Organization ID**: `o_ZjIMD7a`
- **Project ID**: `proj_GzsqKG9`
- **Gmail Account ID**: `apn_GXhl8aX` (for akbar.shamjijr@gmail.com)
- **User ID**: `f41814b8-d0a1-7041-ef1f-e1e5c2dafc86`

## Pipedream Workflow Template

### Prerequisites
1. Create a Pipedream workflow with ID `p_template_gmail_receive`
2. Add an HTTP trigger
3. Add a code step with the following variables:
   - `{{userId}}` - Will be replaced with actual user ID
   - `{{gmailAccountId}}` - Will be replaced with Gmail account ID
   - `{{userEmail}}` - Will be replaced with user's email

### Template Structure
```javascript
export default defineComponent({
  async run({ steps, $ }) {
    const { userId, gmailAccountId, userEmail } = steps.trigger.event.body;
    
    // Forward to Email Receive Lambda
    const lambdaUrl = "https://22y6e3kow4ozzkerpbd6shyxoi0hbcxx.lambda-url.us-east-1.on.aws/";
    
    const response = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(steps.trigger.event.body)
    });
    
    return await response.json();
  }
});
```

## Testing

### Test Payload Format
Use this format when testing the Pipedream workflow:

**Headers:**
```
Content-Type: application/json
X-User-ID: f41814b8-d0a1-7041-ef1f-e1e5c2dafc86
X-Source: gmail-multi-service-polling
```

**Body:**
```json
{
  "userId": "f41814b8-d0a1-7041-ef1f-e1e5c2dafc86",
  "serviceType": "gmail",
  "gmailAccountId": "apn_GXhl8aX",
  "email": "akbar.shamjijr@gmail.com",
  "gmail_data": {
    "id": "197a7ea54ae76df2",
    "threadId": "197a7ea54ae76df2",
    "labelIds": ["INBOX", "UNREAD"],
    "snippet": "Test email content preview",
    "payload": {
      "headers": [
        {"name": "From", "value": "sender@example.com"},
        {"name": "To", "value": "akbar.shamjijr@gmail.com"},
        {"name": "Subject", "value": "Test Email"},
        {"name": "Date", "value": "Sat, 28 Jun 2025 10:30:00 -0700"},
        {"name": "Message-ID", "value": "<test123@mail.gmail.com>"}
      ]
    }
  }
}
```

## API Credentials

### Pipedream OAuth Client
- **Client ID**: `H2eBAsh0nY7_8k1wmVBcxn6hREkA1bWVPZL5mQ0EFug`
- **Client Secret**: `02U5Aam3BajR8rOUy_WMKVS4QosFL0zw07zp7oBeFIg`

### Getting Gmail Account IDs
To find a user's Gmail account ID:

```bash
# 1. Get OAuth token
curl -X POST https://api.pipedream.com/v1/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "H2eBAsh0nY7_8k1wmVBcxn6hREkA1bWVPZL5mQ0EFug",
    "client_secret": "02U5Aam3BajR8rOUy_WMKVS4QosFL0zw07zp7oBeFIg"
  }'

# 2. List Gmail accounts (use the access_token from step 1)
curl -X GET \
  -G \
  "https://api.pipedream.com/v1/connect/proj_GzsqKG9/accounts" \
  -H "Authorization: Bearer {access_token}" \
  -H "x-pd-environment: production" \
  -d "app=gmail" \
  -d "external_user_id=f41814b8-d0a1-7041-ef1f-e1e5c2dafc86" \
  -d "include_credentials=true"
```

## Deployment

### Deploy Gmail Workflow Manager Lambda
```bash
./scripts/deploy-gmail-workflow-manager.sh
```

### Check Polling Status
```bash
AWS_PAGER="" aws dynamodb scan \
  --table-name beya-integration-sessions \
  --region us-east-1 | jq '.'
```

## Troubleshooting

### Common Issues
1. **"No Gmail data found in trigger event"** - Ensure the payload includes the `gmail_data` field
2. **403 Forbidden on Lambda** - Recreate the Lambda function URL
3. **Empty workflows table** - Workflow creation step might be failing
4. **Unauthorized errors** - OAuth token expired or missing environment header

### Debug Commands
```bash
# Check if polling is active
curl http://3.234.215.178:2074/api/polling/status

# View Lambda logs
aws logs tail /aws/lambda/beya-gmail-workflow-manager --follow

# Check workflow creation
AWS_PAGER="" aws dynamodb scan \
  --table-name beya-gmail-workflows \
  --region us-east-1
```

## Notes
- Polling interval is 30 seconds (configurable in `pollingIntervalMs`)
- Max 5 consecutive errors before polling stops
- Gmail account IDs start with `apn_` prefix
- Always use `x-pd-environment: production` header for Connect API calls 
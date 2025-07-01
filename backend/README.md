# Beya Backend Server

This is the backend server for the Beya platform with Pipedream Connect integrations.

## 🚀 Quick Start

### 1. Environment Setup
Create a `.env` file in this directory with:

```bash
# Pipedream Connect Configuration
PIPEDREAM_CLIENT_ID=your_pipedream_client_id_here
PIPEDREAM_CLIENT_SECRET=your_pipedream_client_secret_here
PIPEDREAM_PROJECT_ID=your_pipedream_project_id_here
PIPEDREAM_PROJECT_ENVIRONMENT=production

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=2074
NODE_ENV=development
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Server
```bash
npm run dev
```

The server will start on `http://localhost:2074`

## 📋 Available Endpoints

### Workflow Engine
- `POST /workflow` - Execute MCP workflows
- `POST /debug/list-tools` - List available tools for an app
- `POST /debug/check-connection` - Check connected account status

### Shopify Connect
- `POST /shopify/connect` - Handle Shopify OAuth via Pipedream Connect

### Health Check
- `GET /health` - Server health status

## 🔗 Pipedream Connect Setup

### 1. Create Pipedream Project
- Go to [pipedream.com/projects](https://pipedream.com/projects)
- Create new project or open existing
- Copy your **Project ID** from Settings

### 2. Create OAuth Client
- Visit [API settings](https://pipedream.com/settings/api)
- Create new OAuth client
- Note **Client ID** and **Client Secret**

### 3. Configure Environment
- Add the credentials to your `.env` file
- Restart the server

## 🛍️ Shopify Integration Flow

### Frontend → Backend Flow:
1. User clicks "Connect" on Shopify in IntegrationsPanel
2. Frontend calls `POST /shopify/connect` with `userId` and `action: 'create_token'`
3. Backend generates Pipedream Connect token
4. Frontend opens Pipedream Connect modal
5. User authorizes Shopify account
6. Account is stored in Pipedream and available for workflows

### Code Example:
```javascript
// Frontend call
const response = await fetch('http://localhost:2074/shopify/connect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    userId: 'user123',
    action: 'create_token' 
  })
});

const { token } = await response.json();

// Use token with Pipedream Connect
const pd = createFrontendClient();
await pd.connectAccount({
  app: "shopify",
  token: token,
  onSuccess: (account) => console.log('Connected!', account),
  onError: (err) => console.error('Error:', err)
});
```

## 🔧 Development

### File Structure
```
Backend/
├── index.js           # Main Express server
├── connect.js         # Shopify Connect handlers  
├── shopify-connect.js # Shopify Connect service
├── package.json       # Dependencies
└── .env              # Environment variables
```

### Key Components
- **MCP Workflow Engine**: Executes multi-step workflows using Pipedream
- **Connect Integration**: Handles OAuth flows for external services
- **Debug Endpoints**: Tools for testing and debugging integrations

## 🔍 Debugging

### Check Connected Accounts
```bash
curl -X POST http://localhost:2074/debug/check-connection \
  -H "Content-Type: application/json" \
  -d '{"appSlug": "shopify", "externalUserId": "user123"}'
```

### List Available Tools
```bash
curl -X POST http://localhost:2074/debug/list-tools \
  -H "Content-Type: application/json" \
  -d '{"appSlug": "shopify", "externalUserId": "user123"}'
```

## 🚨 Troubleshooting

### Common Issues

1. **"Missing environment variables"**
   - Ensure all required variables are in `.env`
   - Check Pipedream project settings

2. **"Connect token creation failed"**
   - Verify Pipedream OAuth client credentials
   - Check project ID is correct

3. **"Shopify connection error"**
   - Ensure Shopify app is properly configured
   - Check OAuth scopes and permissions

### Logs
Server logs will show:
- ✅ Successful operations
- ⚠️ Warnings for missing data
- ❌ Errors with stack traces

## 📦 Dependencies

- **@pipedream/sdk**: Pipedream Connect integration
- **express**: Web server framework
- **openai**: AI workflow orchestration
- **cors**: Cross-origin request handling
- **dotenv**: Environment variable loading
- **square**: Square API integration 
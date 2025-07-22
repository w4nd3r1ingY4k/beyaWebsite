# Business Central Sandbox Server

Local testing server for Business Central API endpoints running on **port 3001**.

## 🚀 Quick Start

```bash
cd backend/sandbox
npm install
npm start
```

Server will start at: `http://localhost:3001`

## 📋 Available Endpoints

### Health Check
- `GET /health` - Server health status

### Business Central Data
- `GET /api/business-central/companies` - List all companies
- `GET /api/business-central/accounts` - Chart of accounts with balances
- `GET /api/business-central/customers` - Customer list with balances  
- `GET /api/business-central/vendors` - Vendor list with balances
- `GET /api/business-central/ledger-entries` - General ledger entries
- `GET /api/business-central/revenue` - Comprehensive revenue analysis
- `POST /api/business-central/token` - Get access token

### Testing
- `GET /api/business-central/test-all` - Test all endpoints at once

## 🧪 Testing Commands

```bash
# Health check
curl http://localhost:3001/health

# Test all Business Central endpoints
curl http://localhost:3001/api/business-central/test-all

# Get companies
curl http://localhost:3001/api/business-central/companies

# Get accounts
curl http://localhost:3001/api/business-central/accounts

# Get customers  
curl http://localhost:3001/api/business-central/customers
```

## ⚙️ Configuration

The server uses these Business Central credentials by default:
- **Tenant ID**: `67051142-4b70-4ae9-8992-01d17e991da9`
- **Client ID**: `29cda312-4374-4b29-aefd-406dd53060a3`
- **Company ID**: `2b5bb75b-b5d4-ef11-8eec-00224842ddca`

You can override via environment variables:
```bash
export BC_TENANT_ID="your-tenant-id"
export BC_CLIENT_ID="your-client-id" 
export BC_CLIENT_SECRET="your-client-secret"
export BC_COMPANY_ID="your-company-id"
```

## 🔗 Frontend Integration

To use this local server in your frontend, update your API configuration:

```typescript
// For local development, point to sandbox
const API_BASE = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3001'
  : 'https://your-production-api.com';
```

## 📊 Features

- **All Business Central endpoints** from your cheat sheet
- **Automatic token management** - handles authentication automatically
- **Error handling** with detailed error messages
- **CORS enabled** for frontend integration
- **Test endpoint** to validate all APIs at once
- **Formatted responses** matching your production API structure

## 🎯 Use Cases

- **Local development** - Test Business Central integration without deploying
- **API exploration** - Understand data structure and responses
- **Frontend testing** - Develop UI components with real BC data
- **Integration testing** - Validate API calls before production deployment 
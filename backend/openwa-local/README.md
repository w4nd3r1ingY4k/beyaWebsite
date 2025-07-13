# Beya OpenWA Local Service

A local WhatsApp Web integration service for Beya using OpenWA. This service runs locally on your machine and handles WhatsApp Web automation through the unofficial OpenWA library.

## ⚠️ Important Notes

- This service uses the **unofficial** OpenWA library, not the official WhatsApp Business API
- There's a risk of account suspension if WhatsApp detects automation
- Use at your own risk and consider using a separate WhatsApp account for testing

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend/openwa-local
npm install
```

### 2. Set up Environment Variables
Create a `.env` file in this directory:
```bash
PORT=3001
AWS_REGION=us-east-1
# Add your AWS credentials if not using default profile
```

### 3. Start the Service
```bash
npm start
```

Or for development with auto-restart:
```bash
npm run dev
```

## 📱 How It Works

1. **Start Session**: The service creates a WhatsApp Web session for a user
2. **QR Code**: A QR code is generated and displayed in the terminal
3. **Scan QR**: User scans the QR code with their WhatsApp mobile app
4. **Connection**: Once authenticated, the service listens for incoming messages
5. **Message Processing**: Incoming messages are automatically saved to DynamoDB
6. **Integration**: Messages appear in the Beya inbox alongside other channels

## 🔗 API Endpoints

### Start Session
```http
POST /start-session
Content-Type: application/json

{
  "userId": "user-id-here"
}
```

### Check Session Status
```http
GET /session-status/:userId
```

### Send Message
```http
POST /send-message
Content-Type: application/json

{
  "userId": "user-id-here",
  "phoneNumber": "1234567890",
  "message": "Hello from Beya!"
}
```

### Disconnect Session
```http
POST /disconnect/:userId
```

### Health Check
```http
GET /health
```

## 🔧 Configuration

The service can be configured through environment variables:

- `PORT`: Port to run the service on (default: 3001)
- `AWS_REGION`: AWS region for DynamoDB (default: us-east-1)
- `FLOWS_TABLE`: DynamoDB table for conversation flows (default: Flows)
- `MESSAGES_TABLE`: DynamoDB table for messages (default: Messages)

## 🗃️ Database Integration

The service integrates with your existing Beya database:

- **Messages Table**: Stores incoming WhatsApp messages with `IsUnread: true`
- **Flows Table**: Creates/updates conversation flows for each contact
- **Channel**: Messages are tagged with `Channel: 'whatsapp'`
- **Direction**: Incoming messages have `Direction: 'incoming'`

## 🎯 Frontend Integration

To integrate with the frontend, you'll need to:

1. Update the IntegrationsPanel to call the local OpenWA service
2. Add endpoints to your main backend to proxy requests to the local service
3. Handle QR code display in the frontend
4. Show connection status in the UI

## 🔒 Security Considerations

- This service runs locally and requires AWS credentials
- QR codes contain sensitive authentication data
- Sessions are stored in memory and lost on restart
- Consider implementing session persistence for production use

## 🐛 Troubleshooting

### Common Issues:

1. **Chrome not found**: Install Chrome browser
2. **Session timeout**: QR code expires after 60 seconds
3. **Connection failed**: Check your internet connection
4. **AWS errors**: Verify your AWS credentials and permissions

### Logs:
The service provides detailed console logs for debugging:
- 🚀 Session start
- 📱 QR code generation
- ✅ Connection success
- 📨 Message processing
- ❌ Error handling

## 🔄 Development vs Production

### Development (Current Setup):
- Runs locally on your machine
- Manual QR code scanning
- In-memory session storage
- Direct database access

### Production (Future):
- Deploy to separate cloud infrastructure
- Automated session management
- Persistent session storage
- Webhook integration
- Load balancing for multiple users

## 📝 Next Steps

1. Test the local service with your WhatsApp account
2. Integrate with the frontend IntegrationsPanel
3. Add error handling and retry logic
4. Implement session persistence
5. Plan production deployment strategy 
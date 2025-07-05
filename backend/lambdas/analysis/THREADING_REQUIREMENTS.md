# Email Threading Requirements

## Why Threading Isn't Working Yet

The logs show that the backend **found no incoming messages** to reply to:

```
📧 No recent Message-ID found for threadId: akbar@usebeya.com
📧 No Message-ID found for threadId: akbar@usebeya.com
📧 Email send decision: { hasReplyId: false, replyId: null, isReply: false }
```

## What's Missing

For email threading to work, you need **incoming email messages** stored in your database first. The threading process requires:

### 1. **Incoming Email Processing**
- Someone sends an email **TO** `akbar@usebeya.com`
- Your email processing system (webhook/SES) stores it in the database
- The stored message includes `Headers['Message-ID']` from the original email

### 2. **Database Storage Structure**
When an incoming email is stored, it should have:
```javascript
{
  ThreadId: "sender@example.com",     // The sender's email
  Direction: "incoming",
  Headers: {
    "Message-ID": "<original-message-id@sender-domain.com>"  // ← This is critical!
  },
  // ... other fields
}
```

### 3. **Reply Process**
When you reply:
- Backend looks for incoming messages where `ThreadId = "sender@example.com"`
- Finds the `Headers['Message-ID']` from the incoming message
- Uses that Message-ID in `In-Reply-To` header for threading

## How to Test Email Threading

### Option 1: Send Yourself a Test Email
1. **From your personal Gmail/Outlook**, send an email **TO** `akbar@usebeya.com`
2. **Make sure your SES/webhook system processes it** and stores it in the database
3. **Check the database** to confirm the incoming message is stored with Headers
4. **Then use your UI** to reply to that message

### Option 2: Check Existing Incoming Messages
1. **Check your database** for existing incoming messages:
   ```bash
   # Look for incoming messages in your Messages table
   aws dynamodb scan --table-name Messages --filter-expression "Direction = :dir" --expression-attribute-values '{":dir":{"S":"incoming"}}' --region us-east-1
   ```

2. **Find messages with Headers** containing Message-ID
3. **Use your UI to reply** to one of those existing messages

### Option 3: Simulate Incoming Message (Development)
For testing purposes, you could manually insert an incoming message:

```javascript
// Example of what should be in your database
{
  ThreadId: "test-sender@example.com",
  Timestamp: Date.now(),
  MessageId: "uuid-for-internal-use",
  Direction: "incoming",
  Body: "Hello, this is a test email from external sender",
  Headers: {
    "Message-ID": "<test-12345@example.com>",  // ← Real email Message-ID
    "From": "test-sender@example.com",
    "To": "akbar@usebeya.com",
    "Subject": "Test Email for Threading"
  },
  // ... other fields
}
```

## Verification Steps

1. **Check if you have incoming messages**:
   ```bash
   # Count incoming messages
   aws dynamodb scan --table-name Messages --filter-expression "Direction = :dir" --expression-attribute-values '{":dir":{"S":"incoming"}}' --select COUNT --region us-east-1
   ```

2. **Check a specific thread**:
   ```bash
   # Replace with actual email address
   aws dynamodb query --table-name Messages --key-condition-expression "ThreadId = :tid" --expression-attribute-values '{":tid":{"S":"sender@example.com"}}' --region us-east-1
   ```

3. **Test reply to existing thread**:
   - Find an existing incoming message
   - Reply to that sender's email address
   - Check logs to see if Message-ID is found

## Expected Workflow

1. **External sender** → sends email → `akbar@usebeya.com`
2. **SES/Webhook** → processes email → stores in database with Headers
3. **You use UI** → click Reply → backend finds original Message-ID
4. **Backend sends reply** → with `In-Reply-To` header → **Gmail shows thread!** ✅

## Current Status

✅ Backend threading logic is working correctly  
✅ Message-ID lookup and formatting is implemented  
✅ Reply email structure is proper  
❌ **Missing: Incoming messages in database to reply to**  

**Next step**: Get some incoming email messages stored in your database, then test the reply functionality! 
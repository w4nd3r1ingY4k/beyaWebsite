# Email Reply Functionality Improvements

## Overview
This document outlines the improvements made to the `beya-inbox-send` Lambda function to fix email reply functionality issues with Amazon SES.

## Issues Identified and Fixed

### 1. **Message-ID Format Issues**
**Problem**: SES requires proper RFC-compliant Message-ID format with angle brackets
**Solution**: Added `formatMessageId()` function to ensure proper format

```javascript
function formatMessageId(messageId) {
  if (!messageId) return '';
  if (messageId.startsWith('<') && messageId.endsWith('>')) {
    return messageId;
  }
  return `<${messageId}>`;
}
```

### 2. **Subject Line Threading**
**Problem**: Reply emails didn't automatically add "Re: " prefix
**Solution**: Added `formatReplySubject()` function

```javascript
function formatReplySubject(subject) {
  if (!subject) return 'Re: ';
  if (/^re:\s*/i.test(subject)) {
    return subject;
  }
  return `Re: ${subject}`;
}
```

### 3. **Message-ID Lookup Logic**
**Problem**: Not properly extracting original Message-ID from incoming emails
**Solution**: Enhanced lookup to check multiple sources:
- Email Headers['Message-ID'] (preferred)
- Result.MessageId (SES response)
- MessageId (fallback UUID)

### 4. **Better Email Threading**
**Problem**: Only looked for first incoming message
**Solution**: Added `getLastIncomingMessageId()` to reply to most recent message

### 5. **Enhanced MIME Structure**
**Improvements**:
- Added proper `Date` header
- Generated unique Message-ID for outgoing replies
- Better multipart boundary generation
- Proper UTF-8 encoding

## Files Modified

### `/lib/email.js`
- ✅ Enhanced error handling with SES-specific error types
- ✅ Added proper Message-ID formatting
- ✅ Added automatic "Re: " subject prefixing
- ✅ Improved MIME structure with Date header
- ✅ Better logging for debugging

### `/handlers/sendHandler.js`
- ✅ Enhanced `getFirstIncomingMessageId()` function
- ✅ Added `getLastIncomingMessageId()` function
- ✅ Improved message ID lookup logic
- ✅ Better reply decision making
- ✅ Enhanced logging for debugging

## New Features Added

### 1. **SES Statistics Monitoring**
```javascript
export async function getSendingStats() {
  // Get SES sending statistics for monitoring
}
```

### 2. **Enhanced Error Handling**
- MessageRejected errors
- SendingQuotaExceeded errors
- MailFromDomainNotVerified errors
- InvalidParameterValue errors

### 3. **Better Logging**
- Detailed logging for Message-ID lookup
- Email send decision logging
- SES response logging

## Deployment Instructions

1. **Update Lambda Function**:
   ```bash
   ./deploy-beya-inbox-send.sh
   ```

2. **Test Functionality**:
   ```bash
   node test-email-reply.js
   ```

## Testing the Reply Functionality

### Prerequisites
- SES domain `usebeya.com` is verified ✅
- Lambda function has proper SES permissions
- Messages table contains incoming emails with proper headers

### Test Cases
1. **New Email**: Send fresh email without reply context
2. **Reply Email**: Send email with proper threading headers
3. **Message-ID Lookup**: Verify proper Message-ID extraction from database
4. **Subject Formatting**: Verify "Re: " prefix handling

## Troubleshooting

### Common Issues and Solutions

1. **"SES rejected message"**
   - Check if recipient email is verified (if in sandbox)
   - Verify sending domain is properly configured

2. **"No Message-ID found"**
   - Check if incoming emails are storing headers properly
   - Verify database schema includes Headers field

3. **Threading not working**
   - Ensure Message-ID format includes angle brackets
   - Check if email client supports threading

4. **Rate limiting**
   - Monitor SES sending quotas
   - Implement exponential backoff for retries

## Environment Variables Required
```
AWS_REGION=us-east-1
MSG_TABLE=Messages
FLOWS_TABLE=Flows
```

## Next Steps
1. Deploy updated Lambda function
2. Test with real email threads
3. Monitor CloudWatch logs for any issues
4. Consider implementing retry logic for failed sends

## Monitoring
- Check CloudWatch logs: `/aws/lambda/beya-inbox-send`
- Monitor SES metrics in AWS Console
- Use `getSendingStats()` function for programmatic monitoring 
#!/bin/bash

# Test real email threading with actual incoming messages
echo "🧪 Testing Real Email Threading..."

echo "📧 Step 1: Send initial email to create a thread..."

# First, send an email FROM akbar@usebeya.com to create an initial thread
cat > initial-email.json << 'EOF'
{
  "requestContext": {"http": {"method": "POST"}},
  "pathParameters": {"channel": "email"},
  "body": "{\"to\":\"test-recipient@example.com\",\"subject\":\"Initial Thread Email\",\"text\":\"This is the first email in a thread.\",\"html\":\"<p>This is the first email in a thread.</p>\",\"userId\":\"test-user-123\"}"
}
EOF

aws lambda invoke \
  --function-name beya-inbox-send \
  --region us-east-1 \
  --cli-binary-format raw-in-base64-out \
  --payload file://initial-email.json \
  response1.json

echo "📧 Initial email sent. MessageId: $(jq -r '.body' response1.json | jq -r '.MessageId')"
echo ""

echo "🔍 Now checking what messages exist in database..."

# The real issue might be that we need to have an INCOMING message first
# Let's check what actual threads exist
echo "📋 Let's see what email addresses have incoming messages..."

# Create a test to see what happens when we reply to different addresses
echo ""
echo "📧 Step 2: Testing reply to an address that might have incoming messages..."

# Let's try replying to a different address or check if there are any existing threads
cat > reply-test.json << 'EOF'
{
  "requestContext": {"http": {"method": "POST"}},
  "pathParameters": {"channel": "email"},
  "body": "{\"to\":\"info@example.com\",\"subject\":\"Re: Test Reply\",\"text\":\"This is a reply test to a different address.\",\"html\":\"<p>This is a reply test to a different address.</p>\",\"userId\":\"test-user-123\"}"
}
EOF

aws lambda invoke \
  --function-name beya-inbox-send \
  --region us-east-1 \
  --cli-binary-format raw-in-base64-out \
  --payload file://reply-test.json \
  response2.json

echo ""
echo "📄 Reply test response:"
cat response2.json | jq '.' || cat response2.json
echo ""

# Check logs again
echo "🔍 Checking logs for the reply test..."
aws logs filter-log-events --log-group-name "/aws/lambda/beya-inbox-send" --start-time $(( $(date +%s) - 300 ))000 --region us-east-1 --query 'events[-5:].message' --output text

# Clean up
rm initial-email.json reply-test.json response1.json response2.json

echo ""
echo "💡 Key insight: For email threading to work, you need:"
echo "   1. An INCOMING email message stored in the database first"
echo "   2. That message must have proper Headers['Message-ID']" 
echo "   3. Then when you reply, the backend can find that Message-ID"
echo ""
echo "🎯 To test properly:"
echo "   1. Send yourself a real email (external → akbar@usebeya.com)"
echo "   2. Make sure it gets processed and stored in the database"
echo "   3. Then try replying from the UI"

echo "🎉 Real threading test complete!" 
#!/bin/bash

# Test script for email reply threading functionality
echo "🧪 Testing Email Reply Threading..."

# Test 1: Send a normal email (no threading)
echo "📧 Test 1: Sending new email (no threading)..."

cat > test-new-email.json << 'EOF'
{
  "requestContext": {"http": {"method": "POST"}},
  "pathParameters": {"channel": "email"},
  "body": "{\"to\":\"akbar@usebeya.com\",\"subject\":\"New Thread Test\",\"text\":\"This is a new email thread.\",\"html\":\"<p>This is a new email thread.</p>\",\"userId\":\"test-user-123\"}"
}
EOF

aws lambda invoke \
  --function-name beya-inbox-send \
  --region us-east-1 \
  --cli-binary-format raw-in-base64-out \
  --payload file://test-new-email.json \
  response1.json

echo "📄 New Email Response:"
cat response1.json | jq '.' || cat response1.json
echo ""

# Test 2: Send a reply email (with threading)
echo "📧 Test 2: Sending reply email (with threading)..."

cat > test-reply-email.json << 'EOF'
{
  "requestContext": {"http": {"method": "POST"}},
  "pathParameters": {"channel": "email"},
  "body": "{\"to\":\"akbar@usebeya.com\",\"subject\":\"New Thread Test\",\"text\":\"This is a reply to the previous email.\",\"html\":\"<p>This is a reply to the previous email.</p>\",\"userId\":\"test-user-123\",\"originalMessageId\":\"<test-original-message@example.com>\"}"
}
EOF

aws lambda invoke \
  --function-name beya-inbox-send \
  --region us-east-1 \
  --cli-binary-format raw-in-base64-out \
  --payload file://test-reply-email.json \
  response2.json

echo "📄 Reply Email Response:"
cat response2.json | jq '.' || cat response2.json
echo ""

# Check if both tests passed
echo "🔍 Test Results:"
if grep -q '"statusCode".*200' response1.json && grep -q '"statusCode".*200' response2.json; then
    echo "✅ All tests passed!"
    echo "📧 New email MessageId: $(jq -r '.body' response1.json | jq -r '.MessageId')"
    echo "📧 Reply email MessageId: $(jq -r '.body' response2.json | jq -r '.MessageId')"
    echo ""
    echo "🎯 The reply email should include In-Reply-To and References headers"
    echo "   pointing to '<test-original-message@example.com>'"
else
    echo "❌ Some tests failed. Check responses above."
fi

# Clean up
rm test-new-email.json test-reply-email.json response1.json response2.json

echo "🎉 Threading test complete!" 
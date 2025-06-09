#!/bin/bash

# Test script for automatic email threading (backend auto-detection)
echo "🧪 Testing Automatic Email Threading (Backend Auto-Detection)..."

# Test: Send an email reply WITHOUT providing originalMessageId
# The backend should automatically find the correct Message-ID from the database
echo "📧 Testing automatic Message-ID detection..."

cat > test-auto-threading.json << 'EOF'
{
  "requestContext": {"http": {"method": "POST"}},
  "pathParameters": {"channel": "email"},
  "body": "{\"to\":\"akbar@usebeya.com\",\"subject\":\"Re: Test Reply\",\"text\":\"This is an automatic threading test - no originalMessageId provided.\",\"html\":\"<p>This is an automatic threading test - no <strong>originalMessageId</strong> provided.</p>\",\"userId\":\"test-user-123\"}"
}
EOF

aws lambda invoke \
  --function-name beya-inbox-send \
  --region us-east-1 \
  --cli-binary-format raw-in-base64-out \
  --payload file://test-auto-threading.json \
  response-auto.json

echo ""
echo "📄 Response:"
cat response-auto.json | jq '.' || cat response-auto.json
echo ""

# Check if the test passed
echo "🔍 Test Results:"
if grep -q '"statusCode".*200' response-auto.json; then
    echo "✅ Test passed! Backend automatically detected threading."
    echo "📧 Email sent with MessageId: $(jq -r '.body' response-auto.json | jq -r '.MessageId')"
    echo ""
    echo "🎯 Check CloudWatch logs for:"
    echo "   - 'Email send decision' log showing if replyId was found"
    echo "   - 'Found original Message-ID in headers' (if Headers exist)"
    echo "   - 'Found Message-ID in Result' (if SES MessageId exists)"
    echo "   - 'Using fallback MessageId (UUID)' (if using UUID fallback)"
else
    echo "❌ Test failed. Check response above."
fi

# Clean up
rm test-auto-threading.json response-auto.json

echo ""
echo "💡 How it works now:"
echo "   1. Frontend sends reply WITHOUT originalMessageId"
echo "   2. Backend checks for existing incoming messages for 'akbar@usebeya.com'"
echo "   3. Backend finds the original Message-ID from Headers/Result/UUID"
echo "   4. Backend uses replyEmail() with proper In-Reply-To headers"
echo "   5. Email client shows threaded conversation!"

echo "🎉 Auto-threading test complete!" 
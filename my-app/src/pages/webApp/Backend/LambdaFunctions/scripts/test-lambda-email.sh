#!/bin/bash

# Test script for beya-inbox-send Lambda function
echo "🧪 Testing beya-inbox-send Lambda function..."

# Create test payload file
cat > test-payload.json << 'EOF'
{
  "requestContext": {
    "http": {
      "method": "POST"
    }
  },
  "pathParameters": {
    "channel": "email"
  },
  "body": "{\"to\":\"akbar@usebeya.com\",\"subject\":\"Test Email Reply Function\",\"text\":\"This is a test of the improved email reply functionality.\",\"html\":\"<p>This is a test of the improved email reply functionality.</p>\",\"userId\":\"test-user-123\"}"
}
EOF

echo "📧 Testing email send functionality..."

# Invoke the Lambda function
aws lambda invoke \
  --function-name beya-inbox-send \
  --region us-east-1 \
  --cli-binary-format raw-in-base64-out \
  --payload file://test-payload.json \
  response.json

echo ""
echo "📄 Lambda Response:"
cat response.json | jq '.' || cat response.json
echo ""

# Check if the response is successful
if grep -q '"statusCode".*200' response.json; then
    echo "✅ Test passed! Email functionality is working."
    echo "📧 Email sent successfully with MessageId: $(jq -r '.body' response.json | jq -r '.MessageId')"
else
    echo "❌ Test failed. Check the response above for errors."
fi

# Clean up
rm test-payload.json response.json

echo "🎉 Test complete!" 
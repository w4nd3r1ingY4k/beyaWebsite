#!/bin/bash

# Test script with CORRECTED payload format
echo "🧪 Testing beya-inbox-send with corrected payload format..."

# Create test payload that matches frontend format
cat > test-payload-fixed.json << 'EOF'
{
  "requestContext": {
    "http": {
      "method": "POST"
    }
  },
  "pathParameters": {
    "channel": "email"
  },
  "body": "{\"to\":\"akbar@usebeya.com\",\"subject\":\"Fixed Email Test\",\"text\":\"This is a test with the corrected payload format.\",\"html\":\"<p>This is a test with the <strong>corrected payload format</strong>.</p>\",\"userId\":\"test-user-123\"}"
}
EOF

echo "📧 Testing corrected email payload..."

# Invoke the Lambda function
aws lambda invoke \
  --function-name beya-inbox-send \
  --region us-east-1 \
  --cli-binary-format raw-in-base64-out \
  --payload file://test-payload-fixed.json \
  response-fixed.json

echo ""
echo "📄 Lambda Response:"
cat response-fixed.json | jq '.' || cat response-fixed.json
echo ""

# Check if the response is successful
if grep -q '"statusCode".*200' response-fixed.json; then
    echo "✅ Test passed! Fixed email functionality is working."
    echo "📧 Email sent successfully with MessageId: $(jq -r '.body' response-fixed.json | jq -r '.MessageId')"
else
    echo "❌ Test failed. Check the response above for errors."
fi

# Clean up
rm test-payload-fixed.json response-fixed.json

echo "🎉 Test complete!" 
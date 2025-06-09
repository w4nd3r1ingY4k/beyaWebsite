#!/bin/bash

# Debug script to check what Message-ID data is stored in the database
echo "🔍 Debugging Message-ID Storage in Database..."

# Create a test payload to trigger the message lookup logic
cat > debug-payload.json << 'EOF'
{
  "requestContext": {"http": {"method": "POST"}},
  "pathParameters": {"channel": "email"},
  "body": "{\"to\":\"akbar@usebeya.com\",\"subject\":\"Debug Test\",\"text\":\"This will trigger the message lookup debug logging.\",\"html\":\"<p>This will trigger the message lookup debug logging.</p>\",\"userId\":\"test-user-123\"}"
}
EOF

echo "📧 Invoking Lambda to trigger debug logging..."

aws lambda invoke \
  --function-name beya-inbox-send \
  --region us-east-1 \
  --cli-binary-format raw-in-base64-out \
  --payload file://debug-payload.json \
  response-debug.json

echo ""
echo "📄 Response:"
cat response-debug.json | jq '.' || cat response-debug.json
echo ""

echo "📋 Check the CloudWatch logs for debug output about Message-ID lookup:"
echo "   - Look for '📧 Found original Message-ID in headers:'"
echo "   - Look for '📧 Found Message-ID in Result:'"
echo "   - Look for '📧 Using fallback MessageId (UUID):'"
echo ""

# Check CloudWatch logs for the last few minutes
echo "🔍 Fetching recent CloudWatch logs..."
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/beya-inbox-send" --region us-east-1 --query 'logGroups[0].logGroupName' --output text | head -1 | xargs -I {} aws logs filter-log-events --log-group-name {} --start-time $(date -d '5 minutes ago' +%s)000 --region us-east-1 --query 'events[*].message' --output text | tail -20

# Clean up
rm debug-payload.json response-debug.json

echo "�� Debug complete!" 
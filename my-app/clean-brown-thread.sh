#!/bin/bash

echo "🧹 Cleaning Brown Email Thread for Fresh Threading Test"
echo "This removes old messages without Headers so we can test with new emails that have Headers"
echo ""

# Delete all messages from Brown email thread
echo "Deleting all messages from akbar_shamji@brown.edu thread..."

aws dynamodb scan --region us-east-1 \
  --table-name Messages \
  --filter-expression "ThreadId = :threadId" \
  --expression-attribute-values '{":threadId": {"S": "akbar_shamji@brown.edu"}}' \
  --query 'Items[].[ThreadId.S,Timestamp.N]' \
  --output text | while read threadId timestamp; do
    
    echo "Deleting message: ThreadId=$threadId, Timestamp=$timestamp"
    
    aws dynamodb delete-item --region us-east-1 \
      --table-name Messages \
      --key "{\"ThreadId\": {\"S\": \"$threadId\"}, \"Timestamp\": {\"N\": \"$timestamp\"}}"
done

echo ""
echo "✅ Brown email thread cleaned up!"
echo "📧 Now send a fresh email from akbar_shamji@brown.edu to akbar@usebeya.com"
echo "🎯 The new email will be stored with Headers for proper threading" 
#!/bin/bash

# Clean up the thread between akbar@usebeya.com and akbar_shamji@brown.edu
echo "🧹 Cleaning up thread between akbar@usebeya.com and akbar_shamji@brown.edu..."

# Get all messages in the thread
echo "📋 Getting all messages in the thread..."
aws dynamodb query \
  --table-name Messages \
  --key-condition-expression "ThreadId = :tid" \
  --expression-attribute-values '{":tid":{"S":"akbar_shamji@brown.edu"}}' \
  --region us-east-1 \
  --output json > thread_messages.json

# Count messages
MESSAGE_COUNT=$(jq '.Items | length' thread_messages.json)
echo "📊 Found $MESSAGE_COUNT messages in the thread"

if [ "$MESSAGE_COUNT" -gt 0 ]; then
    echo "🗑️  Deleting messages..."
    
    # Extract each message and delete it
    jq -r '.Items[] | [.ThreadId.S, .Timestamp.N] | @tsv' thread_messages.json | while IFS=$'\t' read -r threadId timestamp; do
        echo "   Deleting message: ThreadId=$threadId, Timestamp=$timestamp"
        aws dynamodb delete-item \
          --table-name Messages \
          --key '{
            "ThreadId": {"S": "'$threadId'"},
            "Timestamp": {"N": "'$timestamp'"}
          }' \
          --region us-east-1
    done
    
    echo "✅ Deleted $MESSAGE_COUNT messages"
else
    echo "ℹ️  No messages found to delete"
fi

# Clean up temp file
rm thread_messages.json

echo ""
echo "🎯 Thread cleaned! Now follow these steps to test threading:"
echo ""
echo "1. 📧 From your Brown email (akbar_shamji@brown.edu):"
echo "   Send an email TO: akbar@usebeya.com"
echo "   Subject: Test Threading"
echo "   Body: This is a test email to verify threading works"
echo ""
echo "2. ⏳ Wait for the email to be processed and stored in your database"
echo "   (Check your email processing webhook/SES setup)"
echo ""
echo "3. 🔍 Verify the incoming message was stored:"
echo "   aws dynamodb query --table-name Messages --key-condition-expression \"ThreadId = :tid\" --expression-attribute-values '{\\":tid\\\":{\\"S\\":\\"akbar_shamji@brown.edu\\"}}'  --region us-east-1"
echo ""
echo "4. 📱 Use your UI to reply to that message"
echo "   The backend should now find the original Message-ID for threading!"
echo ""
echo "5. 📧 Check your Brown email inbox - the reply should appear threaded!"

echo ""
echo "🎉 Clean-up complete! Ready for fresh threading test." 
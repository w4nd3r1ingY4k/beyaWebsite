#!/bin/bash

# Verify that incoming messages have proper Headers for email threading
echo "🔍 Verifying threading readiness for akbar_shamji@brown.edu thread..."

# Check for messages in the thread
aws dynamodb query \
  --table-name Messages \
  --key-condition-expression "ThreadId = :tid" \
  --expression-attribute-values '{":tid":{"S":"akbar_shamji@brown.edu"}}' \
  --region us-east-1 \
  --output json > current_messages.json

MESSAGE_COUNT=$(jq '.Items | length' current_messages.json)
echo "📊 Found $MESSAGE_COUNT messages in thread"

if [ "$MESSAGE_COUNT" -eq 0 ]; then
    echo "❌ No messages found. You need to:"
    echo "   1. Send an email FROM akbar_shamji@brown.edu TO akbar@usebeya.com"
    echo "   2. Wait for it to be processed by your email system"
    echo "   3. Run this script again to verify"
    exit 1
fi

echo ""
echo "📋 Message details:"
echo ""

# Check each message for threading readiness
INCOMING_COUNT=0
HAS_HEADERS=false

for i in $(seq 0 $((MESSAGE_COUNT - 1))); do
    DIRECTION=$(jq -r ".Items[$i].Direction.S" current_messages.json)
    TIMESTAMP=$(jq -r ".Items[$i].Timestamp.N" current_messages.json)
    MESSAGE_ID=$(jq -r ".Items[$i].MessageId.S" current_messages.json)
    SUBJECT=$(jq -r ".Items[$i].Subject.S // \"(no subject)\"" current_messages.json)
    
    echo "Message $((i+1)):"
    echo "  Direction: $DIRECTION"
    echo "  Subject: $SUBJECT"
    echo "  Internal MessageId: $MESSAGE_ID"
    echo "  Timestamp: $TIMESTAMP"
    
    # Check if message has Headers
    HEADERS_EXIST=$(jq -r ".Items[$i].Headers // empty" current_messages.json)
    if [ -n "$HEADERS_EXIST" ]; then
        echo "  ✅ Has Headers:"
        jq -r ".Items[$i].Headers.M" current_messages.json | jq 'to_entries[] | "    " + .key + ": " + .value.S'
        
        # Check specifically for Message-ID header
        EMAIL_MESSAGE_ID=$(jq -r ".Items[$i].Headers.M[\"Message-ID\"].S // empty" current_messages.json)
        if [ -n "$EMAIL_MESSAGE_ID" ]; then
            echo "  🎯 Email Message-ID: $EMAIL_MESSAGE_ID"
            HAS_HEADERS=true
        fi
    else
        echo "  ❌ No Headers found"
    fi
    
    if [ "$DIRECTION" = "incoming" ]; then
        INCOMING_COUNT=$((INCOMING_COUNT + 1))
    fi
    
    echo ""
done

echo "🔍 Threading Analysis:"
echo "  Incoming messages: $INCOMING_COUNT"
echo "  Has proper Headers: $HAS_HEADERS"

if [ "$INCOMING_COUNT" -gt 0 ] && [ "$HAS_HEADERS" = true ]; then
    echo ""
    echo "✅ Threading is ready!"
    echo "🎯 You can now reply from your UI and the backend will find the Message-ID for threading"
    echo ""
    echo "📧 Test the reply by:"
    echo "   1. Open your UI and navigate to the akbar_shamji@brown.edu thread"
    echo "   2. Click Reply and send a message"
    echo "   3. Check your Brown email - it should appear threaded!"
    
elif [ "$INCOMING_COUNT" -eq 0 ]; then
    echo ""
    echo "❌ No incoming messages found"
    echo "🎯 You need to send an email FROM akbar_shamji@brown.edu TO akbar@usebeya.com first"
    
elif [ "$HAS_HEADERS" = false ]; then
    echo ""
    echo "⚠️  Incoming messages found but no Headers with Message-ID"
    echo "🎯 Check your email processing system:"
    echo "   - Make sure SES is storing the original email Headers"
    echo "   - Verify your webhook/processing code includes Headers in database storage"
    
else
    echo ""
    echo "❓ Mixed results - check the details above"
fi

# Clean up
rm current_messages.json

echo ""
echo "🎉 Threading verification complete!" 
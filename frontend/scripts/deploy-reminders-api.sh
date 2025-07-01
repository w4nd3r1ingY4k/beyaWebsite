#!/bin/bash

# Deploy script for beya-reminders-api function
# This creates a complete reminders system with EventBridge scheduling and SES email sending

echo "🔔 Deploying Reminders API Function..."
echo "📅 This creates a scheduled reminders system with automatic email notifications"
echo ""

# Check if we're in the right directory
if [ ! -d "receive-functions/beya-reminders-api" ]; then
    echo "❌ Error: receive-functions/beya-reminders-api directory not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

cd receive-functions/beya-reminders-api

echo "📦 Installing dependencies..."
npm install

echo "📦 Creating deployment package..."

# Remove existing zip if it exists
rm -f beya-reminders-api.zip

# Create the deployment package
zip -r beya-reminders-api.zip . -x "*.git*" "*.DS_Store*" "node_modules/.cache/*"

echo ""
echo "🔍 Checking if Lambda function exists..."

# Check if function exists
FUNCTION_EXISTS=$(/opt/homebrew/bin/aws lambda get-function --function-name beya-reminders-api --region us-east-1 2>/dev/null)

if [ -z "$FUNCTION_EXISTS" ]; then
    echo "🏗️ Creating new Lambda function..."
    
    # Create the function
    /opt/homebrew/bin/aws lambda create-function \
        --function-name beya-reminders-api \
        --runtime nodejs18.x \
        --role arn:aws:iam::575108947335:role/lambda-execution-role \
        --handler handlers/remindersHandler.handler \
        --zip-file fileb://beya-reminders-api.zip \
        --timeout 30 \
        --memory-size 512 \
        --environment Variables='{
            "REMINDERS_TABLE":"beya-reminders",
            "REMINDER_SENDER_LAMBDA_ARN":"arn:aws:lambda:us-east-1:575108947335:function:beya-reminders-api"
        }' \
        --region us-east-1
    
    CREATE_RESULT=$?
else
    echo "🚀 Function exists, updating code..."
    
    # Update the function code
    /opt/homebrew/bin/aws lambda update-function-code \
        --function-name beya-reminders-api \
        --zip-file fileb://beya-reminders-api.zip \
        --region us-east-1
    
    CREATE_RESULT=$?
    
    if [ $CREATE_RESULT -eq 0 ]; then
        echo "⚙️ Updating function configuration..."
        
        # Update environment variables
        /opt/homebrew/bin/aws lambda update-function-configuration \
            --function-name beya-reminders-api \
            --timeout 30 \
            --memory-size 512 \
            --environment Variables='{
                "REMINDERS_TABLE":"beya-reminders",
                "REMINDER_SENDER_LAMBDA_ARN":"arn:aws:lambda:us-east-1:575108947335:function:beya-reminders-api"
            }' \
            --region us-east-1
    fi
fi

if [ $CREATE_RESULT -eq 0 ]; then
    echo ""
    echo "🌐 Creating Function URL (if it doesn't exist)..."
    
    # Create function URL for HTTP access
    /opt/homebrew/bin/aws lambda create-function-url-config \
        --function-name beya-reminders-api \
        --cors '{
            "AllowCredentials": false,
            "AllowHeaders": ["Content-Type"],
            "AllowMethods": ["*"],
            "AllowOrigins": ["*"],
            "ExposeHeaders": [],
            "MaxAge": 86400
        }' \
        --auth-type NONE \
        --region us-east-1 2>/dev/null

    echo ""
    echo "🔗 Getting Function URL..."
    FUNCTION_URL=$(/opt/homebrew/bin/aws lambda get-function-url-config --function-name beya-reminders-api --region us-east-1 --query FunctionUrl --output text 2>/dev/null)
    
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🎯 What was deployed:"
    echo "   - Reminders API Lambda function"
    echo "   - HTTP endpoints for creating/managing reminders"
    echo "   - EventBridge integration for scheduling"
    echo "   - SES integration for email notifications"
    echo ""
    if [ ! -z "$FUNCTION_URL" ]; then
        echo "🌐 Function URL: $FUNCTION_URL"
        echo ""
        echo "📝 Update your frontend to use this endpoint:"
        echo "   Replace: \${apiBase}/reminders"
        echo "   With: ${FUNCTION_URL}reminders"
        echo ""
    fi
    echo "📝 Next steps:"
    echo "   1. Create DynamoDB table 'beya-reminders' (if not exists)"
    echo "   2. Update IAM role with necessary permissions"
    echo "   3. Verify notifications@usebeya.com in SES"
    echo ""
    echo "🔗 API Endpoints:"
    echo "   POST ${FUNCTION_URL}reminders - Create new reminder"
    echo "   GET ${FUNCTION_URL}reminders/user/{userId} - Get user's reminders"  
    echo "   PUT ${FUNCTION_URL}reminders/{reminderId} - Update reminder status"
    echo ""
    echo "📊 Monitor CloudWatch logs: /aws/lambda/beya-reminders-api"
else
    echo ""
    echo "❌ Deployment failed!"
    echo "Check AWS credentials and permissions"
    echo "Make sure the IAM role 'lambda-execution-role' exists"
    exit 1
fi

# Clean up
rm beya-reminders-api.zip

cd ../..

echo ""
echo "🎉 Reminders API deployed successfully!" 
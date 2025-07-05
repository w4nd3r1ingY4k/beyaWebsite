#!/bin/bash

# Deploy Gmail Workflow Manager Lambda Function
echo "🚀 Deploying Gmail Workflow Manager Lambda Function..."

# Set working directory
FUNCTION_DIR="src/pages/webApp/Backend/LambdaFunctions/functions/beya-gmail-workflow-manager"
cd "$FUNCTION_DIR"

# Check if directory exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in $FUNCTION_DIR"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create deployment package
echo "📦 Creating deployment package..."
rm -f beya-gmail-workflow-manager.zip
zip -r beya-gmail-workflow-manager.zip . \
    -x "*.git*" "*.DS_Store*" "node_modules/.cache/*" "*.log"

# Deploy to AWS Lambda
echo "☁️ Deploying to AWS Lambda..."
AWS_PAGER="" aws lambda update-function-code \
    --function-name beya-gmail-workflow-manager \
    --zip-file fileb://beya-gmail-workflow-manager.zip \
    --region us-east-1

if [ $? -eq 0 ]; then
    echo "✅ Gmail Workflow Manager deployment successful!"
else
    echo "❌ Gmail Workflow Manager deployment failed!"
    exit 1
fi

# Set environment variables
echo "🔧 Setting environment variables..."
AWS_PAGER="" aws lambda update-function-configuration \
    --function-name beya-gmail-workflow-manager \
    --environment Variables='{
        "PIPEDREAM_CLIENT_ID":"'"${PIPEDREAM_CLIENT_ID}"'",
        "PIPEDREAM_CLIENT_SECRET":"'"${PIPEDREAM_CLIENT_SECRET}"'",
        "PIPEDREAM_PROJECT_ID":"'"${PIPEDREAM_PROJECT_ID}"'",
        "PIPEDREAM_PROJECT_ENVIRONMENT":"'"${PIPEDREAM_PROJECT_ENVIRONMENT}"'",
        "PIPEDREAM_API_TOKEN":"'"${PIPEDREAM_API_TOKEN}"'",
        "GMAIL_RECEIVE_WEBHOOK_URL":"'"${GMAIL_RECEIVE_WEBHOOK_URL:-https://22y6e3kow4ozzkerpbd6shyxoi0hbcxx.lambda-url.us-east-1.on.aws/}"'",
        "WORKFLOWS_TABLE":"'"${WORKFLOWS_TABLE:-beya-gmail-workflows}"'"
    }' \
    --region us-east-1

echo "🎉 Gmail Workflow Manager Lambda deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Create DynamoDB table: beya-gmail-workflows"
echo "2. Set up API Gateway endpoint for the function"
echo "3. Update GMAIL_WORKFLOW_LAMBDA_URL environment variable in your backend"
echo "4. Test workflow creation via the IntegrationsPanel" 
#!/bin/bash

# Deploy script for fixed beya-inbox-email-receive function
# This fix adds proper Headers storage for email threading

echo "🔧 Deploying Email Receiving Function Fix..."
echo "📧 This fix adds Headers storage with Message-ID for proper email threading"
echo ""

# Check if we're in the right directory
if [ ! -d "receive-functions/beya-inbox-email-receive" ]; then
    echo "❌ Error: receive-functions/beya-inbox-email-receive directory not found"
    echo "Please run this script from the LambdaFunctions directory"
    exit 1
fi

cd receive-functions/beya-inbox-email-receive

echo "📦 Creating deployment package..."

# Remove existing zip if it exists
rm -f beya-inbox-email-receive-fixed.zip

# Create the deployment package
zip -r beya-inbox-email-receive-fixed.zip . -x "*.git*" "*.DS_Store*" "node_modules/.cache/*"

echo ""
echo "🚀 Deploying to AWS Lambda..."

# Deploy the function
/opt/homebrew/bin/aws lambda update-function-code \
    --function-name beya-inbox-email-receive \
    --zip-file fileb://beya-inbox-email-receive-fixed.zip \
    --region us-east-1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🎯 What was fixed:"
    echo "   - Added Headers extraction from parsed email"
    echo "   - Store original Message-ID in Headers['message-id']"
    echo "   - Added logging for debugging headers"
    echo "   - Fixed both SES and HTTP POST paths"
    echo ""
    echo "📧 Email threading should now work!"
    echo "   The send function can now find Headers['Message-ID'] for proper threading"
    echo ""
    echo "🧪 Test the fix:"
    echo "   1. Send an email FROM external address TO akbar@usebeya.com"
    echo "   2. Check logs to see headers extraction"
    echo "   3. Use UI to reply - should now thread properly!"
    echo ""
    echo "📊 Monitor CloudWatch logs: /aws/lambda/beya-inbox-email-receive"
else
    echo ""
    echo "❌ Deployment failed!"
    echo "Check AWS credentials and function name"
    exit 1
fi

# Clean up
rm beya-inbox-email-receive-fixed.zip

cd ../..

echo ""
echo "🎉 Email receive function fix deployed successfully!" 
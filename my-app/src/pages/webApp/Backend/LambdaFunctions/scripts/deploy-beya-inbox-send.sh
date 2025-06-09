#!/bin/bash

# Deployment script for beya-inbox-send Lambda function
set -e

echo "🚀 Deploying beya-inbox-send Lambda function..."

# Change to the function directory
cd beya-inbox-send

# Create deployment package
echo "📦 Creating deployment package..."
zip -r ../beya-inbox-send-updated.zip . -x "*.git*" "*.DS_Store*" "node_modules/.cache/*"

# Go back to parent directory
cd ..

# Deploy to AWS Lambda
echo "☁️  Updating Lambda function code..."
aws lambda update-function-code \
  --function-name beya-inbox-send \
  --zip-file fileb://beya-inbox-send-updated.zip \
  --region us-east-1

# Wait for update to complete
echo "⏳ Waiting for function update to complete..."
aws lambda wait function-updated \
  --function-name beya-inbox-send \
  --region us-east-1

echo "✅ Lambda function updated successfully!"

# Optionally test the function
read -p "Do you want to test the function? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧪 Testing Lambda function..."
    aws lambda invoke \
      --function-name beya-inbox-send \
      --payload '{"requestContext":{"http":{"method":"POST"}},"pathParameters":{"channel":"email"},"body":"{\"to\":\"test@example.com\",\"subject\":\"Test\",\"text\":\"Test message\",\"userId\":\"test-user\"}"}' \
      --region us-east-1 \
      test-response.json
    
    echo "📄 Response:"
    cat test-response.json
    echo
fi

# Clean up
rm beya-inbox-send-updated.zip
if [ -f test-response.json ]; then
    rm test-response.json
fi

echo "🎉 Deployment complete!" 
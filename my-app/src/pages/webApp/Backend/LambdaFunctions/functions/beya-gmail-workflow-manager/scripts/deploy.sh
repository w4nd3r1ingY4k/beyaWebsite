#!/bin/bash
# Script to deploy the beya-gmail-workflow-manager Lambda function

set -e

LAMBDA_NAME="beya-gmail-workflow-manager"
REGION="us-east-1"
ZIP_FILE="beya-gmail-workflow-manager.zip"

echo "📦 Packaging Lambda function: $LAMBDA_NAME..."

# Navigate to the function's root directory
cd ../

# Clean up old zip file
rm -f $ZIP_FILE

# Install npm packages inside the function directory
echo "📦 Installing npm packages..."
npm install --only=production

# Create a zip archive of the function code and dependencies
echo "📦 Zipping artifacts..."
zip -r $ZIP_FILE . -x "scripts/*"

echo "⬆️ Uploading function code to AWS Lambda..."

# Update the Lambda function code
aws lambda update-function-code \
  --function-name $LAMBDA_NAME \
  --zip-file fileb://$ZIP_FILE \
  --region $REGION

echo "✅ Deployment complete for $LAMBDA_NAME."

# Navigate back to the scripts directory
cd scripts 
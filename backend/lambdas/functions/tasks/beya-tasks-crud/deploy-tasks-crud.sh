#!/bin/bash
# Deploy script for beya-tasks-crud function

FUNCTION_NAME="beya-tasks-crud"
echo "📋 Deploying Tasks CRUD Function..."

# Check if we're in the correct directory
if [ ! -f "package.json" ] || [ ! -d "handlers" ]; then
    echo "❌ Error: Must run from the beya-tasks-crud directory"
    echo "Current directory: $(pwd)"
    echo "Expected files: package.json, handlers/"
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "📦 Creating deployment package..."

# Remove existing zip if it exists
rm -f beya-tasks-crud.zip

# Create the deployment package
zip -r beya-tasks-crud.zip . -x "*.git*" "*.DS_Store*" "node_modules/.cache/*" "deploy-tasks-crud.sh"

# Check if function exists
echo "🔍 Checking if function exists..."
FUNCTION_EXISTS=$(aws lambda get-function --function-name $FUNCTION_NAME --region us-east-1 2>/dev/null)

if [ -z "$FUNCTION_EXISTS" ]; then
    echo "🆕 Creating new Lambda function..."
    
    # Create new function
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime nodejs20.x \
        --role arn:aws:iam::471112973702:role/beya-tasks-lambda-role \
        --handler handlers/tasksHandler.handler \
        --zip-file fileb://beya-tasks-crud.zip \
        --timeout 30 \
        --memory-size 512 \
        --region us-east-1 \
        --environment "Variables={TASKS_TABLE=Tasks,SPACES_TABLE=Spaces,BOARDS_TABLE=Boards,COMMENTS_TABLE=TaskComments,SUBTASKS_TABLE=SubTasks,USERS_TABLE=Users,EVENT_BUS_NAME=beya-platform-bus}" \

    if [ $? -eq 0 ]; then
        echo "✅ Function created successfully!"
        
        # Create function URL config for easy access
        echo "🔗 Creating function URL..."
        aws lambda create-function-url-config \
            --function-name $FUNCTION_NAME \
            --auth-type AWS_IAM \
            --region us-east-1
    else
        echo "❌ Failed to create function"
        exit 1
    fi
else
    echo "🔄 Updating existing function code..."
    
    # Update existing function
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://beya-tasks-crud.zip \
        --region us-east-1

    if [ $? -eq 0 ]; then
        echo "📝 Updating function configuration..."
        
        # Update environment variables
        aws lambda update-function-configuration \
            --function-name $FUNCTION_NAME \
            --timeout 30 \
            --memory-size 512 \
            --environment Variables='{"TASKS_TABLE":"Tasks","SPACES_TABLE":"Spaces","BOARDS_TABLE":"Boards","COMMENTS_TABLE":"TaskComments","SUBTASKS_TABLE":"SubTasks","USERS_TABLE":"Users","EVENT_BUS_NAME":"beya-platform-bus"}' \
            --region us-east-1
    else
        echo "❌ Failed to update function"
        exit 1
    fi
fi

# Get function URL
FUNCTION_URL=$(aws lambda get-function-url-config --function-name $FUNCTION_NAME --region us-east-1 --query FunctionUrl --output text 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🎯 What was deployed:"
    echo "   Function Name: $FUNCTION_NAME"
    echo "   Runtime: nodejs20.x"
    echo "   Handler: handlers/tasksHandler.handler"
    echo "   Timeout: 30 seconds"
    echo "   Memory: 512 MB"
    echo "   Function URL: $FUNCTION_URL"
    echo ""
    echo "📋 Available Operations:"
    echo "   • createSpace, createBoard, createTask"
    echo "   • getTasksByBoard, getTask, updateTask, deleteTask"
    echo "   • createComment, getCommentsByTask"
    echo "   • createSubTask, getSubTasksByTask"
    echo "   • followTask, unfollowTask"
    echo ""
    echo "🔗 Environment Variables:"
    echo "   • TASKS_TABLE: Tasks"
    echo "   • SPACES_TABLE: Spaces"
    echo "   • BOARDS_TABLE: Boards"
    echo "   • COMMENTS_TABLE: TaskComments"
    echo "   • SUBTASKS_TABLE: SubTasks"
    echo "   • USERS_TABLE: Users"
    echo "   • EVENT_BUS_NAME: beya-platform-bus"
    echo ""
    echo "📊 Monitor CloudWatch logs: /aws/lambda/$FUNCTION_NAME"
else
    echo "❌ Deployment failed!"
    exit 1
fi

# === API Gateway Setup ===

API_NAME="beya-tasks-crud-api"
REGION="us-east-1"
STAGE_NAME="prod"
ROUTE_METHOD="POST"

# List of operations/routes
OPERATIONS=(
  createSpace
  createBoard
  createTask
  getTasksByBoard
  getTask
  updateTask
  createComment
  getCommentsByTask
  createSubTask
  getSubTasksByTask
  followTask
  unfollowTask
  deleteTask
)

# 1. Create the API
API_ID=$(aws apigatewayv2 create-api \
  --name "$API_NAME" \
  --protocol-type HTTP \
  --region $REGION \
  --query 'ApiId' --output text)

if [ -z "$API_ID" ]; then
  echo "❌ Failed to create API Gateway API"
  exit 1
fi

echo "✅ API created with ID: $API_ID"

# 2. Create Lambda integration
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
INTEGRATION_ID=$(aws apigatewayv2 create-integration \
  --api-id $API_ID \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME \
  --payload-format-version 2.0 \
  --region $REGION \
  --query 'IntegrationId' --output text)

echo "✅ Integration created with ID: $INTEGRATION_ID"

# 3. Create routes for each operation
for OP in "${OPERATIONS[@]}"; do
  aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key "$ROUTE_METHOD /$OP" \
    --target "integrations/$INTEGRATION_ID" \
    --region $REGION
  echo "✅ Route $ROUTE_METHOD /$OP created"
done

# 4. Add Lambda invoke permission for API Gateway
aws lambda add-permission \
  --function-name $FUNCTION_NAME \
  --statement-id "apigateway-invoke-$(date +%s)" \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/$ROUTE_METHOD/*" \
  --region $REGION

echo "✅ Lambda invoke permission added"

# 5. Create and deploy stage
aws apigatewayv2 create-stage \
  --api-id $API_ID \
  --stage-name $STAGE_NAME \
  --auto-deploy \
  --region $REGION

echo "✅ Stage '$STAGE_NAME' created and deployed"

# 6. Output the API endpoint
API_ENDPOINT=$(aws apigatewayv2 get-api \
  --api-id $API_ID \
  --region $REGION \
  --query 'ApiEndpoint' --output text)

echo ""
echo "🎉 Your Lambda is now accessible at:"
for OP in "${OPERATIONS[@]}"; do
  echo "$API_ENDPOINT/$STAGE_NAME/$OP"
done

echo ""
echo "Test an endpoint with:"
echo "curl -X POST $API_ENDPOINT/$STAGE_NAME/createTask -d '{\"operation\":\"createTask\", ...}'"

# Clean up
echo "🧹 Cleaning up..."
rm beya-tasks-crud.zip

echo ""
echo "🎉 Tasks CRUD function deployed successfully!"
echo "📘 Test the function using the AWS Console or API Gateway" 
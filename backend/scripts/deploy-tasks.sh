#!/bin/bash

# Deploy Tasks System to AWS Lambda
# This script packages and deploys the tasks-related Lambda functions

set -e

echo "🚀 Deploying Beya Tasks System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGION=${AWS_REGION:-us-east-1}
STACK_NAME="beya-tasks-system"
BUCKET_NAME=${S3_BUCKET:-beya-lambda-deployments}

# Function configurations
FUNCTIONS=(
  "beya-tasks-crud:backend/lambdas/functions/tasks/beya-tasks-crud"
  "beya-sla-service:backend/lambdas/functions/tasks/beya-sla-service"
)

# Create S3 bucket if it doesn't exist
echo -e "${YELLOW}📦 Setting up S3 bucket...${NC}"
aws s3 mb s3://$BUCKET_NAME --region $REGION 2>/dev/null || echo "Bucket already exists"

# Deploy each function
for function_config in "${FUNCTIONS[@]}"; do
  IFS=':' read -r function_name function_path <<< "$function_config"
  
  echo -e "${YELLOW}📦 Packaging $function_name...${NC}"
  
  # Create temporary directory for packaging
  temp_dir=$(mktemp -d)
  cp -r "$function_path"/* "$temp_dir/"
  
  # Install dependencies
  cd "$temp_dir"
  npm install --production
  
  # Create ZIP file
  zip_file="${function_name}.zip"
  zip -r "$zip_file" . -x "*.git*" "node_modules/.cache/*"
  
  # Upload to S3
  echo -e "${YELLOW}📤 Uploading $function_name to S3...${NC}"
  aws s3 cp "$zip_file" "s3://$BUCKET_NAME/$zip_file"
  
  # Get S3 URL
  s3_url="s3://$BUCKET_NAME/$zip_file"
  
  # Create or update Lambda function
  echo -e "${YELLOW}🔧 Creating/updating Lambda function: $function_name${NC}"
  
  # Check if function exists
  if aws lambda get-function --function-name "$function_name" --region $REGION >/dev/null 2>&1; then
    echo -e "${YELLOW}📝 Updating existing function...${NC}"
    aws lambda update-function-code \
      --function-name "$function_name" \
      --s3-bucket "$BUCKET_NAME" \
      --s3-key "$zip_file" \
      --region $REGION
  else
    echo -e "${YELLOW}🆕 Creating new function...${NC}"
    
    # Get execution role ARN (you may need to adjust this)
    ROLE_ARN=$(aws iam get-role --role-name lambda-execution-role --query 'Role.Arn' --output text 2>/dev/null || echo "")
    
    if [ -z "$ROLE_ARN" ]; then
      echo -e "${RED}❌ Lambda execution role not found. Please create a role with Lambda execution permissions.${NC}"
      exit 1
    fi
    
    aws lambda create-function \
      --function-name "$function_name" \
      --runtime nodejs18.x \
      --role "$ROLE_ARN" \
      --handler "handlers/${function_name#beya-}Handler.handler" \
      --code S3Bucket="$BUCKET_NAME",S3Key="$zip_file" \
      --timeout 30 \
      --memory-size 512 \
      --region $REGION
  fi
  
  # Set environment variables
  echo -e "${YELLOW}⚙️ Setting environment variables...${NC}"
  aws lambda update-function-configuration \
    --function-name "$function_name" \
    --environment Variables="{
      AWS_REGION=$REGION,
      TASKS_TABLE=Tasks,
      SPACES_TABLE=Spaces,
      BOARDS_TABLE=Boards,
      COMMENTS_TABLE=TaskComments,
      SUBTASKS_TABLE=SubTasks,
      SLA_POLICIES_TABLE=SLAPolicies,
      SLA_TIMERS_TABLE=SLATimers,
      USERS_TABLE=Users,
      EVENT_BUS_NAME=beya-platform-bus
    }" \
    --region $REGION
  
  # Clean up
  cd - >/dev/null
  rm -rf "$temp_dir"
  
  echo -e "${GREEN}✅ $function_name deployed successfully!${NC}"
done

# Create DynamoDB tables if they don't exist
echo -e "${YELLOW}🗄️ Setting up DynamoDB tables...${NC}"

TABLES=(
  "Tasks:taskId"
  "Spaces:spaceId"
  "Boards:boardId"
  "TaskComments:commentId"
  "SubTasks:subTaskId"
  "SLAPolicies:id"
  "SLATimers:timerId"
)

for table_config in "${TABLES[@]}"; do
  IFS=':' read -r table_name partition_key <<< "$table_config"
  
  # Check if table exists
  if ! aws dynamodb describe-table --table-name "$table_name" --region $REGION >/dev/null 2>&1; then
    echo -e "${YELLOW}🆕 Creating table: $table_name${NC}"
    
    aws dynamodb create-table \
      --table-name "$table_name" \
      --attribute-definitions AttributeName="$partition_key",AttributeType=S \
      --key-schema AttributeName="$partition_key",KeyType=HASH \
      --billing-mode PAY_PER_REQUEST \
      --region $REGION
    
    # Wait for table to be active
    aws dynamodb wait table-exists --table-name "$table_name" --region $REGION
    echo -e "${GREEN}✅ Table $table_name created successfully!${NC}"
  else
    echo -e "${GREEN}✅ Table $table_name already exists${NC}"
  fi
done

# Create GSI for Tasks table (BoardIndex)
echo -e "${YELLOW}🔍 Setting up Global Secondary Indexes...${NC}"

# Add BoardIndex to Tasks table
aws dynamodb update-table \
  --table-name Tasks \
  --attribute-definitions AttributeName=boardId,AttributeType=S \
  --global-secondary-index-updates "[{
    \"Create\": {
      \"IndexName\": \"BoardIndex\",
      \"KeySchema\": [{\"AttributeName\": \"boardId\", \"KeyType\": \"HASH\"}],
      \"Projection\": {\"ProjectionType\": \"ALL\"}
    }
  }]" \
  --region $REGION 2>/dev/null || echo "BoardIndex already exists or table doesn't exist"

# Add TaskIndex to TaskComments table
aws dynamodb update-table \
  --table-name TaskComments \
  --attribute-definitions AttributeName=taskId,AttributeType=S \
  --global-secondary-index-updates "[{
    \"Create\": {
      \"IndexName\": \"TaskIndex\",
      \"KeySchema\": [{\"AttributeName\": \"taskId\", \"KeyType\": \"HASH\"}],
      \"Projection\": {\"ProjectionType\": \"ALL\"}
    }
  }]" \
  --region $REGION 2>/dev/null || echo "TaskIndex already exists or table doesn't exist"

# Add TaskIndex to SubTasks table
aws dynamodb update-table \
  --table-name SubTasks \
  --attribute-definitions AttributeName=taskId,AttributeType=S \
  --global-secondary-index-updates "[{
    \"Create\": {
      \"IndexName\": \"TaskIndex\",
      \"KeySchema\": [{\"AttributeName\": \"taskId\", \"KeyType\": \"HASH\"}],
      \"Projection\": {\"ProjectionType\": \"ALL\"}
    }
  }]" \
  --region $REGION 2>/dev/null || echo "TaskIndex already exists or table doesn't exist"

# Add TaskIndex to SLATimers table
aws dynamodb update-table \
  --table-name SLATimers \
  --attribute-definitions AttributeName=taskId,AttributeType=S \
  --global-secondary-index-updates "[{
    \"Create\": {
      \"IndexName\": \"TaskIndex\",
      \"KeySchema\": [{\"AttributeName\": \"taskId\", \"KeyType\": \"HASH\"}],
      \"Projection\": {\"ProjectionType\": \"ALL\"}
    }
  }]" \
  --region $REGION 2>/dev/null || echo "TaskIndex already exists or table doesn't exist"

# Add OwnerIndex to Spaces table
aws dynamodb update-table \
  --table-name Spaces \
  --attribute-definitions AttributeName=ownerId,AttributeType=S \
  --global-secondary-index-updates "[{
    \"Create\": {
      \"IndexName\": \"OwnerIndex\",
      \"KeySchema\": [{\"AttributeName\": \"ownerId\", \"KeyType\": \"HASH\"}],
      \"Projection\": {\"ProjectionType\": \"ALL\"}
    }
  }]" \
  --region $REGION 2>/dev/null || echo "OwnerIndex already exists or table doesn't exist"

echo -e "${GREEN}🎉 Tasks system deployment completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Update your environment variables:"
echo "   - TASKS_LAMBDA_URL=<your-lambda-url>"
echo "   - SLA_LAMBDA_URL=<your-sla-lambda-url>"
echo ""
echo "2. Test the API endpoints:"
echo "   - POST /api/v1/tasks/spaces"
echo "   - POST /api/v1/tasks/boards"
echo "   - POST /api/v1/tasks"
echo "   - GET /api/v1/tasks/board/:boardId"
echo ""
echo "3. Set up EventBridge rules for SLA monitoring"
echo ""
echo -e "${GREEN}✨ Your tasks system is ready to use!${NC}" 
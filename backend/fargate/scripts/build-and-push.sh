#!/bin/bash

# Beya Fargate Docker Build and Push Script
set -e

# Configuration
AWS_REGION="us-east-1"
ECR_REPOSITORY="beya-polling-service"
AWS_ACCOUNT_ID="575108947335"
IMAGE_TAG="latest"

echo "🔨 Building and pushing Beya Fargate Docker image..."

# Get the full ECR repository URI
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"

# Navigate to the Fargate source directory
cd ../

echo "📦 Building Docker image..."
# Build for linux/amd64 platform (Fargate requirement)
docker buildx build --platform linux/amd64 -t ${ECR_REPOSITORY}:${IMAGE_TAG} .

echo "🏷️ Tagging image for ECR..."
docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${ECR_URI}:${IMAGE_TAG}

echo "🔐 Logging into ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_URI}

echo "⬆️ Pushing image to ECR..."
docker push ${ECR_URI}:${IMAGE_TAG}

echo "✅ Image pushed successfully!"
echo "📍 Image URI: ${ECR_URI}:${IMAGE_TAG}"

cd scripts/ 
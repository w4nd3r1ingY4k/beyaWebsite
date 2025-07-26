# Beya AI Service Dockerfile
FROM node:18-alpine

# Install curl for debugging (health checks managed by ECS)
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=2075

# Expose port
EXPOSE 2075

# Health checks are managed by ECS task definition
# Removed Docker HEALTHCHECK to avoid conflicts with ECS health checks

# Start the application
CMD ["node", "index.js"] 
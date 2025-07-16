# Beya AI Service Dockerfile
FROM node:18-alpine

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

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:2075/health || exit 1

# Start the application
CMD ["node", "index.js"] 
# Beya Polling Service Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY src/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=2074

# Expose port
EXPOSE 2074

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:2074/health || exit 1

# Start the application
CMD ["node", "index.js"] 
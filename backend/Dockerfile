# syntax=docker/dockerfile:1

# Build stage
FROM node:18-alpine AS base

# Install system dependencies for native modules
RUN apk add --no-cache \
    gdal \
    gdal-dev \
    python3 \
    make \
    g++ \
    libc6-compat

WORKDIR /app

# Dependencies stage
FROM base AS dependencies

# Copy package files
COPY package*.json ./

# Install dependencies using the lockfile for deterministic production builds
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Install only runtime dependencies
RUN apk add --no-cache \
    gdal \
    libc6-compat \
    dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies from dependencies stage
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create necessary directories with proper permissions
RUN mkdir -p uploads/kmz uploads/shapefiles uploads/thumbnails temp && \
    chown -R nodejs:nodejs uploads temp && \
    chmod -R 755 uploads temp

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application
CMD ["node", "server.js"]

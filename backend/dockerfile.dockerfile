FROM node:18-alpine

WORKDIR /app

# Install system dependencies for shapefile and KMZ processing
RUN apk add --no-cache \
    gdal \
    gdal-dev \
    python3 \
    make \
    g++ \
    libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads/kmz uploads/shapefiles uploads/thumbnails temp

# Set permissions
RUN chmod -R 755 uploads temp

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start application
CMD ["npm", "start"]
# Parcel Map Application - Docker Setup

## Overview

This is a containerized Parcel Map Viewer application with the following components:
- **Frontend**: React application with OpenLayers for map visualization
- **Backend**: Node.js/Express API server
- **PostGIS**: PostgreSQL database with spatial extensions
- **GeoServer**: Geographic data server

## Architecture

\\\
┌─────────────┐
│   Frontend  │ :3000 (React + Nginx)
└──────┬──────┘
       │
┌──────▼──────┐
│   Backend   │ :3001 (Node.js/Express)
└──────┬──────┘
       │
   ┌───┴────────────┐
   │                │
┌──▼──────┐  ┌─────▼─────┐
│ PostGIS │  │ GeoServer │
└─────────┘  └───────────┘
\\\

## Prerequisites

- Docker Desktop (includes Docker and Docker Compose)
- At least 4GB RAM available for Docker
- Ports available: 3000, 3001, 5432, 8080

## Quick Start

### Production Mode

1. **Clone and navigate to the project:**
   \\\powershell
   cd C:\parcel-map-app
   \\\

2. **Configure environment variables:**
   Review and update the \.env\ file with your settings.

3. **Build and start services:**
   \\\powershell
   docker-compose up -d --build
   \\\

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001/api
   - GeoServer: http://localhost:8080/geoserver
   - PostgreSQL: localhost:5432

### Development Mode

For development with hot-reload:

\\\powershell
docker-compose -f docker-compose.dev.yml up --build
\\\

## Docker Commands

### Basic Operations

\\\powershell
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend

# Rebuild and start
docker-compose up -d --build

# Restart a specific service
docker-compose restart backend
\\\

### Service Management

\\\powershell
# Check service status
docker-compose ps

# Execute command in a container
docker-compose exec backend npm run dev

# Access container shell
docker-compose exec backend sh

# View resource usage
docker stats
\\\

### Data Management

\\\powershell
# Backup PostgreSQL database
docker-compose exec postgis pg_dump -U parcel_user parcel_db > backup.sql

# Restore database
docker-compose exec -T postgis psql -U parcel_user parcel_db < backup.sql

# List volumes
docker volume ls

# Remove all volumes (WARNING: deletes all data)
docker-compose down -v
\\\

### Cleanup

\\\powershell
# Stop and remove containers
docker-compose down

# Remove containers, networks, and volumes
docker-compose down -v

# Remove unused Docker resources
docker system prune -a
\\\

## Docker Best Practices Implemented

### 1. Multi-Stage Builds
- Frontend and backend use multi-stage builds to minimize image size
- Build dependencies are not included in final images

### 2. Security
- Non-root users for all services
- Minimal base images (Alpine Linux)
- Security headers in Nginx
- No sensitive data in images
- Read-only volumes where applicable

### 3. Performance
- Layer caching optimization
- Minimal image sizes
- Resource limits defined
- Health checks for all services

### 4. Reliability
- Health checks for automatic recovery
- Proper signal handling with dumb-init
- Graceful shutdown support
- Dependency management with conditions

### 5. Development Experience
- Separate dev and prod configurations
- Hot-reload in development mode
- Volume mounts for live code updates
- Easy debugging access

## Service Details

### Frontend (React + Nginx)

**Production Image Size:** ~50MB  
**Build time:** ~2-3 minutes

Features:
- Multi-stage build (build + production)
- Optimized Nginx configuration
- Gzip compression enabled
- Security headers
- API proxy to backend
- Static asset caching

### Backend (Node.js)

**Production Image Size:** ~300MB  
**Build time:** ~3-5 minutes

Features:
- Alpine-based image
- Native module support (GDAL)
- Non-root user
- Health check endpoint
- Volume mounts for uploads

### PostGIS

**Image:** Official postgis/postgis:15-3.3  
**Storage:** Persistent volume

Features:
- PostgreSQL 15 with PostGIS 3.3
- Spatial data support
- Automatic schema initialization
- Health checks

### GeoServer

**Image:** kartoza/geoserver:2.23.1  
**Storage:** Persistent volume

Features:
- GeoServer 2.23
- PostGIS integration
- Custom data directory
- Web interface

## Environment Variables

Key environment variables in \.env\:

\\\env
# Database
DB_HOST=postgis
DB_PORT=5432
DB_NAME=parcel_db
DB_USER=parcel_user
DB_PASSWORD=parcel_password

# GeoServer
GEOSERVER_URL=http://geoserver:8080/geoserver
GEOSERVER_USER=admin
GEOSERVER_PASSWORD=geoserver

# Application
UPLOAD_MAX_SIZE=100MB
APP_ENV=production
\\\

## Troubleshooting

### Services won't start

\\\powershell
# Check logs
docker-compose logs

# Check if ports are available
netstat -ano | findstr "3000 3001 5432 8080"
\\\

### Database connection issues

\\\powershell
# Check PostGIS health
docker-compose exec postgis pg_isready -U parcel_user

# Connect to database
docker-compose exec postgis psql -U parcel_user -d parcel_db
\\\

### Frontend not loading

\\\powershell
# Check nginx logs
docker-compose logs frontend

# Verify build completed
docker-compose exec frontend ls -la /usr/share/nginx/html
\\\

### Clear everything and start fresh

\\\powershell
docker-compose down -v
docker system prune -a
docker-compose up -d --build
\\\

## Resource Requirements

Minimum recommended:
- **CPU:** 2 cores
- **RAM:** 4GB
- **Disk:** 10GB free space

Production recommended:
- **CPU:** 4+ cores
- **RAM:** 8GB+
- **Disk:** 50GB+ SSD

## Performance Tuning

### Increase PostgreSQL performance

Edit \docker-compose.yml\ and add to postgis service:

\\\yaml
command: 
  - postgres
  - -c
  - shared_buffers=256MB
  - -c
  - max_connections=200
\\\

### Increase GeoServer memory

Edit \docker-compose.yml\ geoserver environment:

\\\yaml
INITIAL_MEMORY: 2G
MAXIMUM_MEMORY: 4G
\\\

## Security Considerations

1. **Change default passwords** in \.env\
2. **Use secrets** for production (Docker secrets or environment variables)
3. **Enable HTTPS** with a reverse proxy (Traefik, Nginx)
4. **Limit exposed ports** in production
5. **Regular updates** of base images
6. **Scan images** for vulnerabilities:

\\\powershell
docker scan parcel-backend
\\\

## Monitoring

### View container metrics

\\\powershell
docker stats
\\\

### Check health status

\\\powershell
docker-compose ps
\\\

### View application logs

\\\powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100
\\\

## CI/CD Integration

Example GitHub Actions workflow:

\\\yaml
name: Docker Build and Push

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build images
        run: docker-compose build
      
      - name: Run tests
        run: docker-compose up -d && docker-compose exec -T backend npm test
\\\

## Support

For issues or questions:
1. Check the logs: \docker-compose logs\
2. Review this documentation
3. Check Docker Desktop status
4. Verify system resources

## License

[Your License Here]

---

**Built with Docker Best Practices** 🐳
- Multi-stage builds
- Security hardening
- Health checks
- Resource limits
- Non-root users
- Minimal images

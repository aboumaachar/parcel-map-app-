# Docker Setup Checklist ✓

## Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] Copy .env.example to .env (if not exists)
- [ ] Update DB_PASSWORD in .env
- [ ] Update GEOSERVER_PASSWORD in .env
- [ ] Update SESSION_SECRET in .env
- [ ] Review UPLOAD_MAX_SIZE setting
- [ ] Set APP_ENV to 'production'

### 2. Security Review
- [ ] Changed all default passwords
- [ ] Reviewed exposed ports
- [ ] Verified non-root users in Dockerfiles
- [ ] Checked security headers in nginx.conf
- [ ] Reviewed .dockerignore files
- [ ] No secrets committed to repository

### 3. Docker Configuration
- [ ] Docker Desktop installed and running
- [ ] Sufficient disk space (10GB+ free)
- [ ] Sufficient RAM allocated (4GB+ to Docker)
- [ ] Ports available: 3000, 3001, 5432, 8080

### 4. Testing
- [ ] Run: docker-compose config (validate syntax)
- [ ] Run: docker-compose up -d --build
- [ ] Check: docker-compose ps (all services healthy)
- [ ] Test: http://localhost:3000 (frontend loads)
- [ ] Test: http://localhost:3001/api/health (backend responds)
- [ ] Test: http://localhost:8080/geoserver (GeoServer loads)
- [ ] Check logs: docker-compose logs

### 5. Backup Strategy
- [ ] Database backup script tested
- [ ] Volume backup strategy defined
- [ ] Restore procedure documented
- [ ] Backup schedule configured

### 6. Monitoring
- [ ] Health checks verified working
- [ ] Log aggregation configured (if needed)
- [ ] Resource monitoring set up
- [ ] Alert system configured (if production)

## Development Checklist

### First Time Setup
- [ ] Clone repository
- [ ] Copy .env.example to .env
- [ ] Start with: docker-compose -f docker-compose.dev.yml up
- [ ] Wait for all services to be healthy
- [ ] Access frontend at http://localhost:3000
- [ ] Verify hot-reload works

### Daily Development
- [ ] Start services: docker-compose -f docker-compose.dev.yml up
- [ ] Check logs if issues: docker-compose logs -f
- [ ] Stop when done: Ctrl+C or docker-compose down

## Production Deployment Checklist

### Before Deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Secrets management configured
- [ ] SSL/TLS certificates ready
- [ ] Reverse proxy configured (if needed)
- [ ] Firewall rules configured
- [ ] Backup system ready

### During Deployment
- [ ] Build images: docker-compose build
- [ ] Tag images appropriately
- [ ] Push to registry (if using)
- [ ] Pull on production server
- [ ] Run: docker-compose up -d
- [ ] Verify all services healthy
- [ ] Test all endpoints
- [ ] Monitor logs for errors

### After Deployment
- [ ] Verify application accessible
- [ ] Test critical functionality
- [ ] Check resource usage
- [ ] Set up monitoring alerts
- [ ] Document deployment
- [ ] Create rollback plan

## Maintenance Checklist

### Weekly
- [ ] Check disk space usage
- [ ] Review container logs
- [ ] Verify backups working
- [ ] Check for security updates

### Monthly
- [ ] Update base images
- [ ] Review resource usage
- [ ] Test backup restoration
- [ ] Review and rotate logs
- [ ] Security scan images

### Quarterly
- [ ] Major version updates
- [ ] Performance review
- [ ] Disaster recovery test
- [ ] Documentation review

## Troubleshooting Checklist

### Service Won't Start
- [ ] Check Docker Desktop running
- [ ] Verify port not in use: netstat -ano | findstr "PORT"
- [ ] Check logs: docker-compose logs SERVICE_NAME
- [ ] Verify environment variables set
- [ ] Check disk space available

### Container Keeps Restarting
- [ ] Check health check endpoint
- [ ] Review container logs
- [ ] Verify dependencies started
- [ ] Check resource limits
- [ ] Test database connectivity

### Performance Issues
- [ ] Check resource usage: docker stats
- [ ] Review logs for errors
- [ ] Verify database queries optimized
- [ ] Check network latency
- [ ] Review caching configuration

### Data Issues
- [ ] Verify volumes mounted correctly
- [ ] Check permissions on volume directories
- [ ] Verify database initialized
- [ ] Test backup/restore
- [ ] Check disk space

## Quick Reference Commands

### Start/Stop
\\\powershell
# Production
docker-compose up -d

# Development  
docker-compose -f docker-compose.dev.yml up

# Stop
docker-compose down
\\\

### Monitoring
\\\powershell
# Status
docker-compose ps

# Logs
docker-compose logs -f

# Resources
docker stats
\\\

### Maintenance
\\\powershell
# Rebuild
docker-compose up -d --build

# Restart service
docker-compose restart backend

# Clean up
docker-compose down -v
\\\

### Debugging
\\\powershell
# Shell access
docker-compose exec backend sh

# Database access
docker-compose exec postgis psql -U parcel_user -d parcel_db

# View specific logs
docker-compose logs --tail=100 backend
\\\

## Support Resources

- Project Documentation: DOCKER_README.md
- Setup Summary: DOCKER_SETUP_SUMMARY.md
- Quick Start: docker-start.bat
- Environment Template: .env.example

---

**Note:** Check items off as you complete them. Keep this checklist for reference during deployment and maintenance activities.

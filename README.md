# Parcel Map Application

[![CI](https://github.com/aboumaachar/parcel-map-app/actions/workflows/ci.yml/badge.svg)](https://github.com/aboumaachar/parcel-map-app/actions/workflows/ci.yml)

A comprehensive parcel map viewing and management system with KMZ/KML and Shapefile support.

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running
- 4GB+ RAM allocated to Docker
- 10GB+ free disk space

### Start the Application

**Windows (Easy):**
\\\powershell
.\docker-start.bat
# Or
.\docker-manage.ps1 start
\\\

**Using Docker Compose:**
\\\powershell
# Production
docker-compose up -d

# Development (with hot-reload)
docker-compose -f docker-compose.dev.yml up
\\\

### Access the Application
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/api
- **GeoServer:** http://localhost:8080/geoserver
- **PostgreSQL:** localhost:5432

## 📁 Project Structure

\\\
parcel-map-app/
├── backend/              # Node.js/Express API
│   ├── Dockerfile        # Optimized backend container
│   ├── .dockerignore     # Build optimization
│   ├── server.js         # Main application
│   └── package.json      # Dependencies
├── frontend/             # React application
│   ├── Dockerfile        # Multi-stage frontend build
│   ├── .dockerignore     # Build optimization
│   ├── nginx.conf        # Nginx configuration
│   └── package.json      # Dependencies
├── database/             # PostgreSQL initialization
│   └── init.sql          # Database schema
├── docker-compose.yml    # Production configuration
├── docker-compose.dev.yml # Development configuration
├── .env                  # Environment variables
└── .env.example          # Environment template
\\\

## 🐳 Docker Architecture

### Services
1. **PostGIS** - PostgreSQL 15 + PostGIS 3.3
2. **GeoServer** - Geographic data server
3. **Backend** - Node.js API with GDAL support
4. **Frontend** - React app served by Nginx

### Features
✅ Multi-stage builds for optimal image sizes  
✅ Non-root users for security  
✅ Health checks for auto-recovery  
✅ Resource limits configured  
✅ Development and production modes  
✅ Persistent volumes for data  

## 📚 Documentation

- **[DOCKER_README.md](DOCKER_README.md)** - Comprehensive Docker guide
- **[DOCKER_SETUP_SUMMARY.md](DOCKER_SETUP_SUMMARY.md)** - Setup overview
- **[DOCKER_CHECKLIST.md](DOCKER_CHECKLIST.md)** - Deployment checklist
- **[.env.example](.env.example)** - Environment configuration

## 🛠️ Management Tools

### PowerShell Script (Recommended)
\\\powershell
.\docker-manage.ps1 start      # Start production
.\docker-manage.ps1 dev        # Start development
.\docker-manage.ps1 stop       # Stop services
.\docker-manage.ps1 logs       # View logs
.\docker-manage.ps1 status     # Check status
.\docker-manage.ps1 build      # Rebuild images
.\docker-manage.ps1 clean      # Clean everything
.\docker-manage.ps1 backup     # Backup database
\\\

### Batch Script
\\\cmd
docker-start.bat
\\\

### Makefile (if you have make)
\\\ash
make help      # Show all commands
make up        # Start production
make dev       # Start development
make logs      # View logs
make clean     # Clean everything
\\\

## 🔧 Common Commands

\\\powershell
# View service status
docker-compose ps

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart backend

# Execute commands
docker-compose exec backend sh

# Database access
docker-compose exec postgis psql -U parcel_user -d parcel_db

# Resource usage
docker stats
\\\

## 🔒 Security

### Before Production Deployment:
1. Update passwords in .env:
   - DB_PASSWORD
   - GEOSERVER_PASSWORD
   - SESSION_SECRET

2. Configure SSL/TLS with reverse proxy
3. Review and limit exposed ports
4. Enable firewall rules
5. Regular security updates

## 🧪 Testing

\\\powershell
# Run backend tests
docker-compose exec backend npm test

# Check health
curl http://localhost:3001/api/health

# Validate configuration
docker-compose config
\\\

## 📊 Monitoring

\\\powershell
# Container stats
docker stats

# Service health
docker-compose ps

# Detailed logs
docker-compose logs --tail=100 backend
\\\

## 🔄 Backup & Restore

### Backup Database
\\\powershell
.\docker-manage.ps1 backup
# Or
docker-compose exec postgis pg_dump -U parcel_user parcel_db > backup.sql
\\\

### Restore Database
\\\powershell
docker-compose exec -T postgis psql -U parcel_user parcel_db < backup.sql
\\\

## 🐛 Troubleshooting

### Services won't start
\\\powershell
# Check Docker is running
docker info

# Check ports
netstat -ano | findstr "3000 3001 5432 8080"

# View logs
docker-compose logs

# Clean and rebuild
docker-compose down -v
docker-compose up -d --build
\\\

### Database connection issues
\\\powershell
# Check PostGIS health
docker-compose exec postgis pg_isready -U parcel_user

# Connect to database
docker-compose exec postgis psql -U parcel_user -d parcel_db
\\\

## 🚀 Deployment

### Development
\\\powershell
docker-compose -f docker-compose.dev.yml up
\\\

### Production
\\\powershell
docker-compose up -d --build
\\\

### Staging/Testing
\\\powershell
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
\\\

## 📦 Image Sizes

- Frontend: ~50MB (Nginx + React)
- Backend: ~300MB (Node.js + GDAL)
- PostGIS: ~300MB
- GeoServer: ~600MB
- **Total:** ~1.25GB

## 🎯 Key Features

### Backend
- Express API server
- KMZ/KML file processing
- Shapefile support
- GDAL integration
- PostgreSQL/PostGIS connectivity
- File upload handling

### Frontend
- React 18
- OpenLayers for maps
- Bootstrap UI
- Real-time updates
- File upload interface

### Database
- PostgreSQL 15
- PostGIS 3.3
- Spatial queries
- Automatic initialization

### GeoServer
- WMS/WFS services
- Map styling
- Data publishing
- Web interface

## 📝 Environment Variables

Key variables in .env:

\\\env
# Database
DB_HOST=postgis
DB_NAME=parcel_db
DB_USER=parcel_user
DB_PASSWORD=your_password

# GeoServer
GEOSERVER_URL=http://geoserver:8080/geoserver
GEOSERVER_PASSWORD=your_password

# Application
UPLOAD_MAX_SIZE=100MB
APP_ENV=production
\\\

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker
5. Submit a pull request

## 📄 License

[Your License Here]

## 📞 Support

- Documentation: See DOCKER_README.md
- Issues: Check logs with docker-compose logs
- Help: Run .\docker-manage.ps1 help

---

**Built with Docker Best Practices** 🐳

Multi-stage builds • Security hardening • Health checks • Resource optimization • Non-root users • Minimal images

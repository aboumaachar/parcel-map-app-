# Navigate to project root
cd ~/parcel-map-app

# Build and start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs (optional)
docker-compose logs -f

# If you need to stop
docker-compose stop

# To completely remove everything
docker-compose down -v
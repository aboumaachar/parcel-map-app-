.PHONY: help build up down restart logs clean dev prod test backup

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

build: ## Build all Docker images
	docker-compose build

up: ## Start all services in production mode
	docker-compose up -d

down: ## Stop all services
	docker-compose down

restart: ## Restart all services
	docker-compose restart

logs: ## View logs from all services
	docker-compose logs -f

logs-backend: ## View backend logs
	docker-compose logs -f backend

logs-frontend: ## View frontend logs
	docker-compose logs -f frontend

clean: ## Remove all containers, networks, and volumes
	docker-compose down -v
	docker system prune -f

dev: ## Start services in development mode
	docker-compose -f docker-compose.dev.yml up --build

prod: ## Start services in production mode with build
	docker-compose up -d --build

ps: ## Show status of all services
	docker-compose ps

test: ## Run tests
	docker-compose exec backend npm test

backup: ## Backup PostgreSQL database
	docker-compose exec postgis pg_dump -U parcel_user parcel_db > backup_$(shell date +%Y%m%d_%H%M%S).sql

restore: ## Restore PostgreSQL database (use FILE=backup.sql)
	docker-compose exec -T postgis psql -U parcel_user parcel_db < $(FILE)

shell-backend: ## Open shell in backend container
	docker-compose exec backend sh

shell-db: ## Open PostgreSQL shell
	docker-compose exec postgis psql -U parcel_user -d parcel_db

stats: ## Show container resource usage
	docker stats

health: ## Check health of all services
	docker-compose ps
	@echo ""
	@echo "Backend Health:"
	@curl -f http://localhost:3001/api/health || echo "Backend not responding"
	@echo ""
	@echo "Frontend Health:"
	@curl -f http://localhost:3000 > /dev/null && echo "Frontend OK" || echo "Frontend not responding"

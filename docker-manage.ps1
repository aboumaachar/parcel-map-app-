# Parcel Map Application - Docker Management Script
# PowerShell version

param(
    [Parameter(Position=0)]
    [ValidateSet('start', 'stop', 'restart', 'logs', 'status', 'build', 'clean', 'dev', 'test', 'backup', 'help')]
    [string]$Command = 'help'
)

$ErrorActionPreference = "Stop"

function Write-Header {
    Write-Host "
========================================" -ForegroundColor Cyan
    Write-Host "Parcel Map Application - Docker Manager" -ForegroundColor Cyan
    Write-Host "========================================
" -ForegroundColor Cyan
}

function Test-DockerRunning {
    try {
        docker info | Out-Null
        return $true
    } catch {
        Write-Host "[ERROR] Docker is not running!" -ForegroundColor Red
        Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
        return $false
    }
}

function Show-Help {
    Write-Host "Usage: .\docker-manage.ps1 [command]
" -ForegroundColor White
    Write-Host "Available commands:" -ForegroundColor Green
    Write-Host "  start      Start application in production mode" -ForegroundColor White
    Write-Host "  dev        Start application in development mode" -ForegroundColor White
    Write-Host "  stop       Stop all services" -ForegroundColor White
    Write-Host "  restart    Restart all services" -ForegroundColor White
    Write-Host "  logs       View logs from all services" -ForegroundColor White
    Write-Host "  status     Check status of all services" -ForegroundColor White
    Write-Host "  build      Rebuild all images" -ForegroundColor White
    Write-Host "  clean      Remove all containers, networks, and volumes" -ForegroundColor White
    Write-Host "  test       Run tests" -ForegroundColor White
    Write-Host "  backup     Backup PostgreSQL database" -ForegroundColor White
    Write-Host "  help       Show this help message
" -ForegroundColor White
    
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\docker-manage.ps1 start" -ForegroundColor Gray
    Write-Host "  .\docker-manage.ps1 dev" -ForegroundColor Gray
    Write-Host "  .\docker-manage.ps1 logs
" -ForegroundColor Gray
}

function Start-Production {
    Write-Host "
[INFO] Starting application in PRODUCTION mode..." -ForegroundColor Blue
    docker-compose up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "
[SUCCESS] Application started successfully!" -ForegroundColor Green
        Write-Host "
Access points:" -ForegroundColor Cyan
        Write-Host "  - Frontend:    http://localhost:3000" -ForegroundColor White
        Write-Host "  - Backend API: http://localhost:3001/api" -ForegroundColor White
        Write-Host "  - GeoServer:   http://localhost:8080/geoserver" -ForegroundColor White
        Write-Host "  - PostgreSQL:  localhost:5432
" -ForegroundColor White
    } else {
        Write-Host "
[ERROR] Failed to start application!" -ForegroundColor Red
        Write-Host "Check logs with: .\docker-manage.ps1 logs
" -ForegroundColor Yellow
    }
}

function Start-Development {
    Write-Host "
[INFO] Starting application in DEVELOPMENT mode..." -ForegroundColor Blue
    Write-Host "[INFO] Press Ctrl+C to stop
" -ForegroundColor Yellow
    docker-compose -f docker-compose.dev.yml up --build
}

function Stop-Application {
    Write-Host "
[INFO] Stopping application..." -ForegroundColor Blue
    docker-compose down
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "
[SUCCESS] Application stopped successfully!
" -ForegroundColor Green
    } else {
        Write-Host "
[ERROR] Failed to stop application!
" -ForegroundColor Red
    }
}

function Restart-Application {
    Write-Host "
[INFO] Restarting application..." -ForegroundColor Blue
    docker-compose restart
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "
[SUCCESS] Application restarted successfully!
" -ForegroundColor Green
    } else {
        Write-Host "
[ERROR] Failed to restart application!
" -ForegroundColor Red
    }
}

function Show-Logs {
    Write-Host "
[INFO] Viewing logs (Press Ctrl+C to exit)..." -ForegroundColor Blue
    docker-compose logs -f
}

function Show-Status {
    Write-Host "
[INFO] Checking application status...
" -ForegroundColor Blue
    docker-compose ps
    Write-Host ""
}

function Build-Images {
    Write-Host "
[INFO] Building all images..." -ForegroundColor Blue
    docker-compose build --no-cache
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "
[SUCCESS] Images built successfully!
" -ForegroundColor Green
    } else {
        Write-Host "
[ERROR] Failed to build images!
" -ForegroundColor Red
    }
}

function Clean-Application {
    Write-Host "
[WARNING] This will remove all containers, networks, and volumes!" -ForegroundColor Yellow
    $confirmation = Read-Host "Are you sure? (yes/no)"
    
    if ($confirmation -eq 'yes') {
        Write-Host "
[INFO] Cleaning up..." -ForegroundColor Blue
        docker-compose down -v
        docker system prune -f
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "
[SUCCESS] Cleanup complete!
" -ForegroundColor Green
        } else {
            Write-Host "
[ERROR] Cleanup failed!
" -ForegroundColor Red
        }
    } else {
        Write-Host "
[INFO] Cancelled.
" -ForegroundColor Yellow
    }
}

function Run-Tests {
    Write-Host "
[INFO] Running tests..." -ForegroundColor Blue
    docker-compose exec -T backend npm test
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "
[SUCCESS] Tests passed!
" -ForegroundColor Green
    } else {
        Write-Host "
[ERROR] Tests failed!
" -ForegroundColor Red
    }
}

function Backup-Database {
    Write-Host "
[INFO] Backing up PostgreSQL database..." -ForegroundColor Blue
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "backup_$timestamp.sql"
    
    docker-compose exec -T postgis pg_dump -U parcel_user parcel_db > $backupFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "
[SUCCESS] Database backed up to: $backupFile
" -ForegroundColor Green
    } else {
        Write-Host "
[ERROR] Backup failed!
" -ForegroundColor Red
    }
}

# Main execution
Write-Header

if (-not (Test-DockerRunning)) {
    exit 1
}

Write-Host "[OK] Docker is running
" -ForegroundColor Green

switch ($Command) {
    'start'   { Start-Production }
    'dev'     { Start-Development }
    'stop'    { Stop-Application }
    'restart' { Restart-Application }
    'logs'    { Show-Logs }
    'status'  { Show-Status }
    'build'   { Build-Images }
    'clean'   { Clean-Application }
    'test'    { Run-Tests }
    'backup'  { Backup-Database }
    'help'    { Show-Help }
    default   { Show-Help }
}

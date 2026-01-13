@echo off
REM Parcel Map Application - Docker Quick Start Script

echo ========================================
echo Parcel Map Application
echo Docker Quick Start
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

:menu
echo Select an option:
echo 1. Start application (Production)
echo 2. Start application (Development)
echo 3. Stop application
echo 4. View logs
echo 5. Check status
echo 6. Rebuild and start
echo 7. Clean everything
echo 8. Exit
echo.
set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" goto start_prod
if "%choice%"=="2" goto start_dev
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto logs
if "%choice%"=="5" goto status
if "%choice%"=="6" goto rebuild
if "%choice%"=="7" goto clean
if "%choice%"=="8" goto end

echo Invalid choice! Please try again.
echo.
goto menu

:start_prod
echo.
echo Starting application in PRODUCTION mode...
docker-compose up -d
echo.
echo Application started!
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:3001/api
echo - GeoServer: http://localhost:8080/geoserver
echo - PostgreSQL: localhost:5432
echo.
pause
goto menu

:start_dev
echo.
echo Starting application in DEVELOPMENT mode...
docker-compose -f docker-compose.dev.yml up --build
pause
goto menu

:stop
echo.
echo Stopping application...
docker-compose down
echo.
echo Application stopped!
echo.
pause
goto menu

:logs
echo.
echo Viewing logs (Press Ctrl+C to exit)...
docker-compose logs -f
pause
goto menu

:status
echo.
echo Checking application status...
docker-compose ps
echo.
pause
goto menu

:rebuild
echo.
echo Rebuilding and starting application...
docker-compose up -d --build
echo.
echo Application rebuilt and started!
echo.
pause
goto menu

:clean
echo.
echo WARNING! This will remove all containers, networks, and volumes.
set /p confirm="Are you sure? (yes/no): "
if /i not "%confirm%"=="yes" (
    echo Cancelled.
    pause
    goto menu
)
echo.
echo Cleaning up...
docker-compose down -v
docker system prune -f
echo.
echo Cleanup complete!
echo.
pause
goto menu

:end
echo.
echo Goodbye!
timeout /t 2 >nul
exit /b 0

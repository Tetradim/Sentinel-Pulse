@echo off
title Start MongoDB
echo ==================================================
echo   MongoDB Startup
echo ==================================================
echo.

REM Check if MongoDB is installed
if not exist "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" (
    echo ERROR: MongoDB not found at:
    echo   C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe
    echo.
    echo Please install MongoDB Server 8.2 from:
    echo   https://www.mongodb.com/try/download/community
    echo.
    pause
    exit /b 1
)

REM Create data directory if it doesn't exist
if not exist "C:\data\db" (
    echo Creating data directory...
    mkdir "C:\data\db"
)

REM Start MongoDB
echo Starting MongoDB on localhost:27017...
echo.
start "MongoDB" "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath "C:\data\db"

REM Wait for MongoDB to start
timeout /t 3 /nobreak > nul

echo MongoDB started successfully!
echo Data directory: C:\data\db
echo.
echo You can now start Sentinel Pulse.
echo.
pause
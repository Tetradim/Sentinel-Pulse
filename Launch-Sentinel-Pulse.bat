@echo off
setlocal enabledelayedexpansion

title Sentinel Pulse Launcher
echo ==================================================
echo   Sentinel Pulse v1.0.0
echo ==================================================
echo.

REM --------------------------------------------------
REM 1. Check MongoDB
REM --------------------------------------------------
echo [1/4] Checking MongoDB...
if not exist "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" (
    echo ERROR: MongoDB not found at:
    echo   C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe
    echo.
    echo Please install MongoDB Server 8.2 from:
    echo   https://www.mongodb.com/try/download/community
    echo.
    echo OR update this script if MongoDB is installed elsewhere.
    echo.
    pause
    exit /b 1
)
echo   MongoDB found

REM --------------------------------------------------
REM 2. Create data directories
REM --------------------------------------------------
echo [2/4] Preparing directories...
if not exist "C:\data\db" mkdir "C:\data\db"
if not exist "logs" mkdir "logs"
echo   Directories ready

REM --------------------------------------------------
REM 3. Start MongoDB (if not running)
REM --------------------------------------------------
echo [3/4] Starting MongoDB...
netstat | findstr ":27017" > nul
if %errorlevel% equ 0 (
    echo   MongoDB already running
) else (
    start "MongoDB" /min cmd /c "cd /d "C:\Program Files\MongoDB\Server\8.2\bin" && mongod --dbpath C:\data\db --logpath logs\mongod.log --quiet"
    timeout /t 3 /nobreak > nul
    echo   MongoDB started
)

REM --------------------------------------------------
REM 4. Start Sentinel Pulse
REM --------------------------------------------------
echo [4/4] Starting Sentinel Pulse...
echo.

REM Check if frontend built
if exist "backend\static\index.html" (
    echo   Starting web server...
    start cmd /c "cd /d backend && uvicorn server:app --host 0.0.0.0 --port 8002"
    timeout /t 2 /nobreak > nul
) else (
    echo   NOTE: Run 'npm run build' in frontend first for full UI
    echo   Starting API server only...
    start cmd /c "cd /d backend && uvicorn server:app --host 0.0.0.0 --port 8002"
)

REM --------------------------------------------------
REM 5. Open browser
REM --------------------------------------------------
echo.
echo ==================================================
echo   Ready! Opening dashboard...
echo ==================================================
timeout /t 2 /nobreak > nul
start http://localhost:3000

echo.
echo Press any key to exit (MongoDB will keep running)...
pause > nul
echo.
echo To stop MongoDB: taskkill /F /IM mongod.exe
endlocal
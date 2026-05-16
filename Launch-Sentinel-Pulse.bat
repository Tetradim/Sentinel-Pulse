@echo off
setlocal enabledelayedexpansion
title Sentinel Pulse v1.0.0 Launcher
setlocal

:: Config
set PROJECT_DIR=%~dp0
set PORT=8002
set MONGODB_PORT=27017
set LOG_FILE=%PROJECT_DIR%sentinel_pulse.log

cd /d "%PROJECT_DIR%"

echo.
echo ==================================================
echo   Sentinel Pulse v1.0.0
echo ==================================================
echo.

:: ---------------------------------------------------
:: 1. Check/create directories and .env
:: ---------------------------------------------------
echo [1/5] Checking prerequisites...

if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo   Created .env from template
    ) else (
        echo   WARNING: .env not found
    )
)

if not exist "logs" mkdir logs 2>nul
if not exist "data\db" mkdir data\db 2>nul
echo   Directories ready

:: ---------------------------------------------------
:: 2. Check/Start MongoDB
:: ---------------------------------------------------
echo [2/5] Checking MongoDB...

:: Check if MongoDB is already running on port 27017
netstat -ano | findstr ":%MONGODB_PORT% " >nul
if %errorlevel% equ 0 (
    echo   MongoDB is already running on port %MONGODB_PORT%
) else (
    :: Try to find mongod in standard locations
    set MONGODB_PATH=
    if exist "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" set MONGODB_PATH=C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe
    if exist "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" set MONGODB_PATH=C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe
    if exist "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" set MONGODB_PATH=C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe
    
    if defined MONGODB_PATH (
        echo   Starting MongoDB from: !MONGODB_PATH!
        start "MongoDB" /min cmd /c "cd /d "!MONGODB_PATH!\.." && mongod --dbpath C:\data\db --logpath logs\mongod.log --quiet"
        timeout /t 3 /nobreak >nul
        echo   MongoDB started
    ) else (
        echo   ERROR: MongoDB not found
        echo   Please install MongoDB Server 8.2 from:
        echo     https://www.mongodb.com/try/download/community
        echo.
        echo   Or manually start MongoDB before launching.
        echo.
        echo   Press any key to continue anyway...
        pause >nul
    )
)

:: ---------------------------------------------------
:: 3. Check for stale processes on port
:: ---------------------------------------------------
echo [3/5] Checking port %PORT%...

:: Kill any existing process on our port to avoid conflicts
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%PORT% "') do (
    echo   Cleaning up stale process on port %PORT%...
    taskkill /F /PID %%a >nul 2>&1
    timeout /t 1 /nobreak >nul
)
echo   Port %PORT% ready

:: ---------------------------------------------------
:: 4. Start Sentinel Pulse Server
:: ---------------------------------------------------
echo [4/5] Starting Sentinel Pulse Server...

:: Log startup
echo. >> %LOG_FILE%
echo ===== Launched at %date% %time% ===== >> %LOG_FILE%

:: Start the server with logging
if exist "backend\server.py" (
    start "SentinelPulse" /min cmd /c "cd /d "%PROJECT_DIR%backend" && python server.py >> ..\\logs\\server.log 2>&1"
    echo   Server starting...
) else if exist "backend\SentinelPulse.exe" (
    start "" "%PROJECT_DIR%backend\SentinelPulse.exe"
    echo   Running bundled exe...
) else (
    echo   ERROR: Server not found
    echo   Run build first to create backend\SentinelPulse.exe
    pause
    exit /b 1
)

timeout /t 4 /nobreak >nul
echo   Server started

:: ---------------------------------------------------
:: 5. Open browser
:: ---------------------------------------------------
echo [5/5] Opening browser...

timeout /t 2 /nobreak >nul
start http://localhost:%PORT%

:: ---------------------------------------------------
:: Done
:: ---------------------------------------------------
echo.
echo ==================================================
echo   Sentinel Pulse is ready!
echo   Open http://localhost:%PORT%
echo ==================================================
echo.
echo   Log file: %LOG_FILE%
echo.

:: Write to log
echo %date% %time% - Launched successfully >> %LOG_FILE%

echo   Press any key to exit (app will continue running)...
pause >nul
echo.
echo   To stop: taskkill /F /IM python.exe /IM SentinelPulse.exe
endlocal
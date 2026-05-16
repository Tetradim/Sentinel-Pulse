@echo off
setlocal enabledelayedexpansion
title Sentinel Pulse v1.0.0 Launcher
setlocal

:: Config
set "PROJECT_DIR=%~dp0"
set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
set PORT=8002
set MONGODB_PORT=27017
set DESKTOP=%USERPROFILE%\Desktop
set LOG_FILE=%DESKTOP%\sentinel_pulse.log

echo DEBUG: PROJECT_DIR=%PROJECT_DIR%
cd /d "%PROJECT_DIR%"
echo DEBUG: CWD=%CD%

:: ---------------------------------------------------
:: Run as Administrator
:: ---------------------------------------------------
net session >nul 2>&1
if %errorlevel% neq 0 (
    :: Not running as admin - re-launch with elevation
    echo Requesting administrator privileges...
    powershell -Command "Start-Process cmd.exe -ArgumentList '/c cd /d \"%PROJECT_DIR%\" && \"%~f0\"' -Verb RunAs"
    exit /b 0
)

:: Ensure we're in the right directory after any re-launch
cd /d "%PROJECT_DIR%"

echo.
echo ==================================================
echo   Sentinel Pulse v1.0.0
echo ==================================================
echo.

:: Write startup to desktop log
echo. >> %LOG_FILE%
echo ======================================= >> %LOG_FILE%
echo LAUNCH: %date% %time% >> %LOG_FILE%
echo ======================================= >> %LOG_FILE%

:: ---------------------------------------------------
:: 1. Check/create directories and .env
:: ---------------------------------------------------
echo [1/5] Checking prerequisites...

if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo   Created .env from template
        echo   Created .env >> %LOG_FILE%
    ) else (
        echo   WARNING: .env not found
    )
)

if not exist "logs" mkdir logs 2>nul
if not exist "data\db" mkdir data\db 2>nul
echo   Directories ready
echo   Dirs: logs, data\db ready >> %LOG_FILE%

:: ---------------------------------------------------
:: 2. Check/Start MongoDB
:: ---------------------------------------------------
echo [2/5] Checking MongoDB...
echo   Checking MongoDB... >> %LOG_FILE%

:: Check if MongoDB is already running on port 27017
netstat -ano | findstr ":%MONGODB_PORT% " >nul
if %errorlevel% equ 0 (
    echo   MongoDB already running on port %MONGODB_PORT%
    echo   MongoDB already running >> %LOG_FILE%
) else (
    :: Try to find mongod in standard locations
    set MONGODB_PATH=
    if exist "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" set MONGODB_PATH=C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe
    if exist "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" set MONGODB_PATH=C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe
    if exist "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" set MONGODB_PATH=C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe
    
    if defined MONGODB_PATH (
        echo   Starting MongoDB from: !MONGODB_PATH!
        echo   Starting MongoDB: !MONGODB_PATH! >> %LOG_FILE%
        start "MongoDB" /min cmd /c "cd /d "!MONGODB_PATH!\.." && mongod --dbpath C:\data\db --logpath logs\mongod.log --quiet"
        timeout /t 3 /nobreak >nul
        echo   MongoDB started
        echo   MongoDB started >> %LOG_FILE%
    ) else (
        echo   ERROR: MongoDB not found
        echo   ERROR: MongoDB not found >> %LOG_FILE%
        echo   Please install MongoDB Server 8.2 from:
        echo     https://www.mongodb.com/try/download/community
        echo.
        echo   Press any key to continue anyway...
        pause >nul
    )
)

:: ---------------------------------------------------
:: 3. Check for stale processes on port
:: ---------------------------------------------------
echo [3/5] Checking port %PORT%...
echo   Checking port %PORT%... >> %LOG_FILE%

:: Kill any existing process on our port to avoid conflicts
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%PORT% "') do (
    echo   Cleaning up stale process on port %PORT%...
    echo   Cleaning stale: %%a >> %LOG_FILE%
    taskkill /F /PID %%a >nul 2>&1
    timeout /t 1 /nobreak >nul
)
echo   Port %PORT% ready

:: ---------------------------------------------------
:: 4. Start Sentinel Pulse Server
:: ---------------------------------------------------
echo [4/5] Starting Sentinel Pulse Server...
echo   Starting Sentinel Pulse... >> %LOG_FILE%

:: Start the server with logging
echo DEBUG: Checking server.py: backend\server.py exists=%ERRORLEVEL%
if exist "backend\server.py" (
    echo   Server: backend\server.py found
    echo   Server: backend\server.py found >> %LOG_FILE%
    start "SentinelPulse" /min cmd /c "cd /d "%PROJECT_DIR%backend" && python server.py >> ..\\logs\\server.log 2>&1"
    echo   Server starting...
) else if exist "backend\SentinelPulse.exe" (
    echo   Server: SentinelPulse.exe found
    echo   Server: SentinelPulse.exe found >> %LOG_FILE%
    start "" "%PROJECT_DIR%backend\SentinelPulse.exe"
    echo   Running bundled exe...
) else (
    echo   ERROR: Server not found
    echo   ERROR: Server not found at %PROJECT_DIR%backend >> %LOG_FILE%
    dir "%PROJECT_DIR%backend" >> %LOG_FILE%
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
echo   Opening browser >> %LOG_FILE%

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

:: Write success to log
echo %date% %time% - SUCCESS >> %LOG_FILE%

echo   Press any key to exit (app will continue running)...
pause >nul
echo.
echo   To stop: taskkill /F /IM python.exe /IM SentinelPulse.exe
endlocal
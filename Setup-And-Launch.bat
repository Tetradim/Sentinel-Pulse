@echo off
title Sentinel Pulse - Auto Setup
echo.
echo  ========================================
echo    Sentinel Pulse - Auto Setup ^& Launch
echo  ========================================
echo.

set DEMO_MODE=
echo Checking for MongoDB...

:: Method 1: Check if Docker MongoDB exists
where docker >nul 2>&1
if %errorlevel% equ 0 (
    docker ps -a 2>nul | findstr mongo >nul 2>&1
    if %errorlevel% equ 0 (
        echo Found Docker MongoDB container - starting...
        docker start mongo >nul 2>&1
        set MONGO_URL=mongodb://localhost:27017
        goto :launch
    )
)

:: Method 2: Check if local MongoDB installed
where mongod >nul 2>&1
if %errorlevel% equ 0 (
    echo Starting local MongoDB...
    start /b cmd /c "mongod --dbpath %%USERPROFILE%%\data\db"
    timeout /t 2 /nobreak >nul
    set MONGO_URL=mongodb://localhost:27017
    goto :launch
)

:: Method 3: Check if already running
netstat | findstr ":27017" >nul
if %errorlevel% equ 0 (
    echo MongoDB already running
    set MONGO_URL=mongodb://localhost:27017
    goto :launch
)

:: No MongoDB - Enable Demo Mode
echo.
echo  ========================================
echo    No MongoDB found. Using demo mode.
echo  ========================================
set DEMO_MODE=true

:launch
echo.
echo Starting Sentinel Pulse...

:: Generate credential key
set CREDENTIAL_KEY=sentinel-%RANDOM%-%TIME:~0,2%

:: Show what we're setting
echo Setting: DEMO_MODE=%DEMO_MODE% CREDENTIAL_KEY=*** (%MONGO_URL%)

:: Write .env file
del .env 2>nul
(
echo CREDENTIAL_KEY=%CREDENTIAL_KEY%
if "%DEMO_MODE%"=="true" (
    echo DEMO_MODE=true
    echo MONGO_URL=
) else (
    echo MONGO_URL=%MONGO_URL%
)
) > .env

:: Launch app with env vars - use /d to set working directory
start "" /d "%CD%" /b "SentinelPulse.exe"

:: Wait for app to start
timeout /t 2 /nobreak >nul
echo  ========================================
echo    Done! Opening browser...
echo  ========================================
start http://localhost:3000
echo.
echo  Press Ctrl+C to stop, then any key to exit...
pause >nul
taskkill /f /im SentinelPulse.exe >nul 2>&1
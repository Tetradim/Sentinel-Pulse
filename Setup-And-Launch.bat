@echo off
title Sentinel Pulse - Auto Setup
echo.
echo ========================================
echo   Sentinel Pulse - Auto Setup ^& Launch
echo ========================================
echo.

set DEMO_MODE=
echo Checking for MongoDB...

where docker >nul 2>&1
if %errorlevel% equ 0 (
    docker ps -a 2>nul | findstr mongo >nul 2>&1
    if %errorlevel% equ 0 (
        echo Found Docker MongoDB - starting...
        docker start mongo >nul 2>&1
        set MONGO_URL=mongodb://localhost:27017
        goto :launch
    )
)

where mongod >nul 2>&1
if %errorlevel% equ 0 (
    echo Starting MongoDB...
    start /b cmd /c "mongod --dbpath %%USERPROFILE%%\data\db"
    timeout /t 2 /nobreak >nul
    set MONGO_URL=mongodb://localhost:27017
    goto :launch
)

netstat | findstr ":27017" >nul
if %errorlevel% equ 0 (
    set MONGO_URL=mongodb://localhost:27017
    goto :launch
)

echo No MongoDB - enabling demo mode
set DEMO_MODE=true

:launch
set CREDENTIAL_KEY=sentinel-%RANDOM%-%TIME:~0,2%

del launch.ps1 2>nul
(
echo $env:DEMO_MODE = "true"
echo $env:CREDENTIAL_KEY = "%CREDENTIAL_KEY%"
echo $env:MONGO_URL = ""
echo .
echo .\SentinelPulse.exe
) > launch.ps1

echo Running with env vars...
powershell -ExecutionPolicy Bypass -File launch.ps1
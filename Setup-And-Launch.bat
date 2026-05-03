@echo off
title Sentinel Pulse - Auto Start
echo.
echo ========================================
echo   Sentinel Pulse - Auto Start
echo ========================================
echo.

:: Run the PowerShell starter with admin privileges
:: This will check/start MongoDB, launch app, and check Edge
powershell -ExecutionPolicy Bypass -File "%~dp0start-sentinel.ps1"

pause
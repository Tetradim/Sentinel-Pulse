@echo off
REM Sentinel Pulse Launcher v2 Wrapper
REM Calls the v2 PowerShell script with One-Closes-All feature
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0Launch-Sentinel-Pulse-v2.ps1"
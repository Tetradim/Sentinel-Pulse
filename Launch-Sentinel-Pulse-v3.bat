@echo off
REM Sentinel Pulse Launcher v3 Wrapper
REM Features: One-Closes-All + Auto-Restart on Crash + Logging
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0Launch-Sentinel-Pulse-v3.ps1"
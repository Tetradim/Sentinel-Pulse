@echo off
setlocal enabledelayedexpansion
title Sentinel Pulse v1.0.0 Launcher
setlocal

:: ================================================================
:: COMPREHENSIVE DEBUG LAUNCHER
:: ================================================================

:: Config
set "PROJECT_DIR=%~dp0"
set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
set PORT=8002
set MONGODB_PORT=27017
set DESKTOP=%USERPROFILE%\Desktop
set LOG_FILE=%DESKTOP%\sentinel_pulse.log

:: ================================================================
:: DEBUG: System Information
:: ================================================================
echo.
echo [DEBUG] ===== SYSTEM INFO =====
echo   COMPUTER: %COMPUTERNAME%
echo   USER: %USERNAME%
echo   ADMIN: checking...
echo DEBUG: PROJECT_DIR=%PROJECT_DIR%

cd /d "%PROJECT_DIR%"
echo DEBUG: CWD=%CD%

:: Write system info to log
echo. >> %LOG_FILE%
echo [DEBUG] ===== SYSTEM ===== >> %LOG_FILE%
echo COMPUTER: %COMPUTERNAME% >> %LOG_FILE%
echo USER: %USERNAME% >> %LOG_FILE%
echo PROJECT_DIR: %PROJECT_DIR% >> %LOG_FILE%
echo CWD: %CD% >> %LOG_FILE%
echo TIME: %date% %time% >> %LOG_FILE%

:: ================================================================
:: Run as Administrator
:: ================================================================
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [DEBUG] Not admin - requesting elevation...
    echo [DEBUG] Not admin - requesting elevation >> %LOG_FILE%
    powershell -Command "Start-Process cmd.exe -ArgumentList '/c cd /d \"%PROJECT_DIR%\" && \"%~f0\"' -Verb RunAs"
    exit /b 0
)

echo [DEBUG] Running as admin: YES
echo [DEBUG] Running as admin: YES >> %LOG_FILE%

cd /d "%PROJECT_DIR%"

:: ================================================================
:: DEBUG: Environment Variables
:: ================================================================
echo.
echo [DEBUG] ===== ENV VARS =====
echo   PATH length: %PATH:~0,100%...
echo   PYTHONPATH: %PYTHONPATH%
echo   PYTHON_HOME: %PYTHON_HOME%

echo [DEBUG] ENV >> %LOG_FILE%
echo   PATH: %PATH% >> %LOG_FILE%
echo   PYTHON: %PYTHON% >> %LOG_FILE%
echo   PYTHON_HOME: %PYTHON_HOME% >> %LOG_FILE%
echo   windir: %windir% >> %LOG_FILE%

:: ================================================================
:: DEBUG: Directory Contents
:: ================================================================
echo.
echo [DEBUG] ===== DIRECTORIES =====

echo [DEBUG] PROJECT_DIR contents: >> %LOG_FILE%
dir /b "%PROJECT_DIR%" >> %LOG_FILE%
echo   Project roots: 
dir /b "%PROJECT_DIR%"

echo [DEBUG] backend\ contents: >> %LOG_FILE%
dir /b "%PROJECT_DIR%\backend" >> %LOG_FILE%
echo   Backend files: 
dir /b "%PROJECT_DIR%\backend"

:: ================================================================
:: 1. Check/create directories and .env
:: ================================================================
echo.
echo [1/5] Checking prerequisites...
echo [1/5] Checking prerequisites >> %LOG_FILE%

:: Check .env
echo [DEBUG] Checking .env...
if exist ".env" (
    echo   .env found
    echo   .env: found >> %LOG_FILE%
) else (
    echo   .env NOT found
    echo   .env: NOT FOUND >> %LOG_FILE%
    if exist ".env.example" (
        copy .env.example .env >nul
        echo   Created .env from template
        echo   Created .env from .env.example >> %LOG_FILE%
    )
)

:: Check/create directories
if not exist "logs" (mkdir logs 2>nul && echo   Created logs\ || echo   logs\ exists)
if not exist "data\db" (mkdir data\db 2>nul && echo   Created data\db\ || echo   data\db\ exists)
echo   Dirs checked
echo   Dirs: logs, data\db >> %LOG_FILE%

:: Verify directories
if exist "logs" echo   logs\ exists || echo   logs\ MISSING
if exist "data\db" echo   data\db\ exists || echo   data\db\ MISSING

:: List what's in logs
echo [DEBUG] logs\ contents: >> %LOG_FILE%
dir /b "%PROJECT_DIR%\logs" >> %LOG_FILE% 2>&1

:: ================================================================
:: 2. Check/Start MongoDB
:: ================================================================
echo.
echo [2/5] Checking MongoDB...
echo [2/5] MongoDB >> %LOG_FILE%

:: Check if MongoDB is already running
netstat -ano | findstr ":%MONGODB_PORT% " >nul
if %errorlevel% equ 0 (
    echo   MongoDB ALREADY running on port %MONGODB_PORT%
    echo   MongoDB: already running >> %LOG_FILE%
) else (
    echo   MongoDB NOT running - trying to start
    echo   MongoDB: not running, checking install >> %LOG_FILE%
    
    :: Try to find mongod
    set MONGODB_PATH=
    if exist "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" set MONGODB_PATH=C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe
    if exist "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" set MONGODB_PATH=C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe
    if exist "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" set MONGODB_PATH=C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe
    if exist "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" set MONGODB_PATH=C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe
    
    echo [DEBUG] MONGODB_PATH: !MONGODB_PATH!
    echo   MongoDB: !MONGODB_PATH! >> %LOG_FILE%
    
    if defined MONGODB_PATH (
        echo   Starting MongoDB from: !MONGODB_PATH!
        start "MongoDB" /min cmd /c "cd /d "!MONGODB_PATH!\.." && mongod --dbpath C:\data\db --logpath "%PROJECT_DIR%\logs\mongod.log" --quiet"
        timeout /t 3 /nobreak >nul
        echo   MongoDB started
        echo   MongoDB: started >> %LOG_FILE%
    ) else (
        echo   ERROR: MongoDB not found
        echo   ERROR: MongoDB not found >> %LOG_FILE%
    )
)

:: ================================================================
:: 3. Check port availability
:: ================================================================
echo.
echo [3/5] Checking port %PORT%...
echo [3/5] Port %PORT% >> %LOG_FILE%

:: Check what's on our port
netstat -ano | findstr ":%PORT% " >nul
if %errorlevel% equ 0 (
    echo   Port %PORT% IN USE - finding process...
    echo   Port %PORT%: IN USE >> %LOG_FILE%
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%PORT% "') do (
        echo   PID %%a on port %PORT%
        echo   Process: %%a >> %LOG_FILE%
    )
) else (
    echo   Port %PORT% is FREE
    echo   Port %PORT%: FREE >> %LOG_FILE%
)

:: Kill any existing process on our port
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%PORT% "') do (
    echo   Killing PID %%a on port %PORT%...
    echo   Killing: %%a >> %LOG_FILE%
    taskkill /F /PID %%a >nul 2>&1
    timeout /t 1 /nobreak >nul
)

:: ================================================================
:: 4. Find Python
:: ================================================================
echo.
echo [4/5] Looking for Python...
echo [4/5] Finding Python >> %LOG_FILE%

set PYTHON=

:: Check PATH first
echo [DEBUG] Checking PATH for python...
where python >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('where python') do set PYTHON=%%i
    echo   Found in PATH: !PYTHON!
    echo   Python in PATH: !PYTHON! >> %LOG_FILE%
)

:: Try common Python locations
if not defined PYTHON (
    echo [DEBUG] Checking common Python locations...
    set PYTHON_LOCS=C:\Python312\python.exe C:\Python311\python.exe C:\Python310\python.exe C:\Python39\python.exe C:\Python38\python.exe "C:\Program Files\Python312\python.exe" "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" "%PROGRAMFILES%\Python312\python.exe" "%PROGRAMFILES(X86)%\Python312\python.exe"
    for %%p in (%PYTHON_LOCS%) do (
        if exist "%%p" (
            set PYTHON=%%p
            echo   Found: !PYTHON!
            echo   Python at %%p >> %LOG_FILE%
        )
    )
)

:: Also check python3
if not defined PYTHON (
    where python3 >nul 2>&1
    if %errorlevel% equ 0 (
        for /f "delims=" %%i in ('where python3') do set PYTHON=%%i
    )
)

:: Also check py launcher
if not defined PYTHON (
    for /f "delims=" %%i in ('where py') do set PYTHON=%%i
    echo   Found via py: !PYTHON!
)

if defined PYTHON (
    echo   Python: !PYTHON!
    echo   Python: !PYTHON! >> %LOG_FILE%
    :: Verify python works
    "!PYTHON!" --version >> %LOG_FILE% 2>&1
    echo   Python version logged
) else (
    echo   ERROR: Python NOT FOUND
    echo   ERROR: Python NOT FOUND >> %LOG_FILE%
)

:: ================================================================
:: 5. Find and start server
:: ================================================================
echo.
echo [5/5] Starting Sentinel Pulse Server...
echo [5/5] Starting server >> %LOG_FILE%

:: Look for SentinelPulse.exe (may be at root level)
if exist "%PROJECT_DIR%\SentinelPulse.exe" (
    echo   Found: SentinelPulse.exe (ROOT)
    echo   SentinelPulse.exe: ROOT >> %LOG_FILE%
    start "" "%PROJECT_DIR%\SentinelPulse.exe"
    echo   Started: SentinelPulse.exe
    echo   SentinelPulse.exe: started >> %LOG_FILE%
    goto :server_started
)

:: Look in _internal folder
if exist "%PROJECT_DIR%_internal\SentinelPulse.exe" (
    echo   Found: _internal\SentinelPulse.exe
    echo   SentinelPulse.exe: _internal >> %LOG_FILE%
    start "" "%PROJECT_DIR%_internal\SentinelPulse.exe"
    echo   Started: SentinelPulse.exe
    goto :server_started
)

:: Look for server.py in _internal
if exist "%PROJECT_DIR%_internal\server.py" (
    echo   Found: _internal\server.py
    echo   server.py: _internal >> %LOG_FILE%
    start "SentinelPulse" /min cmd /c "cd /d "%PROJECT_DIR%_internal" ^&^& "!PYTHON!" server.py 2>>"%PROJECT_DIR%\logs\server.log""
    echo   Started: server.py
    echo   server.py: started >> %LOG_FILE%
    goto :server_started
)

:: Look in backend (original location)
if exist "%PROJECT_DIR%\backend\server.py" (
    echo   Found: backend\server.py
    echo   server.py: backend >> %LOG_FILE%
    start "SentinelPulse" /min cmd /c "cd /d "%PROJECT_DIR%\backend" ^&^& "!PYTHON!" server.py 2>>"%PROJECT_DIR%\logs\server.log""
    echo   Started: server.py
    echo   server.py: started >> %LOG_FILE%
    goto :server_started
)

if exist "%PROJECT_DIR%\backend\SentinelPulse.exe" (
    echo   Found: backend\SentinelPulse.exe
    start "" "%PROJECT_DIR%\backend\SentinelPulse.exe"
    echo   Started: SentinelPulse.exe
    goto :server_started
)

:: If we get here, no server found
echo   ERROR: No server file found in any location
echo   ERROR: Tried: root, _internal, backend >> %LOG_FILE%
dir /s /b "%PROJECT_DIR%*.exe" >> %LOG_FILE% 2>&1
dir /s /b "%PROJECT_DIR%*.py" >> %LOG_FILE% 2>&1

:server_started

timeout /t 4 /nobreak >nul

:: ================================================================
:: 6. Open browser
:: ================================================================
echo.
echo [6/6] Opening browser...
echo [6/6] Browser >> %LOG_FILE%

timeout /t 2 /nobreak >nul
start http://localhost:%PORT%

:: ================================================================
:: Done
:: ================================================================
echo.
echo ==================================================
echo   Sentinel Pulse - Done
echo ==================================================
echo.
echo   Log: %LOG_FILE%
echo.

echo %date% %time% - COMPLETE >> %LOG_FILE%

echo   Press any key to exit...
pause >nul
endlocal
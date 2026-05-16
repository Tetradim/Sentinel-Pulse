# Sentinel Pulse Launcher
# Starts MongoDB + Sentinel Pulse with a single click

param(
    [string]$MongoPath = "C:\Program Files\MongoDB\Server\8.2\bin",
    [string]$DataPath = "C:\data\db",
    [string]$LogPath = "logs",
    [int]$Port = 27017,
    [int]$AppPort = 8002
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message, [string]$Status = "OK") {
    $colors = @{
        "OK" = "Green"
        "SKIP" = "Yellow"
        "FAIL" = "Red"
    }
    $color = $colors[$Status]
    Write-Host "[$Status] $Message" -ForegroundColor $color
}

# Banner
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Sentinel Pulse v1.0.0 - Launcher" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------
# 1. Check MongoDB
# ---------------------------------------------------
Write-Step "Checking MongoDB..." "OK"
$mongoExe = Join-Path $MongoPath "mongod.exe"
if (-not (Test-Path $mongoExe)) {
    Write-Host ""
    Write-Host "ERROR: MongoDB not found at:" -ForegroundColor Red
    Write-Host "  $mongoExe" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install MongoDB Server 8.2 from:" -ForegroundColor Yellow
    Write-Host "  https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# ---------------------------------------------------
# 2. Create directories
# ---------------------------------------------------
Write-Step "Preparing directories..." "OK"
if (-not (Test-Path $DataPath)) {
    New-Item -ItemType Directory -Path $DataPath -Force | Out-Null
}
if (-not (Test-Path $LogPath)) {
    New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
}

# ---------------------------------------------------
# 3. Check if MongoDB already running
# ---------------------------------------------------
Write-Step "Checking MongoDB status..." "OK"
$connection = Test-NetConnection -ComputerName "localhost" -Port $Port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
if ($connection.TcpTestSucceeded) {
    Write-Step "MongoDB already running on port $Port" "SKIP"
    $mongoRunning = $true
} else {
    Write-Step "Starting MongoDB..." "OK"
    $mongoLog = Join-Path $LogPath "mongod.log"
    
    # Start MongoDB as background process
    Start-Process -FilePath $mongoExe -ArgumentList "--dbpath", $DataPath, "--port", $Port, "--logpath", $mongoLog, "--quiet" -NoNewWindow -PassThru | Out-Null
    
    # Wait for startup
    Start-Sleep -Seconds 3
    
    # Verify
    $connection = Test-NetConnection -ComputerName "localhost" -Port $Port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Step "MongoDB started on port $Port" "OK"
    } else {
        Write-Host "WARNING: Could not verify MongoDB started" -ForegroundColor Yellow
    }
}

# ---------------------------------------------------
# 4. Check backend dependencies
# ---------------------------------------------------
Write-Step "Checking backend dependencies..." "OK"
$requirements = "backend\requirements.txt"
if (-not (Test-Path $requirements)) {
    Write-Host "WARNING: $requirements not found" -ForegroundColor Yellow
} else {
    # Check if virtual env exists
    $venv = "backend\venv"
    if (-not (Test-Path $venv)) {
        Write-Host "NOTE: No virtual environment - will use system Python" -ForegroundColor Yellow
    }
}

# ---------------------------------------------------
# 5. Start Sentinel Pulse
# ---------------------------------------------------
Write-Step "Starting Sentinel Pulse..." "OK"

# Check if already running
$appRunning = Test-NetConnection -ComputerName "localhost" -Port $AppPort -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
if ($appRunning.TcpTestSucceeded) {
    Write-Step "Sentinel Pulse already running on port $AppPort" "SKIP"
} else {
    # Start backend server
    $serverCmd = "cd backend; uvicorn server:app --host 0.0.0.0 --port $AppPort"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $serverCmd -NoNewWindow -PassThru | Out-Null
    Start-Sleep -Seconds 2
    Write-Step "Sentinel Pulse API started on port $AppPort" "OK"
}

# ---------------------------------------------------
# 6. Open browser
# ---------------------------------------------------
Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  Ready!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Dashboard: http://localhost:3000" -ForegroundColor Cyan
Write-Host "API Docs:   http://localhost:$AppPort/docs" -ForegroundColor Gray
Write-Host ""

Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"

Write-Host "Press any key to exit..." -ForegroundColor Gray
Read-Host ""
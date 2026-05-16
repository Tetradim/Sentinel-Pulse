# Start MongoDB for Sentinel Pulse
# Run this before starting Sentinel Pulse

param(
    [string]$MongoPath = "C:\Program Files\MongoDB\Server\8.2\bin",
    [string]$DataPath = "C:\data\db",
    [int]$Port = 27017
)

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  MongoDB Startup Script" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check MongoDB installation
$mongoExe = Join-Path $MongoPath "mongod.exe"
if (-not (Test-Path $mongoExe)) {
    Write-Host "ERROR: MongoDB not found at:" -ForegroundColor Red
    Write-Host "  $mongoExe" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install MongoDB Server 8.2 from:" -ForegroundColor Yellow
    Write-Host "  https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or update `$MongoPath in this script if installed elsewhere." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Create data directory if needed
if (-not (Test-Path $DataPath)) {
    Write-Host "Creating data directory: $DataPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $DataPath -Force | Out-Null
}

# Start MongoDB
Write-Host "Starting MongoDB..." -ForegroundColor Green
Write-Host "  Executable: $mongoExe" -ForegroundColor Gray
Write-Host "  Data Path:  $DataPath" -ForegroundColor Gray
Write-Host "  Port:     $Port" -ForegroundColor Gray
Write-Host ""

# Start MongoDB as background process
Start-Process -FilePath $mongoExe -ArgumentList "--dbpath", $DataPath, "--port", $Port, "--logpath", (Join-Path $DataPath "mongod.log") -NoNewWindow

# Wait for MongoDB to start
Start-Sleep -Seconds 3

# Check if MongoDB is running
$process = Get-Process -Name "mongod" -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "SUCCESS: MongoDB is running!" -ForegroundColor Green
    Write-Host "  Process ID: $($process.Id)" -ForegroundColor Gray
    Write-Host "  Connection: mongodb://localhost:$Port" -ForegroundColor Gray
    Write-Host ""
    Write-Host "You can now start Sentinel Pulse." -ForegroundColor Cyan
} else {
    Write-Host "WARNING: Could not verify MongoDB process started." -ForegroundColor Yellow
    Write-Host "Check if MongoDB is running in Task Manager." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
Read-Host ""
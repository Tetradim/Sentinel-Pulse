# Sentinel Pulse Auto-Start Script
# Run as: powershell -ExecutionPolicy Bypass -File start-sentinel.ps1

param(
    [switch]$SkipMongo,      # Skip MongoDB check
    [switch]$NoBrowser      # Don't open browser
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Sentinel Pulse - Auto Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check/Start MongoDB ------------------
if (-not $SkipMongo) {
    Write-Host "[1/3] Checking MongoDB..." -ForegroundColor Yellow
    
    # Check if MongoDB is running on port 27017
    $mongoRunning = Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue
    
    if ($mongoRunning) {
        Write-Host "  MongoDB is already running" -ForegroundColor Green
    } else {
        # Try to start MongoDB
        $mongod = Get-Command mongod -ErrorAction SilentlyContinue
        if ($mongod) {
            Write-Host "  Starting MongoDB..."
            Start-Process -FilePath "mongod" -ArgumentList "--dbpath $env:USERPROFILE\data\db" -WindowStyle Hidden
            Start-Sleep -Seconds 3
            Write-Host "  MongoDB started" -ForegroundColor Green
        } else {
            Write-Host "  MongoDB not found - using demo mode" -ForegroundColor Yellow
            $env:DEMO_MODE = "true"
        }
    }
}

# 2. Start Sentinel Pulse ----------------
Write-Host "[2/3] Starting Sentinel Pulse..." -ForegroundColor Yellow

$env:CREDENTIAL_KEY = "sentinel-$(Get-Random -Maximum 9999)"

# Start the app
$proc = Start-Process -FilePath ".\SentinelPulse.exe" -PassThru -WorkingDirectory $PWD

if ($proc) {
    Write-Host "  Sentinel Pulse started (PID: $($proc.Id))" -ForegroundColor Green
} else {
    Write-Host "  Failed to start Sentinel Pulse" -ForegroundColor Red
    exit 1
}

# 3. Check if Edge is running ----------
Write-Host "[3/3] Checking Edge browser..." -ForegroundColor Yellow

Start-Sleep -Seconds 2

$edge = Get-Process -Name msedge -ErrorAction SilentlyContinue

if ($edge) {
    Write-Host "  Edge is running (PID: $($edge.Id))" -ForegroundColor Green
} else {
    Write-Host "  Edge not running" -ForegroundColor Yellow
    if (-not $NoBrowser) {
        Write-Host "  Opening default browser..."
        Start-Process "http://localhost:3000"
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Sentinel Pulse is ready!" -ForegroundColor Green
Write-Host "  Open http://localhost:3000" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop, or any key to exit..."

# Wait for user input
try {
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
} catch {}

# Cleanup
if ($proc -and -not $proc.HasExited) {
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}
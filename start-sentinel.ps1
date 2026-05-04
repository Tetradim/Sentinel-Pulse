# Sentinel Pulse Auto-Start Script
# Run as: powershell -ExecutionPolicy Bypass -File start-sentinel.ps1

param(
    [switch]$SkipMongo,      # Skip MongoDB check
    [switch]$NoBrowser      # Don't open browser
)

$ErrorActionPreference = "Continue"

# Get script directory - works both ways
$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
    $ScriptDir = Split-Path -Parent $PSCommandPath
}
if (-not $ScriptDir) {
    $ScriptDir = $PWD
}

# Create error log early
function Write-ErrorLog {
    param([string]$Message)
    $logMsg = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
    $logMsg | Out-File -FilePath "$env:USERPROFILE\Desktop\sentinel_pulse.log" -Append
    Write-Host "  LOG: $logMsg" -ForegroundColor Gray
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Sentinel Pulse - Auto Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-ErrorLog "Starting Sentinel Pulse..."

# 1. Check/Start MongoDB ------------------
if (-not $SkipMongo) {
    Write-Host "[1/3] Checking MongoDB..." -ForegroundColor Yellow
    
    # Check if MongoDB is running on port 27017
    $mongoRunning = Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue
    $mongoConn = $mongoRunning | Select-Object -First 1
    
    if ($mongoConn) {
        Write-Host "  MongoDB is already running" -ForegroundColor Green
    } else {
        # Try to start MongoDB - check multiple locations
        $mongodPaths = @(
            "mongod",  # PATH
            "$env:ProgramFiles\MongoDB\Server\6.0\bin\mongod.exe",
            "$env:ProgramFiles(x86)\MongoDB\Server\6.0\bin\mongod.exe",
            "$ScriptDir\mongod.exe",
            "$ScriptDir\..\mongodb\mongod.exe"
        )
        
        $mongod = $null
        foreach ($path in $mongodPaths) {
            if ($path -and (Test-Path $path)) {
                $mongod = $path
                break
            }
        }
        
        # Try which as fallback
        if (-not $mongod) {
            $mongod = Get-Command mongod -ErrorAction SilentlyContinue | Select-Object -First 1
        }
        
        if ($mongod) {
            Write-Host "  Starting MongoDB from: $mongod"
            $dbPath = "$ScriptDir\..\data\db"
            if (-not (Test-Path $dbPath)) { New-Item -ItemType Directory -Path $dbPath -Force | Out-Null }
            Start-Process -FilePath $mongod -ArgumentList "--dbpath $dbPath" -WindowStyle Hidden
            Start-Sleep -Seconds 3
            Write-Host "  MongoDB started" -ForegroundColor Green
        } else {
            Write-Host "  ERROR: MongoDB not found - Sentinel Pulse requires MongoDB" -ForegroundColor Red
            Write-ErrorLog "ERROR: MongoDB not found"
            exit 1
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
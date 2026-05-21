# ============================================================
# Sentinel Pulse Launcher v2
# "One Closes All" Feature - closing Browser OR Console kills everything
# Auto-detects project location
# ============================================================

param(
    [string]$MongoPath = "C:\Program Files\MongoDB\Server\8.2\bin",
    [string]$DataPath = "",  # auto-detected below
    [string]$LogPath = "",
    [int]$Port = 27017,
    [int]$AppPort = 8002
)

$ErrorActionPreference = "SilentlyContinue"

# Auto-detect project directory  
$script:ProjectRoot = $PSScriptRoot
if (-not $script:ProjectRoot) { 
    $script:ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path 
}
if (-not $script:ProjectRoot) { 
    $script:ProjectRoot = Get-Location 
}

# Apply defaults
if (-not $DataPath) { $DataPath = "$script:ProjectRoot\data\db" }
if (-not $LogPath) { $LogPath = "$script:ProjectRoot\logs" }

Write-Host "[INFO] Project root: $script:ProjectRoot" -ForegroundColor Cyan

# Global PIDs for cross-termination
$script:MongoPID = $null
$script:BackendPID = $null
$script:BrowserPID = $null
$script:LauncherPID = $PID

function Stop-Everything {
    Write-Host ""
    Write-Host "[STOP] Shutting down all processes..." -ForegroundColor Yellow
    
    # Kill browser
    if ($script:BrowserPID) {
        $bp = Get-Process -Id $script:BrowserPID -ErrorAction SilentlyContinue
        if ($bp) {
            $bp.CloseMainWindow() | Out-Null
            Start-Sleep -Milliseconds 500
            Stop-Process -Id $script:BrowserPID -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Kill backend
    if ($script:BackendPID) {
        $be = Get-Process -Id $script:BackendPID -ErrorAction SilentlyContinue
        if ($be) { Stop-Process -Id $script:BackendPID -Force -ErrorAction SilentlyContinue }
    }
    
    # Kill MongoDB
    if ($script:MongoPID) {
        $mp = Get-Process -Id $script:MongoPID -ErrorAction SilentlyContinue
        if ($mp) { Stop-Process -Id $script:MongoPID -Force -ErrorAction SilentlyContinue }
    }
    
    Write-Host "[STOP] All processes terminated." -ForegroundColor Green
}

function Test-ProcessAlive {
    param([int]$PID)
    if (-not $PID) { return $false }
    $p = Get-Process -Id $PID -ErrorAction SilentlyContinue
    return ($null -ne $p)
}

# --------------------------------------------------------
# Banner
# --------------------------------------------------------
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Sentinel Pulse v1.0.0 - Launcher v2" -ForegroundColor Cyan
Write-Host "  [One Closes All]" -ForegroundColor DarkGray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --------------------------------------------------------
# 1. Check MongoDB
# --------------------------------------------------------
Write-Host "[CHECK] MongoDB..." -NoNewline
$mongoExe = Join-Path $MongoPath "mongod.exe"
if (Test-Path $mongoExe) { Write-Host " OK" -ForegroundColor Green } 
else { 
    Write-Host " MISSING" -ForegroundColor Red
    Write-Host "ERROR: MongoDB not at: $mongoExe" -ForegroundColor Red
    exit 1 
}

# --------------------------------------------------------
# 2. Directories
# --------------------------------------------------------
Write-Host "[CHECK] Directories..." -NoNewline
if (-not (Test-Path $DataPath)) { New-Item -ItemType Directory -Path $DataPath -Force | Out-Null }
if (-not (Test-Path $LogPath)) { New-Item -ItemType Directory -Path $LogPath -Force | Out-Null }
Write-Host " OK" -ForegroundColor Green

# --------------------------------------------------------
# 3. Start MongoDB
# --------------------------------------------------------
Write-Host "[CHECK] MongoDB port $Port..." -NoNewline
$conn = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
if ($conn.TcpTestSucceeded) {
    Write-Host " already running" -ForegroundColor Yellow
} else {
    Write-Host " starting..." -ForegroundColor Cyan
    $mongoLog = Join-Path $LogPath "mongod.log"
    $mongop = Start-Process -FilePath $mongoExe -ArgumentList "--dbpath",$DataPath,"--port",$Port,"--logpath",$mongoLog,"--quiet" -PassThru -NoNewWindow
    $script:MongoPID = $mongop.Id
    Start-Sleep -Seconds 3
    $conn = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
    if ($conn.TcpTestSucceeded) { 
        Write-Host " started (PID $($script:MongoPID))" -ForegroundColor Green 
    } else { 
        Write-Host " WARNING" -ForegroundColor Yellow 
    }
}

# --------------------------------------------------------
# 4. Start Backend
# --------------------------------------------------------
Write-Host "[CHECK] App port $AppPort..." -NoNewline
$conn = Test-NetConnection -ComputerName localhost -Port $AppPort -WarningAction SilentlyContinue
if ($conn.TcpTestSucceeded) {
    Write-Host " already running" -ForegroundColor Yellow
    $script:BackendPID = 0  # we didn't start it
} else {
    Write-Host " starting..." -ForegroundColor Cyan
    $cmdStr = "cd backend; uvicorn server:app --host 0.0.0.0 --port $AppPort"
    $backendProc = Start-Process -FilePath cmd.exe -ArgumentList "/c",$cmdStr -PassThru -NoNewWindow
    $script:BackendPID = $backendProc.Id
    Start-Sleep -Seconds 2
    $conn = Test-NetConnection -ComputerName localhost -Port $AppPort -WarningAction SilentlyContinue
    if ($conn.TcpTestSucceeded) { 
        Write-Host " started (PID $($script:BackendPID))" -ForegroundColor Green 
    } else { 
        Write-Host " WARNING" -ForegroundColor Yellow 
    }
}

# --------------------------------------------------------
# 5. Open Browser
# --------------------------------------------------------
Write-Host "[CHECK] Browser..." -NoNewline
$browserUrl = "http://localhost:$AppPort"
$browseProc = Start-Process -FilePath $browserUrl -PassThru
$script:BrowserPID = $browseProc.Id
Write-Host " opened (PID $($script:BrowserPID))" -ForegroundColor Green

# --------------------------------------------------------
# 6. Ready
# --------------------------------------------------------
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Ready! Dashboard: http://localhost:$AppPort" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "[MONITOR] Closing Browser or Console stops all" -ForegroundColor DarkGray
Write-Host ""

# --------------------------------------------------------
# 7. Monitor Loop - "One Closes All"
# --------------------------------------------------------
$running = $true

while ($running) {
    Start-Sleep -Milliseconds 750
    
    # Check: Browser closed?
    if ($script:BrowserPID -and -not (Test-ProcessAlive $script:BrowserPID)) {
        Write-Host "[DETECT] Browser closed → stopping all..." -ForegroundColor Yellow
        Stop-Everything
        $running = $false
        break
    }
    
    # Check: Console closed? (launcher process died)
    if (-not (Test-ProcessAlive $script:LauncherPID)) {
        Write-Host "[DETECT] Console closed → stopping all..." -ForegroundColor Yellow
        Stop-Everything
        $running = $false
        break
    }
    
    # Check: Backend crashed?
    if ($script:BackendPID -and (Test-ProcessAlive $script:BackendPID) -eq $false -and $script:BackendPID -ne 0) {
        Write-Host "[DETECT] Backend crashed → closing browser..." -ForegroundColor Yellow
        if ($script:BrowserPID -and (Test-ProcessAlive $script:BrowserPID)) {
            Stop-Process -Id $script:BrowserPID -Force -ErrorAction SilentlyContinue
        }
        $running = $false
        break
    }
}

Write-Host "[EXIT] Launcher terminated." -ForegroundColor Gray
exit 0
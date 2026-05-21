# ============================================================
# Sentinel Pulse Launcher v3
# Features:
# - "One Closes All" (close browser OR console kills all)
# - Auto-restart on crash (configurable, persisted)
# - Extensive error logging
# Auto-detects project location
# ============================================================

param(
    [string]$MongoPath = "C:\Program Files\MongoDB\Server\8.2\bin",
    [string]$DataPath = "",
    [string]$LogPath = "",
    [string]$SettingsPath = "",
    [int]$Port = 27017,
    [int]$AppPort = 8002,
    [switch]$SkipSettings
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

# Apply defaults using detected project root
if (-not $DataPath) { $DataPath = "$script:ProjectRoot\data\db" }
if (-not $LogPath) { $LogPath = "$script:ProjectRoot\logs" }
if (-not $SettingsPath) { $SettingsPath = "$script:ProjectRoot\launcher-settings.ini" }

Write-Host "[INFO] Project root: $script:ProjectRoot" -ForegroundColor Cyan

$ErrorActionPreference = "SilentlyContinue"

# --------------------------------------------------------
# Settings Management (Persisted to INI file)
# --------------------------------------------------------
$script:Settings = @{
    AutoRestart = $false
    RestartDelaySeconds = 5
    MaxRestartAttempts = 3
    EnableLogging = $true
}

function Load-Settings {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return }
    $content = Get-Content $Path -Raw
    if (-not $content) { return }
    foreach ($line in ($content -split "`n")) {
        $line = $line.Trim()
        if ($line -match '^([A-Za-z]+)=(.*)$') {
            $key = $matches[1]
            $value = $matches[2]
            if ($key -eq "AutoRestart") { 
                $script:Settings.AutoRestart = ($value -eq "true") 
            }
            elseif ($key -eq "RestartDelaySeconds") { 
                $script:Settings.RestartDelaySeconds = [int]$value 
            }
            elseif ($key -eq "MaxRestartAttempts") { 
                $script:Settings.MaxRestartAttempts = [int]$value 
            }
            elseif ($key -eq "EnableLogging") { 
                $script:Settings.EnableLogging = ($value -eq "true") 
            }
        }
    }
}

function Save-Settings {
    param([string]$Path)
    $lines = @(
        "AutoRestart=$($script:Settings.AutoRestart)",
        "RestartDelaySeconds=$($script:Settings.RestartDelaySeconds)",
        "MaxRestartAttempts=$($script:Settings.MaxRestartAttempts)",
        "EnableLogging=$($script:Settings.EnableLogging)"
    )
    $lines | Set-Content $Path -Encoding UTF8
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    if (-not $script:Settings.EnableLogging) { return }
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    $logMsg = "$timestamp [$Level] $Message"
    $logFile = Join-Path $LogPath "launcher.log"
    Add-Content -Path $logFile -Value $logMsg -Encoding UTF8
}

function Prompt-ForSetting {
    param([string]$Name, [string]$Prompt, [string]$Current)
    Write-Host "$Prompt" -ForegroundColor Cyan
    Write-Host "  [current: $Current] (press Enter to keep)" -ForegroundColor Gray
    $input = Read-Host
    if ($input) { return $input }
    return $Current
}

function Configure-Settings {
    Write-Host ""
    Write-Host "======= Launcher Settings =======" -ForegroundColor Cyan
    Write-Host ""
    
    # Auto-restart toggle
    Write-Host "Auto-restart on crash?" -ForegroundColor Cyan
    Write-Host "  Current: $(if ($script:Settings.AutoRestart) {'ON'} else {'OFF'})" -ForegroundColor $(if ($script:Settings.AutoRestart) {'Green'} else {'Yellow'})
    $ans = Read-Host "  Enable auto-restart? (y/N)"
    if ($ans -match '^[Yy]') { 
        $script:Settings.AutoRestart = $true
        
        # Delay setting
        Write-Host ""
        $delay = Prompt-ForSetting "Delay" "  Restart delay (seconds)?" $script:Settings.RestartDelaySeconds
        if ($delay -match '^\d+$') { $script:Settings.RestartDelaySeconds = [int]$delay }
        
        # Max attempts
        Write-Host ""
        $max = Prompt-ForSetting "Attempts" "  Max restart attempts before giving up?" $script:Settings.MaxRestartAttempts
        if ($max -match '^\d+$') { $script:Settings.MaxRestartAttempts = [int]$max }
    } else {
        $script:Settings.AutoRestart = $false
    }
    
    # Save
    Write-Host ""
    Write-Host "Settings saved." -ForegroundColor Green
    Save-Settings $script:SettingsFile
    Write-Host ""
}

# Real path for settings file
$script:SettingsFile = $SettingsPath
if (Test-Path $SettingsPath) { Load-Settings $SettingsPath }

# Check first-run or -SkipSettings
if (-not $SkipSettings) {
    Write-Host ""
    Write-Host "Press 's' to configure settings..." -ForegroundColor DarkGray
    $key = Read-Host
    if ($key -eq 's') { Configure-Settings }
}

# Global PIDs
$script:MongoPID = $null
$script:BackendPID = $null
$script:BrowserPID = $null
$script:LauncherPID = $PID
$script:RestartCount = 0

function Stop-Everything {
    param([string]$Reason = "normal")
    Write-Host ""
    Write-Host "[STOP] Shutting down (reason: $Reason)..." -ForegroundColor Yellow
    Write-Log "Stopping all processes - $Reason"
    
    if ($script:BrowserPID) {
        $bp = Get-Process -Id $script:BrowserPID -ErrorAction SilentlyContinue
        if ($bp) {
            $bp.CloseMainWindow() | Out-Null
            Start-Sleep -Milliseconds 500
            Stop-Process -Id $script:BrowserPID -Force -ErrorAction SilentlyContinue
        }
    }
    if ($script:BackendPID -and $script:BackendPID -ne 0) {
        $be = Get-Process -Id $script:BackendPID -ErrorAction SilentlyContinue
        if ($be) { Stop-Process -Id $script:BackendPID -Force -ErrorAction SilentlyContinue }
    }
    if ($script:MongoPID) {
        $mp = Get-Process -Id $script:MongoPID -ErrorAction SilentlyContinue
        if ($mp) { Stop-Process -Id $script:MongoPID -Force -ErrorAction SilentlyContinue }
    }
    
    Write-Host "[STOP] All processes terminated." -ForegroundColor Green
    Write-Log "All processes terminated"
}

function Test-ProcessAlive {
    param([int]$PID)
    if (-not $PID) { return $false }
    $p = Get-Process -Id $PID -ErrorAction SilentlyContinue
    return ($null -ne $p)
}

function Start-MongoDB {
    Write-Log "Attempting to start MongoDB"
    $conn = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
    if ($conn.TcpTestSucceeded) {
        Write-Host "[NOTE] MongoDB already running on port $Port" -ForegroundColor Yellow
        Write-Log "MongoDB already running - reusing"
        return $true
    }
    
    Write-Host "[START] MongoDB..." -ForegroundColor Cyan
    $mongoExe = Join-Path $MongoPath "mongod.exe"
    $mongoLog = Join-Path $LogPath "mongod.log"
    $mongop = Start-Process -FilePath $mongoExe -ArgumentList "--dbpath",$DataPath,"--port",$Port,"--logpath",$mongoLog,"--quiet" -PassThru -NoNewWindow
    $script:MongoPID = $mongop.Id
    Start-Sleep -Seconds 3
    
    $conn = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
    if ($conn.TcpTestSucceeded) { 
        Write-Host "[START] MongoDB started (PID $script:MongoPID)" -ForegroundColor Green
        Write-Log "MongoDB started successfully (PID $($script:MongoPID))"
        return $true
    } else { 
        Write-Host "[ERROR] MongoDB failed to start" -ForegroundColor Red
        Write-Log "MongoDB failed to start" "ERROR"
        return $false
    }
}

function Start-Backend {
    Write-Log "Attempting to start backend"
    $conn = Test-NetConnection -ComputerName localhost -Port $AppPort -WarningAction SilentlyContinue
    if ($conn.TcpTestSucceeded) {
        Write-Host "[NOTE] App already running on port $AppPort" -ForegroundColor Yellow
        Write-Log "Backend already running - reusing"
        $script:BackendPID = 0
        return $true
    }
    
    Write-Host "[START] Backend..." -ForegroundColor Cyan
    $cmdStr = "cd backend; uvicorn server:app --host 0.0.0.0 --port $AppPort"
    $backendProc = Start-Process -FilePath cmd.exe -ArgumentList "/c",$cmdStr -PassThru -NoNewWindow
    $script:BackendPID = $backendProc.Id
    Start-Sleep -Seconds 2
    
    $conn = Test-NetConnection -ComputerName localhost -Port $AppPort -WarningAction SilentlyContinue
    if ($conn.TcpTestSucceeded) { 
        Write-Host "[START] Backend started (PID $script:BackendPID)" -ForegroundColor Green
        Write-Log "Backend started successfully (PID $($script:BackendPID))"
        return $true
    } else { 
        Write-Host "[ERROR] Backend failed to start" -ForegroundColor Red
        Write-Log "Backend failed to start" "ERROR"
        return $false
    }
}

function Start-Browser {
    Write-Log "Opening browser"
    $browserUrl = "http://localhost:$AppPort"
    $browseProc = Start-Process -FilePath $browserUrl -PassThru
    $script:BrowserPID = $browseProc.Id
    Write-Host "[START] Browser opened (PID $script:BrowserPID)" -ForegroundColor Green
    Write-Log "Browser opened (PID $($script:BrowserPID))"
}

# --------------------------------------------------------
# Crash Recovery Loop
# --------------------------------------------------------
$crashed = $false
$runLoop = $true

while ($runLoop) {
    # Increment restart count on crash loop
    if ($crashed) {
        $script:RestartCount++
        Write-Host ""
        Write-Host "[CRASH] Attempt $script:RestartCount of $($script:Settings.MaxRestartAttempts)..." -ForegroundColor Red
        Write-Log "Crash detected - restart attempt $script:RestartCount/$($script:Settings.MaxRestartAttempts)" "WARN"
        
        # Check restart limit
        if ($script:RestartCount -ge $script:Settings.MaxRestartAttempts) {
            Write-Host "[ABORT] Too many restart attempts ($script:RestartCount)" -ForegroundColor Red
            Write-Log "Max restart attempts reached - giving up" "ERROR"
            Write-Host "Press Enter to exit..."
            Read-Host
            exit 1
        }
        
        # Wait before restart
        Write-Host "[WAIT] Restarting in $($script:Settings.RestartDelaySeconds) seconds..." -ForegroundColor Yellow
        Start-Sleep -Seconds $script:Settings.RestartDelaySeconds
        $crashed = $false
    }
    
    # --------------------------------------------------------
    # Banner
    # --------------------------------------------------------
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Sentinel Pulse v1.0.0 - Launcher v3" -ForegroundColor Cyan
    Write-Host "  [Auto-Restart: $(if ($script:Settings.AutoRestart) {'ON'} else {'OFF'})]" -ForegroundColor $(if ($script:Settings.AutoRestart) {'Green'} else {'DarkGray'})
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # --------------------------------------------------------
    # 1. Check MongoDB
    # --------------------------------------------------------
    Write-Host "[CHECK] MongoDB at $MongoPath..." -NoNewline
    $mongoExe = Join-Path $MongoPath "mongod.exe"
    if (Test-Path $mongoExe) { Write-Host " OK" -ForegroundColor Green } 
    else { 
        Write-Host " MISSING" -ForegroundColor Red
        Write-Log "MongoDB executable not found at $mongoExe" "ERROR"
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
    Write-Log "Directories ready"
    
    # --------------------------------------------------------
    # 3. Start Services
    # --------------------------------------------------------
    $mongoOk = Start-MongoDB
    if (-not $mongoOk) { 
        if ($script:Settings.AutoRestart) { 
            $crashed = $true
            continue 
        } else { exit 1 }
    }
    
    $backendOk = Start-Backend
    if (-not $backendOk) { 
        if ($script:Settings.AutoRestart) { 
            $crashed = $true
            continue
        } else { exit 1 }
    }
    
    # --------------------------------------------------------
    # 4. Open Browser
    # --------------------------------------------------------
    Start-Browser
    
    # --------------------------------------------------------
    # 5. Ready
    # --------------------------------------------------------
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Ready! Dashboard: http://localhost:$AppPort" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "[MONITOR] Closing Browser or Console stops all" -ForegroundColor DarkGray
    if ($script:Settings.AutoRestart) {
        Write-Host "[AUTO-RESTART] ON - $($script:Settings.MaxRestartAttempts) attempts, $($script:Settings.RestartDelaySeconds)s delay" -ForegroundColor DarkGray
    }
    Write-Host ""
    Write-Log "Application started successfully"
    
    # --------------------------------------------------------
    # 6. Monitor Loop
    # --------------------------------------------------------
    while ($runLoop) {
        Start-Sleep -Milliseconds 750
        
        # Browser closed?
        if ($script:BrowserPID -and -not (Test-ProcessAlive $script:BrowserPID)) {
            Write-Host "[DETECT] Browser closed → stopping all..." -ForegroundColor Yellow
            Write-Log "Browser closed by user"
            Stop-Everything "browser-closed"
            $runLoop = $false
            break
        }
        
        # Console closed?
        if (-not (Test-ProcessAlive $script:LauncherPID)) {
            Write-Host "[DETECT] Console closed → stopping all..." -ForegroundColor Yellow
            Write-Log "Console closed by user"
            Stop-Everything "console-closed"
            $runLoop = $false
            break
        }
        
        # Backend crashed?
        if ($script:BackendPID -and (Test-ProcessAlive $script:BackendPID) -eq $false -and $script:BackendPID -ne 0) {
            Write-Host "[DETECT] Backend crashed!" -ForegroundColor Red
            Write-Log "Backend process died unexpectedly" "ERROR"
            
            if ($script:Settings.AutoRestart) {
                $crashed = $true
                Stop-Everything "backend-crashed"
                break  # to crash recovery loop
            } else {
                Stop-Everything "backend-crashed-manual"
                $runLoop = $false
                break
            }
        }
    }
}

Write-Host "[EXIT] Launcher terminated." -ForegroundColor Gray
Write-Log "Launcher exited normally"
exit 0
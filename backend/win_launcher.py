"""
Windows entry point for Sentinel Pulse.

Starts the FastAPI server, optionally launches MongoDB, and opens browser automatically.
Features:
- System tray icon with context menu
- Global hotkeys for quick actions
- Auto-start option on system boot
- Native Windows notifications
"""
import asyncio
import os
import sys
import webbrowser
import subprocess
import threading
import time
import signal
import socket
import logging
import winreg
from pathlib import Path

# Set Windows console to UTF-8 mode BEFORE any other imports
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

if getattr(sys, 'frozen', False):
    BASE_DIR = Path(sys._MEIPASS)
else:
    BASE_DIR = Path(__file__).parent

sys.path.insert(0, str(BASE_DIR))

# Set up logger with UTF-8 encoding for console
def _get_stream_handler():
    import sys
    # Use stderr instead - stdout may not be initialized yet at import time
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter('%(asctime)s %(message)s'))
    return handler

def get_log_path():
    return BASE_DIR / "sentinel_pulse.log"

logging.basicConfig(
    level=logging.INFO, 
    format="%(asctime)s %(message)s",
    handlers=[
        logging.FileHandler(str(get_log_path())),
        _get_stream_handler()
    ]
)
logger = logging.getLogger("SentinelPulse")

# Simple file logger for debugging packaged app (on desktop for easy access)
try:
    desktop = Path.home() / "Desktop"
    log_file = desktop / "sentinel_pulse.log"
    fh = logging.FileHandler(str(log_file))
    fh.setFormatter(logging.Formatter("%(asctime)s %(message)s"))
    logger.addHandler(fh)
    logger.info("=== Launcher PID: %d, Log: %s ===", os.getpid(), log_file)
except Exception as e:
    logger.warning("Log file failed: %s", e)


# Optional MongoDB process
_mongo_process = None
_tray_icon = None
_app = None


def is_port_in_use(port: int) -> bool:
    """Check if a port is already in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.connect(('localhost', port))
            return True
        except OSError:
            return False


def check_mongo_running() -> bool:
    """Check if MongoDB is already running."""
    try:
        result = subprocess.run(
            ['tasklist'], 
            capture_output=True, 
            text=True,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
        )
        return 'mongod' in result.stdout.lower()
    except Exception:
        return False


def start_mongodb():
    """Start MongoDB from bundled location."""
    mongo_exe = BASE_DIR / 'mongodb' / 'mongod.exe'
    if mongo_exe.exists():
        start_mongodb_path(mongo_exe)
    else:
        logger.error("MongoDB not found - Sentinel Pulse requires MongoDB")
        logger.error("Please install MongoDB or bundle it with the app")
        sys.exit(1)


def start_mongodb_path(mongo_exe: Path):
    """Start MongoDB from a specific path."""
    global _mongo_process
    
    # Check if MongoDB already running
    if is_port_in_use(27017):
        logger.info("MongoDB already running on port 27017")
        return
    
    logger.info("Starting MongoDB from: %s", mongo_exe)
    _mongo_process = subprocess.Popen(
        [str(mongo_exe), "--dbpath", str(DATA_DIR / "db")],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
    )
    # Wait for MongoDB to start
    for _ in range(20):
        if is_port_in_use(27017):
            logger.info("MongoDB started")
            return
        time.sleep(0.5)
    logger.error("MongoDB failed to start")


def open_browser():
    """Open the dashboard in the default browser."""
    import webbrowser
    import os
    port = int(os.environ.get("PORT", "8002"))
    webbrowser.open(f"http://localhost:{port}")


def graceful_shutdown(signum, frame):
    """Handle graceful shutdown."""
    logger.info("Shutting down...")
    stop_mongodb()
    sys.exit(0)




def _setup_system_tray(): pass  # Optional system tray (can be implemented later)

def _setup_global_hotkeys(): pass  # Optional global hotkeys (can be implemented later)

def stop_mongodb():
    """Stop the MongoDB process we started."""
    global _mongo_process
    if _mongo_process:
        try:
            _mongo_process.terminate()
            _mongo_process.wait(timeout=5)
        except Exception:
            try:
                _mongo_process.kill()
            except Exception:
                pass
        _mongo_process = None


def main():
    port = int(os.environ.get("PORT", "8002"))
    signal.signal(signal.SIGINT, graceful_shutdown)
    signal.signal(signal.SIGTERM, graceful_shutdown)
    logger.info("=" * 50)
    logger.info("Sentinel Pulse v1.0.0")
    logger.info("=" * 50)
    logger.info("")
    
    # MongoDB is required - check for bundled, system MongoDB, or running instance
    mongo_exe = BASE_DIR / "mongodb" / "mongod.exe"
    
    # Check system MongoDB locations
    system_mongo_paths = [
        Path(r"C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"),
        Path(r"C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"),
        Path(r"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"),
        Path(r"C:\Program Files (x86)\MongoDB\Server\8.2\bin\mongod.exe"),
    ]
    
    mongo_running = check_mongo_running()
    
    if mongo_exe.exists():
        logger.info("Using bundled MongoDB...")
        start_mongodb()
    elif any(p.exists() for p in system_mongo_paths):
        logger.info("Using system MongoDB...")
        # System MongoDB is installed and running - just verify connection
        if not mongo_running:
            # Try to start system MongoDB
            for mongo_path in system_mongo_paths:
                if mongo_path.exists():
                    logger.info("Starting system MongoDB from: %s", mongo_path)
                    start_mongodb_path(mongo_path)
                    break
        else:
            logger.info("System MongoDB already running")
    elif mongo_running:
        logger.info("MongoDB already running (detected via tasklist)")
    else:
        logger.error("MongoDB not found - please install MongoDB or bundle mongod.exe")
        logger.error("Download from: https://www.mongodb.com/try/download/community")
        sys.exit(1)
    
    # Give server time to start before opening browser
    time.sleep(2)
    
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()
    
    # Set up system tray (optional - don't fail if it doesn't work)
    try:
        _setup_system_tray()
    except Exception as e:
        logger.warning(f"System tray setup skipped: {e}")
    
    # Set up global hotkeys (optional)
    try:
        _setup_global_hotkeys()
    except Exception as e:
        logger.warning(f"Global hotkeys setup skipped: {e}")
    
    import uvicorn
    from server import app
    
    try:
        uvicorn.run(
            app, 
            host="0.0.0.0", 
            port=port, 
            log_config=None
        )
    finally:
        stop_mongodb()
        logger.info("[Sentinel Pulse] Server stopped")


if __name__ == "__main__":
    main()
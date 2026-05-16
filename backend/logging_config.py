"""Structured logging for Sentinel Pulse.

Adds:
- Correlation IDs for request tracing
- Structured JSON logging
- Error context enrichment
- Colored console output in dev
"""
import json
import logging
import sys
import traceback
from datetime import datetime, timezone
from typing import Any, Optional
from contextvars import ContextVar

# Correlation ID for request tracing
correlation_id: ContextVar[Optional[str]] = ContextVar('correlation_id', default=None)

# Structured log fields that are always included
EXTRA_FIELDS = {
    'app': 'SentinelPulse',
    'version': '1.0.0-beta',
}

class StructuredLogFormatter(logging.Formatter):
    """JSON formatter for structured logging."""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        # Add correlation ID if present
        corr_id = correlation_id.get()
        if corr_id:
            log_data['correlation_id'] = corr_id
        
        # Add extra fields
        for key, value in record.__dict__.get('extra_fields', {}).items():
            log_data[key] = value
        
        # Add exception info
        if record.exc_info:
            log_data['exception'] = {
                'type': record.exc_info[0].__name__ if record.exc_info[0] else None,
                'message': str(record.exc_info[1]) if record.exc_info[1] else None,
                'traceback': traceback.format_exception(*record.exc_info),
            }
        
        # Add custom fields from record
        if hasattr(record, 'symbol'):
            log_data['symbol'] = record.symbol
        if hasattr(record, 'broker_id'):
            log_data['broker_id'] = record.broker_id
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id
            
        return json.dumps(log_data)


class ColoredConsoleFormatter(logging.Formatter):
    """Colored formatter for console output."""
    
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',   # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
    }
    RESET = '\033[0m'
    
    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, self.RESET)
        corr_id = correlation_id.get()
        
        parts = []
        if corr_id:
            parts.append(f'[{corr_id[:8]}]')
        
        parts.append(f'{color}{record.levelname}{self.RESET}')
        parts.append(f'{record.name}:')
        parts.append(record.getMessage())
        
        if record.exc_info:
            parts.append('\n' + traceback.format_exception(*record.exc_info))
        
        return ' '.join(parts)


def setup_logging(
    level: str = 'INFO',
    json_format: bool = False,
    include_correlation_ids: bool = True,
) -> None:
    """Setup structured logging.
    
    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR)
        json_format: Use JSON output (for production)
        include_correlation_ids: Enable correlation ID tracking
    """
    log_level = getattr(logging, level.upper(), logging.INFO)
    
    # Root logger
    root = logging.getLogger()
    root.setLevel(log_level)
    
    # Remove existing handlers
    for handler in root.handlers[:]:
        root.removeHandler(handler)
    
    # Console handler
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(log_level)
    
    # Set formatter
    if json_format:
        console.setFormatter(StructuredLogFormatter())
    else:
        console.setFormatter(ColoredConsoleFormatter())
    
    root.addHandler(console)
    
    # Set level for our loggers
    for logger_name in ['sentinelpulse', 'SentinelPulse', 'trading_engine', 'broker']:
        logger = logging.getLogger(logger_name)
        logger.setLevel(log_level)


def log_error_with_context(
    logger: logging.Logger,
    error: Exception,
    context: dict[str, Any],
    symbol: Optional[str] = None,
    broker_id: Optional[str] = None,
    user_id: Optional[str] = None,
) -> None:
    """Log an error with rich context.
    
    Args:
        logger: Logger instance
        error: The exception
        context: Additional context dict
        symbol: Ticker symbol if applicable
        broker_id: Broker ID if applicable
        user_id: User ID if applicable
    """
    extra = {'extra_fields': context}
    if symbol:
        extra['symbol'] = symbol
    if broker_id:
        extra['broker_id'] = broker_id
    if user_id:
        extra['user_id'] = user_id
    
    logger.exception(
        f"{type(error).__name__}: {error}",
        exc_info=error,
        extra=extra,
    )


def log_trade(
    logger: logging.Logger,
    action: str,
    symbol: str,
    quantity: float,
    price: float,
    broker_id: str,
    success: bool,
    error: Optional[str] = None,
) -> None:
    """Log a trade execution."""
    logger.info(
        f"Trade {action} {symbol} {quantity}@{price} via {broker_id}: {'OK' if success else error}",
        extra={
            'extra_fields': {
                'trade': {
                    'action': action,
                    'symbol': symbol,
                    'quantity': quantity,
                    'price': price,
                    'broker': broker_id,
                    'success': success,
                    'error': error,
                }
            }
        }
    )


def log_signal(
    logger: logging.Logger,
    strategy_name: str,
    symbol: str,
    signal: str,
    confidence: float,
    reason: str,
) -> None:
    """Log a signal generation."""
    logger.info(
        f"Signal: {strategy_name} -> {signal} ({confidence:.0%}) for {symbol}: {reason}",
        extra={
            'extra_fields': {
                'signal': {
                    'strategy': strategy_name,
                    'symbol': symbol,
                    'action': signal,
                    'confidence': confidence,
                    'reason': reason,
                }
            }
        }
    )
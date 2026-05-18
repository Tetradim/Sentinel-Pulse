"""Shared default ticker seeding for startup and WebSocket fallback."""
from __future__ import annotations

import logging
from typing import Iterable

from schemas import TickerConfig

DEFAULT_TICKER_SYMBOLS = ("SPY", "QQQ", "AAPL", "NVDA")
LEGACY_DEFAULT_TICKER_SYMBOLS = ("TSLA", "AAPL", "NVDA")


def _normalize_symbols(symbols: Iterable[str | None]) -> set[str]:
    return {str(symbol).upper() for symbol in symbols if symbol}


def make_default_ticker(symbol: str, sort_order: int) -> TickerConfig:
    """Build a canonical default ticker document."""
    return TickerConfig(symbol=symbol, base_power=100.0, market="US", sort_order=sort_order)


async def ensure_default_tickers(db, logger: logging.Logger | None = None) -> list[str]:
    """Ensure a fresh or legacy-seeded database has the canonical defaults.

    Historically, normal startup seeded only TSLA/AAPL/NVDA while the WebSocket
    fallback seeded SPY/QQQ/AAPL/NVDA. Because startup runs before the first
    WebSocket connection, users saw only three default watchlist cards. This
    helper centralizes the default set and backfills SPY/QQQ only when the DB
    still exactly matches the legacy seed set, avoiding changes to user-managed
    watchlists.
    """
    docs = await db.tickers.find({}, {"_id": 0, "symbol": 1, "sort_order": 1}).to_list(100)
    symbols = _normalize_symbols(doc.get("symbol") for doc in docs)

    if not docs:
        symbols_to_seed = list(DEFAULT_TICKER_SYMBOLS)
        start_order = 0
    elif symbols == set(LEGACY_DEFAULT_TICKER_SYMBOLS):
        symbols_to_seed = [symbol for symbol in DEFAULT_TICKER_SYMBOLS if symbol not in symbols]
        next_sort_order = max((doc.get("sort_order", index) for index, doc in enumerate(docs)), default=-1) + 1
        start_order = max(next_sort_order, len(docs))
    else:
        return []

    seeded: list[str] = []
    for offset, symbol in enumerate(symbols_to_seed):
        ticker = make_default_ticker(symbol, start_order + offset)
        result = await db.tickers.update_one(
            {"symbol": symbol},
            {"$setOnInsert": ticker.model_dump()},
            upsert=True,
        )
        if result.upserted_id is not None:
            seeded.append(symbol)

    if seeded and logger:
        logger.info("Seeded default tickers: %s", ", ".join(seeded))

    return seeded

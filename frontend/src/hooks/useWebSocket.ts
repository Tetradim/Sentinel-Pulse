import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/stores/useStore';
import { wsLog } from '@/lib/wsLogger';

// Vite uses VITE_ prefix for env vars (CRA used REACT_APP_)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

function getWsUrl(): string {
  const url = BACKEND_URL 
    ? new URL(BACKEND_URL).host 
    : `${window.location.host}`;
  const proto = BACKEND_URL 
    ? (new URL(BACKEND_URL).protocol === 'https:' ? 'wss:' : 'ws:')
    : (window.location.protocol === 'https:' ? 'wss:' : 'ws:');
  const wsUrl = `${proto}//${url}/api/ws`;
  console.log('[WS] getWsUrl:', wsUrl);
  return wsUrl;
}

export function useWebSocket() {
  const socket = useRef<WebSocket | null>(null);
  const reconnect = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(3000); // Start at 3s, exponential: 3s→6s→12s→30s...→5min max
  const store = useStore();

  const connect = useCallback(() => {
    if (socket.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(getWsUrl());
    socket.current = ws;

    ws.onopen = () => {
      console.log('[WS] onopen - WebSocket connected');
      reconnectDelay.current = 3000; // Reset to 3s on successful connect
      store.setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        wsLog.in(data.type, data);
        console.log('[WS] onmessage:', data.type, data);

        if (data.type === 'INITIAL_STATE') {
          console.log('[WS] INITIAL_STATE - tickers:', data.tickers ? Object.keys(data.tickers) : 'none');
          console.log('[WS] INITIAL_STATE - prices:', data.prices ? Object.keys(data.prices) : 'none');
          if (data.tickers) store.setTickers(data.tickers);
          if (data.prices) store.setPrices(data.prices);
          if (data.profits) store.setProfits(data.profits);
          if (data.cash_reserve !== undefined) store.setCashReserve(data.cash_reserve);
          if (data.increment_step !== undefined) store.setIncrementStep(data.increment_step);
          if (data.decrement_step !== undefined) store.setDecrementStep(data.decrement_step);
          if (data.account_balance !== undefined) {
            store.setAccountBalance(data.account_balance, data.allocated ?? 0, data.available ?? 0);
          }
          if (data.simulate_24_7 !== undefined) store.setSimulate247(data.simulate_24_7);
          if (data.live_during_market_hours !== undefined) store.setLiveDuringMarketHours(data.live_during_market_hours);
          if (data.paper_after_hours !== undefined) store.setPaperAfterHours(data.paper_after_hours);
          store.setPaused(data.paused ?? false);
          store.setRunning(data.running ?? false);
          store.setMarketOpen(data.market_open ?? false);
        }

        if (data.type === 'PRICE_UPDATE') {
          console.log('[WS] PRICE_UPDATE - prices:', data.prices ? Object.keys(data.prices) : 'none');
          console.log('[WS] PRICE_UPDATE - sample price:', data.prices ? Object.values(data.prices).slice(0, 3) : 'none');
          if (data.prices) {
            store.setPrices(data.prices);
            store.appendPriceHistory(data.prices);
          }
          if (data.positions) store.setPositions(data.positions);
          if (data.profits) store.setProfits(data.profits);
          if (data.cash_reserve !== undefined) store.setCashReserve(data.cash_reserve);
          if (data.simulate_24_7 !== undefined) store.setSimulate247(data.simulate_24_7);
          store.setPaused(data.paused ?? store.paused);
          store.setRunning(data.running ?? store.running);
          store.setMarketOpen(data.market_open ?? store.marketOpen);
        }

        if (data.type === 'PROFITS_UPDATE') {
          if (data.profits) store.setProfits(data.profits);
          if (data.cash_reserve !== undefined) store.setCashReserve(data.cash_reserve);
        }

        if (data.type === 'TRADE') {
          store.addTrade(data.trade);
        }

        if (data.type === 'TICKER_ADDED') {
          console.log('[WS] TICKER_ADDED:', data.ticker?.symbol);
          store.addTicker(data.ticker);
        }

        if (data.type === 'TICKER_UPDATED') {
          console.log('[WS] TICKER_UPDATED:', data.ticker?.symbol);
          store.updateTicker(data.ticker.symbol, data.ticker);
        }

        if (data.type === 'TICKER_DELETED') {
          console.log('[WS] TICKER_DELETED:', data.symbol);
          store.removeTicker(data.symbol);
        }

        if (data.type === 'TICKERS_REORDERED') {
          console.log('[WS] TICKERS_REORDERED:', data.tickers ? Object.keys(data.tickers) : 'none');
          if (data.tickers) store.setTickers(data.tickers);
        }

        if (data.type === 'ACCOUNT_UPDATE') {
          console.log('[WS] ACCOUNT_UPDATE:', data);
          store.setAccountBalance(data.account_balance ?? 0, data.allocated ?? 0, data.available ?? 0);
        }

        if (data.type === 'BOT_STATUS') {
          console.log('[WS] BOT_STATUS:', data);
          store.setRunning(data.running ?? store.running);
          store.setPaused(data.paused ?? store.paused);
        }

        if (data.type === 'MODE_SWITCH') {
          console.log('[WS] MODE_SWITCH:', data);
          if (data.simulate_24_7 !== undefined) store.setSimulate247(data.simulate_24_7);
          if (data.trading_mode) store.setTradingMode(data.trading_mode);
        }

        if (data.type === 'BROKER_FAILED') {
          console.log('[WS] BROKER_FAILED:', data);
          store.setBrokerFailed(data.broker_id, data.reason || 'Connection failed', data.symbol || '');
          // Auto-clear after 30 seconds
          setTimeout(() => {
            store.clearBrokerFailed(data.broker_id);
          }, 30000);
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onclose = (event) => {
      console.log('[WS] onclose:', event.code, event.reason);
      store.setConnected(false);
      const delay = Math.min(reconnectDelay.current, 300000); // Cap at 5 minutes
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, 300000); // Double each attempt
      console.log('[WS] reconnect in:', delay, 'ms');
      reconnect.current = setTimeout(connect, delay);
    };

    ws.onerror = (event) => {
      console.error('[WS] onerror:', event);
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnect.current) clearTimeout(reconnect.current);
      socket.current?.close();
    };
  }, [connect]);

  const send = useCallback((action: string, payload: Record<string, any> = {}) => {
    const msg = { action, ...payload };
    console.log('[WS] send:', action, payload);
    wsLog.out(action, payload);
    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify(msg));
    } else {
      console.warn('[WS] send failed - socket not open:', socket.current?.readyState);
      wsLog.error(action, 'Socket not open — message dropped');
    }
  }, []);

  return { send };
}

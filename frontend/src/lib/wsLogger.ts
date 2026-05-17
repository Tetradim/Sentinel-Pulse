/** WebSocket message logger for debugging.
 * Stores last 500 messages in memory, accessible via Logs tab.
 */
import { useState, useCallback } from 'react';

type WSEvent = {
  direction: 'in' | 'out';
  type: string;
  payload?: unknown;
  ts: string;
  error?: string;
};

const MAX = 500;
const log: WSEvent[] = [];

function now() {
  return new Date().toISOString();
}

function push(e: WSEvent) {
  log.push(e);
  if (log.length > MAX) log.shift();
}

export const wsLog = {
  in: (type: string, payload?: unknown) => push({ direction: 'in', type, payload, ts: now() }),
  
  out: (type: string, payload?: unknown) => push({ direction: 'out', type, payload, ts: now() }),
  
  error: (type: string, error: string) => push({ direction: 'in', type, error, ts: now() }),
  
  get: () => [...log] as WSEvent[],
  
  clear: () => log.splice(0),
  
  // React hook for components
  useLogger: () => {
    const [, setTick] = useState(0);
    const refresh = useCallback(() => setTick(t => t + 1), []);
    
    return {
      log: log.slice(),
      clear: () => { log.splice(0); refresh(); },
      refresh,
    };
  },
};
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Global error handlers — send to backend which logs to sentinel_pulse.log
window.addEventListener('error', (event) => {
  console.error('[GlobalError]', event.error);
  fetch('/api/logs/client-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'uncaught',
      message: event.message,
      source: event.filename,
      line: event.lineno,
      stack: event.error?.stack,
    }),
  }).catch(() => {});
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[UnhandledPromise]', event.reason);
  fetch('/api/logs/client-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'promise',
      message: String(event.reason),
      stack: event.reason?.stack,
    }),
  }).catch(() => {});
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

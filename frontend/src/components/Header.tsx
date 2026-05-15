import { useStore } from '@/stores/useStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useEffect } from 'react';
import { AddTickerDialog } from './AddTickerDialog';
import { FeedbackDialog } from './FeedbackDialog';
import { Play, Square } from 'lucide-react';

export function Header() {
  const { send }       = useWebSocket();
  const running        = useStore((s) => s.running);
  const connected      = useStore((s) => s.connected);
  const marketOpen     = useStore((s) => s.marketOpen);
  const simulate247    = useStore((s) => s.simulate247);
  const themeMode      = useStore((s) => s.themeMode);
  const accentColor    = useStore((s) => s.accentColor);
  const setThemeMode   = useStore((s) => s.setThemeMode);
  const setAccentColor = useStore((s) => s.setAccentColor);

  // Keep accent class on <html> in sync
  useEffect(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.remove(
      'accent-gold','accent-blue','accent-emerald','accent-amber','accent-rose','accent-violet','accent-cyan'
    );
    if (themeMode === 'light') document.documentElement.classList.add('light');
    document.documentElement.classList.add(`accent-${accentColor}`);
  }, [themeMode, accentColor]);

  const modeLabel = simulate247 ? 'PAPER' : 'LIVE';

  return (
    <header className="sp-header" data-testid="header">
      {/* Layered gold/silver/gold plate backgrounds */}
      <div className="sp-hdr-gold-top" />
      <div className="sp-hdr-silver"   />
      <div className="sp-hdr-streak"   />
      <div className="sp-hdr-gold-bot" />
      {/* Accent lines */}
      <div className="sp-hdr-line-top" />
      <div className="sp-hdr-line-bot" />

      {/* Brand */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="sp-logo" data-testid="app-title">SENTINEL PULSE</div>
        <div className="sp-logo-sub">Signal Forge Laboratory</div>
      </div>

      <div className="sp-hdr-div" />

      {/* Status pills */}
      <span
        className={`sp-pill ${connected ? 'sp-pill-green' : 'sp-pill-red'}`}
        data-testid="connection-status"
      >
        <span className="sp-pill-dot" />
        {connected ? 'Connected' : 'Offline'}
      </span>

      <span
        className={`sp-pill ${marketOpen ? 'sp-pill-green' : 'sp-pill-gold'}`}
        data-testid="market-status"
      >
        {marketOpen ? 'Market Open' : 'Pre-Market'}
      </span>

      <span
        className={`sp-pill ${simulate247 ? 'sp-pill-gold' : 'sp-pill-green'}`}
        data-testid="trading-mode-status"
      >
        {modeLabel}
      </span>

      {/* Push everything else to the right */}
      <div style={{ flex: 1 }} />

      <AddTickerDialog />
      <FeedbackDialog />

      {!running ? (
        <button
          className="sp-start-btn"
          style={{ marginLeft: 0 }}
          data-testid="start-bot-btn"
          onClick={() => send('START_BOT')}
        >
          <Play size={11} style={{ display: 'inline', marginRight: 4 }} fill="currentColor" />
          START
        </button>
      ) : (
        <button
          className="sp-start-btn"
          style={{ marginLeft: 0, color: '#e03040', borderColor: 'rgba(192,40,46,0.35)' }}
          data-testid="stop-bot-btn"
          onClick={() => send('STOP_BOT')}
        >
          <Square size={11} style={{ display: 'inline', marginRight: 4 }} fill="currentColor" />
          STOP
        </button>
      )}
    </header>
  );
}

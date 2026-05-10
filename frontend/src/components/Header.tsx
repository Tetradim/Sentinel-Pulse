import { useStore } from '@/stores/useStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useState, useEffect } from 'react';
import { AddTickerDialog } from './AddTickerDialog';
import { FeedbackDialog } from './FeedbackDialog';
import {
  Activity,
  Wifi,
  WifiOff,
  Play,
  Square,
  TrendingUp,
  TrendingDown,
  Zap,
  Banknote,
  Wallet,
  PiggyBank,
  AlertTriangle,
  Sun,
  Moon,
} from 'lucide-react';

export function Header() {
  const { send } = useWebSocket();
  const connected       = useStore((s) => s.connected);
  const running         = useStore((s) => s.running);
  const marketOpen      = useStore((s) => s.marketOpen);
  const simulate247     = useStore((s) => s.simulate247);
  const profits         = useStore((s) => s.profits);
  const tickers         = useStore((s) => s.tickers);
  const cashReserve     = useStore((s) => s.cashReserve);
  const accountBalance  = useStore((s) => s.accountBalance);
  const allocated       = useStore((s) => s.allocated);
  const available       = useStore((s) => s.available);
  const themeMode       = useStore((s) => s.themeMode);
  const accentColor     = useStore((s) => s.accentColor);
  const setThemeMode    = useStore((s) => s.setThemeMode);
  const setAccentColor  = useStore((s) => s.setAccentColor);

  const totalPnl = Object.values(profits).reduce((a, b) => a + b, 0);

  const localAllocated      = Object.values(tickers).reduce((s, t) => s + (t.base_power ?? 0), 0);
  const effectiveAllocated  = localAllocated || allocated;
  const effectiveAvailable  = accountBalance - effectiveAllocated;
  const isOverAllocated     = accountBalance > 0 && effectiveAvailable < 0;
  const isLowBalance        = accountBalance > 0 && effectiveAvailable > 0 && effectiveAvailable < accountBalance * 0.1;

  useEffect(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.remove(
      'accent-gold','accent-blue','accent-emerald','accent-amber','accent-rose','accent-violet','accent-cyan'
    );
    if (themeMode === 'light') document.documentElement.classList.add('light');
    document.documentElement.classList.add(`accent-${accentColor}`);
  }, [themeMode, accentColor]);

  const accentOptions: Array<{ id: typeof accentColor; color: string }> = [
    { id: 'blue',    color: '#5b7fff' },
    { id: 'emerald', color: '#2dd4a0' },
    { id: 'amber',   color: '#f59e0b' },
    { id: 'rose',    color: '#f43f5e' },
    { id: 'violet',  color: '#8b5cf6' },
    { id: 'cyan',    color: '#06b6d4' },
  ];

  return (
    <>
      {/* ── Main header ── */}
      <header
        className="gold-border-top border-b border-border px-5 py-0"
        style={{ background: 'linear-gradient(180deg, #101014 0%, #0e0e12 100%)' }}
        data-testid="header"
      >
        <div className="flex items-center h-14 gap-5">

          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <Activity className="w-6 h-6" style={{ color: '#dca828' }} />
              {running && (
                <span
                  className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full pulse-dot"
                  style={{ background: '#2dd4a0', boxShadow: '0 0 6px #2dd4a0' }}
                />
              )}
            </div>
            <div>
              <h1
                className="text-base font-bold tracking-tight text-gold"
                style={{ fontFamily: 'Syne, system-ui, sans-serif', letterSpacing: '0.04em' }}
                data-testid="app-title"
              >
                SENTINEL PULSE
              </h1>
              <p
                className="text-[9px] uppercase tracking-widest"
                style={{ color: 'rgba(220,168,40,0.45)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                Signal Forge Laboratory
              </p>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.06)' }} />

          {/* Status pills */}
          <div className="flex items-center gap-2">
            <StatusPill
              testId="connection-status"
              active={connected}
              icon={connected ? Wifi : WifiOff}
              label={connected ? 'Live' : 'Offline'}
              color={connected ? 'green' : 'red'}
            />
            <StatusPill
              testId="market-status"
              active={marketOpen}
              icon={Activity}
              label={marketOpen ? 'Market Open' : 'Closed'}
              color={marketOpen ? 'green' : 'gold'}
            />
            <span
              data-testid="trading-mode-status"
              className="market-badge"
              style={simulate247
                ? { background: 'rgba(220,168,40,0.12)', color: '#dca828', border: '1px solid rgba(220,168,40,0.25)' }
                : { background: 'rgba(45,212,160,0.1)', color: '#2dd4a0', border: '1px solid rgba(45,212,160,0.2)' }
              }
            >
              {simulate247 ? 'PAPER' : 'LIVE'}
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.06)' }} />

          {/* Metrics */}
          <div className="hidden lg:flex items-center gap-5 flex-1">
            {accountBalance > 0 && (
              <>
                <MetricItem testId="metric-balance"   label="Account"   value={`$${accountBalance.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`} icon={Wallet} />
                <MetricItem testId="metric-allocated" label="Allocated"  value={`$${effectiveAllocated.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`} icon={Zap} />
                <MetricItem testId="metric-available" label="Available"  value={`$${effectiveAvailable.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`} icon={PiggyBank} positive={effectiveAvailable >= 0} warning={isLowBalance} />
              </>
            )}
            <MetricItem
              testId="metric-pnl"
              label="Total P&L"
              value={`${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`}
              icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
              positive={totalPnl >= 0}
              isPnl
            />
            {cashReserve > 0 && (
              <MetricItem testId="metric-cash" label="Cash Reserve" value={`$${cashReserve.toFixed(2)}`} positive icon={Banknote} />
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 ml-auto shrink-0">

            {/* Theme controls */}
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              data-testid="theme-controls"
            >
              <button
                data-testid="theme-mode-btn"
                onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                title={themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
                className="p-1 rounded hover:bg-white/5 transition-colors"
              >
                {themeMode === 'dark'
                  ? <Sun size={12} style={{ color: '#dca828' }} />
                  : <Moon size={12} style={{ color: '#8b5cf6' }} />
                }
              </button>
              <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />
              <div className="flex items-center gap-1">
                {accentOptions.map((c) => (
                  <button
                    key={c.id}
                    data-testid={`accent-${c.id}`}
                    onClick={() => setAccentColor(c.id)}
                    title={c.id}
                    className="w-3.5 h-3.5 rounded-full transition-all"
                    style={{
                      backgroundColor: c.color,
                      opacity: accentColor === c.id ? 1 : 0.45,
                      outline: accentColor === c.id ? `2px solid ${c.color}` : 'none',
                      outlineOffset: 1,
                      transform: accentColor === c.id ? 'scale(1.15)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>

            <AddTickerDialog />
            <FeedbackDialog />

            {!running ? (
              <button
                data-testid="start-bot-btn"
                onClick={() => send('START_BOT')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  fontFamily: 'Rajdhani, sans-serif',
                  letterSpacing: '0.08em',
                  background: 'rgba(45,212,160,0.1)',
                  color: '#2dd4a0',
                  border: '1px solid rgba(45,212,160,0.25)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(45,212,160,0.18)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(45,212,160,0.1)')}
              >
                <Play size={11} fill="currentColor" /> START
              </button>
            ) : (
              <button
                data-testid="stop-bot-btn"
                onClick={() => send('STOP_BOT')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  fontFamily: 'Rajdhani, sans-serif',
                  letterSpacing: '0.08em',
                  background: 'rgba(239,68,68,0.1)',
                  color: '#f05060',
                  border: '1px solid rgba(239,68,68,0.25)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.18)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
              >
                <Square size={11} fill="currentColor" /> STOP
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Warning banners ── */}
      {isOverAllocated && (
        <div className="px-5" data-testid="over-allocated-warning">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-b-lg text-xs"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderTop: 'none', color: '#f05060' }}
          >
            <AlertTriangle size={13} className="shrink-0" />
            <span>
              <strong>Over-allocated by ${Math.abs(effectiveAvailable).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong>
              {' '}— Reduce buy power on some tickers or increase your account balance in Settings.
            </span>
          </div>
        </div>
      )}

      {isLowBalance && !isOverAllocated && (
        <div className="px-5" data-testid="low-balance-warning">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-b-lg text-xs"
            style={{ background: 'rgba(220,168,40,0.08)', border: '1px solid rgba(220,168,40,0.2)', borderTop: 'none', color: '#dca828' }}
          >
            <AlertTriangle size={13} className="shrink-0" />
            <span>
              <strong>Low available balance</strong>
              {' '}— Only ${effectiveAvailable.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} remaining ({((effectiveAvailable / accountBalance) * 100).toFixed(1)}% of account).
            </span>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Sub-components ── */

function StatusPill({
  testId, active, icon: Icon, label, color,
}: {
  testId: string; active: boolean; icon: any; label: string;
  color: 'green' | 'red' | 'gold';
}) {
  const colors = {
    green: { bg: 'rgba(45,212,160,0.1)',  text: '#2dd4a0', border: 'rgba(45,212,160,0.2)'  },
    red:   { bg: 'rgba(240,80,96,0.1)',   text: '#f05060', border: 'rgba(240,80,96,0.2)'   },
    gold:  { bg: 'rgba(220,168,40,0.1)',  text: '#dca828', border: 'rgba(220,168,40,0.2)'  },
  };
  const c = colors[color];
  return (
    <span
      data-testid={testId}
      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full market-badge"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      <Icon size={11} />
      {label}
    </span>
  );
}

function MetricItem({
  label, value, positive, warning, isPnl, icon: Icon, testId,
}: {
  label: string; value: string; positive?: boolean; warning?: boolean;
  isPnl?: boolean; icon: any; testId: string;
}) {
  const color = warning
    ? '#dca828'
    : positive === undefined
      ? '#dca828'
      : isPnl
        ? positive ? '#2dd4a0' : '#f05060'
        : positive ? '#e8dfc0' : '#f05060';

  return (
    <div className={`flex items-center gap-2 ${warning ? 'animate-pulse' : ''}`} data-testid={testId}>
      <Icon size={13} style={{ color, opacity: 0.7 }} />
      <div>
        <p
          className="text-[9px] uppercase tracking-wider"
          style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono, monospace' }}
        >
          {label}
        </p>
        <p
          className="font-mono text-sm font-bold tracking-tight"
          style={{ color, lineHeight: 1.1 }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

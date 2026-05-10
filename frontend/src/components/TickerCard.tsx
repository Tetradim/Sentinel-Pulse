import React, { memo, useState, useCallback, useEffect } from 'react';
import { useStore, TickerConfig } from '@/stores/useStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { apiFetch } from '@/lib/api';
import {
  Trash2,
  TrendingUp,
  TrendingDown,
  Zap,
  Banknote,
  GripVertical,
  Settings2,
  Plug,
  Copy,
  Palette,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getMarketMeta, formatPrice, formatPriceSecondary } from '@/lib/market-utils';

interface Props {
  ticker: TickerConfig;
  onConfigOpen: (symbol: string) => void;
}

interface BrokerOption {
  id: string;
  name: string;
  color: string;
  supported: boolean;
}

let _brokerPromise: Promise<BrokerOption[]> | null = null;

function fetchBrokers(): Promise<BrokerOption[]> {
  if (!_brokerPromise) {
    _brokerPromise = apiFetch('/api/brokers')
      .then((data: any[]) =>
        data.filter((b) => b.supported).map((b) => ({
          id: b.id,
          name: b.name,
          color: b.color,
          supported: b.supported,
        }))
      )
      .catch(() => [] as BrokerOption[]);
  }
  return _brokerPromise;
}

// Gold-first color palette — metallic tones for the card accent line
const CARD_COLORS = [
  '#dca828', // gold (default)
  '#2dd4a0', // emerald
  '#4da8f0', // steel blue
  '#f05060', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#f97316', // orange
  '#94a3b8', // slate
];

// ── Helper: gold-tinted surface with accent line ──────────────────────────────
const cardSurface = (accent: string, isPositive: boolean, isActive: boolean, isSelected: boolean) => ({
  base: {
    position: 'relative' as const,
    background: 'linear-gradient(145deg, #1c1c24 0%, #16161c 60%, #141418 100%)',
    border: `1px solid ${
      isSelected
        ? 'rgba(220,168,40,0.6)'
        : isActive
          ? isPositive
            ? 'rgba(45,212,160,0.2)'
            : 'rgba(240,80,96,0.2)'
          : 'rgba(255,255,255,0.05)'
    }`,
    borderRadius: 10,
    overflow: 'hidden' as const,
    transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.1s',
    boxShadow: isSelected
      ? '0 0 0 1px rgba(220,168,40,0.4), 0 0 20px -6px rgba(220,168,40,0.25)'
      : isActive
        ? isPositive
          ? '0 0 16px -6px rgba(45,212,160,0.25)'
          : '0 0 16px -6px rgba(240,80,96,0.2)'
        : 'none',
  },
});

export const TickerCard = memo(function TickerCard({ ticker, onConfigOpen }: Props) {
  const { send } = useWebSocket();
  const price              = useStore((s) => s.prices[ticker.symbol] ?? 0);
  const pnl                = useStore((s) => s.profits[ticker.symbol] ?? 0);
  const position           = useStore((s) => s.positions[ticker.symbol]);
  const currencyDisplay    = useStore((s) => s.currencyDisplay);
  const fxRates            = useStore((s) => s.fxRates);
  const compactMode        = useStore((s) => s.compactMode);
  const tickerColors       = useStore((s) => s.tickerColors);
  const selectedTickers    = useStore((s) => s.selectedTickers);
  const toggleTickerSelection = useStore((s) => s.toggleTickerSelection);
  const setTickerColor     = useStore((s) => s.setTickerColor);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmTP, setConfirmTP]         = useState(false);
  const [brokers, setBrokers]             = useState<BrokerOption[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [quickEdit, setQuickEdit]         = useState({ buy: false, sell: false, stop: false });
  const [editValues, setEditValues]       = useState({
    buy_offset:  ticker.buy_offset,
    sell_offset: ticker.sell_offset,
    stop_offset: ticker.stop_offset,
  });

  useEffect(() => { fetchBrokers().then(setBrokers); }, []);

  useEffect(() => {
    setEditValues({
      buy_offset:  ticker.buy_offset,
      sell_offset: ticker.sell_offset,
      stop_offset: ticker.stop_offset,
    });
  }, [ticker.buy_offset, ticker.sell_offset, ticker.stop_offset]);

  const marketMeta   = getMarketMeta(ticker);
  const isNonUS      = marketMeta.currency !== 'USD';
  const primaryPrice = formatPrice(price, ticker, currencyDisplay, fxRates);

  const handleBrokerToggle = useCallback((brokerId: string) => {
    const current = ticker.broker_ids || [];
    const updated = current.includes(brokerId)
      ? current.filter((id) => id !== brokerId)
      : [...current, brokerId];
    send('UPDATE_TICKER', { symbol: ticker.symbol, broker_ids: updated });
  }, [send, ticker.symbol, ticker.broker_ids]);

  const selectedBrokers = brokers.filter((b) => (ticker.broker_ids || []).includes(b.id));
  const failedBrokers   = useStore((s) => s.failedBrokers);

  const isPositive  = pnl >= 0;
  const isActive    = ticker.enabled;
  const isSelected  = selectedTickers.includes(ticker.symbol);
  const cardColor   = tickerColors[ticker.symbol] || CARD_COLORS[0];
  const hasPosition = position && position.quantity > 0;

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    send('DELETE_TICKER', { symbol: ticker.symbol });
  };

  const handleTakeProfit = () => {
    if (!confirmTP) {
      setConfirmTP(true);
      setTimeout(() => setConfirmTP(false), 4000);
      return;
    }
    send('TAKE_PROFIT', { symbol: ticker.symbol });
    setConfirmTP(false);
    toast.success(`Took profit for ${ticker.symbol}: $${pnl.toFixed(2)} moved to cash`);
  };

  const handleDuplicate = async () => {
    try {
      const allTickers = useStore.getState().tickers;
      const newSymbol  = `${ticker.symbol}_COPY`;
      const newTicker  = { ...ticker, symbol: newSymbol, sort_order: Object.keys(allTickers).length };
      delete (newTicker as any)._id;
      await apiFetch('/api/tickers', { method: 'POST', body: JSON.stringify(newTicker) });
      toast.success(`Duplicated ${ticker.symbol} as ${newSymbol}`);
    } catch {
      toast.error('Failed to duplicate ticker');
    }
  };

  const saveQuickEdit = (field: string, value: number) => {
    send('UPDATE_TICKER', { symbol: ticker.symbol, [field]: value });
    setQuickEdit({ buy: false, sell: false, stop: false });
    toast.success(`${field} updated to ${value}`);
  };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ticker.symbol });

  const dndStyle = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.4 : 1,
    zIndex:     isDragging ? 50 : 'auto',
    '--card-accent': cardColor,
  } as React.CSSProperties;

  const surfaces = cardSurface(cardColor, isPositive, isActive, isSelected);

  // ── Compact view ─────────────────────────────────────────────────────────────
  if (compactMode) {
    return (
      <div
        ref={setNodeRef}
        style={{
          ...dndStyle,
          ...surfaces.base,
          borderLeft: isActive ? `3px solid ${cardColor}` : undefined,
          opacity: isActive ? 1 : 0.55,
        }}
        data-testid={`ticker-card-${ticker.symbol}`}
        onClick={() => toggleTickerSelection(ticker.symbol)}
      >
        {/* Accent top line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${cardColor}80, transparent)`,
        }} />

        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <Checkbox checked={isSelected} onCheckedChange={() => {}} className="h-3 w-3" />
            <span
              className="font-bold text-sm"
              style={{
                fontFamily: 'Syne, system-ui, sans-serif',
                color: ticker.auto_stopped ? '#f05060' : '#f0ead6',
              }}
            >
              {ticker.symbol}
            </span>
            <span className="text-muted-foreground text-xs font-mono">{primaryPrice}</span>
          </div>
          <div className="flex items-center gap-2">
            {pnl !== 0 && (
              <span
                className="text-xs font-mono font-bold"
                style={{ color: pnl >= 0 ? '#2dd4a0' : '#f05060' }}
              >
                {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onConfigOpen(ticker.symbol); }}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <Settings2 size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Full card view ────────────────────────────────────────────────────────────
  return (
    <div
      ref={setNodeRef}
      style={{ ...dndStyle, ...surfaces.base, opacity: isActive ? 1 : 0.55 }}
      data-testid={`ticker-card-${ticker.symbol}`}
      onDoubleClick={() => onConfigOpen(ticker.symbol)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = isDragging ? '' : 'translateY(-1px)';
        (e.currentTarget as HTMLElement).style.borderColor = `${cardColor}40`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = '';
        (e.currentTarget as HTMLElement).style.borderColor = surfaces.base.border.split(' ').slice(2).join(' ');
      }}
    >
      {/* ── Accent top line (metal gleam) ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: isActive
          ? `linear-gradient(90deg, transparent, ${cardColor}60, ${cardColor}, ${cardColor}60, transparent)`
          : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
        opacity: isActive ? 1 : 0.5,
      }} />

      {/* ── Background glow blob ── */}
      {isActive && (
        <div style={{
          position: 'absolute', top: -32, right: -32,
          width: 96, height: 96, borderRadius: '50%',
          background: isPositive ? 'rgba(45,212,160,0.06)' : 'rgba(240,80,96,0.06)',
          filter: 'blur(24px)',
          pointerEvents: 'none',
        }} />
      )}

      {/* ── Auto-stopped banner ── */}
      {ticker.auto_stopped && (
        <div style={{
          background: 'rgba(240,80,96,0.12)', borderBottom: '1px solid rgba(240,80,96,0.2)',
          padding: '3px 12px', fontSize: 9, letterSpacing: '0.12em',
          color: '#f05060', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase',
        }}>
          ⚠ Auto-stopped — {ticker.auto_stop_reason || 'Risk limit hit'}
        </div>
      )}

      <div style={{ padding: '12px 14px 10px' }}>

        {/* ── Title bar ── */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing"
              style={{ color: 'rgba(255,255,255,0.15)', padding: 0 }}
              data-testid={`drag-handle-${ticker.symbol}`}
            >
              <GripVertical size={13} />
            </button>

            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleTickerSelection(ticker.symbol)}
              className="h-3.5 w-3.5"
            />

            <h3
              style={{
                fontFamily: 'Syne, system-ui, sans-serif',
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: ticker.auto_stopped ? '#f05060' : '#f0ead6',
                lineHeight: 1,
              }}
            >
              {isNonUS && <span style={{ marginRight: 4 }}>{marketMeta.flag}</span>}
              {ticker.symbol}
            </h3>

            {/* Status badges */}
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                padding: '2px 6px',
                borderRadius: 4,
                fontFamily: 'JetBrains Mono, monospace',
                ...(isActive
                  ? { background: `${cardColor}18`, color: cardColor, border: `1px solid ${cardColor}40` }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.06)' }
                ),
              }}
            >
              {isActive ? 'LIVE' : 'OFF'}
            </span>

            {ticker.trailing_enabled && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                padding: '2px 6px', borderRadius: 4,
                background: 'rgba(220,168,40,0.1)', color: '#dca828',
                border: '1px solid rgba(220,168,40,0.25)',
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                TRAIL
              </span>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            {/* Color picker */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                style={{ padding: 5, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Card color"
              >
                <Palette size={11} style={{ color: cardColor }} />
              </button>
              {showColorPicker && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 4,
                  padding: 8, background: '#1c1c24', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 50,
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
                    {CARD_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => { setTickerColor(ticker.symbol, color); setShowColorPicker(false); }}
                        style={{
                          width: 18, height: 18, borderRadius: '50%',
                          background: color, border: `2px solid ${cardColor === color ? '#fff' : 'transparent'}`,
                          cursor: 'pointer', padding: 0,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleDuplicate}
              style={{ padding: 5, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Duplicate ticker"
            >
              <Copy size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
            </button>

            <Switch
              checked={isActive}
              onCheckedChange={(checked) => send('UPDATE_TICKER', { symbol: ticker.symbol, enabled: checked })}
              className="h-4 w-7"
            />
          </div>
        </div>

        {/* ── Separator ── */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 0 10px' }} />

        {/* ── Price & P&L ── */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 22,
                fontWeight: 600,
                color: '#f0ead6',
                letterSpacing: '-0.01em',
                lineHeight: 1,
              }}
            >
              {primaryPrice}
            </div>
            {isNonUS && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                {formatPriceSecondary(price, ticker, currencyDisplay, fxRates)}
              </div>
            )}
          </div>

          {pnl !== 0 && (
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 17,
                  fontWeight: 700,
                  color: pnl >= 0 ? '#2dd4a0' : '#f05060',
                  lineHeight: 1,
                }}
              >
                {pnl >= 0 ? '+' : ''}{formatPrice(Math.abs(pnl), ticker, currencyDisplay, fxRates)}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>
                P&L
              </div>
            </div>
          )}
        </div>

        {/* ── P&L progress bar ── */}
        {pnl !== 0 && (
          <div style={{ height: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 1, marginBottom: 10, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(Math.abs(pnl) / (ticker.base_power || 100) * 100, 100)}%`,
              background: pnl >= 0
                ? 'linear-gradient(90deg, rgba(45,212,160,0.3), #2dd4a0)'
                : 'linear-gradient(90deg, rgba(240,80,96,0.3), #f05060)',
              borderRadius: 1,
              transition: 'width 0.5s ease',
            }} />
          </div>
        )}

        {/* ── Open position ── */}
        {position && position.quantity > 0 && (
          <div style={{
            marginBottom: 10, padding: '6px 10px', borderRadius: 6,
            background: 'rgba(220,168,40,0.06)', border: '1px solid rgba(220,168,40,0.15)',
            fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>Holding: </span>
            <span style={{ color: '#f0ead6', fontWeight: 600 }}>{position.quantity.toFixed(4)}</span>
            <span style={{ color: 'rgba(255,255,255,0.35)' }}> @ </span>
            <span style={{ color: '#f0ead6' }}>{formatPrice(position.avg_entry, ticker, currencyDisplay, fxRates)}</span>
            <span style={{ marginLeft: 8, fontWeight: 700, color: position.unrealized_pnl >= 0 ? '#2dd4a0' : '#f05060' }}>
              {position.unrealized_pnl >= 0 ? '+' : ''}{formatPrice(Math.abs(position.unrealized_pnl), ticker, currencyDisplay, fxRates)}
            </span>
          </div>
        )}

        {/* ── Broker chips ── */}
        {selectedBrokers.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
            {selectedBrokers.map((b) => {
              const hasFailed = !!failedBrokers[b.id];
              return (
                <span
                  key={b.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '2px 7px', borderRadius: 4,
                    fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                    background: hasFailed ? 'rgba(240,80,96,0.12)' : `${b.color}18`,
                    color: hasFailed ? '#f05060' : b.color,
                    border: `1px solid ${hasFailed ? 'rgba(240,80,96,0.3)' : `${b.color}40`}`,
                    animation: hasFailed ? 'pulse 1s ease-in-out infinite' : 'none',
                  }}
                >
                  <Plug size={8} />
                  {b.name}
                  {hasFailed && ' ✕'}
                </span>
              );
            })}
          </div>
        )}

        {/* ── Quick edit: buy / sell / stop ── */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10, marginTop: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11 }}>
            {/* Buy */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingDown size={9} style={{ color: '#2dd4a0' }} />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono, monospace', width: 28 }}>Buy</span>
              {quickEdit.buy ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <input
                    type="number"
                    value={editValues.buy_offset}
                    onChange={(e) => setEditValues({ ...editValues, buy_offset: parseFloat(e.target.value) || 0 })}
                    style={{ width: 56, padding: '1px 4px', background: '#1c1c24', border: '1px solid rgba(220,168,40,0.3)', borderRadius: 4, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#f0ead6', outline: 'none' }}
                    autoFocus
                  />
                  <button onClick={() => saveQuickEdit('buy_offset', editValues.buy_offset)} style={{ color: '#dca828', background: 'none', border: 'none', cursor: 'pointer' }}><Zap size={9} /></button>
                  <button onClick={() => setQuickEdit({ ...quickEdit, buy: false })} style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>×</button>
                </div>
              ) : (
                <button
                  onClick={() => setQuickEdit({ ...quickEdit, buy: true })}
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#2dd4a0', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {ticker.buy_percent ? `${ticker.buy_offset}%` : `$${ticker.buy_offset}`}
                </button>
              )}
            </div>

            {/* Sell */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={9} style={{ color: '#4da8f0' }} />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono, monospace', width: 28 }}>Sell</span>
              {quickEdit.sell ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <input
                    type="number"
                    value={editValues.sell_offset}
                    onChange={(e) => setEditValues({ ...editValues, sell_offset: parseFloat(e.target.value) || 0 })}
                    style={{ width: 56, padding: '1px 4px', background: '#1c1c24', border: '1px solid rgba(220,168,40,0.3)', borderRadius: 4, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#f0ead6', outline: 'none' }}
                  />
                  <button onClick={() => saveQuickEdit('sell_offset', editValues.sell_offset)} style={{ color: '#dca828', background: 'none', border: 'none', cursor: 'pointer' }}><Zap size={9} /></button>
                  <button onClick={() => setQuickEdit({ ...quickEdit, sell: false })} style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>×</button>
                </div>
              ) : (
                <button
                  onClick={() => setQuickEdit({ ...quickEdit, sell: true })}
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#4da8f0', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {ticker.sell_percent ? `${ticker.sell_offset}%` : `$${ticker.sell_offset}`}
                </button>
              )}
            </div>

            {/* Stop */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap size={9} style={{ color: '#f05060' }} />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono, monospace', width: 28 }}>Stop</span>
              {quickEdit.stop ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <input
                    type="number"
                    value={editValues.stop_offset}
                    onChange={(e) => setEditValues({ ...editValues, stop_offset: parseFloat(e.target.value) || 0 })}
                    style={{ width: 56, padding: '1px 4px', background: '#1c1c24', border: '1px solid rgba(220,168,40,0.3)', borderRadius: 4, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#f0ead6', outline: 'none' }}
                  />
                  <button onClick={() => saveQuickEdit('stop_offset', editValues.stop_offset)} style={{ color: '#dca828', background: 'none', border: 'none', cursor: 'pointer' }}><Zap size={9} /></button>
                  <button onClick={() => setQuickEdit({ ...quickEdit, stop: false })} style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>×</button>
                </div>
              ) : (
                <button
                  onClick={() => setQuickEdit({ ...quickEdit, stop: true })}
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#f05060', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {ticker.stop_percent ? `${ticker.stop_offset}%` : `$${ticker.stop_offset}`}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer: configure / take profit / delete ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <button
            onClick={() => onConfigOpen(ticker.symbol)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontFamily: 'Rajdhani, sans-serif', fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer',
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#dca828')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
          >
            <Settings2 size={12} />
            Configure
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {pnl !== 0 && (
              <button
                onClick={handleTakeProfit}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                  fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, letterSpacing: '0.08em',
                  textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: confirmTP ? '#dca828' : '#2dd4a0',
                  animation: confirmTP ? 'pulse 1s ease-in-out infinite' : 'none',
                }}
              >
                <Banknote size={11} />
                {confirmTP ? `Take $${pnl.toFixed(2)}?` : 'Take Profit'}
              </button>
            )}

            <button
              onClick={handleDelete}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                color: confirmDelete ? '#f05060' : 'rgba(255,255,255,0.2)',
                animation: confirmDelete ? 'pulse 1s ease-in-out infinite' : 'none',
              }}
              onMouseEnter={(e) => { if (!confirmDelete) (e.currentTarget as HTMLElement).style.color = '#f05060'; }}
              onMouseLeave={(e) => { if (!confirmDelete) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.2)'; }}
            >
              <Trash2 size={11} />
              {confirmDelete ? (hasPosition ? 'Delete with position?' : 'Confirm?') : 'Remove'}
            </button>
          </div>
        </div>

        {/* ── Resize handle (visual only — actual resize via CSS resize or future impl) ── */}
        <div className="resize-handle" />
      </div>
    </div>
  );
});

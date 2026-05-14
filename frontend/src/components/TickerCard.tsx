import React, { memo, useState, useCallback, useEffect } from 'react';
import { useStore, TickerConfig } from '@/stores/useStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Switch } from '@/components/ui/switch';
import { apiFetch } from '@/lib/api';
import { Trash2, TrendingUp, TrendingDown, Zap, Banknote, GripVertical, Settings2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getMarketMeta, formatPrice } from '@/lib/market-utils';
import { TunnelSVG } from './TunnelSVG';

interface Props {
  ticker: TickerConfig;
  onConfigOpen: (symbol: string) => void;
  tunnelColor: 'gold' | 'red' | 'amber' | 'blue';
  cardSheen: string;
}

export const TickerCard = memo(function TickerCard({ ticker, onConfigOpen, tunnelColor, cardSheen }: Props) {
  const { send }           = useWebSocket();
  const price              = useStore((s) => s.prices[ticker.symbol] ?? 0);
  const pnl                = useStore((s) => s.profits[ticker.symbol] ?? 0);
  const position           = useStore((s) => s.positions[ticker.symbol]);
  const priceHistory       = useStore((s) => s.priceHistory[ticker.symbol] ?? []);
  const currencyDisplay    = useStore((s) => s.currencyDisplay);
  const fxRates            = useStore((s) => s.fxRates);
  const failedBrokers      = useStore((s) => s.failedBrokers);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmTP,     setConfirmTP]     = useState(false);
  const [quickEdit,     setQuickEdit]     = useState({ buy: false, sell: false, stop: false });
  const [editVals,      setEditVals]      = useState({ buy: ticker.buy_offset, sell: ticker.sell_offset, stop: ticker.stop_offset });

  useEffect(() => {
    setEditVals({ buy: ticker.buy_offset, sell: ticker.sell_offset, stop: ticker.stop_offset });
  }, [ticker.buy_offset, ticker.sell_offset, ticker.stop_offset]);

  const isActive   = ticker.enabled;
  const isPositive = pnl >= 0;
  const marketMeta = getMarketMeta(ticker);
  const primaryPrice = formatPrice(price, ticker, currencyDisplay, fxRates);

  // Card active class
  const cardClass = [
    'sp-ticker-card',
    isActive && isPositive ? 'active' : '',
    isActive && !isPositive ? 'negative' : '',
    !isActive ? 'paused' : '',
  ].filter(Boolean).join(' ');

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 4000); return; }
    send('DELETE_TICKER', { symbol: ticker.symbol });
  };

  const handleTakeProfit = () => {
    if (!confirmTP) { setConfirmTP(true); setTimeout(() => setConfirmTP(false), 4000); return; }
    send('TAKE_PROFIT', { symbol: ticker.symbol });
    setConfirmTP(false);
    toast.success(`Took profit for ${ticker.symbol}: $${pnl.toFixed(2)}`);
  };

  const handleDuplicate = async () => {
    try {
      const allTickers = useStore.getState().tickers;
      const newSymbol  = `${ticker.symbol}_COPY`;
      const newTicker  = { ...ticker, symbol: newSymbol, sort_order: Object.keys(allTickers).length };
      delete (newTicker as any)._id;
      await apiFetch('/api/tickers', { method: 'POST', body: JSON.stringify(newTicker) });
      toast.success(`Duplicated as ${newSymbol}`);
    } catch { toast.error('Failed to duplicate'); }
  };

  const saveQuickEdit = (field: string, value: number) => {
    send('UPDATE_TICKER', { symbol: ticker.symbol, [field]: value });
    setQuickEdit({ buy: false, sell: false, stop: false });
    toast.success(`${field} → ${value}`);
  };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ticker.symbol });

  const dndStyle: React.CSSProperties = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.4 : isActive ? 1 : 0.6,
    zIndex:     isDragging ? 50 : undefined,
  };

  // Build sparkline points from price history
  const sparkPoints = (() => {
    if (priceHistory.length < 2) return null;
    const pts  = priceHistory.slice(-60);
    const vals = pts.map((p) => p.price);
    const min  = Math.min(...vals);
    const max  = Math.max(...vals);
    const range = max - min || 1;
    const w = 180, h = 26;
    const coords = pts.map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((p.price - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return coords.join(' ');
  })();

  const sparkColor = isPositive ? '#2dd4a0' : '#e03040';
  const sparkId    = `spark-${ticker.symbol}`;

  // Sheen class based on mode
  const modeSheen = (() => {
    if (!isActive) return 'sp-sheen-amber';
    if (ticker.strategy === 'paper') return 'sp-sheen-blue';
    if (!isPositive) return 'sp-sheen-red';
    return cardSheen;
  })();

  const modeLabel = !isActive ? 'PAUSED' : ticker.strategy === 'paper' ? 'PAPER' : 'LIVE';
  const modeClass = !isActive ? 'sp-mode-paused' : ticker.strategy === 'paper' ? 'sp-mode-paper' : 'sp-mode-live';

  return (
    <div
      ref={setNodeRef}
      style={dndStyle}
      className={cardClass}
      data-testid={`ticker-card-${ticker.symbol}`}
      onDoubleClick={() => onConfigOpen(ticker.symbol)}
    >
      {/* Sci-fi tunnel background */}
      <div className="sp-ticker-tunnel">
        <TunnelSVG color={tunnelColor} />
      </div>

      {/* Auto-stopped banner */}
      {ticker.auto_stopped && (
        <div style={{ position:'relative', zIndex:6, background:'rgba(240,80,96,0.12)', borderBottom:'1px solid rgba(240,80,96,0.2)', padding:'3px 10px', fontSize:9, letterSpacing:'.12em', color:'#f05060', fontFamily:"'JetBrains Mono',monospace", textTransform:'uppercase' }}>
          ⚠ Auto-stopped — {ticker.auto_stop_reason || 'Risk limit hit'}
        </div>
      )}

      {/* Title bar */}
      <div className={`sp-ticker-titlebar ${modeSheen}`}>
        <button
          {...attributes}
          {...listeners}
          style={{ background:'none', border:'none', cursor:'grab', color:'rgba(200,145,10,0.25)', padding:0, display:'flex', alignItems:'center', position:'relative', zIndex:1 }}
          data-testid={`drag-handle-${ticker.symbol}`}
        >
          <GripVertical size={13} />
        </button>

        <span className="sp-ticker-sym">
          {marketMeta.currency !== 'USD' && <span style={{ marginRight: 4 }}>{marketMeta.flag}</span>}
          {ticker.symbol}
        </span>

        <span className={`sp-ticker-mode ${modeClass}`}>{modeLabel}</span>

        {ticker.trailing_enabled && (
          <span style={{ fontSize:7, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', padding:'2px 5px', borderRadius:3, background:'rgba(220,168,40,0.1)', color:'#dca828', border:'1px solid rgba(220,168,40,0.22)', fontFamily:"'JetBrains Mono',monospace", position:'relative', zIndex:1 }}>
            TRAIL
          </span>
        )}
      </div>

      {/* Body */}
      <div className="sp-ticker-body">
        {/* Price */}
        <div className="sp-price-row">
          <div className="sp-price">{primaryPrice}</div>
          {pnl !== 0 && (
            <div className={`sp-price-chg ${pnl >= 0 ? 'up' : 'dn'}`}>
              {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
            </div>
          )}
        </div>

        {/* Sparkline */}
        <svg className="sp-sparkline" viewBox="0 0 180 26" preserveAspectRatio="none">
          <defs>
            <linearGradient id={sparkId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={sparkColor} stopOpacity={0.25} />
              <stop offset="100%" stopColor={sparkColor} stopOpacity={0}    />
            </linearGradient>
          </defs>
          {sparkPoints ? (
            <>
              <polyline points={sparkPoints} fill="none" stroke={sparkColor} strokeWidth="1.5" strokeLinecap="round" />
              <polyline points={`${sparkPoints} 180,26 0,26`} fill={`url(#${sparkId})`} />
            </>
          ) : (
            <line x1="0" y1="13" x2="180" y2="13" stroke={sparkColor} strokeWidth="1" strokeOpacity="0.2" strokeDasharray="4 3" />
          )}
        </svg>

        {/* Buy / Sell brackets — quick editable */}
        <div className="sp-bracket-row">
          <div>
            <div className="sp-bracket-lbl">Buy</div>
            {quickEdit.buy ? (
              <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                <input type="number" value={editVals.buy} onChange={(e) => setEditVals(v => ({ ...v, buy: parseFloat(e.target.value)||0 }))} style={{ width:52, padding:'1px 4px', background:'#1c1c24', border:'1px solid rgba(220,168,40,0.3)', borderRadius:3, fontSize:11, fontFamily:"'JetBrains Mono',monospace", color:'#f0ead6', outline:'none' }} autoFocus />
                <button onClick={() => saveQuickEdit('buy_offset', editVals.buy)} style={{ color:'#dca828', background:'none', border:'none', cursor:'pointer', fontSize:11 }}>✓</button>
                <button onClick={() => setQuickEdit(v => ({ ...v, buy:false }))} style={{ color:'rgba(255,255,255,0.3)', background:'none', border:'none', cursor:'pointer', fontSize:13 }}>×</button>
              </div>
            ) : (
              <button className="sp-bracket-val buy" style={{ background:'none', border:'none', cursor:'pointer', padding:0 }} onClick={() => setQuickEdit(v => ({ ...v, buy:true }))}>
                {ticker.buy_percent ? `${ticker.buy_offset}%` : `$${ticker.buy_offset}`}
              </button>
            )}
          </div>
          <div>
            <div className="sp-bracket-lbl">Sell</div>
            {quickEdit.sell ? (
              <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                <input type="number" value={editVals.sell} onChange={(e) => setEditVals(v => ({ ...v, sell: parseFloat(e.target.value)||0 }))} style={{ width:52, padding:'1px 4px', background:'#1c1c24', border:'1px solid rgba(220,168,40,0.3)', borderRadius:3, fontSize:11, fontFamily:"'JetBrains Mono',monospace", color:'#f0ead6', outline:'none' }} autoFocus />
                <button onClick={() => saveQuickEdit('sell_offset', editVals.sell)} style={{ color:'#dca828', background:'none', border:'none', cursor:'pointer', fontSize:11 }}>✓</button>
                <button onClick={() => setQuickEdit(v => ({ ...v, sell:false }))} style={{ color:'rgba(255,255,255,0.3)', background:'none', border:'none', cursor:'pointer', fontSize:13 }}>×</button>
              </div>
            ) : (
              <button className="sp-bracket-val sell" style={{ background:'none', border:'none', cursor:'pointer', padding:0 }} onClick={() => setQuickEdit(v => ({ ...v, sell:true }))}>
                {ticker.sell_percent ? `${ticker.sell_offset}%` : `$${ticker.sell_offset}`}
              </button>
            )}
          </div>
        </div>

        {/* P&L bar */}
        <div className="sp-pnl-bar">
          <div
            className={`sp-pnl-fill ${isPositive ? 'pos' : 'neg'}`}
            style={{ width: `${Math.min(Math.abs(pnl) / (ticker.base_power || 100) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="sp-ticker-footer">
        <div className={`sp-pnl-val ${pnl >= 0 ? 'pos' : 'neg'}`}>
          {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
        </div>
        <div className="sp-card-btns">
          <button className="sp-card-btn" title="Configure" onClick={() => onConfigOpen(ticker.symbol)}>
            <Settings2 size={11} />
          </button>
          <button
            className="sp-card-btn"
            title={isActive ? 'Pause' : 'Resume'}
            onClick={() => send('UPDATE_TICKER', { symbol: ticker.symbol, enabled: !isActive })}
          >
            {isActive
              ? <span style={{ fontSize:10 }}>⏸</span>
              : <span style={{ fontSize:10 }}>▶</span>
            }
          </button>
          {pnl !== 0 && (
            <button
              className="sp-card-btn"
              title={confirmTP ? `Take $${pnl.toFixed(2)}?` : 'Take Profit'}
              onClick={handleTakeProfit}
              style={confirmTP ? { color:'#dca828', borderColor:'rgba(220,168,40,0.4)' } : {}}
            >
              <Banknote size={11} />
            </button>
          )}
          <button
            className="sp-card-btn"
            title={confirmDelete ? 'Confirm?' : 'Remove'}
            onClick={handleDelete}
            style={confirmDelete ? { color:'#f05060', borderColor:'rgba(240,80,96,0.35)' } : {}}
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Resize handle */}
      <div className="sp-resize-handle" />
    </div>
  );
});

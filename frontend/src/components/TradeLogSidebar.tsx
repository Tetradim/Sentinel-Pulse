import { useState } from 'react';
import { useStore, TradeLog } from '@/stores/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface TradeGroup {
  key: string;
  symbol: string;
  side: string;
  trades: TradeLog[];
  avgPrice: number;
  totalQty: number;
  totalPnl: number;
  firstTime: string;
}

function groupTrades(trades: TradeLog[]): TradeGroup[] {
  const groups: TradeGroup[] = [];
  let current: TradeGroup | null = null;
  for (const t of trades) {
    if (current && current.symbol === t.symbol && current.side === t.side) {
      current.trades.push(t);
      current.totalQty += t.quantity;
      current.totalPnl += t.pnl;
      current.avgPrice =
        current.trades.reduce((s, tr) => s + tr.price * tr.quantity, 0) / current.totalQty;
    } else {
      current = {
        key: t.id, symbol: t.symbol, side: t.side,
        trades: [t], avgPrice: t.price, totalQty: t.quantity,
        totalPnl: t.pnl, firstTime: t.timestamp,
      };
      groups.push(current);
    }
  }
  return groups;
}

// Side color map
const sideStyle: Record<string, { color: string; bg: string; label: string }> = {
  BUY:           { color: '#2dd4a0', bg: 'rgba(45,212,160,0.08)',  label: 'B' },
  SELL:          { color: '#4da8f0', bg: 'rgba(77,168,240,0.08)',  label: 'S' },
  STOP:          { color: '#f05060', bg: 'rgba(240,80,96,0.08)',   label: '⚡' },
  TRAILING_STOP: { color: '#dca828', bg: 'rgba(220,168,40,0.08)', label: 'TS' },
};

function TradeDetailMini({ trade }: { trade: TradeLog }) {
  const isLoss  = trade.pnl < 0;
  const isSell  = trade.side !== 'BUY';

  return (
    <div
      style={{
        borderRadius: 5, padding: '6px 8px',
        background: isLoss ? 'rgba(240,80,96,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isLoss ? 'rgba(240,80,96,0.12)' : 'rgba(255,255,255,0.04)'}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>
          {new Date(trade.timestamp).toLocaleTimeString()}
        </span>
        <div style={{ display: 'flex', gap: 3 }}>
          {trade.order_type && (
            <span style={{
              fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
              fontFamily: 'JetBrains Mono, monospace',
              ...(trade.order_type === 'MARKET'
                ? { background: 'rgba(249,115,22,0.15)', color: '#f97316' }
                : { background: 'rgba(77,168,240,0.15)', color: '#4da8f0' }
              ),
            }}>
              {trade.order_type === 'MARKET' ? 'MKT' : 'LMT'}
            </span>
          )}
          {trade.rule_mode && (
            <span style={{
              fontSize: 8, padding: '1px 4px', borderRadius: 3,
              fontFamily: 'JetBrains Mono, monospace',
              ...(trade.rule_mode === 'PERCENT'
                ? { background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }
                : { background: 'rgba(20,184,166,0.15)', color: '#14b8a6' }
              ),
            }}>
              {trade.rule_mode === 'PERCENT' ? '%' : '$'}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
          ${trade.price.toFixed(2)} × {trade.quantity.toFixed(4)}
        </span>
        {trade.pnl !== 0 && (
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700,
            color: isLoss ? '#f05060' : '#2dd4a0',
          }}>
            {trade.pnl > 0 ? '+' : ''}{trade.pnl.toFixed(2)}
          </span>
        )}
      </div>

      {isSell && trade.entry_price > 0 && (
        <div style={{ marginTop: 2, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>
          Entry ${trade.entry_price.toFixed(2)} → ${(trade.target_price || 0).toFixed(2)}
        </div>
      )}

      {isLoss && trade.entry_price > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
          <AlertTriangle size={8} style={{ color: '#f05060' }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'rgba(240,80,96,0.7)' }}>
            Loss {((trade.price / trade.entry_price - 1) * 100).toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}

function GroupRow({ group }: { group: TradeGroup }) {
  const [expanded, setExpanded] = useState(false);
  const count    = group.trades.length;
  const isSingle = count === 1;
  const isLoss   = group.totalPnl < 0;
  const side     = sideStyle[group.side] || { color: '#f0ead6', bg: 'rgba(255,255,255,0.04)', label: group.side[0] };

  return (
    <div
      style={{
        borderRadius: 6,
        border: `1px solid ${isLoss ? 'rgba(240,80,96,0.12)' : 'rgba(255,255,255,0.04)'}`,
        background: expanded ? 'rgba(255,255,255,0.02)' : 'transparent',
        overflow: 'hidden',
        transition: 'background 0.15s',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        data-testid={`trade-group-${group.key}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          {/* Side indicator */}
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700,
            minWidth: 18, color: side.color,
          }}>
            {side.label}
          </span>

          <span style={{
            fontFamily: 'Syne, system-ui, sans-serif', fontSize: 13, fontWeight: 700,
            color: '#f0ead6', letterSpacing: '0.04em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {group.symbol}
          </span>

          {!isSingle && (
            <span style={{
              fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
              padding: '1px 5px', borderRadius: 8,
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
            }}>
              ×{count}
            </span>
          )}

          {/* Order type badge for single trades */}
          {isSingle && group.trades[0]?.order_type && (
            <span style={{
              fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
              fontFamily: 'JetBrains Mono, monospace',
              ...(group.trades[0].order_type === 'MARKET'
                ? { background: 'rgba(249,115,22,0.15)', color: '#f97316' }
                : { background: 'rgba(77,168,240,0.15)', color: '#4da8f0' }
              ),
            }}>
              {group.trades[0].order_type === 'MARKET' ? 'MKT' : 'LMT'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
            ${group.avgPrice.toFixed(2)}
          </span>
          {group.totalPnl !== 0 && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
              color: group.totalPnl > 0 ? '#2dd4a0' : '#f05060',
            }}>
              {group.totalPnl > 0 ? '+' : ''}{group.totalPnl.toFixed(2)}
            </span>
          )}
          {expanded
            ? <ChevronUp size={10} style={{ color: 'rgba(255,255,255,0.2)' }} />
            : <ChevronDown size={10} style={{ color: 'rgba(255,255,255,0.2)' }} />
          }
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {group.trades.map((t) => (
                <TradeDetailMini key={t.id} trade={t} />
              ))}

              {!isSingle && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '5px 8px 0',
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                  marginTop: 2,
                }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>
                    Total
                  </span>
                  <div style={{ display: 'flex', gap: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 9 }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>avg ${group.avgPrice.toFixed(2)}</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>×{group.totalQty.toFixed(4)}</span>
                    {group.totalPnl !== 0 && (
                      <span style={{ fontWeight: 700, color: group.totalPnl > 0 ? '#2dd4a0' : '#f05060' }}>
                        {group.totalPnl > 0 ? '+' : ''}{group.totalPnl.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TradeLogSidebar() {
  const trades  = useStore((s) => s.trades);
  const groups  = groupTrades(trades);
  const lossCount = trades.filter((t) => t.pnl < 0).length;
  const totalPnl  = trades.reduce((a, t) => a + t.pnl, 0);

  return (
    <aside
      className="hidden xl:flex flex-col"
      style={{
        width: 280,
        borderLeft: '1px solid rgba(255,255,255,0.05)',
        background: '#0e0e12',
        position: 'relative',
      }}
      data-testid="trade-log-sidebar"
    >
      {/* Gold gleam on left edge */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: 1,
        background: 'linear-gradient(180deg, transparent, rgba(220,168,40,0.2) 30%, rgba(220,168,40,0.2) 70%, transparent)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'Syne, system-ui, sans-serif', fontSize: 10,
          fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.3)',
        }}>
          Live Activity
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {lossCount > 0 && (
            <span
              data-testid="loss-count-badge"
              style={{
                fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                padding: '2px 6px', borderRadius: 8,
                background: 'rgba(240,80,96,0.1)', color: '#f05060',
                border: '1px solid rgba(240,80,96,0.2)',
              }}
            >
              {lossCount} loss{lossCount !== 1 ? 'es' : ''}
            </span>
          )}
          {trades.length > 0 && (
            <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.2)' }}>
              {trades.length}t / {groups.length}g
            </span>
          )}
        </div>
      </div>

      {/* Running P&L strip */}
      {trades.length > 0 && (
        <div style={{
          padding: '6px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: totalPnl >= 0 ? 'rgba(45,212,160,0.04)' : 'rgba(240,80,96,0.04)',
        }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Session P&L
          </span>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700,
            color: totalPnl >= 0 ? '#2dd4a0' : '#f05060',
          }}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </span>
        </div>
      )}

      {/* Trade list */}
      <div
        className="flex-1 overflow-auto scrollbar-hide"
        style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 3 }}
      >
        {groups.map((g) => (
          <GroupRow key={g.key} group={g} />
        ))}

        {trades.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: 160, gap: 6,
          }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.06em' }}>
              No activity yet
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.1)', fontFamily: 'JetBrains Mono, monospace' }}>
              Trades appear in real-time
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

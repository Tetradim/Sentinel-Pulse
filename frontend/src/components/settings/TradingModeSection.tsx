import { Zap } from 'lucide-react';

export function TradingModeSection() {
  return (
    <section className="glass rounded-xl border border-border p-6 space-y-4" data-testid="trading-mode-section">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-emerald-400" />
          <h3 className="text-sm font-bold text-foreground">Trading Mode</h3>
        </div>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
          data-testid="trading-mode-badge"
        >
          LIVE
        </span>
      </div>
      <div className="rounded-lg p-4 border bg-emerald-500/5 border-emerald-500/20">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-emerald-400">Live Broker Routing</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-4">
            <li>Orders are routed to connected brokers.</li>
            <li>Every enabled ticker must have a broker assignment before execution.</li>
            <li>Broker failures are handled with alerts and reconciliation.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

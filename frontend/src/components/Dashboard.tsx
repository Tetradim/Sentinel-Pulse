import { useStore } from '@/stores/useStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useEffect, useRef } from 'react';
import { Header } from './Header';
import { WatchlistTab } from './tabs/WatchlistTab';
import { PositionsTab } from './tabs/PositionsTab';
import { HistoryTab } from './tabs/HistoryTab';
import { LogsTab } from './tabs/LogsTab';
import { SettingsTab } from './tabs/SettingsTab';
import { BrokersTab } from './tabs/BrokersTab';
import { TracesTab } from './tabs/TracesTab';
import { ForeignTab } from './tabs/ForeignTab';
import { RiskCenterTab } from './tabs/RiskCenterTab';
import { OrdersExecutionTab } from './tabs/OrdersExecutionTab';
import { ReconciliationTab } from './tabs/ReconciliationTab';
import { ComplianceAuditTab } from './tabs/ComplianceAuditTab';
import { IncidentsOpsTab } from './tabs/IncidentsOpsTab';
import { PortfolioAnalyticsTab } from './tabs/PortfolioAnalyticsTab';
import { AdminIAMTab } from './tabs/AdminIAMTab';
import { SLODashboardTab } from './tabs/SLODashboardTab';
import { PortfolioTab } from './tabs/PortfolioTab';
import { TradeLogSidebar } from './TradeLogSidebar';
import { ErrorBoundary } from './ErrorBoundary';
import { apiFetch } from '@/lib/api';
import { LayoutDashboard, Crosshair, History, ScrollText, Settings, Plug, Activity, Globe, Wallet, ChevronLeft, ChevronRight, Shield, List, Scale, BarChart3, Users, Server, Target } from 'lucide-react';

const TABS = [
  { id: 'watchlist', label: 'Watchlist', icon: LayoutDashboard },
  { id: 'portfolio', label: 'Portfolio', icon: Wallet },
  { id: 'positions', label: 'Positions', icon: Crosshair },
  { id: 'risk-center', label: 'Risk Center', icon: Shield },
  { id: 'orders', label: 'Orders', icon: List },
  { id: 'reconciliation', label: 'Reconciliation', icon: Scale },
  { id: 'compliance', label: 'Compliance', icon: Users },
  { id: 'history', label: 'History', icon: History },
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'brokers', label: 'Brokers', icon: Plug },
  { id: 'foreign', label: 'Foreign', icon: Globe },
  { id: 'traces', label: 'Traces', icon: Activity },
  { id: 'incidents', label: 'Incidents', icon: Server },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'admin', label: 'Admin', icon: Users },
  { id: 'slo', label: 'SLO', icon: Target },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Dashboard() {
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const setFxRates = useStore((s) => s.setFxRates);
  const setCurrencyDisplay = useStore((s) => s.setCurrencyDisplay);
  const tabNavRef = useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabNavRef.current) {
      tabNavRef.current.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
    }
  };

  // Pre-load FX rates and currency preference on app start so TickerCards
  // can convert prices immediately without requiring a visit to the Foreign tab.
  useEffect(() => {
    apiFetch('/api/fx-rates')
      .then((d) => setFxRates(d.rates))
      .catch(() => {});
    apiFetch('/api/settings/currency-display')
      .then((d) => setCurrencyDisplay(d.mode))
      .catch(() => {});
    // Refresh FX every 5 minutes
    const timer = setInterval(() => {
      apiFetch('/api/fx-rates').then((d) => setFxRates(d.rates)).catch(() => {});
    }, 5 * 60_000);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col" data-testid="dashboard-container">
      <Header />

      <div className="flex-1 flex">
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center pt-4 pb-0 border-b border-border">
            <button onClick={() => scrollTabs('left')} className="p-2 text-muted-foreground hover:text-foreground shrink-0" title="Scroll left">
              <ChevronLeft size={18} />
            </button>
            <nav ref={tabNavRef} className="flex items-center gap-1 px-2 overflow-x-auto scrollbar-hide" data-testid="tab-bar">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    data-testid={`tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap
                      ${active
                        ? 'text-primary bg-card border border-b-0 border-border -mb-px'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                      }
                    `}
                  >
                    <Icon size={15} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
            <button onClick={() => scrollTabs('right')} className="p-2 text-muted-foreground hover:text-foreground shrink-0" title="Scroll right">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto p-6" data-testid="tab-content">
            <ErrorBoundary fallbackLabel="Tab failed to render">
              {activeTab === 'watchlist' && <WatchlistTab />}
              {activeTab === 'portfolio' && <PortfolioTab />}
              {activeTab === 'positions' && <PositionsTab />}
              {activeTab === 'risk-center' && <RiskCenterTab />}
              {activeTab === 'orders' && <OrdersExecutionTab />}
              {activeTab === 'reconciliation' && <ReconciliationTab />}
              {activeTab === 'compliance' && <ComplianceAuditTab />}
              {activeTab === 'history' && <HistoryTab />}
              {activeTab === 'logs' && <LogsTab />}
              {activeTab === 'brokers' && <BrokersTab />}
              {activeTab === 'foreign' && <ForeignTab />}
              {activeTab === 'traces' && <TracesTab />}
              {activeTab === 'incidents' && <IncidentsOpsTab />}
              {activeTab === 'analytics' && <PortfolioAnalyticsTab />}
              {activeTab === 'admin' && <AdminIAMTab />}
              {activeTab === 'slo' && <SLODashboardTab />}
              {activeTab === 'settings' && <SettingsTab />}
            </ErrorBoundary>
          </div>
        </div>

        {/* Trade log sidebar */}
        <TradeLogSidebar />
      </div>
    </div>
  );
}

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
import {
  LayoutDashboard, Crosshair, History, ScrollText, Settings, Plug,
  Activity, Globe, Wallet, ChevronLeft, ChevronRight, Shield, List,
  Scale, BarChart3, Users, Server, Target,
} from 'lucide-react';

// ── Tab groups — primary tabs always visible, overflow scrolls ──
const TABS = [
  { id: 'watchlist',      label: 'Watchlist',    icon: LayoutDashboard, group: 'primary'  },
  { id: 'portfolio',      label: 'Portfolio',    icon: Wallet,           group: 'primary'  },
  { id: 'positions',      label: 'Positions',    icon: Crosshair,        group: 'primary'  },
  { id: 'history',        label: 'History',      icon: History,          group: 'primary'  },
  { id: 'risk-center',    label: 'Risk',         icon: Shield,           group: 'ops'      },
  { id: 'orders',         label: 'Orders',       icon: List,             group: 'ops'      },
  { id: 'reconciliation', label: 'Reconcile',    icon: Scale,            group: 'ops'      },
  { id: 'compliance',     label: 'Compliance',   icon: Users,            group: 'ops'      },
  { id: 'logs',           label: 'Logs',         icon: ScrollText,       group: 'system'   },
  { id: 'brokers',        label: 'Brokers',      icon: Plug,             group: 'system'   },
  { id: 'foreign',        label: 'Foreign',      icon: Globe,            group: 'system'   },
  { id: 'traces',         label: 'Traces',       icon: Activity,         group: 'system'   },
  { id: 'incidents',      label: 'Incidents',    icon: Server,           group: 'system'   },
  { id: 'analytics',      label: 'Analytics',    icon: BarChart3,        group: 'advanced' },
  { id: 'admin',          label: 'Admin',        icon: Users,            group: 'advanced' },
  { id: 'slo',            label: 'SLO',          icon: Target,           group: 'advanced' },
  { id: 'settings',       label: 'Settings',     icon: Settings,         group: 'settings' },
];

// Group label colors for the thin separator dots
const GROUP_COLORS: Record<string, string> = {
  primary:  'transparent',
  ops:      'rgba(220,168,40,0.25)',
  system:   'rgba(77,168,240,0.25)',
  advanced: 'rgba(139,92,246,0.25)',
  settings: 'rgba(255,255,255,0.1)',
};

export function Dashboard() {
  const activeTab        = useStore((s) => s.activeTab);
  const setActiveTab     = useStore((s) => s.setActiveTab);
  const setFxRates       = useStore((s) => s.setFxRates);
  const setCurrencyDisplay = useStore((s) => s.setCurrencyDisplay);
  const tabNavRef        = useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabNavRef.current) {
      tabNavRef.current.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    apiFetch('/api/fx-rates').then((d) => setFxRates(d.rates)).catch(() => {});
    apiFetch('/api/settings/currency-display').then((d) => setCurrencyDisplay(d.mode)).catch(() => {});
    const timer = setInterval(() => {
      apiFetch('/api/fx-rates').then((d) => setFxRates(d.rates)).catch(() => {});
    }, 5 * 60_000);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#0a0a0b' }}
      data-testid="dashboard-container"
    >
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── Tab bar ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'linear-gradient(180deg, #101014 0%, #0e0e12 100%)',
              position: 'relative',
              height: 40,
            }}
          >
            {/* Gold gleam line along bottom of tab bar */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, transparent 0%, rgba(220,168,40,0.15) 30%, rgba(220,168,40,0.3) 50%, rgba(220,168,40,0.15) 70%, transparent 100%)',
              pointerEvents: 'none',
            }} />

            {/* Scroll left */}
            <button
              onClick={() => scrollTabs('left')}
              style={{
                padding: '0 10px', color: 'rgba(255,255,255,0.25)',
                background: 'none', border: 'none', cursor: 'pointer',
                flexShrink: 0, display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#dca828')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
              title="Scroll tabs left"
            >
              <ChevronLeft size={15} />
            </button>

            {/* Tab strip */}
            <nav
              ref={tabNavRef}
              className="scrollbar-hide"
              style={{
                display: 'flex',
                alignItems: 'stretch',
                gap: 0,
                flex: 1,
                overflowX: 'auto',
                padding: '0 4px',
              }}
              data-testid="tab-bar"
            >
              {TABS.map((tab, i) => {
                const Icon     = tab.icon;
                const active   = activeTab === tab.id;
                const prevGroup = i > 0 ? TABS[i - 1].group : tab.group;
                const showSep  = tab.group !== prevGroup && i > 0;

                return (
                  <>
                    {/* Group separator dot */}
                    {showSep && (
                      <div
                        key={`sep-${tab.id}`}
                        style={{
                          width: 1,
                          margin: '10px 4px',
                          background: GROUP_COLORS[tab.group] || 'rgba(255,255,255,0.08)',
                          flexShrink: 0,
                          borderRadius: 1,
                        }}
                      />
                    )}

                    <button
                      key={tab.id}
                      data-testid={`tab-${tab.id}`}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '0 12px',
                        fontSize: 11,
                        fontWeight: active ? 700 : 500,
                        fontFamily: 'Rajdhani, system-ui, sans-serif',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        border: 'none',
                        borderBottom: active ? '2px solid #dca828' : '2px solid transparent',
                        background: active ? 'rgba(220,168,40,0.06)' : 'transparent',
                        color: active ? '#dca828' : 'rgba(255,255,255,0.35)',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'color 0.15s, background 0.15s',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)';
                          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)';
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }
                      }}
                    >
                      <Icon size={12} />
                      {tab.label}
                    </button>
                  </>
                );
              })}
            </nav>

            {/* Scroll right */}
            <button
              onClick={() => scrollTabs('right')}
              style={{
                padding: '0 10px', color: 'rgba(255,255,255,0.25)',
                background: 'none', border: 'none', cursor: 'pointer',
                flexShrink: 0, display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#dca828')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
              title="Scroll tabs right"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* ── Tab content ── */}
          <div
            className="flex-1 overflow-auto"
            style={{ padding: '20px 24px', background: '#0a0a0b' }}
            data-testid="tab-content"
          >
            <ErrorBoundary fallbackLabel="Tab failed to render">
              {activeTab === 'watchlist'      && <WatchlistTab />}
              {activeTab === 'portfolio'      && <PortfolioTab />}
              {activeTab === 'positions'      && <PositionsTab />}
              {activeTab === 'risk-center'    && <RiskCenterTab />}
              {activeTab === 'orders'         && <OrdersExecutionTab />}
              {activeTab === 'reconciliation' && <ReconciliationTab />}
              {activeTab === 'compliance'     && <ComplianceAuditTab />}
              {activeTab === 'history'        && <HistoryTab />}
              {activeTab === 'logs'           && <LogsTab />}
              {activeTab === 'brokers'        && <BrokersTab />}
              {activeTab === 'foreign'        && <ForeignTab />}
              {activeTab === 'traces'         && <TracesTab />}
              {activeTab === 'incidents'      && <IncidentsOpsTab />}
              {activeTab === 'analytics'      && <PortfolioAnalyticsTab />}
              {activeTab === 'admin'          && <AdminIAMTab />}
              {activeTab === 'slo'            && <SLODashboardTab />}
              {activeTab === 'settings'       && <SettingsTab />}
            </ErrorBoundary>
          </div>
        </div>

        {/* ── Trade log sidebar ── */}
        <TradeLogSidebar />
      </div>
    </div>
  );
}

import { useStore } from '@/stores/useStore';
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
import { ErrorBoundary } from './ErrorBoundary';
import { apiFetch } from '@/lib/api';
import {
  LayoutDashboard, Crosshair, History, ScrollText, Settings, Plug,
  Activity, Globe, Wallet, ChevronLeft, ChevronRight, Shield, List,
  Scale, BarChart3, Users, Server, Target, Bell, Briefcase,
} from 'lucide-react';

// ── Sidebar icon buttons ────────────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { id: 'watchlist',   icon: LayoutDashboard, title: 'Watchlist'  },
  { id: 'portfolio',   icon: Briefcase,       title: 'Portfolio'  },
  { id: 'positions',   icon: Crosshair,       title: 'Positions'  },
  { id: 'history',     icon: History,         title: 'History'    },
  { id: '---' },
  { id: 'risk-center', icon: Shield,          title: 'Risk'       },
  { id: 'orders',      icon: List,            title: 'Orders'     },
  { id: 'logs',        icon: ScrollText,      title: 'Logs'       },
  { id: 'brokers',     icon: Plug,            title: 'Brokers'    },
  { id: 'foreign',     icon: Globe,           title: 'Foreign'    },
  { id: '---' },
  { id: 'analytics',   icon: BarChart3,       title: 'Analytics'  },
  { id: 'traces',      icon: Activity,        title: 'Traces'     },
];

// ── Full tab list ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'watchlist',      label: 'Watchlist',   icon: LayoutDashboard, group: 'primary'  },
  { id: 'portfolio',      label: 'Portfolio',   icon: Briefcase,       group: 'primary'  },
  { id: 'positions',      label: 'Positions',   icon: Crosshair,       group: 'primary'  },
  { id: 'history',        label: 'History',     icon: History,         group: 'primary'  },
  { id: 'risk-center',    label: 'Risk',        icon: Shield,          group: 'ops'      },
  { id: 'orders',         label: 'Orders',      icon: List,            group: 'ops'      },
  { id: 'reconciliation', label: 'Reconcile',   icon: Scale,           group: 'ops'      },
  { id: 'compliance',     label: 'Compliance',  icon: Users,           group: 'ops'      },
  { id: 'logs',           label: 'Logs',        icon: ScrollText,      group: 'system'   },
  { id: 'brokers',        label: 'Brokers',     icon: Plug,            group: 'system'   },
  { id: 'foreign',        label: 'Foreign',     icon: Globe,           group: 'system'   },
  { id: 'traces',         label: 'Traces',      icon: Activity,        group: 'system'   },
  { id: 'incidents',      label: 'Incidents',   icon: Server,          group: 'system'   },
  { id: 'analytics',      label: 'Analytics',   icon: BarChart3,       group: 'advanced' },
  { id: 'admin',          label: 'Admin',       icon: Users,           group: 'advanced' },
  { id: 'slo',            label: 'SLO',         icon: Target,          group: 'advanced' },
  { id: 'settings',       label: 'Settings',    icon: Settings,        group: 'settings' },
];

export function Dashboard() {
  const activeTab          = useStore((s) => s.activeTab);
  const setActiveTab       = useStore((s) => s.setActiveTab);
  const setFxRates         = useStore((s) => s.setFxRates);
  const setCurrencyDisplay = useStore((s) => s.setCurrencyDisplay);
  const tabNavRef          = useRef<HTMLDivElement>(null);

  const scrollTabs = (dir: 'left' | 'right') => {
    tabNavRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  // Pre-load FX rates
  useEffect(() => {
    apiFetch('/api/fx-rates').then((d) => setFxRates(d.rates)).catch(() => {});
    apiFetch('/api/settings/currency-display').then((d) => setCurrencyDisplay(d.mode)).catch(() => {});
    const timer = setInterval(() => {
      apiFetch('/api/fx-rates').then((d) => setFxRates(d.rates)).catch(() => {});
    }, 5 * 60_000);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Render tab separators between groups
  let lastGroup = '';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ position: 'relative', zIndex: 1 }}
      data-testid="dashboard-container"
    >
      {/* Full-page gold X triangle background */}
      <div className="sp-bg" aria-hidden="true">
        <div className="sp-bg-pattern" />
        <div className="sp-bg-vignette" />
      </div>

      <Header />
      <div className="sp-gleam-bar" />

      <div className="sp-layout" style={{ flex: 1, overflow: 'hidden' }}>

        {/* ── Left sidebar icon nav ── */}
        <nav className="sp-sidebar" aria-label="Main navigation">
          {SIDEBAR_ITEMS.map((item, i) => {
            if (item.id === '---') {
              return <div key={`sep-${i}`} className="sp-sb-divider" />;
            }
            const Icon = item.icon!;
            return (
              <button
                key={item.id}
                className={`sp-sb-btn ${activeTab === item.id ? 'active' : ''}`}
                title={item.title}
                onClick={() => setActiveTab(item.id!)}
                data-testid={`sidebar-${item.id}`}
              >
                <Icon size={17} />
              </button>
            );
          })}
          <div className="sp-sb-spacer" />
          <div className="sp-sb-divider" />
          <button className="sp-sb-btn" title="Alerts"><Bell size={17} /></button>
          <button
            className={`sp-sb-btn ${activeTab === 'settings' ? 'active' : ''}`}
            title="Settings"
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={17} />
          </button>
        </nav>

        {/* ── Main content ── */}
        <div className="sp-main">

          {/* Tab bar */}
          <div className="sp-tabbar scrollbar-hide" data-testid="tab-bar">
            <button className="sp-tab-scr" onClick={() => scrollTabs('left')} title="Scroll left">
              <ChevronLeft size={13} />
            </button>

            <nav
              ref={tabNavRef}
              className="scrollbar-hide"
              style={{ display: 'flex', alignItems: 'stretch', flex: 1, overflowX: 'auto' }}
            >
              {TABS.map((tab) => {
                const Icon     = tab.icon;
                const isActive = activeTab === tab.id;
                const showSep  = tab.group !== lastGroup && lastGroup !== '';
                lastGroup = tab.group;

                return (
                  <div key={tab.id} style={{ display: 'flex', alignItems: 'stretch' }}>
                    {showSep && (
                      <div
                        className={tab.group === 'system' ? 'sp-tab-sep-r' : 'sp-tab-sep'}
                      />
                    )}
                    <button
                      className={`sp-tab ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab.id)}
                      data-testid={`tab-${tab.id}`}
                    >
                      <Icon size={10} />
                      {tab.label}
                    </button>
                  </div>
                );
              })}
            </nav>

            <button className="sp-tab-scr" onClick={() => scrollTabs('right')} title="Scroll right">
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Tab content */}
          <div
            className="flex-1 overflow-auto"
            style={{ padding: '14px 16px' }}
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
      </div>
    </div>
  );
}

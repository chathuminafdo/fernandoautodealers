import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats } from '../services/dashboardService';
import Dashboard from './Dashboard';
import Vehicles from './Vehicles';
import LCTracker from './LCTracker';
import VehiclesAndProfit from './VehiclesAndProfit';
import BusinessExpenses from './BusinessExpenses';
import TaxManager from './TaxManager';
import CustomerDetails from './CustomerDetails';
import Documents from './Documents';
import Users from './Users';
import Settings from './Settings';
import AdvancePaid from './AdvancePaid';

const SECTIONS = [
  { key: 'dashboard',     icon: 'fa-gauge-high',       label: 'Dashboard',        group: 'COMMAND'   },
  { key: 'vehicles',      icon: 'fa-car-side',         label: 'Vehicle Register', group: 'INVENTORY' },
  { key: 'inhand',        icon: 'fa-warehouse',        label: 'In Hand',          group: 'INVENTORY', badge: 'inhand' },
  { key: 'onway',         icon: 'fa-ship',             label: 'On The Way',       group: 'INVENTORY', badge: 'onway'  },
  { key: 'advance',       icon: 'fa-money-bill-wave',  label: 'Advance Paid',     group: 'INVENTORY' },
  { key: 'lc',            icon: 'fa-file-contract',    label: 'LC Tracker',       group: 'IMPORT'    },
  { key: 'taxreport',        icon: 'fa-receipt',               label: 'VAT & SSCL',        group: 'FINANCE' },
  { key: 'businessexpenses', icon: 'fa-file-invoice-dollar',  label: 'Business Expenses', group: 'FINANCE' },
  { key: 'customers',     icon: 'fa-address-card',     label: 'Customers',        group: 'CLIENTS'   },
  { key: 'documents',     icon: 'fa-folder-open',      label: 'Documents',        group: 'CLIENTS'   },
  { key: 'users',         icon: 'fa-users-gear',       label: 'User Accounts',    group: 'SYSTEM'    },
  { key: 'settings',      icon: 'fa-sliders',          label: 'Settings',         group: 'SYSTEM'    },
];

const TITLES = {
  dashboard:     'Dashboard',
  vehicles:      'Vehicle Register',
  inhand:        'In Hand',
  onway:         'On The Way',
  advance:       'Advance Paid',
  lc:            'LC Tracker',
  taxreport:        'VAT & SSCL',
  businessexpenses: 'Business Expenses',
  customers:     'Customers',
  documents:     'Documents',
  users:         'User Accounts',
  settings:      'Settings',
};

const GROUP_ICONS = {
  COMMAND:   'fa-terminal',
  INVENTORY: 'fa-boxes-stacked',
  IMPORT:    'fa-anchor',
  FINANCE:   'fa-coins',
  CLIENTS:   'fa-users',
  SYSTEM:    'fa-shield-halved',
};

function Clock({ tz, label, flag }) {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { timeZone: tz, hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tz]);
  return (
    <div className="ck-item">
      <span className="ck-flag">{flag}</span>
      <div className="ck-info">
        <span className="ck-lbl">{label}</span>
        <span className="ck-val">{time || '--:--:--'}</span>
      </div>
    </div>
  );
}

function ExchangeRate({ from, to, label, flag }) {
  const [rate, setRate] = useState(null);
  useEffect(() => {
    const fetch_ = () =>
      fetch(`https://open.er-api.com/v6/latest/${from}`)
        .then(r => r.json())
        .then(d => d.rates?.[to] && setRate(d.rates[to].toFixed(2)))
        .catch(() => {});
    fetch_();
    const id = setInterval(fetch_, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [from, to]);
  return (
    <div className="ck-item">
      <span className="ck-flag">{flag}</span>
      <div className="ck-info">
        <span className="ck-lbl">{label}</span>
        <span className="ck-val">{rate ?? '---'}</span>
      </div>
    </div>
  );
}

function Toast({ message, type, visible }) {
  return <div className={`toast ${type} ${visible ? 'show' : ''}`}>{message}</div>;
}

export default function Layout() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [collapsed, setCollapsed]       = useState(false);
  const [badges, setBadges]             = useState({ inhand: 0, onway: 0 });
  const [alerts, setAlerts]             = useState({ d60: 0, d90: 0, thisMonth: 0, target: null });
  const [notifOpen, setNotifOpen]       = useState(false);
  const [toast, setToast]               = useState({ message: '', type: 'ok', visible: false });
  const notifRef = useRef(null);

  const section = location.pathname.replace('/', '') || 'dashboard';
  const groups  = [...new Set(SECTIONS.map(s => s.group))];

  useEffect(() => {
    getDashboardStats()
      .then(d => {
        setBadges({ inhand: d.inhand, onway: d.onway });
        setAlerts({ d60: d.aging?.d60 || 0, d90: d.aging?.d90 || 0, thisMonth: d.this_month || 0, target: d.target || null });
      })
      .catch(() => {});
  }, [section]);

  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showToast = useCallback((message, type = 'ok') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3200);
  }, []);

  const go = (key) => {
    navigate('/' + key);
    setSidebarOpen(false);
  };

  const currentSection = SECTIONS.find(s => s.key === section);
  const currentGroup   = currentSection?.group || '';

  const now        = new Date();
  const daysPct    = (now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) * 100;
  const behindPace = alerts.target?.profit_target > 0 &&
    (alerts.thisMonth / alerts.target.profit_target) * 100 < daysPct - 10;
  const critCount  = (alerts.d90 > 0 ? 1 : 0) + (alerts.d60 > 0 ? 1 : 0) + (behindPace ? 1 : 0);


  return (
    <div className={`layout-root ${collapsed ? 'sb-collapsed' : ''}`}>
      <div className={`overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>

        {/* Logo */}
        <div className="sb-head">
          <div className="sb-logo">
            <div className="sb-logo-mark">
              <div className="sb-dot" />
            </div>
            {!collapsed && (
              <div className="sb-brand-text">
                <span className="sb-name">Fernando</span>
                <span className="sb-sub">AUTO DEALERS · ADMIN</span>
              </div>
            )}
          </div>
          <button
            className="sb-collapse-btn"
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <i className={`fa ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`} />
          </button>
        </div>

        {/* Status indicator */}
        {!collapsed && (
          <div className="sb-status">
            <span className="sb-status-dot" />
            <span className="sb-status-text">SYSTEM ONLINE</span>
          </div>
        )}

        {/* Nav */}
        <nav className="sb-nav">
          {groups.map((group, gi) => (
            <div key={group} className="sb-section">
              {!collapsed && (
                <div className="nav-group">
                  <i className={`fa ${GROUP_ICONS[group] || 'fa-circle'}`} />
                  {group}
                </div>
              )}
              {collapsed && gi > 0 && <div className="nav-group-divider" />}
              {SECTIONS.filter(s => s.group === group).map((s, i) => (
                <button
                  key={s.key}
                  className={`nav-item ${section === s.key ? 'active' : ''}`}
                  onClick={() => go(s.key)}
                  title={collapsed ? s.label : undefined}
                  style={{ animationDelay: `${(gi * 3 + i) * 35}ms` }}
                >
                  <span className="nav-item-icon">
                    <i className={`fa ${s.icon}`} />
                  </span>
                  {!collapsed && <span className="nav-item-label">{s.label}</span>}
                  {s.badge && badges[s.badge] > 0 && (
                    <span className={`nav-badge ${collapsed ? 'nb-dot' : ''}`}>
                      {collapsed ? '' : badges[s.badge]}
                    </span>
                  )}
                  {section === s.key && <span className="nav-active-bar" />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sb-footer">
          <div className="sb-user">
            <div className="sb-avatar">
              {username.slice(0, 2).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="sb-info">
                <p className="sb-uname">{username}</p>
                <span className="sb-urole">Administrator</span>
              </div>
            )}
          </div>
          <button className="sb-logout" onClick={logout} title="Sign out">
            <i className="fa fa-right-from-bracket" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <div className="main">

        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="ham" onClick={() => setSidebarOpen(v => !v)} aria-label="Menu">
              <span /><span /><span />
            </button>
            <div className="topbar-breadcrumb">
              <span className="tb-group">{currentGroup}</span>
              {currentGroup && <span className="tb-sep"><i className="fa fa-chevron-right" /></span>}
              <span className="topbar-title">{TITLES[section] || section.toUpperCase()}</span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="clocks-bar">
              <Clock tz="Asia/Colombo" label="COLOMBO" flag="🇱🇰" />
              <Clock tz="Asia/Tokyo"   label="TOKYO"   flag="🇯🇵" />
              <ExchangeRate from="JPY" to="LKR" label="JPY/LKR" flag="¥" />
              <ExchangeRate from="USD" to="LKR" label="USD/LKR" flag="$" />
            </div>
            <div className="notif-wrap" ref={notifRef}>
              <button
                className={`notif-bell ${critCount > 0 ? 'ringing' : ''}`}
                onClick={() => setNotifOpen(v => !v)}
                title="Alerts"
              >
                <i className="fa fa-bell" />
                {critCount > 0 && <span className="notif-badge">{critCount}</span>}
              </button>

              {notifOpen && (
                <div className="notif-panel">
                  <div className="notif-panel-hdr">ALERTS</div>

                  {alerts.d90 > 0 && (
                    <div className="notif-item ni-crit" onClick={() => { navigate('/inhand'); setNotifOpen(false); }}>
                      <i className="fa fa-triangle-exclamation notif-item-icon" />
                      <div className="notif-item-body">
                        <strong>{alerts.d90} vehicle{alerts.d90 > 1 ? 's' : ''} CRITICAL</strong>
                        <span>90+ days in stock — sell immediately</span>
                      </div>
                    </div>
                  )}

                  {alerts.d60 > 0 && (
                    <div className="notif-item ni-warn" onClick={() => { navigate('/inhand'); setNotifOpen(false); }}>
                      <i className="fa fa-clock notif-item-icon" />
                      <div className="notif-item-body">
                        <strong>{alerts.d60} vehicle{alerts.d60 > 1 ? 's' : ''} URGENT</strong>
                        <span>60 – 90 days in stock</span>
                      </div>
                    </div>
                  )}

                  {behindPace && (
                    <div className="notif-item ni-warn" onClick={() => { navigate('/dashboard'); setNotifOpen(false); }}>
                      <i className="fa fa-chart-line notif-item-icon" />
                      <div className="notif-item-body">
                        <strong>Behind monthly target</strong>
                        <span>Profit pace is below schedule</span>
                      </div>
                    </div>
                  )}

                  {critCount === 0 && (
                    <div className="notif-empty">
                      <i className="fa fa-circle-check" style={{ color: 'var(--g)', marginRight: 6 }} />
                      All clear — no alerts
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pill">
              <span className="pill-dot" />
              ADMIN
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="content">
          <Routes>
            <Route path="/"              element={<Dashboard     showToast={showToast} />} />
            <Route path="/dashboard"     element={<Dashboard     showToast={showToast} />} />
            <Route path="/vehicles"      element={<VehiclesAndProfit showToast={showToast} />} />
            <Route path="/inhand"        element={<Vehicles          showToast={showToast} defaultStatus="IN HAND" />} />
            <Route path="/onway"         element={<Vehicles          showToast={showToast} defaultStatus="ON THE WAY" />} />
            <Route path="/advance"       element={<AdvancePaid       showToast={showToast} />} />
            <Route path="/lc"            element={<LCTracker         showToast={showToast} />} />
            <Route path="/taxreport"        element={<TaxManager        showToast={showToast} />} />
            <Route path="/businessexpenses" element={<BusinessExpenses  showToast={showToast} />} />
            <Route path="/customers"     element={<CustomerDetails showToast={showToast} />} />
            <Route path="/documents"     element={<Documents     showToast={showToast} />} />
            <Route path="/users"         element={<Users         showToast={showToast} />} />
            <Route path="/settings"      element={<Settings      showToast={showToast} />} />
          </Routes>
        </main>
      </div>

      <Toast {...toast} />
    </div>
  );
}

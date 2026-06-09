import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats } from '../services/dashboardService';
import Dashboard from './Dashboard';
import Vehicles from './Vehicles';
import LCTracker from './LCTracker';
import ProfitReport from './ProfitReport';
import TaxManager from './TaxManager';
import CustomerDetails from './CustomerDetails';
import Documents from './Documents';
import Users from './Users';
import Settings from './Settings';
import AdvancePaid from './AdvancePaid';

const SECTIONS = [
  { key: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard', group: 'Main' },
  { key: 'vehicles', icon: 'fa-car', label: 'Vehicle Register', group: 'Main' },
  { key: 'lc', icon: 'fa-file-invoice', label: 'LC Tracker', group: 'Main' },
  { key: 'profit', icon: 'fa-coins', label: 'Profit Report', group: 'Main' },
  { key: 'inhand', icon: 'fa-warehouse', label: 'In Hand', group: 'Status', badge: 'inhand' },
  { key: 'onway', icon: 'fa-ship', label: 'On The Way', group: 'Status', badge: 'onway' },
  { key: 'advance', icon: 'fa-clock', label: 'Advance Paid', group: 'Status' },
  { key: 'taxreport', icon: 'fa-file-invoice-dollar', label: 'VAT & SSCL', group: 'Finance' },
  { key: 'customers', icon: 'fa-address-book', label: 'Customer Details', group: 'Customer' },
  { key: 'documents', icon: 'fa-folder-open', label: 'Documents', group: 'Customer' },
  { key: 'users', icon: 'fa-users', label: 'User Accounts', group: 'Management' },
  { key: 'settings', icon: 'fa-gear', label: 'Settings', group: 'Management' },
];

const TITLES = {
  dashboard: 'DASHBOARD', vehicles: 'VEHICLE REGISTER', lc: 'LC TRACKER',
  profit: 'PROFIT REPORT', inhand: 'IN HAND', onway: 'ON THE WAY',
  advance: 'ADVANCE PAID',
  taxreport: 'VAT & SSCL', customers: 'CUSTOMER DETAILS', documents: 'VEHICLE DOCUMENTS',
  users: 'USER ACCOUNTS', settings: 'SETTINGS'
};

function Clock({ tz, label, flag }) {
  const [time, setTime] = useState('--:--:--');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { timeZone: tz, hour12: true }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tz]);
  return (
    <div className="ck-item">
      <span className="ck-flag">{flag}</span>
      <div className="ck-info">
        <span className="ck-lbl">{label}</span>
        <span className="ck-val">{time}</span>
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
  return (
    <div className={`toast ${type} ${visible ? 'show' : ''}`}>{message}</div>
  );
}

export default function Layout() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [badges, setBadges] = useState({ inhand: 0, onway: 0 });
  const [toast, setToast] = useState({ message: '', type: 'ok', visible: false });

  const section = location.pathname.replace('/', '') || 'dashboard';

  useEffect(() => {
    getDashboardStats().then(d => {
      setBadges({ inhand: d.inhand, onway: d.onway });
    }).catch(() => {});
  }, [section]);

  const showToast = useCallback((message, type = 'ok') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }, []);

  const go = (key) => {
    navigate('/' + key);
    setSidebarOpen(false);
  };

  const groups = [...new Set(SECTIONS.map(s => s.group))];

  return (
    <div className="layout-root">
      <div className={`overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sb-logo">
          <div className="sb-brand"><div className="sb-dot" /><h2>Fernando</h2></div>
          <p className="sb-sub">AUTO DEALERS · ADMIN</p>
        </div>
        <nav className="sb-nav">
          {groups.map(group => (
            <div key={group}>
              <div className="nav-group">{group}</div>
              {SECTIONS.filter(s => s.group === group).map(s => (
                <div
                  key={s.key}
                  className={`nav-item ${section === s.key ? 'active' : ''}`}
                  onClick={() => go(s.key)}
                >
                  <i className={`fa ${s.icon}`} />
                  {s.label}
                  {s.badge && badges[s.badge] > 0 && (
                    <span className="nav-badge">{badges[s.badge]}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div className="sb-footer">
          <div className="sb-user">
            <div className="sb-avatar">{username.slice(0, 2).toUpperCase()}</div>
            <div className="sb-info">
              <p>{username}</p>
              <span>Fernando Auto Dealers</span>
            </div>
          </div>
          <button className="sb-logout" onClick={logout}>
            <i className="fa fa-right-from-bracket" /> Sign Out
          </button>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="topbar-left">
            <button className="ham" onClick={() => setSidebarOpen(v => !v)}>
              <span /><span /><span />
            </button>
            <span className="topbar-title">{TITLES[section] || section.toUpperCase()}</span>
          </div>
          <div className="topbar-right">
            <div className="clocks-bar">
              <Clock tz="Asia/Colombo" label="Sri Lanka" flag="🇱🇰" />
              <Clock tz="Asia/Tokyo" label="Japan" flag="🇯🇵" />
              <ExchangeRate from="JPY" to="LKR" label="JPY → LKR" flag="💴" />
              <ExchangeRate from="USD" to="LKR" label="USD → LKR" flag="💵" />
            </div>
            <span className="pill">ADMIN</span>
          </div>
        </div>

        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard showToast={showToast} />} />
            <Route path="/dashboard" element={<Dashboard showToast={showToast} />} />
            <Route path="/vehicles" element={<Vehicles showToast={showToast} />} />
            <Route path="/inhand" element={<Vehicles showToast={showToast} defaultStatus="IN HAND" />} />
            <Route path="/onway" element={<Vehicles showToast={showToast} defaultStatus="ON THE WAY" />} />
            <Route path="/advance" element={<AdvancePaid showToast={showToast} />} />
            <Route path="/lc" element={<LCTracker showToast={showToast} />} />
            <Route path="/profit" element={<ProfitReport showToast={showToast} />} />
            <Route path="/taxreport" element={<TaxManager showToast={showToast} />} />
            <Route path="/customers" element={<CustomerDetails showToast={showToast} />} />
            <Route path="/documents" element={<Documents showToast={showToast} />} />
            <Route path="/users" element={<Users showToast={showToast} />} />
            <Route path="/settings" element={<Settings showToast={showToast} />} />
          </Routes>
        </div>
      </div>

      <Toast {...toast} />
    </div>
  );
}

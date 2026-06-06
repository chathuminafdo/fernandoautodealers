import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats } from '../services/dashboardService';
import Dashboard from './Dashboard';
import Vehicles from './Vehicles';
import LCTracker from './LCTracker';
import ProfitReport from './ProfitReport';
import Messages from './Messages';
import PriceRequests from './PriceRequests';
import Meetings from './Meetings';
import TaxManager from './TaxManager';
import Users from './Users';
import Settings from './Settings';

const SECTIONS = [
  { key: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard', group: 'Main' },
  { key: 'vehicles', icon: 'fa-car', label: 'Vehicle Register', group: 'Main' },
  { key: 'lc', icon: 'fa-file-invoice', label: 'LC Tracker', group: 'Main' },
  { key: 'profit', icon: 'fa-coins', label: 'Profit Report', group: 'Main' },
  { key: 'inhand', icon: 'fa-warehouse', label: 'In Hand', group: 'Status', badge: 'inhand' },
  { key: 'onway', icon: 'fa-ship', label: 'On The Way', group: 'Status', badge: 'onway' },
  { key: 'taxreport', icon: 'fa-file-invoice-dollar', label: 'VAT & SSCL', group: 'Finance' },
  { key: 'messages', icon: 'fa-envelope', label: 'Messages', group: 'Enquiries', badge: 'msgs' },
  { key: 'pricereq', icon: 'fa-tag', label: 'Price Requests', group: 'Enquiries', badge: 'prs' },
  { key: 'meetings', icon: 'fa-calendar-check', label: 'Meetings', group: 'Enquiries', badge: 'meets' },
  { key: 'users', icon: 'fa-users', label: 'User Accounts', group: 'Management' },
  { key: 'settings', icon: 'fa-gear', label: 'Settings', group: 'Management' },
];

const TITLES = {
  dashboard: 'DASHBOARD', vehicles: 'VEHICLE REGISTER', lc: 'LC TRACKER',
  profit: 'PROFIT REPORT', inhand: 'IN HAND', onway: 'ON THE WAY',
  taxreport: 'VAT & SSCL', messages: 'MESSAGES', pricereq: 'PRICE REQUESTS',
  meetings: 'MEETINGS', users: 'USER ACCOUNTS', settings: 'SETTINGS'
};

function Clock({ tz, label, flag }) {
  const [time, setTime] = useState('--:--:--');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { timeZone: tz, hour12: false }));
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
  const [badges, setBadges] = useState({ inhand: 0, onway: 0, msgs: 0, prs: 0, meets: 0 });
  const [toast, setToast] = useState({ message: '', type: 'ok', visible: false });

  const section = location.pathname.replace('/', '') || 'dashboard';

  useEffect(() => {
    getDashboardStats().then(d => {
      setBadges({ inhand: d.inhand, onway: d.onway, msgs: d.msgs, prs: d.prs, meets: d.meets });
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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
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
            <Route path="/lc" element={<LCTracker showToast={showToast} />} />
            <Route path="/profit" element={<ProfitReport showToast={showToast} />} />
            <Route path="/messages" element={<Messages showToast={showToast} />} />
            <Route path="/pricereq" element={<PriceRequests showToast={showToast} />} />
            <Route path="/meetings" element={<Meetings showToast={showToast} />} />
            <Route path="/taxreport" element={<TaxManager showToast={showToast} />} />
            <Route path="/users" element={<Users showToast={showToast} />} />
            <Route path="/settings" element={<Settings showToast={showToast} />} />
          </Routes>
        </div>
      </div>

      <Toast {...toast} />
    </div>
  );
}

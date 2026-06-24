import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../services/authService';
import { getTarget, setTarget, getAllTargets } from '../services/targetService';

const fmt = n => n == null ? '—' : Number(n).toLocaleString('en-LK', { maximumFractionDigits: 0 });
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Settings({ showToast }) {
  const { username, user } = useAuth();

  /* ── Password change ── */
  const [cur, setCur]         = useState('');
  const [np, setNp]           = useState('');
  const [cp, setCp]           = useState('');
  const [saving, setSaving]   = useState(false);

  /* ── Monthly targets ── */
  const now = new Date();
  const [tYear, setTYear]             = useState(now.getFullYear());
  const [tMonth, setTMonth]           = useState(now.getMonth() + 1);
  const [profitTarget, setPT]         = useState('');
  const [unitsTarget, setUT]          = useState('');
  const [savingT, setSavingT]         = useState(false);
  const [allTargets, setAllTargets]   = useState([]);
  const [loadingT, setLoadingT]       = useState(false);

  useEffect(() => { loadCurrentTarget(); }, [tYear, tMonth]);
  useEffect(() => { loadAllTargets(); }, []);

  const loadCurrentTarget = async () => {
    setLoadingT(true);
    try {
      const t = await getTarget(tYear, tMonth);
      setPT(t?.profit_target ? String(t.profit_target) : '');
      setUT(t?.units_target  ? String(t.units_target)  : '');
    } catch {}
    finally { setLoadingT(false); }
  };

  const loadAllTargets = async () => {
    try { setAllTargets(await getAllTargets()); }
    catch {}
  };

  const savePwd = async () => {
    if (!cur || !np || !cp) { showToast('Fill in all password fields', 'err'); return; }
    if (np !== cp)           { showToast('Passwords do not match', 'err');     return; }
    if (np.length < 6)       { showToast('Min 6 characters', 'err');           return; }
    setSaving(true);
    try {
      await changePassword(cur, np);
      showToast('Password changed!', 'ok');
      setCur(''); setNp(''); setCp('');
    } catch (e) {
      const msg = e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential'
        ? 'Current password is incorrect' : e.message || 'Failed';
      showToast(msg, 'err');
    } finally { setSaving(false); }
  };

  const saveTarget = async () => {
    if (!profitTarget && !unitsTarget) { showToast('Enter at least one target value', 'err'); return; }
    setSavingT(true);
    try {
      await setTarget(tYear, tMonth, profitTarget, unitsTarget);
      showToast(`Target saved for ${MONTHS[tMonth - 1]} ${tYear}!`, 'ok');
      await loadAllTargets();
    } catch { showToast('Failed to save target', 'err'); }
    finally { setSavingT(false); }
  };

  const monthVal = `${tYear}-${String(tMonth).padStart(2, '0')}`;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 16, alignItems: 'start' }}>

      {/* ── Change Password ── */}
      <div className="card">
        <div className="card-header"><h3>CHANGE PASSWORD</h3></div>
        <div className="card-body">
          <div className="form-row">
            <label>Email</label>
            <input type="text" value={user?.email || username} readOnly style={{ opacity: .5 }} />
          </div>
          <div className="form-row">
            <label>Current Password</label>
            <input type="password" value={cur} onChange={e => setCur(e.target.value)} placeholder="Current password" />
          </div>
          <div className="form-row">
            <label>New Password</label>
            <input type="password" value={np} onChange={e => setNp(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div className="form-row">
            <label>Confirm New Password</label>
            <input type="password" value={cp} onChange={e => setCp(e.target.value)} placeholder="Confirm" />
          </div>
          <button className="btn-save" style={{ width: '100%', marginTop: 6 }} onClick={savePwd} disabled={saving}>
            {saving ? 'Saving…' : 'Save Password'}
          </button>
        </div>
      </div>

      {/* ── Monthly Targets ── */}
      <div className="card">
        <div className="card-header">
          <h3><i className="fa fa-bullseye" style={{ marginRight: 8, color: 'var(--r)' }} />MONTHLY TARGETS</h3>
        </div>
        <div className="card-body">

          {/* Month picker */}
          <div className="form-row">
            <label>Month</label>
            <input
              type="month"
              value={monthVal}
              onChange={e => {
                const [y, m] = e.target.value.split('-');
                if (y && m) { setTYear(Number(y)); setTMonth(Number(m)); }
              }}
            />
          </div>

          {loadingT && <div style={{ fontSize: '.72rem', color: 'var(--t3)', marginBottom: 10 }}><span className="spin" />Loading…</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div className="form-row">
              <label>Profit Target (LKR)</label>
              <input
                type="number"
                value={profitTarget}
                onChange={e => setPT(e.target.value)}
                placeholder="e.g. 5000000"
              />
            </div>
            <div className="form-row">
              <label>Units Target (Vehicles)</label>
              <input
                type="number"
                value={unitsTarget}
                onChange={e => setUT(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
          </div>

          {/* Live preview */}
          {(profitTarget || unitsTarget) && (
            <div style={{ background: 'rgba(229,57,53,.07)', border: '1px solid rgba(229,57,53,.18)', borderRadius: 9, padding: '10px 14px', marginBottom: 12, fontSize: '.78rem' }}>
              <div style={{ color: 'var(--t3)', fontSize: '.62rem', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>Preview</div>
              <div style={{ display: 'flex', gap: 20 }}>
                {profitTarget && (
                  <span style={{ color: 'var(--g)' }}>
                    <i className="fa fa-coins" style={{ marginRight: 5 }} />
                    LKR {fmt(profitTarget)}
                  </span>
                )}
                {unitsTarget && (
                  <span style={{ color: '#60a5fa' }}>
                    <i className="fa fa-car" style={{ marginRight: 5 }} />
                    {unitsTarget} vehicles
                  </span>
                )}
              </div>
            </div>
          )}

          <button className="btn-save" style={{ width: '100%' }} onClick={saveTarget} disabled={savingT}>
            {savingT ? 'Saving…' : `Save Target — ${MONTHS[tMonth - 1]} ${tYear}`}
          </button>

          {/* Recent targets history */}
          {allTargets.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: '.6rem', color: 'var(--t3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>
                Target History
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {allTargets.slice(0, 8).map(t => {
                  const isCurrentMonth = t.year === now.getFullYear() && t.month === now.getMonth() + 1;
                  return (
                    <div key={t.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 11px',
                      background: isCurrentMonth ? 'rgba(229,57,53,.07)' : 'var(--bg3)',
                      borderRadius: 8,
                      border: isCurrentMonth ? '1px solid rgba(229,57,53,.2)' : '1px solid var(--br)',
                    }}>
                      <span style={{ fontFamily: "'Josefin Sans',sans-serif", fontSize: '.78rem', color: isCurrentMonth ? '#fff' : 'var(--t2)' }}>
                        {isCurrentMonth && <i className="fa fa-circle-dot" style={{ color: 'var(--r)', marginRight: 6, fontSize: '.6rem' }} />}
                        {MONTHS[(t.month || 1) - 1]} {t.year}
                      </span>
                      <div style={{ display: 'flex', gap: 14 }}>
                        <span style={{ fontSize: '.72rem', color: 'var(--g)' }}>
                          <i className="fa fa-coins" style={{ marginRight: 4 }} />
                          {fmt(t.profit_target)}
                        </span>
                        <span style={{ fontSize: '.72rem', color: '#60a5fa' }}>
                          <i className="fa fa-car" style={{ marginRight: 4 }} />
                          {t.units_target}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

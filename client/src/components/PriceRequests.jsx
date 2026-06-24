import React, { useEffect, useState } from 'react';
import { getPriceRequests, updatePriceRequest, deletePriceRequest } from '../services/priceRequestService';

const STAGES = [
  { key: 'new',         label: 'New',        icon: 'fa-inbox',           color: '#3b82f6' },
  { key: 'quoted',      label: 'Quoted',      icon: 'fa-file-invoice',    color: '#f59e0b' },
  { key: 'negotiating', label: 'Negotiating', icon: 'fa-comments-dollar', color: '#f97316' },
  { key: 'won',         label: 'Won',         icon: 'fa-circle-check',    color: '#22c55e' },
  { key: 'lost',        label: 'Lost',        icon: 'fa-circle-xmark',    color: '#ef4444' },
];

const normalize = (s) => {
  if (!s) return 'new';
  if (s === 'pending') return 'new';
  if (s === 'replied') return 'quoted';
  if (s === 'closed')  return 'lost';
  return s;
};

const fmt  = n => n == null ? '—' : Number(n).toLocaleString('en-LK', { maximumFractionDigits: 0 });
const fmtD = d => { if (!d) return '—'; const s = d.split('T')[0]; const [y, m, dy] = s.split('-'); return `${dy}/${m}/${y}`; };

function ManageModal({ req, onClose, onSave, showToast }) {
  const [status, setStatus]     = useState(normalize(req.status));
  const [quotedPrice, setQP]    = useState(req.quoted_price || '');
  const [followUp, setFollowUp] = useState(req.follow_up_date || '');
  const [notes, setNotes]       = useState(req.admin_notes || '');
  const [saving, setSaving]     = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updatePriceRequest(req.id, {
        status,
        quoted_price:   quotedPrice ? Number(quotedPrice) : null,
        follow_up_date: followUp || null,
        admin_notes:    notes || null,
      });
      showToast('Updated!', 'ok');
      onSave();
      onClose();
    } catch { showToast('Failed to save', 'err'); }
    finally { setSaving(false); }
  };

  const stage = STAGES.find(s => s.key === status);
  const today = new Date().toISOString().split('T')[0];
  const fuOverdue = followUp && followUp < today;
  const createdStr = req.created_at?.toDate
    ? req.created_at.toDate().toISOString()
    : (typeof req.created_at === 'string' ? req.created_at : null);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Price Request</h2>
          <button className="modal-close" onClick={onClose}><i className="fa fa-times" /></button>
        </div>

        <div style={{ background: 'var(--bg3)', borderRadius: 9, padding: '10px 14px', marginBottom: 16, borderLeft: `3px solid ${stage.color}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '.9rem' }}>{req.name}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--t3)', marginTop: 2 }}>{req.phone} · {req.email}</div>
            </div>
            <span style={{ fontSize: '.72rem', color: 'var(--t3)', textAlign: 'right' }}>
              {req.brand} {req.model}<br />
              <span style={{ fontSize: '.65rem' }}>Req: {fmtD(createdStr)}</span>
            </span>
          </div>
          {req.message && (
            <div style={{ marginTop: 8, fontSize: '.72rem', color: 'var(--t2)', fontStyle: 'italic', borderTop: '1px solid var(--br)', paddingTop: 6 }}>
              "{req.message}"
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: '.65rem', color: 'var(--t3)', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Pipeline Stage</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
            {STAGES.map(s => (
              <button
                key={s.key}
                onClick={() => setStatus(s.key)}
                style={{
                  background: status === s.key ? s.color + '22' : 'var(--bg3)',
                  border: `1.5px solid ${status === s.key ? s.color : 'var(--br)'}`,
                  borderRadius: 8, padding: '8px 4px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  transition: 'all .2s',
                }}
              >
                <i className={`fa ${s.icon}`} style={{ color: status === s.key ? s.color : 'var(--t3)', fontSize: '.9rem' }} />
                <span style={{ fontSize: '.6rem', color: status === s.key ? s.color : 'var(--t3)', fontFamily: "'Josefin Sans',sans-serif", fontWeight: 700, letterSpacing: '.5px' }}>
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <div className="form-row">
            <label>Quoted Price (LKR)</label>
            <input
              type="number"
              value={quotedPrice}
              onChange={e => setQP(e.target.value)}
              placeholder="e.g. 8500000"
              disabled={status === 'lost'}
            />
          </div>
          <div className="form-row">
            <label style={{ color: fuOverdue ? 'var(--rl)' : undefined }}>
              {fuOverdue && <i className="fa fa-triangle-exclamation" style={{ marginRight: 5 }} />}
              Follow-up Date
            </label>
            <input
              type="date"
              value={followUp}
              onChange={e => setFollowUp(e.target.value)}
              style={{ borderColor: fuOverdue ? 'var(--rl)' : undefined }}
            />
          </div>
        </div>

        <div className="form-row">
          <label>Admin Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Negotiation details, conditions…"
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button className="btn-save" style={{ flex: 1 }} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function PriceRequests({ showToast }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPriceRequests();
      setRequests(data.map(r => ({ ...r, _status: normalize(r.status) })));
    } catch { showToast('Failed to load', 'err'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deletePriceRequest(id);
      showToast('Deleted', 'ok');
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch { showToast('Failed to delete', 'err'); }
    finally { setDeleting(null); }
  };

  const counts = STAGES.reduce((acc, s) => {
    acc[s.key] = requests.filter(r => r._status === s.key).length;
    return acc;
  }, {});
  counts.all = requests.length;

  const visible = filter === 'all' ? requests : requests.filter(r => r._status === filter);
  const today   = new Date().toISOString().split('T')[0];

  return (
    <>
      <div className="pr-pipeline">
        <button
          className={`pr-stage-btn ${filter === 'all' ? 'active' : ''}`}
          style={{ '--sc': '#9ca3af' }}
          onClick={() => setFilter('all')}
        >
          <span className="pr-stage-count">{counts.all}</span>
          <span className="pr-stage-name">All</span>
        </button>
        {STAGES.map(s => (
          <button
            key={s.key}
            className={`pr-stage-btn ${filter === s.key ? 'active' : ''}`}
            style={{ '--sc': s.color }}
            onClick={() => setFilter(s.key)}
          >
            <i className={`fa ${s.icon}`} style={{ marginBottom: 3 }} />
            <span className="pr-stage-count">{counts[s.key]}</span>
            <span className="pr-stage-name">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>
            {filter === 'all'
              ? `ALL REQUESTS (${requests.length})`
              : `${STAGES.find(s => s.key === filter)?.label?.toUpperCase()} (${counts[filter]})`}
          </h3>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Stage</th>
                <th>Customer</th>
                <th>Vehicle Interest</th>
                <th>Quoted Price</th>
                <th>Follow-up</th>
                <th>Received</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="loading"><span className="spin" />Loading…</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan="8" className="empty">No requests in this stage</td></tr>
              ) : visible.map(r => {
                const stage = STAGES.find(s => s.key === r._status) || STAGES[0];
                const fuOverdue = r.follow_up_date && r.follow_up_date < today;
                const createdStr = r.created_at?.toDate
                  ? r.created_at.toDate().toISOString()
                  : (typeof r.created_at === 'string' ? r.created_at : null);
                return (
                  <tr key={r.id} onClick={() => setSelected(r)} style={{ cursor: 'pointer' }}>
                    <td>
                      <span className="pr-pill" style={{ '--pc': stage.color }}>
                        <i className={`fa ${stage.icon}`} />
                        {stage.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '.82rem' }}>{r.name}</div>
                      <div style={{ fontSize: '.65rem', color: 'var(--t3)' }}>{r.phone}</div>
                      {r.email && <div style={{ fontSize: '.62rem', color: 'var(--t3)' }}>{r.email}</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '.82rem' }}>{r.brand} {r.model}</div>
                      {r.message && (
                        <div style={{ fontSize: '.63rem', color: 'var(--t3)', marginTop: 2, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.message}
                        </div>
                      )}
                    </td>
                    <td className="amt">
                      {r.quoted_price
                        ? <span style={{ color: 'var(--g)', fontWeight: 700, fontSize: '.82rem' }}>LKR {fmt(r.quoted_price)}</span>
                        : <span style={{ color: 'var(--t3)', fontSize: '.72rem' }}>Not quoted</span>}
                    </td>
                    <td>
                      {r.follow_up_date
                        ? <span style={{ color: fuOverdue ? 'var(--rl)' : 'var(--t2)', fontSize: '.75rem', fontWeight: fuOverdue ? 700 : 400 }}>
                            {fuOverdue && <i className="fa fa-triangle-exclamation" style={{ marginRight: 4 }} />}
                            {fmtD(r.follow_up_date)}
                          </span>
                        : <span style={{ color: 'var(--t3)', fontSize: '.72rem' }}>—</span>}
                    </td>
                    <td style={{ fontSize: '.72rem', color: 'var(--t3)' }}>{fmtD(createdStr)}</td>
                    <td>
                      {r.admin_notes
                        ? <span style={{ fontSize: '.65rem', color: 'var(--t2)', maxWidth: 120, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.admin_notes}
                          </span>
                        : <span style={{ color: 'var(--t3)', fontSize: '.65rem' }}>—</span>}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" title="Edit" onClick={() => setSelected(r)}>
                          <i className="fa fa-pen-to-square" />
                        </button>
                        <button
                          className="btn-icon danger"
                          title="Delete"
                          disabled={deleting === r.id}
                          onClick={() => { if (window.confirm('Delete this request?')) handleDelete(r.id); }}
                        >
                          {deleting === r.id ? <span className="spin" /> : <i className="fa fa-trash" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <ManageModal
          req={selected}
          onClose={() => setSelected(null)}
          onSave={load}
          showToast={showToast}
        />
      )}
    </>
  );
}

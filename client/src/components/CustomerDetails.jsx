import React, { useState, useEffect, useCallback } from 'react';
import { getVehicles, updateVehicle } from '../services/vehicleService';
import { printAdvanceInvoice, printCustomerInvoice } from '../utils/invoicePrint';

const fmt  = n => n == null ? '—' : Number(n).toLocaleString('en-LK', { maximumFractionDigits: 0 });
const fmtD = d => { if (!d) return '—'; const s = String(d).split('T')[0]; const [y, m, dy] = s.split('-'); return `${dy}/${m}/${y}`; };

/* ── Edit popup for customer / registration fields ── */
function EditModal({ vehicle, onClose, onSaved, showToast }) {
  const [customerName, setCustomerName] = useState(vehicle.customer_name || '');
  const [contact, setContact]           = useState(vehicle.contact       || '');
  const [regStatus, setRegStatus]       = useState(vehicle.reg_status    || 'UNREGISTERED');
  const [regNum, setRegNum]             = useState(vehicle.reg_num       || '');
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const save = async () => {
    setSaving(true);
    try {
      await updateVehicle(vehicle.id, {
        ...vehicle,
        customer_name: customerName,
        contact,
        reg_status: regStatus,
        reg_num: regNum,
        /* keep date fields as plain strings so basePayload is happy */
        lc_date:    vehicle.lc_date?.split('T')[0]    || '',
        clear_date: vehicle.clear_date?.split('T')[0] || '',
        sell_date:  vehicle.sell_date?.split('T')[0]  || '',
      });
      showToast('Updated!', 'ok');
      onSaved();
      onClose();
    } catch (e) {
      showToast(e.message || 'Save failed', 'err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--bg2)', border: '1px solid var(--br2)',
        borderRadius: 14, padding: '22px 22px 18px',
      }}>
        {/* header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '.82rem', fontWeight: 800, color: '#fff', letterSpacing: '.6px', marginBottom: 3 }}>
            EDIT CUSTOMER INFO
          </div>
          <div style={{ fontSize: '.7rem', color: 'var(--t3)' }}>
            #{vehicle.no} · {vehicle.brand} {vehicle.model}
          </div>
        </div>

        {/* Customer Name */}
        <div className="form-row">
          <label>Customer Name</label>
          <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Full name of buyer" />
        </div>

        {/* Contact */}
        <div className="form-row">
          <label>Contact (Phone)</label>
          <input value={contact} onChange={e => setContact(e.target.value)} placeholder="07X XXX XXXX" />
        </div>

        {/* Registration toggle */}
        <div className="form-row">
          <label>Vehicle Registration</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['UNREGISTERED', 'REGISTERED'].map(opt => (
              <button key={opt} onClick={() => setRegStatus(opt)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 7, fontSize: '.72rem', fontWeight: 700,
                  border: `1px solid ${regStatus === opt ? (opt === 'REGISTERED' ? 'rgba(96,165,250,.5)' : 'rgba(251,146,60,.5)') : 'var(--br)'}`,
                  background: regStatus === opt ? (opt === 'REGISTERED' ? 'rgba(96,165,250,.15)' : 'rgba(251,146,60,.12)') : 'var(--bg3)',
                  color: regStatus === opt ? (opt === 'REGISTERED' ? '#93c5fd' : '#fb923c') : 'var(--t3)',
                  cursor: 'pointer',
                }}>
                <i className={`fa ${opt === 'REGISTERED' ? 'fa-id-card' : 'fa-circle-xmark'}`} style={{ marginRight: 5 }} />
                {opt === 'REGISTERED' ? 'Registered' : 'Unregistered'}
              </button>
            ))}
          </div>
        </div>

        {/* Reg Number */}
        {regStatus === 'REGISTERED' && (
          <div className="form-row">
            <label>Registration Number</label>
            <input
              value={regNum}
              onChange={e => setRegNum(e.target.value.toUpperCase())}
              placeholder="CCB 1717"
              style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '.5px' }}
            />
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   Main page
   ════════════════════════════════════════════ */
export default function CustomerDetails({ showToast }) {
  const [customers, setCustomers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [q, setQ]                   = useState('');
  const [expanded, setExpanded]     = useState(null);
  const [editVehicle, setEditVehicle] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getVehicles()
      .then(vehicles => {
        const sold = vehicles.filter(v => v.status === 'SOLD' && v.contact);
        const map = {};
        sold.forEach(v => {
          const key = v.contact.trim();
          if (!map[key]) map[key] = {
            contact: key, customer_name: '',
            vehicles: [], total_spent: 0, total_income: 0,
          };
          if (v.customer_name && !map[key].customer_name) map[key].customer_name = v.customer_name;
          map[key].vehicles.push(v);
          map[key].total_spent  += parseFloat(v.sell_price) || 0;
          map[key].total_income += parseFloat(v.income)     || 0;
        });
        setCustomers(Object.values(map).sort((a, b) => Math.min(...a.vehicles.map(v => v.no)) - Math.min(...b.vehicles.map(v => v.no))));
      })
      .catch(() => showToast('Failed to load customers', 'err'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = q
    ? customers.filter(c =>
        c.contact.includes(q) ||
        (c.customer_name || '').toLowerCase().includes(q.toLowerCase()) ||
        c.vehicles.some(v => `${v.brand} ${v.model}`.toLowerCase().includes(q.toLowerCase()))
      )
    : customers;

  const toggle = contact => setExpanded(e => e === contact ? null : contact);

  return (
    <>
      {editVehicle && (
        <EditModal
          vehicle={editVehicle}
          onClose={() => setEditVehicle(null)}
          onSaved={load}
          showToast={showToast}
        />
      )}

      <div className="card">
        <div className="card-header">
          <h3>CUSTOMER DETAILS</h3>
          <div className="card-header-right">
            <div className="search-wrap">
              <i className="fa fa-search" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, contact or vehicle…" />
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Purchases</th>
                <th>Total Spent (LKR)</th>
                <th>Our Income (LKR)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="loading"><span className="spin" />Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" className="empty">No customers found</td></tr>
              ) : filtered.map((c, i) => (
                <React.Fragment key={c.contact}>
                  {/* ── Customer summary row ── */}
                  <tr style={{ cursor: 'pointer' }} onClick={() => toggle(c.contact)}>
                    <td><strong>{Math.min(...c.vehicles.map(v => v.no))}</strong></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'var(--bg3)', border: '1px solid var(--br)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '.7rem', color: 'var(--t2)', flexShrink: 0,
                          fontWeight: 700, fontFamily: "'Josefin Sans', sans-serif",
                        }}>
                          {c.customer_name
                            ? c.customer_name.slice(0, 2).toUpperCase()
                            : <i className="fa fa-user" style={{ fontSize: '.65rem' }} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '.82rem' }}>
                            {c.customer_name || <span style={{ color: 'var(--t3)', fontWeight: 400 }}>—</span>}
                          </div>
                          {c.vehicles.length > 1 && (
                            <div style={{ fontSize: '.63rem', color: 'var(--g)', marginTop: 1 }}>
                              <i className="fa fa-rotate" style={{ marginRight: 4 }} />Repeat customer
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '.76rem', color: 'var(--t2)' }}>{c.contact}</td>
                    <td>
                      <span className="badge b-import">{c.vehicles.length} vehicle{c.vehicles.length > 1 ? 's' : ''}</span>
                    </td>
                    <td className="amt">{fmt(c.total_spent)}</td>
                    <td>
                      <span className={`badge ${c.total_income >= 0 ? 'b-profit' : 'b-loss'}`}>
                        {c.total_income >= 0 ? '+ ' : '− '}{fmt(Math.abs(c.total_income))}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <i className={`fa fa-chevron-${expanded === c.contact ? 'up' : 'down'}`}
                        style={{ fontSize: '.7rem', color: 'var(--t3)' }} />
                    </td>
                  </tr>

                  {/* ── Expanded vehicle sub-rows ── */}
                  {expanded === c.contact && c.vehicles.map(v => {
                    const isReg = v.reg_status === 'REGISTERED';
                    return (
                      <tr key={v.id} style={{ background: 'rgba(255,255,255,.025)' }}>
                        <td />
                        <td colSpan="5">
                          <div style={{
                            display: 'flex', gap: 12, alignItems: 'center',
                            padding: '7px 4px', fontSize: '.76rem', flexWrap: 'wrap',
                          }}>
                            {/* No */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--g)', flexShrink: 0 }} />
                              <strong style={{ fontFamily: "'Josefin Sans', sans-serif" }}>#{v.no}</strong>
                            </div>

                            {/* Vehicle name */}
                            <span style={{ fontWeight: 600 }}>{v.brand} {v.model}</span>

                            {/* Chassis */}
                            {v.chassis && (
                              <span style={{ color: 'var(--t3)', fontFamily: 'monospace', fontSize: '.7rem' }}>{v.chassis}</span>
                            )}

                            {/* Colour */}
                            {v.colour && <span style={{ color: 'var(--t3)' }}>{v.colour}</span>}

                            {/* Type badge */}
                            <span className={`badge ${v.type === 'LOCAL' ? 'b-local' : 'b-import'}`}>{v.type}</span>

                            {/* Registration badge */}
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '2px 9px', borderRadius: 20, fontSize: '.65rem', fontWeight: 700,
                              background: isReg ? 'rgba(96,165,250,.12)' : 'rgba(255,255,255,.06)',
                              color: isReg ? '#60a5fa' : 'var(--t3)',
                              border: `1px solid ${isReg ? 'rgba(96,165,250,.3)' : 'var(--br)'}`,
                            }}>
                              <i className={`fa ${isReg ? 'fa-id-card' : 'fa-circle-xmark'}`} style={{ fontSize: '.6rem' }} />
                              {isReg ? 'Registered' : 'Unregistered'}
                            </span>

                            {/* Reg number plate */}
                            {isReg && v.reg_num && (
                              <span style={{
                                padding: '2px 10px', borderRadius: 6, fontSize: '.72rem', fontWeight: 800,
                                background: 'rgba(96,165,250,.1)', color: '#93c5fd',
                                border: '1px solid rgba(96,165,250,.25)',
                                fontFamily: 'monospace', letterSpacing: '.5px',
                              }}>
                                {v.reg_num.toUpperCase()}
                              </span>
                            )}

                            {/* Sell price */}
                            <span style={{ marginLeft: 'auto', fontWeight: 700, fontFamily: "'Josefin Sans', sans-serif" }}>
                              LKR {fmt(v.sell_price)}
                            </span>

                            {/* Sell date */}
                            <span style={{ color: 'var(--t3)' }}>{fmtD(v.sell_date)}</span>

                            {/* Income badge */}
                            {v.income != null && (
                              <span className={`badge ${parseFloat(v.income) >= 0 ? 'b-profit' : 'b-loss'}`}>
                                {parseFloat(v.income) >= 0 ? '+ ' : '− '}{fmt(Math.abs(v.income))}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Invoice + Edit buttons */}
                        <td style={{ textAlign: 'right', paddingRight: 8 }}>
                          <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            {v.payment_type === 'ADVANCE' && (
                              <button
                                onClick={e => { e.stopPropagation(); printAdvanceInvoice({ vehicle: { ...v }, sale: { sell_price: v.sell_price, sell_date: v.sell_date, advance_date: v.advance_date, advance_amount: v.advance_amount, vehicle_price: v.vehicle_price, rmv_fee: v.rmv_fee, lease_amount: v.lease_amount, cash_amount: v.cash_amount }, buyer: { customer_name: v.customer_name, contact: v.contact, buyer_address: v.buyer_address } }); }}
                                title="Advance Invoice"
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  padding: '4px 10px', borderRadius: 7, fontSize: '.68rem', fontWeight: 700,
                                  background: 'rgba(251,146,60,.1)', color: '#fb923c',
                                  border: '1px solid rgba(251,146,60,.25)', cursor: 'pointer',
                                }}
                              >
                                <i className="fa fa-file-invoice" style={{ fontSize: '.6rem' }} /> Advance
                              </button>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); printCustomerInvoice({ vehicle: { ...v }, sale: { sell_price: v.sell_price, sell_date: v.sell_date, advance_date: v.advance_date, advance_amount: v.advance_amount, vehicle_price: v.vehicle_price, rmv_fee: v.rmv_fee, lease_amount: v.lease_amount, cash_amount: v.cash_amount }, buyer: { customer_name: v.customer_name, contact: v.contact, buyer_address: v.buyer_address } }); }}
                              title="Final Invoice"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '4px 10px', borderRadius: 7, fontSize: '.68rem', fontWeight: 700,
                                background: 'rgba(74,222,128,.1)', color: '#4ade80',
                                border: '1px solid rgba(74,222,128,.25)', cursor: 'pointer',
                              }}
                            >
                              <i className="fa fa-file-invoice-dollar" style={{ fontSize: '.6rem' }} /> Final
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setEditVehicle(v); }}
                              title="Edit customer / registration"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '4px 10px', borderRadius: 7, fontSize: '.68rem', fontWeight: 700,
                                background: 'rgba(96,165,250,.1)', color: '#93c5fd',
                                border: '1px solid rgba(96,165,250,.25)', cursor: 'pointer',
                              }}
                            >
                              <i className="fa fa-pen" style={{ fontSize: '.6rem' }} /> Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pag">
          <span className="pag-info">
            {filtered.length} customer{filtered.length !== 1 ? 's' : ''}
            {filtered.length > 0 && ` · ${filtered.reduce((s, c) => s + c.vehicles.length, 0)} total purchases`}
          </span>
        </div>
      </div>
    </>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createVehicle, updateVehicle } from '../services/vehicleService';

const fmt  = n => n == null ? '—' : Number(n).toLocaleString('en-LK', { maximumFractionDigits: 0 });
const fmtD = d => { if (!d) return '—'; const s = String(d).split('T')[0]; const [y, m, dy] = s.split('-'); return `${dy}/${m}/${y}`; };

const EMPTY = {
  status: 'ON THE WAY', type: 'IMPORT', brand: '', model: '', year: '',
  chassis: '', colour: '', mileage: '', grade: '',
  engine_num: '', model_code: '', origin: 'Japan', fuel_type: 'Petrol',
  lc_date: '', lc_num: '', tt_lkr: '', lc_lkr: '', duty: '',
  others: '', cusdec: '', clear_date: '', cost: '', sell_date: '', sell_price: '', income: '',
  contact: '', customer_name: '', reg_status: 'UNREGISTERED', reg_num: '', notes: '',
};

/* ── In-page PDF viewer ── */
function PdfViewer({ url, title, onClose }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,.85)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{ width: '100%', maxWidth: 920, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fa fa-file-pdf" style={{ color: '#ef4444', fontSize: '1.1rem' }} />
          <span style={{ fontSize: '.82rem', fontWeight: 700, color: '#fff', letterSpacing: '.5px' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={url} target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8, fontSize: '.72rem', fontWeight: 700,
              background: 'rgba(96,165,250,.15)', color: '#93c5fd',
              border: '1px solid rgba(96,165,250,.3)', textDecoration: 'none' }}>
            <i className="fa fa-arrow-up-right-from-square" /> Open in Browser
          </a>
          <button onClick={onClose}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8, fontSize: '.72rem', fontWeight: 700,
              background: 'rgba(239,68,68,.15)', color: '#fca5a5',
              border: '1px solid rgba(239,68,68,.3)', cursor: 'pointer' }}>
            <i className="fa fa-xmark" /> Close
          </button>
        </div>
      </div>
      <iframe src={url} title={title}
        style={{ width: '100%', maxWidth: 920, height: 'min(80vh, 900px)',
          border: 'none', borderRadius: 10, background: '#fff' }} />
    </div>
  );
}

/* ── Tab bar ── */
const TAB_STYLE = (active) => ({
  flex: 1, padding: '9px 0', border: 'none', borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
  background: 'transparent', color: active ? '#60a5fa' : 'var(--t3)',
  fontSize: '.74rem', fontWeight: 700, letterSpacing: '.6px', cursor: 'pointer',
  textTransform: 'uppercase', transition: 'color .2s',
});

/* ── Read-only info row ── */
const InfoRow = ({ label, value, accent }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '5px 0', borderBottom: '1px solid var(--br)', fontSize: '.76rem' }}>
    <span style={{ color: 'var(--t3)' }}>{label}</span>
    <span style={{ color: accent || 'var(--t1)', fontWeight: 600 }}>{value || '—'}</span>
  </div>
);

/* ── Overview section heading ── */
const SectionHead = ({ icon, label, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 8px',
    fontSize: '.7rem', fontWeight: 700, letterSpacing: '.8px', color: color || 'var(--t2)', textTransform: 'uppercase' }}>
    <i className={`fa ${icon}`} style={{ color }} />
    {label}
  </div>
);

export default function VehicleModal({ open, vehicle, onClose, onSaved, showToast }) {
  const [form, setForm]     = useState(EMPTY);
  const [tab, setTab]       = useState('details');
  const [saving, setSaving] = useState(false);
  const [pdfUrl, setPdfUrl]     = useState(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const lcPdfRef     = useRef();
  const cusdecPdfRef = useRef();
  const openPdf  = useCallback((url, title) => { setPdfUrl(url); setPdfTitle(title); }, []);
  const closePdf = useCallback(() => setPdfUrl(null), []);

  useEffect(() => {
    if (vehicle) {
      const f = { ...EMPTY };
      Object.keys(EMPTY).forEach(k => { f[k] = vehicle[k] != null ? String(vehicle[k]) : ''; });
      if (vehicle.lc_date)    f.lc_date    = vehicle.lc_date.split('T')[0];
      if (vehicle.clear_date) f.clear_date = vehicle.clear_date.split('T')[0];
      if (vehicle.sell_date)  f.sell_date  = vehicle.sell_date.split('T')[0];
      setForm(f);
    } else {
      setForm(EMPTY);
    }
    setTab('details');
    if (lcPdfRef.current)     lcPdfRef.current.value     = '';
    if (cusdecPdfRef.current) cusdecPdfRef.current.value = '';
  }, [vehicle, open]);

  const set = (k, v) => setForm(f => {
    const nf = { ...f, [k]: v };
    if (k !== 'income') {
      const cost = parseFloat(nf.cost)       || 0;
      const sell = parseFloat(nf.sell_price) || 0;
      if (cost && sell) nf.income = (sell - cost).toFixed(2);
    }
    return nf;
  });

  const save = async () => {
    if (!form.brand.trim() || !form.model.trim()) {
      showToast('Brand and Model required', 'err'); return;
    }
    setSaving(true);
    try {
      const lcPdf     = lcPdfRef.current?.files[0]     || null;
      const cusdecPdf = cusdecPdfRef.current?.files[0] || null;
      if (vehicle?.id) {
        await updateVehicle(vehicle.id, form, lcPdf, cusdecPdf);
        showToast('Vehicle updated!', 'ok');
      } else {
        await createVehicle(form, lcPdf, cusdecPdf);
        showToast('Vehicle added!', 'ok');
      }
      onSaved();
      onClose();
    } catch (e) {
      showToast(e.message || 'Save failed', 'err');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  /* derived values for overview */
  const income     = parseFloat(form.income)     || null;
  const cost       = parseFloat(form.cost)       || null;
  const sell_price = parseFloat(form.sell_price) || null;
  const incomeColor = income == null ? 'var(--t1)' : income >= 0 ? '#4ade80' : '#f87171';

  const statusColor = form.status === 'SOLD' ? '#4ade80' : form.status === 'IN HAND' ? '#60a5fa' : '#fb923c';

  return (
    <>
    {pdfUrl && <PdfViewer url={pdfUrl} title={pdfTitle} onClose={closePdf} />}
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <h3>{vehicle ? `EDIT VEHICLE #${vehicle.no}` : 'ADD NEW VEHICLE'}</h3>

        {/* ── Tab bar ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--br)', marginBottom: 16 }}>
          <button style={TAB_STYLE(tab === 'details')} onClick={() => setTab('details')}>
            <i className="fa fa-car" style={{ marginRight: 6 }} />Vehicle Details
          </button>
          <button style={TAB_STYLE(tab === 'docs')} onClick={() => setTab('docs')}>
            <i className="fa fa-file-pdf" style={{ marginRight: 6 }} />Documents &amp; Overview
          </button>
        </div>

        {/* ════════════════════ TAB 1 — Vehicle Details ════════════════════ */}
        {tab === 'details' && (
          <div className="modal-grid">
            <div className="form-row">
              <label>Status *</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option>SOLD</option><option>IN HAND</option><option>ON THE WAY</option>
              </select>
            </div>
            <div className="form-row">
              <label>Type *</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}>
                <option>LOCAL</option><option>IMPORT</option>
              </select>
            </div>
            <div className="form-row">
              <label>Brand *</label>
              <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Toyota / Honda / Suzuki" />
            </div>
            <div className="form-row">
              <label>Model *</label>
              <input value={form.model} onChange={e => set('model', e.target.value)} placeholder="Yaris X (2024)" />
            </div>
            <div className="form-row">
              <label>Chassis</label>
              <input value={form.chassis} onChange={e => set('chassis', e.target.value)} placeholder="KSP210-…" />
            </div>
            <div className="form-row">
              <label>Colour</label>
              <input value={form.colour} onChange={e => set('colour', e.target.value)} placeholder="Pearl White" />
            </div>
            <div className="form-row">
              <label>Mileage</label>
              <input value={form.mileage} onChange={e => set('mileage', e.target.value)} placeholder="5 KM" />
            </div>
            <div className="form-row">
              <label>Grade</label>
              <input value={form.grade} onChange={e => set('grade', e.target.value)} placeholder="S / 4.5 / 5" />
            </div>
            <div className="form-row">
              <label>Year</label>
              <input value={form.year} onChange={e => set('year', e.target.value)} placeholder="2024" />
            </div>
            <div className="form-row">
              <label>Engine Number</label>
              <input value={form.engine_num} onChange={e => set('engine_num', e.target.value)} placeholder="R06D-WA04C-K510493" />
            </div>
            <div className="form-row">
              <label>Model Code</label>
              <input value={form.model_code} onChange={e => set('model_code', e.target.value)} placeholder="5AA-MH95S" />
            </div>
            <div className="form-row">
              <label>Country of Origin</label>
              <input value={form.origin} onChange={e => set('origin', e.target.value)} placeholder="Japan" />
            </div>
            <div className="form-row">
              <label>Fuel Type</label>
              <input value={form.fuel_type} onChange={e => set('fuel_type', e.target.value)} placeholder="Petrol" />
            </div>
            <div className="form-row" style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--br)', paddingTop: 8, marginTop: 2 }}>
              <label style={{ color: 'var(--t3)', fontSize: '.55rem', letterSpacing: '1.5px' }}>LC &amp; IMPORT DETAILS</label>
            </div>
            <div className="form-row">
              <label>LC Date</label>
              <input type="date" value={form.lc_date} onChange={e => set('lc_date', e.target.value)} />
            </div>
            <div className="form-row">
              <label>LC Number</label>
              <input value={form.lc_num} onChange={e => set('lc_num', e.target.value)} placeholder="DCSPABC…" />
            </div>
            <div className="form-row">
              <label>CUSDEC</label>
              <input value={form.cusdec} onChange={e => set('cusdec', e.target.value)} placeholder="HBIM1|…" />
            </div>
            <div className="form-row">
              <label>Clearing Date</label>
              <input type="date" value={form.clear_date} onChange={e => set('clear_date', e.target.value)} />
            </div>
            <div className="form-row">
              <label>Cost (LKR) <small style={{ color: 'var(--g)' }}>(from ledger)</small></label>
              <div style={{
                padding: '9px 11px', background: 'var(--bg3)', border: '1px solid var(--br)',
                borderRadius: 7, fontSize: '.79rem', minHeight: 38, display: 'flex', alignItems: 'center',
                color: form.cost ? 'var(--tx)' : 'var(--t3)', fontFamily: "'Josefin Sans',sans-serif",
              }}>
                {form.cost ? `LKR ${Number(form.cost).toLocaleString('en-LK', { maximumFractionDigits: 0 })}` : 'Add entries via ledger (  icon)'}
              </div>
            </div>
            <div className="form-row">
              <label>Sell Date</label>
              <input type="date" value={form.sell_date} onChange={e => set('sell_date', e.target.value)} />
            </div>
            <div className="form-row">
              <label>Sell Price (LKR)</label>
              <input type="number" value={form.sell_price} onChange={e => set('sell_price', e.target.value)} placeholder="0" />
            </div>
            <div className="form-row">
              <label>Income (LKR) <small style={{ color: 'var(--g)' }}>(auto)</small></label>
              <input type="number" value={form.income} onChange={e => set('income', e.target.value)} placeholder="Auto" />
            </div>
            <div className="form-row">
              <label>Contact (Phone)</label>
              <input value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="07X XXX XXXX" />
            </div>
            <div className="form-row">
              <label>Customer Name</label>
              <input value={form.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder="Full name of buyer" />
            </div>
            <div className="form-row">
              <label>Registration</label>
              <select value={form.reg_status} onChange={e => set('reg_status', e.target.value)}>
                <option value="UNREGISTERED">Unregistered</option>
                <option value="REGISTERED">Registered</option>
              </select>
            </div>
            {form.reg_status === 'REGISTERED' && (
              <div className="form-row">
                <label>Reg. Number</label>
                <input value={form.reg_num} onChange={e => set('reg_num', e.target.value)} placeholder="CCB 1717" style={{ textTransform: 'uppercase' }} />
              </div>
            )}
            <div className="form-row full">
              <label>Notes</label>
              <textarea rows="2" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes…" />
            </div>
          </div>
        )}

        {/* ════════════════════ TAB 2 — Documents & Overview ════════════════════ */}
        {tab === 'docs' && (
          <div style={{ padding: '0 2px' }}>

            {/* ── PDF Uploads ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 4 }}>
              {/* LC PDF */}
              <div style={{ background: 'var(--bg3)', border: '1px solid var(--br)', borderRadius: 10, padding: '14px 14px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <i className="fa fa-file-pdf" style={{ color: '#ef4444', fontSize: '1.1rem' }} />
                  <span style={{ fontSize: '.74rem', fontWeight: 700, letterSpacing: '.5px', color: 'var(--t2)', textTransform: 'uppercase' }}>LC PDF</span>
                </div>
                {vehicle?.lc_pdf_url && (
                  <button
                    onClick={() => openPdf(vehicle.lc_pdf_url, `#${vehicle.no} ${vehicle.brand} ${vehicle.model} — LC PDF`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
                      padding: '7px 10px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
                      borderRadius: 7, fontSize: '.72rem', color: '#fca5a5', cursor: 'pointer', width: '100%' }}>
                    <i className="fa fa-eye" /> View Current LC PDF
                  </button>
                )}
                <input ref={lcPdfRef} type="file" accept="application/pdf"
                  style={{ fontSize: '.72rem', color: 'var(--t2)', width: '100%' }} />
                <div style={{ fontSize: '.65rem', color: 'var(--t3)', marginTop: 6 }}>
                  {vehicle?.lc_pdf_url ? 'Upload to replace existing' : 'No PDF uploaded yet'}
                </div>
              </div>

              {/* Cusdec PDF */}
              <div style={{ background: 'var(--bg3)', border: '1px solid var(--br)', borderRadius: 10, padding: '14px 14px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <i className="fa fa-file-pdf" style={{ color: '#ef4444', fontSize: '1.1rem' }} />
                  <span style={{ fontSize: '.74rem', fontWeight: 700, letterSpacing: '.5px', color: 'var(--t2)', textTransform: 'uppercase' }}>Cusdec PDF</span>
                </div>
                {vehicle?.cusdec_pdf_url && (
                  <button
                    onClick={() => openPdf(vehicle.cusdec_pdf_url, `#${vehicle.no} ${vehicle.brand} ${vehicle.model} — Cusdec PDF`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
                      padding: '7px 10px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
                      borderRadius: 7, fontSize: '.72rem', color: '#fca5a5', cursor: 'pointer', width: '100%' }}>
                    <i className="fa fa-eye" /> View Current Cusdec PDF
                  </button>
                )}
                <input ref={cusdecPdfRef} type="file" accept="application/pdf"
                  style={{ fontSize: '.72rem', color: 'var(--t2)', width: '100%' }} />
                <div style={{ fontSize: '.65rem', color: 'var(--t3)', marginTop: 6 }}>
                  {vehicle?.cusdec_pdf_url ? 'Upload to replace existing' : 'No PDF uploaded yet'}
                </div>
              </div>
            </div>

            {/* ── LC Tracker View ── */}
            <SectionHead icon="fa-file-invoice" label="LC Tracker" color="#60a5fa" />
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--br)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0 24px' }}>
                <div>
                  <InfoRow label="LC Date"       value={fmtD(form.lc_date)} />
                  <InfoRow label="LC Number"     value={form.lc_num} />
                  <InfoRow label="CUSDEC"        value={form.cusdec} />
                </div>
                <div>
                  <InfoRow label="Clearing Date" value={fmtD(form.clear_date)} />
                </div>
              </div>
            </div>

            {/* ── Profit Report View ── */}
            <SectionHead icon="fa-coins" label="Profit Report" color="#4ade80" />
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--br)', borderRadius: 10, padding: '10px 14px' }}>
              <InfoRow label="Total Cost (LKR)"  value={cost       ? `LKR ${fmt(cost)}`       : null} />
              <InfoRow label="Sell Price (LKR)"  value={sell_price ? `LKR ${fmt(sell_price)}` : null} />
              <InfoRow label="Sell Date"         value={fmtD(form.sell_date)} />
              <InfoRow label="Income (LKR)"
                value={income != null ? `${income >= 0 ? '+ ' : '− '}LKR ${fmt(Math.abs(income))}` : null}
                accent={incomeColor} />
            </div>

            {/* ── Status View (In Hand / On The Way) ── */}
            <SectionHead icon="fa-warehouse" label="Current Status" color="#fb923c" />
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--br)', borderRadius: 10, padding: '12px 14px',
              display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '.68rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Status</span>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700,
                  background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44` }}>
                  {form.status || 'Not set'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '.68rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Type</span>
                <span className={`badge ${form.type === 'LOCAL' ? 'b-local' : 'b-import'}`}>{form.type || '—'}</span>
              </div>
              {form.status === 'ON THE WAY' && (
                <div style={{ fontSize: '.72rem', color: '#fb923c', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fa fa-ship" /> In transit — not yet cleared
                </div>
              )}
              {form.status === 'IN HAND' && (
                <div style={{ fontSize: '.72rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fa fa-warehouse" /> Cleared {fmtD(form.clear_date)} · Ready to sell
                </div>
              )}
              {form.status === 'SOLD' && (
                <div style={{ fontSize: '.72rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fa fa-circle-check" /> Sold {fmtD(form.sell_date)}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── Actions ── */}
        <div className="modal-actions" style={{ marginTop: 18 }}>
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Vehicle'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

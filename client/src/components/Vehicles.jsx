import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { getVehicles, deleteVehicle, sellVehicle, completeAdvanceSale, updateVehicle, bulkCreateVehicles } from '../services/vehicleService';
import VehicleModal from './VehicleModal';
import VehicleLedgerModal from './VehicleLedgerModal';
import { printAdvanceInvoice, printCustomerInvoice } from '../utils/invoicePrint';

const fmt = n => n == null ? '—' : Number(n).toLocaleString('en-LK', { maximumFractionDigits: 0 });
const fmtD = d => { if (!d) return '—'; const s = d.split('T')[0]; const [y, m, dy] = s.split('-'); return `${dy}/${m}/${y}`; };
const fc = v => { const t = parseFloat(v.tt_lkr) || 0, l = parseFloat(v.lc_lkr) || 0, d = parseFloat(v.duty) || 0, o = parseFloat(v.others) || 0; return (t + l + d + o) || parseFloat(v.cost) || 0; };

function SellModal({ open, vehicle, finalCost, onClose, onDone, showToast }) {
  const [payType, setPayType]         = useState('FULL');
  const [sell, setSell]               = useState('');
  const [date, setDate]               = useState(() => new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('');
  const [contact, setContact]         = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [advanceAmt, setAdvanceAmt]   = useState('');
  const [vehiclePrice, setVehiclePrice] = useState('');
  const [rmvFee, setRmvFee]           = useState('');
  const [leaseAmt, setLeaseAmt]       = useState('');
  const [cashAmt, setCashAmt]         = useState('');
  const [regStatus, setRegStatus]     = useState('UNREGISTERED');
  const [regNum, setRegNum]           = useState('');
  const [saving, setSaving]           = useState(false);

  const inc = sell && finalCost ? parseFloat(sell) - finalCost : null;

  const reset = () => {
    setPayType('FULL'); setSell(''); setDate(new Date().toISOString().split('T')[0]);
    setCustomerName(''); setContact(''); setBuyerAddress('');
    setAdvanceAmt(''); setVehiclePrice(''); setRmvFee('');
    setLeaseAmt(''); setCashAmt('');
    setRegStatus('UNREGISTERED'); setRegNum('');
  };

  useEffect(() => { if (open) reset(); }, [open, vehicle?.id]);

  const doSell = async () => {
    if (!sell || !date) { showToast('Enter sell price and date', 'err'); return; }
    if (payType === 'ADVANCE' && !advanceAmt) { showToast('Enter advance amount', 'err'); return; }
    if (payType === 'ADVANCE' && !customerName) { showToast('Enter buyer name', 'err'); return; }
    if (payType === 'ADVANCE' && !buyerAddress) { showToast('Enter buyer address', 'err'); return; }
    setSaving(true);
    try {
      const income = await sellVehicle(vehicle.id, {
        sell_price: sell, sell_date: date, contact, customer_name: customerName,
        reg_status: regStatus, reg_num: regNum,
        payment_type: payType,
        advance_amount: advanceAmt, advance_date: date,
        buyer_address: buyerAddress,
        vehicle_price: vehiclePrice, rmv_fee: rmvFee,
        lease_amount: leaseAmt, cash_amount: cashAmt,
      });

      const invoiceData = {
        vehicle: { ...vehicle },
        sale: {
          sell_price: sell, sell_date: date,
          advance_amount: advanceAmt, advance_date: date,
          vehicle_price: vehiclePrice, rmv_fee: rmvFee,
          lease_amount: leaseAmt, cash_amount: cashAmt,
        },
        buyer: { customer_name: customerName, contact, buyer_address: buyerAddress },
      };

      if (payType === 'ADVANCE') {
        showToast(`Advance recorded! LKR ${fmt(advanceAmt)} paid`, 'ok');
        onDone();
        onClose();
        printAdvanceInvoice(invoiceData);
      } else {
        showToast(`Sold! Income: LKR ${fmt(income)}`, 'ok');
        onDone();
        onClose();
        printCustomerInvoice(invoiceData);
      }
    } catch (e) {
      showToast(e.message || 'Failed', 'err');
    } finally {
      setSaving(false);
    }
  };

  const btnStyle = (active, col) => ({
    flex: 1, padding: '9px 0', borderRadius: 7, fontSize: '.76rem', fontWeight: 700, cursor: 'pointer',
    border: `1px solid ${active ? col + '88' : 'var(--br)'}`,
    background: active ? col + '22' : 'var(--bg3)',
    color: active ? col : 'var(--t3)',
  });

  if (!open) return null;
  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="qs-box" style={{ maxWidth: 440 }}>
        <h3>💰 MARK AS SOLD</h3>
        <p style={{ color: 'var(--rl)', fontSize: '.76rem', marginBottom: 14 }}>
          {vehicle?.brand} {vehicle?.model} — #{vehicle?.no}
        </p>

        {/* Payment type toggle */}
        <div style={{ fontSize: '.62rem', color: 'var(--t3)', letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 6 }}>Payment Type *</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button style={btnStyle(payType === 'FULL', '#22c55e')} onClick={() => setPayType('FULL')}>
            <i className="fa fa-circle-check" style={{ marginRight: 6 }} />Full Paid
          </button>
          <button style={btnStyle(payType === 'ADVANCE', '#f59e0b')} onClick={() => setPayType('ADVANCE')}>
            <i className="fa fa-clock" style={{ marginRight: 6 }} />Advance Paid
          </button>
        </div>

        {payType === 'ADVANCE' && (
          <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 7, padding: '8px 12px', fontSize: '.74rem', color: 'var(--a)', marginBottom: 12 }}>
            <i className="fa fa-info-circle" style={{ marginRight: 5 }} />
            Vehicle stays in <b>In Hand</b> until full payment is completed.
          </div>
        )}

        {/* Sale details */}
        <div className="sell-section-hdr">Sale Details</div>
        <div className="form-row">
          <label>Selling Price (LKR) *</label>
          <input type="number" value={sell} onChange={e => setSell(e.target.value)} placeholder="Enter selling price" />
        </div>
        {payType === 'ADVANCE' && (
          <div className="form-row">
            <label style={{ color: 'var(--a)' }}>Advance Amount (LKR) *</label>
            <input type="number" value={advanceAmt} onChange={e => setAdvanceAmt(e.target.value)} placeholder="Amount paid now" style={{ borderColor: 'rgba(245,158,11,.4)' }} />
          </div>
        )}
        {inc !== null && payType === 'FULL' && (
          <div style={{ background: inc >= 0 ? 'rgba(34,197,94,.08)' : 'rgba(229,57,53,.08)', border: `1px solid ${inc >= 0 ? 'rgba(34,197,94,.2)' : 'rgba(229,57,53,.2)'}`, borderRadius: 7, padding: '9px 12px', fontSize: '.78rem', margin: '6px 0 10px', color: inc >= 0 ? '#4ade80' : '#ff6b6b' }}>
            Income: LKR {fmt(Math.abs(inc))} {inc >= 0 ? '✓ Profit' : '⚠ Loss'}
          </div>
        )}
        <div className="form-row">
          <label>Date *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        {/* Buyer details */}
        <div className="sell-section-hdr">Buyer Details</div>
        <div className="form-row">
          <label>Customer Name {payType === 'ADVANCE' ? '*' : ''}</label>
          <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Full name of buyer" />
        </div>
        <div className="form-row">
          <label>Contact (Phone)</label>
          <input value={contact} onChange={e => setContact(e.target.value)} placeholder="07X XXX XXXX" />
        </div>
        <div className="form-row">
          <label>Buyer Address {payType === 'ADVANCE' ? '*' : ''}</label>
          <textarea
            rows={3} value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)}
            placeholder={'B/23,\nDasaya Hamara,\nMinneriya'}
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Invoice details (optional breakdown) */}
        <div className="sell-section-hdr" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Invoice Breakdown <span style={{ fontSize: '.58rem', color: 'var(--t3)', fontWeight: 400 }}>(optional)</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
          <div className="form-row">
            <label>Vehicle Price (LKR)</label>
            <input type="number" value={vehiclePrice} onChange={e => setVehiclePrice(e.target.value)} placeholder="Before RMV" />
          </div>
          <div className="form-row">
            <label>RMV Fee (LKR)</label>
            <input type="number" value={rmvFee} onChange={e => setRmvFee(e.target.value)} placeholder="46,000" />
          </div>
          <div className="form-row">
            <label>Lease Amount (LKR)</label>
            <input type="number" value={leaseAmt} onChange={e => setLeaseAmt(e.target.value)} placeholder="Optional" />
          </div>
          <div className="form-row">
            <label>Cash Amount (LKR)</label>
            <input type="number" value={cashAmt} onChange={e => setCashAmt(e.target.value)} placeholder="Optional" />
          </div>
        </div>

        {/* Registration */}
        <div className="sell-section-hdr">Registration</div>
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
        {regStatus === 'REGISTERED' && (
          <div className="form-row">
            <label>Registration Number</label>
            <input value={regNum} onChange={e => setRegNum(e.target.value.toUpperCase())} placeholder="CCB 1717" style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '.5px' }} />
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button
            style={{ flex: 2, padding: 10, background: payType === 'ADVANCE' ? 'linear-gradient(135deg,#d97706,#b45309)' : 'linear-gradient(135deg,#16a34a,#15803d)', border: 'none', borderRadius: 7, color: '#fff', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', minHeight: 40 }}
            onClick={doSell} disabled={saving}
          >
            {saving ? 'Saving…' : payType === 'ADVANCE' ? '✓ Confirm Advance & Print Invoice' : '✓ Confirm Sale & Print Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CompleteSaleModal({ open, vehicle, onClose, onDone, showToast }) {
  const [finalDate, setFinalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setFinalDate(new Date().toISOString().split('T')[0]); }, [open]);

  const doComplete = async () => {
    setSaving(true);
    try {
      await completeAdvanceSale(vehicle.id, { final_date: finalDate });
      showToast('Sale completed!', 'ok');
      onDone();
      onClose();
      printCustomerInvoice({
        vehicle: { ...vehicle },
        sale: {
          sell_price: vehicle.sell_price,
          sell_date: finalDate,
          vehicle_price: vehicle.vehicle_price,
          rmv_fee: vehicle.rmv_fee,
          lease_amount: vehicle.lease_amount,
          cash_amount: vehicle.cash_amount,
        },
        buyer: {
          customer_name: vehicle.customer_name,
          contact: vehicle.contact,
          buyer_address: vehicle.buyer_address,
        },
      });
    } catch (e) {
      showToast(e.message || 'Failed', 'err');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  const remaining = vehicle ? (parseFloat(vehicle.sell_price) || 0) - (parseFloat(vehicle.advance_amount) || 0) : 0;

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="qs-box" style={{ maxWidth: 380 }}>
        <h3>✅ COMPLETE SALE</h3>
        <p style={{ color: '#60a5fa', fontSize: '.76rem', marginBottom: 14 }}>{vehicle?.brand} {vehicle?.model} — #{vehicle?.no}</p>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--br)', borderRadius: 8, padding: '10px 14px', fontSize: '.78rem', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ color: 'var(--t3)' }}>Selling Price</span>
            <span style={{ color: '#fff', fontFamily: "'Josefin Sans',sans-serif" }}>LKR {fmt(vehicle?.sell_price)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ color: 'var(--t3)' }}>Advance Paid</span>
            <span style={{ color: 'var(--a)', fontFamily: "'Josefin Sans',sans-serif" }}>LKR {fmt(vehicle?.advance_amount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--br)', paddingTop: 5 }}>
            <span style={{ color: 'var(--t2)', fontWeight: 600 }}>Remaining Balance</span>
            <span style={{ color: '#4ade80', fontFamily: "'Josefin Sans',sans-serif", fontWeight: 700 }}>LKR {fmt(remaining)}</span>
          </div>
        </div>
        <div className="form-row">
          <label>Final Sale Date *</label>
          <input type="date" value={finalDate} onChange={e => setFinalDate(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button style={{ flex: 2, padding: 10, background: 'linear-gradient(135deg,#16a34a,#15803d)', border: 'none', borderRadius: 7, color: '#fff', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', minHeight: 40 }} onClick={doComplete} disabled={saving}>
            {saving ? 'Saving…' : '✓ Complete & Print Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ArriveModal({ open, vehicle, onClose, onDone, showToast }) {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);

  const doArrive = async () => {
    if (!date || !cost) { showToast('Enter date and cost', 'err'); return; }
    setSaving(true);
    try {
      await updateVehicle(vehicle.id, {
        ...vehicle, status: 'IN HAND', clear_date: date, cost,
        lc_date: vehicle.lc_date?.split('T')[0] || '',
        sell_date: vehicle.sell_date?.split('T')[0] || ''
      });
      showToast('Marked In Hand!', 'ok');
      onDone();
      onClose();
    } catch (e) {
      showToast(e.message || 'Failed', 'err');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="qs-box">
        <h3>🚢 MARK AS IN HAND</h3>
        <p style={{ color: '#60a5fa', fontSize: '.76rem', marginBottom: 14 }}>{vehicle?.brand} {vehicle?.model}</p>
        <div className="form-row"><label>Clearing Date *</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div className="form-row"><label>Total Cost (LKR) *</label><input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="Landed cost" /></div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button style={{ flex: 2, padding: 9, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'none', borderRadius: 7, color: '#fff', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer' }} onClick={doArrive} disabled={saving}>
            {saving ? 'Saving…' : '✓ Mark Arrived'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportModal({ open, onClose, onDone, showToast }) {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef();

  const onFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
      setRows(data);
    };
    reader.readAsArrayBuffer(file);
  };

  const doImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setProgress(0);
    try {
      const errors = await bulkCreateVehicles(rows, (done, total) => setProgress(Math.round((done / total) * 100)));
      if (errors.length) showToast(`Imported with ${errors.length} error(s)`, 'err');
      else showToast(`${rows.length} vehicles imported!`, 'ok');
      onDone();
      onClose();
    } catch (e) {
      showToast(e.message || 'Import failed', 'err');
    } finally {
      setImporting(false);
      setRows([]);
      setFileName('');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const reset = () => { setRows([]); setFileName(''); if (fileRef.current) fileRef.current.value = ''; onClose(); };

  if (!open) return null;
  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && reset()}>
      <div className="qs-box" style={{ maxWidth: 460 }}>
        <h3>📥 IMPORT FROM EXCEL</h3>
        <p style={{ fontSize: '.74rem', color: 'var(--t3)', marginBottom: 14 }}>
          Column headers in your sheet should match vehicle fields (Brand, Model, Status, Type, Chassis, Colour, Year, Cost, etc.)
        </p>
        <div className="form-row">
          <label>Excel / CSV File</label>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} style={{ color: 'var(--t1)', fontSize: '.78rem' }} />
        </div>
        {rows.length > 0 && (
          <div style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 7, padding: '10px 14px', fontSize: '.78rem', color: '#4ade80', margin: '8px 0' }}>
            ✓ {rows.length} rows found in <strong>{fileName}</strong>
            <div style={{ color: 'var(--t3)', marginTop: 4 }}>
              Columns: {Object.keys(rows[0] || {}).join(', ')}
            </div>
          </div>
        )}
        {importing && (
          <div style={{ margin: '10px 0' }}>
            <div style={{ background: 'var(--b2)', borderRadius: 4, height: 6 }}>
              <div style={{ background: '#3b82f6', height: 6, borderRadius: 4, width: `${progress}%`, transition: 'width .2s' }} />
            </div>
            <div style={{ fontSize: '.72rem', color: 'var(--t3)', marginTop: 4 }}>{progress}% uploaded…</div>
          </div>
        )}
        <div className="modal-actions">
          <button className="btn-cancel" onClick={reset} disabled={importing}>Cancel</button>
          <button className="btn-primary" onClick={doImport} disabled={!rows.length || importing}>
            {importing ? `Importing… ${progress}%` : `Import ${rows.length || ''} Rows`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Vehicles({ showToast, defaultStatus = '' }) {
  const [vehicles, setVehicles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState('no');
  const [sortDir, setSortDir] = useState('asc');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(defaultStatus);
  const [brand, setBrand] = useState('');
  const [type, setType] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  /* Sync filter when navigating between /inhand and /onway */
  useEffect(() => {
    setStatus(defaultStatus);
    setPage(1);
  }, [defaultStatus]);
  const [editVehicle, setEditVehicle] = useState(null);
  const [qsOpen, setQsOpen] = useState(false);
  const [qsVehicle, setQsVehicle] = useState(null);
  const [qsCost, setQsCost] = useState(0);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeVehicle, setCompleteVehicle] = useState(null);
  const [arrOpen, setArrOpen] = useState(false);
  const [arrVehicle, setArrVehicle] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerVehicle, setLedgerVehicle] = useState(null);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let all = await getVehicles();
      if (status) all = all.filter(v => v.status === status);
      if (brand) all = all.filter(v => v.brand === brand);
      if (type) all = all.filter(v => v.type === type);
      if (q) {
        const lq = q.toLowerCase();
        all = all.filter(v =>
          (v.brand || '').toLowerCase().includes(lq) ||
          (v.model || '').toLowerCase().includes(lq) ||
          (v.chassis || '').toLowerCase().includes(lq) ||
          (v.colour || '').toLowerCase().includes(lq) ||
          (v.contact || '').toLowerCase().includes(lq) ||
          (v.lc_num || '').toLowerCase().includes(lq)
        );
      }
      all.sort((a, b) => {
        const av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
        const res = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
        return sortDir === 'desc' ? -res : res;
      });
      setTotal(all.length);
      setVehicles(all.slice((page - 1) * LIMIT, page * LIMIT));
    } catch { showToast('Failed to load vehicles', 'err'); }
    finally { setLoading(false); }
  }, [q, status, brand, type, page, sortCol, sortDir]);

  useEffect(() => { load(); }, [load]);

  const sort = (col) => {
    setSortCol(col);
    setSortDir(s => sortCol === col ? (s === 'asc' ? 'desc' : 'asc') : 'asc');
    setPage(1);
  };
  const SortBtn = ({ col }) => (
    <button className={`sort-btn ${sortCol === col ? 'on' : ''}`} onClick={() => sort(col)}>
      {sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </button>
  );

  const del = async (v) => {
    if (!confirm(`Delete vehicle #${v.no}?`)) return;
    try {
      await deleteVehicle(v.id);
      showToast(`Vehicle #${v.no} deleted`, 'ok');
      load();
    } catch { showToast('Delete failed', 'err'); }
  };

  const pages = Math.ceil(total / LIMIT);
  const start = (page - 1) * LIMIT;

  const exportCSV = async () => {
    const rows = await getVehicles();
    const cols = ['#', 'Status', 'Type', 'Brand', 'Model', 'Chassis', 'Colour', 'Cost', 'Sell Price', 'Income', 'Sell Date', 'Contact'];
    const data = rows.map(v => [v.no, v.status, v.type, v.brand, v.model, v.chassis || '', v.colour || '', v.cost || '', v.sell_price || '', v.income || '', v.sell_date ? v.sell_date.split('T')[0] : '', v.contact || '']);
    const csv = [cols, ...data].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'vehicles.csv';
    a.click();
  };

  const isStatusPage = defaultStatus !== '';
  const title = defaultStatus === 'IN HAND' ? 'IN HAND — READY TO SELL' : defaultStatus === 'ON THE WAY' ? 'ON THE WAY — IN TRANSIT' : 'VEHICLE REGISTER';

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h3>{title}</h3>
          <div className="card-header-right">
            <div className="search-wrap"><i className="fa fa-search" /><input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search…" /></div>
            {!isStatusPage && (
              <>
                <select className="filter" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
                  <option value="">All Status</option>
                  <option>SOLD</option><option>IN HAND</option><option>ON THE WAY</option>
                </select>
                <select className="filter" value={brand} onChange={e => { setBrand(e.target.value); setPage(1); }}>
                  <option value="">All Brands</option>
                  <option>Toyota</option><option>Honda</option><option>Suzuki</option><option>Nissan</option>
                  <option>Mitsubishi</option><option>Mazda</option><option>Subaru</option>
                </select>
                <select className="filter" value={type} onChange={e => { setType(e.target.value); setPage(1); }}>
                  <option value="">All Types</option><option>LOCAL</option><option>IMPORT</option>
                </select>
                <button className="btn-secondary" onClick={exportCSV}><i className="fa fa-download" /> Export</button>
                <button className="btn-secondary" onClick={() => setImportOpen(true)}><i className="fa fa-file-excel" /> Import</button>
              </>
            )}
            <button className="btn-primary" onClick={() => { setEditVehicle(null); setModalOpen(true); }}>
              <i className="fa fa-plus" /> Add
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Img</th>
                <th><SortBtn col="no" /> #</th>
                <th>Status</th><th>Type</th>
                <th><SortBtn col="brand" /> Brand</th>
                <th>Model</th><th>Chassis</th><th>Colour</th>
                <th><SortBtn col="cost" /> Cost</th>
                {defaultStatus !== 'ON THE WAY' && <><th><SortBtn col="sell_price" /> Sell Price</th><th><SortBtn col="income" /> Income</th><th><SortBtn col="sell_date" /> Sell Date</th><th>Contact</th></>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={defaultStatus === 'ON THE WAY' ? 10 : 14} className="loading"><span className="spin" />Loading…</td></tr>
              ) : vehicles.length === 0 ? (
                <tr><td colSpan={defaultStatus === 'ON THE WAY' ? 10 : 14} className="empty">No vehicles found</td></tr>
              ) : vehicles.map(v => {
                const finalCost = fc(v);
                const inc = v.income != null ? parseFloat(v.income) : null;
                return (
                  <tr key={v.id}>
                    <td>
                      {v.imageUrl
                        ? <img src={v.imageUrl} className="v-img" alt="" onError={e => { e.target.style.display = 'none'; }} />
                        : <div className="v-img-ph"><i className="fa fa-car" /></div>}
                    </td>
                    <td><strong>{v.no}</strong></td>
                    <td>
                      <span className={`badge ${v.status === 'SOLD' ? 'b-sold' : v.status === 'IN HAND' ? 'b-inhand' : 'b-onway'}`}>{v.status}</span>
                      {v.payment_type === 'ADVANCE' && <span className="badge b-pending" style={{ marginLeft: 4 }}>ADV</span>}
                    </td>
                    <td><span className={`badge ${v.type === 'LOCAL' ? 'b-local' : 'b-import'}`}>{v.type}</span></td>
                    <td><strong>{v.brand}</strong></td>
                    <td>{v.model}</td>
                    <td style={{ fontSize: '.7rem', color: 'var(--t3)' }}>{v.chassis || '—'}</td>
                    <td>{v.colour || '—'}</td>
                    <td className="amt">{fmt(v.cost)}</td>
                    {defaultStatus !== 'ON THE WAY' && <>
                      <td className="amt">{fmt(v.sell_price)}</td>
                      <td>
                        {inc == null ? '—' : (
                          <span className={`badge ${inc < 0 ? 'b-loss' : 'b-profit'}`}>
                            {inc < 0 ? '− ' : '+ '}{fmt(Math.abs(inc))}
                          </span>
                        )}
                      </td>
                      <td>{fmtD(v.sell_date)}</td>
                      <td style={{ fontSize: '.71rem' }}>{v.contact || '—'}</td>
                    </>}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="ac" onClick={() => { setEditVehicle(v); setModalOpen(true); }} title="Edit"><i className="fa fa-pen" /></button>
                      <button
                        className="ac"
                        onClick={() => { setLedgerVehicle(v); setLedgerOpen(true); }}
                        title="Financial Ledger"
                        style={{ color: '#8b5cf6' }}
                      >
                        <i className="fa fa-list-ul" />
                      </button>
                      {v.status === 'IN HAND' && v.payment_type !== 'ADVANCE' && (
                        <button className="ac sell" onClick={() => { setQsVehicle(v); setQsCost(finalCost); setQsOpen(true); }} title="Sell"><i className="fa fa-dollar-sign" /></button>
                      )}
                      {v.status === 'IN HAND' && v.payment_type === 'ADVANCE' && (
                        <button className="ac ok" onClick={() => { setCompleteVehicle(v); setCompleteOpen(true); }} title="Complete Sale"><i className="fa fa-circle-check" /></button>
                      )}
                      {v.status === 'ON THE WAY' && (
                        <button className="ac arr" onClick={() => { setArrVehicle(v); setArrOpen(true); }} title="Arrived"><i className="fa fa-ship" /></button>
                      )}
                      <button className="ac del" onClick={() => del(v)} title="Delete"><i className="fa fa-trash" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="pag">
          <span className="pag-info">
            {total > 0 ? `Showing ${Math.min(start + 1, total)}–${Math.min(start + LIMIT, total)} of ${total}` : ''}
          </span>
          <div className="pag-btns">
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`pgb ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      <VehicleModal
        open={modalOpen}
        vehicle={editVehicle}
        onClose={() => { setModalOpen(false); setEditVehicle(null); }}
        onSaved={load}
        showToast={showToast}
      />
      <SellModal
        open={qsOpen}
        vehicle={qsVehicle}
        finalCost={qsCost}
        onClose={() => setQsOpen(false)}
        onDone={load}
        showToast={showToast}
      />
      <CompleteSaleModal
        open={completeOpen}
        vehicle={completeVehicle}
        onClose={() => setCompleteOpen(false)}
        onDone={load}
        showToast={showToast}
      />
      <ArriveModal
        open={arrOpen}
        vehicle={arrVehicle}
        onClose={() => setArrOpen(false)}
        onDone={load}
        showToast={showToast}
      />
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={load}
        showToast={showToast}
      />
      <VehicleLedgerModal
        open={ledgerOpen}
        vehicle={ledgerVehicle}
        onClose={() => setLedgerOpen(false)}
        showToast={showToast}
        onCostUpdated={(vehicleId, newCost) =>
          setVehicles(prev => prev.map(v =>
            v.id === vehicleId ? { ...v, cost: newCost } : v
          ))
        }
      />
    </>
  );
}

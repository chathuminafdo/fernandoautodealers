import React, { useState, useEffect, useMemo } from 'react';
import { getExpenses, addExpense, updateExpense, deleteExpense, updateVehicleCost } from '../services/vehicleService';

const fmt  = n => n == null ? '—' : Number(n).toLocaleString('en-LK', { maximumFractionDigits: 0 });
const fmtD = d => {
  if (!d) return '—';
  const s = String(d).split('T')[0];
  const [y, m, dy] = s.split('-');
  return `${dy}/${m}/${y}`;
};
const fmtShort = v => {
  if (!v) return '0';
  const n = Math.abs(v);
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(0) + 'K';
  return fmt(n);
};
const today = () => new Date().toISOString().split('T')[0];

// ---- Constants ----

const EXPENSE_CATS = [
  { id: 'tt_payment',     label: 'TT Payment',          group: 'Banking & Payments' },
  { id: 'lc_opening',     label: 'LC Opening',          group: 'Banking & Payments' },
  { id: 'lc_payment',     label: 'LC Payment',          group: 'Banking & Payments' },
  { id: 'lc_charges',     label: 'LC Charges',          group: 'Banking & Payments' },
  { id: 'bank_charges',   label: 'Bank Charges',        group: 'Banking & Payments' },
  { id: 'freight',        label: 'Freight / Shipping',  group: 'Shipping & Insurance' },
  { id: 'marine_ins',     label: 'Marine Insurance',    group: 'Shipping & Insurance' },
  { id: 'customs_duty',   label: 'Customs Duty',        group: 'Duties & Taxes' },
  { id: 'excise_duty',    label: 'Excise Duty',         group: 'Duties & Taxes' },
  { id: 'vat',            label: 'VAT',                 group: 'Duties & Taxes' },
  { id: 'pal',            label: 'PAL (Ports Levy)',    group: 'Duties & Taxes' },
  { id: 'cess',           label: 'CESS',                group: 'Duties & Taxes' },
  { id: 'port_charges',   label: 'Port / SLPA Charges', group: 'Port & Clearing' },
  { id: 'clearing_fees',  label: 'Clearing Agent Fees', group: 'Port & Clearing' },
  { id: 'wharf_handling', label: 'Wharf / Handling',    group: 'Port & Clearing' },
  { id: 'transport',      label: 'Transport',           group: 'Other Costs' },
  { id: 'inspection',     label: 'Inspection',          group: 'Other Costs' },
  { id: 'registration',   label: 'Registration / RMV',  group: 'Other Costs' },
  { id: 'refurbishment',  label: 'Refurbishment',       group: 'Other Costs' },
  { id: 'storage',        label: 'Storage / Yard',      group: 'Other Costs' },
  { id: 'other',          label: 'Other',               group: 'Other Costs' },
];

const GROUPS = [
  'Banking & Payments',
  'Shipping & Insurance',
  'Duties & Taxes',
  'Port & Clearing',
  'Other Costs',
];

const GROUP_META = {
  'Banking & Payments':   { color: '#8b5cf6', bg: 'rgba(139,92,246,.1)',  icon: 'fa-building-columns' },
  'Shipping & Insurance': { color: '#06b6d4', bg: 'rgba(6,182,212,.1)',   icon: 'fa-ship' },
  'Duties & Taxes':       { color: '#ef4444', bg: 'rgba(239,68,68,.1)',   icon: 'fa-receipt' },
  'Port & Clearing':      { color: '#f59e0b', bg: 'rgba(245,158,11,.1)',  icon: 'fa-anchor' },
  'Other Costs':          { color: '#6b7280', bg: 'rgba(107,114,128,.1)', icon: 'fa-circle-ellipsis' },
};

const CURRENCIES = ['LKR', 'USD', 'JPY', 'GBP', 'EUR', 'INR', 'AUD', 'SGD'];

const getCat = id => EXPENSE_CATS.find(c => c.id === id) || EXPENSE_CATS[EXPENSE_CATS.length - 1];

const GROUPED_CATS = EXPENSE_CATS.reduce((acc, c) => {
  if (!acc[c.group]) acc[c.group] = [];
  acc[c.group].push(c);
  return acc;
}, {});

// ---- Expense Form (add / edit) ----

function ExpenseForm({ editing, onSave, onCancel }) {
  const [form, setForm] = useState({
    category:     editing?.category     || 'tt_payment',
    date:         editing?.date         || today(),
    currency:     editing?.currency     || 'LKR',
    amount:       editing?.amount       != null ? String(editing.amount) : '',
    exchangeRate: editing?.exchangeRate != null ? String(editing.exchangeRate) : '',
    lkrAmount:    editing?.lkrAmount    != null ? String(editing.lkrAmount) : '',
    reference:    editing?.reference    || '',
    description:  editing?.description  || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => {
    const nf = { ...f, [k]: v };
    if (['amount', 'currency', 'exchangeRate'].includes(k)) {
      const amt  = parseFloat(nf.amount)       || 0;
      const rate = parseFloat(nf.exchangeRate) || 1;
      if (nf.currency === 'LKR') {
        nf.lkrAmount    = amt ? String(amt) : '';
        nf.exchangeRate = '1';
      } else if (amt && rate) {
        nf.lkrAmount = (amt * rate).toFixed(2);
      }
    }
    return nf;
  });

  const setLkr = v => setForm(f => ({ ...f, lkrAmount: v }));

  const submit = async () => {
    const lkr = parseFloat(form.lkrAmount);
    if (!lkr || lkr <= 0) { alert('Enter a valid LKR amount'); return; }
    if (!form.date) { alert('Select a date'); return; }
    setSaving(true);
    try {
      await onSave({
        category:     form.category,
        date:         form.date,
        currency:     form.currency || 'LKR',
        amount:       parseFloat(form.amount) || lkr,
        exchangeRate: parseFloat(form.exchangeRate) || 1,
        lkrAmount:    lkr,
        reference:    form.reference   || null,
        description:  form.description || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const isLKR = form.currency === 'LKR';

  return (
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--br2)',
      borderRadius: 10, padding: '14px 16px 12px',
      marginBottom: 4, animation: 'popup .18s ease',
    }}>
      <div style={{ fontSize: '.6rem', color: 'var(--t3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>
        {editing ? '✎ Edit Entry' : '+ New Entry'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>

        {/* Category — full width */}
        <div className="form-row" style={{ gridColumn: '1 / -1' }}>
          <label>Category *</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}>
            {Object.entries(GROUPED_CATS).map(([grp, cats]) => (
              <optgroup key={grp} label={grp}>
                {cats.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Date | Reference */}
        <div className="form-row">
          <label>Date *</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div className="form-row">
          <label>Reference</label>
          <input
            value={form.reference}
            onChange={e => set('reference', e.target.value)}
            placeholder="LC-2024-001"
            style={{ fontFamily: 'monospace' }}
          />
        </div>

        {/* Currency | Amount */}
        <div className="form-row">
          <label>Currency</label>
          <select value={form.currency} onChange={e => set('currency', e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Amount ({form.currency}) *</label>
          <input
            type="number" min="0" step="0.01"
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
            placeholder="0.00"
            style={{ fontFamily: 'monospace' }}
          />
        </div>

        {/* Foreign currency: exchange rate + LKR equivalent */}
        {!isLKR && <>
          <div className="form-row">
            <label>Rate (1 {form.currency} = LKR)</label>
            <input
              type="number" min="0" step="0.01"
              value={form.exchangeRate}
              onChange={e => set('exchangeRate', e.target.value)}
              placeholder="300.00"
              style={{ fontFamily: 'monospace' }}
            />
          </div>
          <div className="form-row">
            <label>LKR Equivalent *</label>
            <input
              type="number" min="0" step="0.01"
              value={form.lkrAmount}
              onChange={e => setLkr(e.target.value)}
              placeholder="Auto-calculated"
              style={{ fontFamily: 'monospace', borderColor: 'rgba(96,165,250,.35)' }}
            />
          </div>
        </>}

        {/* LKR-only mode: single amount field */}
        {isLKR && (
          <div className="form-row">
            <label>LKR Amount *</label>
            <input
              type="number" min="0" step="1"
              value={form.lkrAmount}
              onChange={e => { setForm(f => ({ ...f, lkrAmount: e.target.value, amount: e.target.value })); }}
              placeholder="0"
              style={{ fontFamily: 'monospace' }}
            />
          </div>
        )}

        {/* Description — full width */}
        <div className="form-row" style={{ gridColumn: '1 / -1' }}>
          <label>Description</label>
          <input
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Optional notes…"
          />
        </div>
      </div>

      {/* Recording-as preview (for foreign currency) */}
      {!isLKR && form.lkrAmount && (
        <div style={{
          background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)',
          borderRadius: 7, padding: '6px 12px', fontSize: '.74rem', color: '#60a5fa',
          marginBottom: 10,
        }}>
          Recording as: <strong>LKR {fmt(form.lkrAmount)}</strong>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-cancel" style={{ flex: 1 }} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button className="btn-save" style={{ flex: 2 }} onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Entry'}
        </button>
      </div>
    </div>
  );
}

// ---- Main Modal ----

export default function VehicleLedgerModal({ open, vehicle, onClose, showToast, onCostUpdated }) {
  const [expenses,  setExpenses]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [editRow,   setEditRow]   = useState(null);   // expense being edited

  const load = async () => {
    if (!vehicle?.id) return;
    setLoading(true);
    try {
      const data = await getExpenses(vehicle.id);
      setExpenses(data);
      const total = data.reduce((s, e) => s + (Number(e.lkrAmount) || 0), 0);
      await updateVehicleCost(vehicle.id, total || null);
      onCostUpdated?.(vehicle.id, total || null);
    } catch {
      showToast('Failed to load ledger', 'err');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && vehicle?.id) {
      load();
      setShowForm(false);
      setEditRow(null);
    }
  }, [open, vehicle?.id]);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleAdd = async (data) => {
    try {
      await addExpense(vehicle.id, data);
      showToast('Entry added!', 'ok');
      setShowForm(false);
      load();
    } catch (e) { showToast(e.message || 'Failed', 'err'); }
  };

  const handleUpdate = async (data) => {
    try {
      await updateExpense(vehicle.id, editRow.id, data);
      showToast('Entry updated!', 'ok');
      setEditRow(null);
      load();
    } catch (e) { showToast(e.message || 'Failed', 'err'); }
  };

  const handleDelete = async (expenseId) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await deleteExpense(vehicle.id, expenseId);
      showToast('Entry deleted', 'ok');
      load();
    } catch (e) { showToast(e.message || 'Failed', 'err'); }
  };

  // ── Derived ──
  const totalCost = useMemo(
    () => expenses.reduce((s, e) => s + (Number(e.lkrAmount) || 0), 0),
    [expenses],
  );
  const sellPrice = vehicle?.sell_price ? parseFloat(vehicle.sell_price) : null;
  const profit    = sellPrice != null ? sellPrice - totalCost : null;

  const byGroup = useMemo(() => {
    const map = {};
    GROUPS.forEach(g => { map[g] = []; });
    expenses.forEach(e => {
      const cat = getCat(e.category);
      if (map[cat.group]) map[cat.group].push({ ...e, _cat: cat });
    });
    return map;
  }, [expenses]);

  const groupTotals = useMemo(() => {
    const t = {};
    GROUPS.forEach(g => { t[g] = (byGroup[g] || []).reduce((s, e) => s + (Number(e.lkrAmount) || 0), 0); });
    return t;
  }, [byGroup]);

  const statusColor = vehicle?.status === 'SOLD' ? '#4ade80'
    : vehicle?.status === 'IN HAND' ? '#ec4899'
    : '#f59e0b';

  if (!open) return null;

  return (
    <div
      className="modal-overlay open"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal-box"
        style={{
          maxWidth: 700, padding: 0, overflow: 'hidden',
          display: 'flex', flexDirection: 'column', maxHeight: '90vh',
        }}
      >

        {/* ── Header ── */}
        <div style={{
          padding: '16px 20px 13px', borderBottom: '1px solid var(--br)',
          background: 'var(--bg3)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
                {vehicle?.no && (
                  <span style={{
                    fontFamily: 'monospace', fontSize: '.67rem',
                    background: 'rgba(255,255,255,.07)', padding: '2px 8px',
                    borderRadius: 4, color: 'var(--t2)',
                  }}>#{vehicle.no}</span>
                )}
                <span style={{
                  padding: '2px 10px', borderRadius: 20, fontSize: '.63rem', fontWeight: 700,
                  background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44`,
                }}>
                  {vehicle?.status}
                </span>
                <span style={{ fontSize: '.63rem', color: 'var(--t3)', letterSpacing: '.8px', textTransform: 'uppercase' }}>
                  Financial Ledger
                </span>
              </div>
              <div style={{
                fontFamily: "'Josefin Sans',sans-serif", fontSize: '.95rem',
                letterSpacing: '1.5px', color: '#fff', fontWeight: 700,
              }}>
                {vehicle?.brand} {vehicle?.model}
              </div>
              {vehicle?.chassis && (
                <div style={{ fontSize: '.65rem', color: 'var(--t3)', marginTop: 3, fontFamily: 'monospace' }}>
                  Chassis: {vehicle.chassis}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                flexShrink: 0, background: 'rgba(255,255,255,.05)', border: '1px solid var(--br)',
                borderRadius: 7, color: 'var(--t2)', padding: '5px 10px', cursor: 'pointer',
                fontSize: '.75rem', transition: 'all .2s',
              }}
            >
              <i className="fa fa-xmark" />
            </button>
          </div>
        </div>

        {/* ── Summary bar ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
          borderBottom: '1px solid var(--br)', flexShrink: 0,
        }}>
          {[
            {
              label: 'Total Cost',
              value: `LKR ${fmt(totalCost)}`,
              sub: `${expenses.length} entr${expenses.length === 1 ? 'y' : 'ies'}`,
              color: '#fff',
            },
            {
              label: 'Sell Price',
              value: sellPrice ? `LKR ${fmt(sellPrice)}` : '—',
              color: sellPrice ? '#fff' : 'var(--t3)',
            },
            {
              label: 'Profit / Loss',
              value: profit == null
                ? '—'
                : `${profit >= 0 ? '+' : '−'} LKR ${fmt(Math.abs(profit))}`,
              color: profit == null ? 'var(--t3)' : profit >= 0 ? '#4ade80' : '#f87171',
            },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '11px 16px',
              borderRight: i < 2 ? '1px solid var(--br)' : 'none',
            }}>
              <div style={{ fontSize: '.57rem', color: 'var(--t3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>
                {s.label}
              </div>
              <div style={{
                fontFamily: "'Josefin Sans',sans-serif", fontSize: '.88rem',
                color: s.color, fontWeight: 700,
              }}>
                {s.value}
              </div>
              {s.sub && <div style={{ fontSize: '.62rem', color: 'var(--t3)', marginTop: 2 }}>{s.sub}</div>}
            </div>
          ))}
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* Breakdown bars */}
          {expenses.length > 0 && (
            <div style={{
              padding: '12px 20px 14px', borderBottom: '1px solid var(--br)',
              background: 'rgba(255,255,255,.015)',
            }}>
              <div style={{ fontSize: '.58rem', color: 'var(--t3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>
                Cost Breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {GROUPS.map(g => {
                  const val  = groupTotals[g] || 0;
                  if (!val) return null;
                  const pct  = totalCost > 0 ? (val / totalCost) * 100 : 0;
                  const meta = GROUP_META[g];
                  return (
                    <div key={g} style={{ display: 'grid', gridTemplateColumns: '148px 1fr 94px', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        fontSize: '.67rem', color: meta.color, fontWeight: 600,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        <i className={`fa ${meta.icon}`} style={{ marginRight: 5, opacity: .8 }} />
                        {g}
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,.06)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: meta.color, borderRadius: 2, transition: 'width .5s' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '.63rem', color: meta.color, fontWeight: 700 }}>{pct.toFixed(0)}%</span>
                        <span style={{ fontSize: '.63rem', color: 'var(--t3)', fontFamily: "'Josefin Sans',sans-serif" }}>
                          {fmtShort(val)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add entry toggle */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--br)' }}>
            {showForm && !editRow ? (
              <ExpenseForm onSave={handleAdd} onCancel={() => setShowForm(false)} />
            ) : (
              !editRow && (
                <button
                  onClick={() => setShowForm(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '8px 14px',
                    background: 'linear-gradient(135deg,#e53935,#b71c1c)',
                    border: 'none', borderRadius: 8, color: '#fff',
                    fontSize: '.73rem', fontWeight: 700, letterSpacing: '.6px',
                    cursor: 'pointer',
                  }}
                >
                  <i className="fa fa-plus" /> ADD ENTRY
                </button>
              )
            )}
          </div>

          {/* Expense list */}
          {loading ? (
            <div className="loading">
              <i className="fa fa-spinner fa-spin" style={{ marginRight: 8 }} />Loading ledger…
            </div>
          ) : expenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <i className="fa fa-file-invoice" style={{ fontSize: '2rem', color: 'var(--t3)', marginBottom: 10, display: 'block' }} />
              <div style={{ color: 'var(--t2)', fontSize: '.82rem', marginBottom: 4 }}>No entries yet</div>
              <div style={{ color: 'var(--t3)', fontSize: '.72rem' }}>
                Track LC, TT, duties and every other payment above
              </div>
            </div>
          ) : (
            <div>
              {GROUPS.map(g => {
                const items = byGroup[g] || [];
                if (!items.length) return null;
                const gTotal = groupTotals[g] || 0;
                const meta   = GROUP_META[g];
                return (
                  <div key={g} style={{ borderBottom: '1px solid var(--br)' }}>

                    {/* Group header */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 20px', background: meta.bg,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <i className={`fa ${meta.icon}`} style={{ color: meta.color, fontSize: '.68rem' }} />
                        <span style={{
                          fontSize: '.63rem', fontWeight: 700,
                          letterSpacing: '.8px', textTransform: 'uppercase', color: meta.color,
                        }}>
                          {g}
                        </span>
                      </div>
                      <span style={{
                        fontFamily: "'Josefin Sans',sans-serif",
                        fontSize: '.76rem', color: meta.color, fontWeight: 700,
                      }}>
                        LKR {fmt(gTotal)}
                      </span>
                    </div>

                    {/* Expense rows */}
                    {items.map(e => (
                      <div key={e.id}>
                        {editRow?.id === e.id ? (
                          <div style={{ padding: '12px 20px', background: 'rgba(255,255,255,.015)' }}>
                            <ExpenseForm
                              editing={editRow}
                              onSave={handleUpdate}
                              onCancel={() => setEditRow(null)}
                            />
                          </div>
                        ) : (
                          <ExpenseRow
                            expense={e}
                            onEdit={() => { setEditRow(e); setShowForm(false); }}
                            onDelete={() => handleDelete(e.id)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Grand total */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 20px',
                background: 'var(--bg3)', borderTop: '2px solid var(--br2)',
              }}>
                <span style={{
                  fontSize: '.64rem', color: 'var(--t3)',
                  letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600,
                }}>
                  Total Invested
                </span>
                <span style={{
                  fontFamily: "'Josefin Sans',sans-serif",
                  fontSize: '1rem', color: '#fff', fontWeight: 700,
                }}>
                  LKR {fmt(totalCost)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '11px 20px', borderTop: '1px solid var(--br)',
          display: 'flex', justifyContent: 'flex-end',
          background: 'var(--bg3)', flexShrink: 0,
        }}>
          <button className="btn-cancel" style={{ minWidth: 80 }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Expense row ----

function ExpenseRow({ expense, onEdit, onDelete }) {
  const e    = expense;
  const isFC = e.currency && e.currency !== 'LKR';

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto auto',
      alignItems: 'center', padding: '9px 20px', gap: 10,
      borderTop: '1px solid var(--br)', transition: 'background .15s',
    }}
      onMouseEnter={ev => { ev.currentTarget.style.background = 'rgba(255,255,255,.018)'; }}
      onMouseLeave={ev => { ev.currentTarget.style.background = 'transparent'; }}
    >
      {/* Info */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.77rem', color: 'var(--t2)', fontWeight: 500 }}>
            {e._cat.label}
          </span>
          {e.reference && (
            <span style={{
              fontFamily: 'monospace', fontSize: '.62rem',
              background: 'rgba(255,255,255,.06)', padding: '1px 7px',
              borderRadius: 4, color: 'var(--t3)',
            }}>
              {e.reference}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.64rem', color: 'var(--t3)' }}>{fmtD(e.date)}</span>
          {e.description && (
            <span style={{
              fontSize: '.64rem', color: 'var(--t3)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200,
            }}>
              · {e.description}
            </span>
          )}
        </div>
        {isFC && (
          <div style={{ fontSize: '.61rem', color: 'var(--t3)', marginTop: 1 }}>
            {e.currency} {fmt(e.amount)} @ {e.exchangeRate}
          </div>
        )}
      </div>

      {/* Amount */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontFamily: "'Josefin Sans',sans-serif",
          fontSize: '.82rem', color: '#fff', fontWeight: 700,
        }}>
          LKR {fmt(e.lkrAmount)}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        <button className="ac" onClick={onEdit} title="Edit">
          <i className="fa fa-pen" />
        </button>
        <button className="ac del" onClick={onDelete} title="Delete">
          <i className="fa fa-trash" />
        </button>
      </div>
    </div>
  );
}

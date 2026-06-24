import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import {
  EXPENSE_CATS, CAT_COLORS,
  getBusinessExpenses, addBusinessExpense,
  updateBusinessExpense, deleteBusinessExpense, updateExpensePdf,
} from '../services/businessExpenseService';

const fmt  = n => n == null ? '—' : Number(n).toLocaleString('en-LK', { maximumFractionDigits: 0 });
const fmtD = d => { if (!d) return '—'; const [y, m, dy] = d.split('-'); return `${dy}/${m}/${y}`; };
const todayISO  = () => new Date().toISOString().split('T')[0];
const thisMonth = () => new Date().toISOString().slice(0, 7);

/* ── PDF viewer ───────────────────────────────────────────────── */
function PdfViewer({ url, title, onClose }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  if (!url) return null;
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.82)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 920, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fa fa-file-pdf" style={{ color: '#ef4444', fontSize: '1.1rem' }} />
          <span style={{ fontSize: '.82rem', fontWeight: 700, color: '#fff', letterSpacing: '.5px' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={url} target="_blank" rel="noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
            fontSize: '.72rem', fontWeight: 700, background: 'rgba(96,165,250,.15)', color: '#93c5fd',
            border: '1px solid rgba(96,165,250,.3)', textDecoration: 'none',
          }}>
            <i className="fa fa-arrow-up-right-from-square" /> Open in Browser
          </a>
          <button onClick={onClose} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
            fontSize: '.72rem', fontWeight: 700, background: 'rgba(239,68,68,.15)', color: '#fca5a5',
            border: '1px solid rgba(239,68,68,.3)', cursor: 'pointer',
          }}>
            <i className="fa fa-xmark" /> Close
          </button>
        </div>
      </div>
      <iframe src={url} title={title} style={{
        width: '100%', maxWidth: 920, height: 'min(80vh,900px)', border: 'none', borderRadius: 10, background: '#fff',
      }} />
    </div>
  );
}

/* ── Inline PDF upload + view cell ───────────────────────────── */
function ExpensePdfCell({ expenseId, currentUrl, label, onUploaded, onView, showToast }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `expenses/${expenseId}_${Date.now()}.pdf`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateExpensePdf(expenseId, url);
      onUploaded(expenseId, url);
      showToast('PDF uploaded!', 'ok');
    } catch (err) {
      showToast(err.message || 'Upload failed', 'err');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {currentUrl ? (
        <button onClick={() => onView(currentUrl, label)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20,
          fontSize: '.68rem', fontWeight: 700, background: 'rgba(74,222,128,.12)', color: '#4ade80',
          border: '1px solid rgba(74,222,128,.25)', cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
          <i className="fa fa-eye" style={{ fontSize: '.6rem' }} /> View
        </button>
      ) : (
        <span style={{ fontSize: '.68rem', color: 'var(--t3)' }}>—</span>
      )}
      <button onClick={() => inputRef.current?.click()} disabled={uploading} style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 20,
        fontSize: '.65rem', fontWeight: 700,
        background: uploading ? 'var(--bg3)' : 'rgba(96,165,250,.12)',
        color: uploading ? 'var(--t3)' : '#93c5fd',
        border: `1px solid ${uploading ? 'var(--br)' : 'rgba(96,165,250,.25)'}`,
        cursor: uploading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
      }}>
        {uploading
          ? <><span className="spin" style={{ width: 10, height: 10, borderWidth: 2 }} /> Uploading…</>
          : <><i className="fa fa-upload" style={{ fontSize: '.6rem' }} /> {currentUrl ? 'Replace' : 'Upload'}</>}
      </button>
      <input ref={inputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

/* ── Add / Edit modal ─────────────────────────────────────────── */
function ExpenseModal({ open, item, onClose, onSave, onViewPdf, showToast }) {
  const blank = { date: todayISO(), category: EXPENSE_CATS[0], description: '', amount: '', reference: '', pdf_url: null };
  const [form, setForm]     = useState(blank);
  const [saving, setSaving] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const pdfRef = useRef();

  useEffect(() => {
    if (open) {
      setForm(item ? { ...item } : blank);
      setPdfFile(null);
    }
  }, [open, item?.id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.date && form.category && form.amount;

  const clearPdf = () => { setPdfFile(null); if (pdfRef.current) pdfRef.current.value = ''; };

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      let pdfUrl = form.pdf_url || null;
      if (pdfFile) {
        const fileRef = ref(storage, `expenses/${item?.id || 'new'}_${Date.now()}.pdf`);
        await uploadBytes(fileRef, pdfFile);
        pdfUrl = await getDownloadURL(fileRef);
      }
      await onSave({ ...form, pdf_url: pdfUrl });
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to save', 'err');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2>{item ? 'EDIT EXPENSE' : 'ADD EXPENSE'}</h2>
          <button className="modal-close" onClick={onClose}><i className="fa fa-times" /></button>
        </div>

        <div className="modal-grid">
          <div className="form-row">
            <label>Date *</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="form-row">
            <label>Category *</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}>
              {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-row full">
            <label>Description *</label>
            <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. March showroom rent" />
          </div>
          <div className="form-row">
            <label>Amount (LKR) *</label>
            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" />
          </div>
          <div className="form-row">
            <label>Reference</label>
            <input value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="Invoice / receipt #" />
          </div>

          {/* ── Receipt PDF ── */}
          <div className="form-row full">
            <label>Receipt PDF</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>

              {/* View existing PDF (edit mode, no new file chosen) */}
              {form.pdf_url && !pdfFile && (
                <button type="button" onClick={() => onViewPdf(form.pdf_url, `${fmtD(form.date)} · ${form.category} Receipt`)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 13px', borderRadius: 8, fontSize: '.72rem', fontWeight: 700,
                    background: 'rgba(74,222,128,.12)', color: '#4ade80',
                    border: '1px solid rgba(74,222,128,.3)', cursor: 'pointer',
                  }}>
                  <i className="fa fa-eye" /> View PDF
                </button>
              )}

              {/* Selected file chip */}
              {pdfFile ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, flex: 1,
                  background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
                  borderRadius: 8, padding: '7px 12px', minWidth: 0,
                }}>
                  <i className="fa fa-file-pdf" style={{ color: '#ef4444', flexShrink: 0 }} />
                  <span style={{ fontSize: '.72rem', color: 'var(--tx)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pdfFile.name}
                  </span>
                  <button type="button" onClick={clearPdf} style={{
                    background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', padding: 0, fontSize: '.8rem', flexShrink: 0,
                  }}>
                    <i className="fa fa-xmark" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => pdfRef.current?.click()} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 13px', borderRadius: 8, fontSize: '.72rem', fontWeight: 700,
                  background: 'rgba(96,165,250,.1)', color: '#93c5fd',
                  border: '1px solid rgba(96,165,250,.3)', cursor: 'pointer',
                }}>
                  <i className="fa fa-paperclip" /> {form.pdf_url ? 'Replace PDF' : 'Attach PDF'}
                </button>
              )}

              <input ref={pdfRef} type="file" accept="application/pdf" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files[0]; if (f) setPdfFile(f); }} />
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={submit} disabled={saving || !valid}>
            {saving
              ? <><span className="spin" style={{ width: 12, height: 12, borderWidth: 2 }} /> {pdfFile ? 'Uploading…' : 'Saving…'}</>
              : item ? 'Update' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────── */
export default function BusinessExpenses({ showToast }) {
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [monthFilter, setMonth]   = useState(thisMonth());
  const [catFilter, setCat]       = useState('');
  const [q, setQ]                 = useState('');
  const [modal, setModal]         = useState({ open: false, item: null });
  const [delId, setDelId]         = useState(null);
  const [pdfUrl, setPdfUrl]       = useState(null);
  const [pdfTitle, setPdfTitle]   = useState('');
  const openPdf  = useCallback((url, title) => { setPdfUrl(url); setPdfTitle(title); }, []);
  const closePdf = useCallback(() => setPdfUrl(null), []);
  const onPdfUploaded = useCallback((id, url) => {
    setRows(rs => rs.map(r => r.id === id ? { ...r, pdf_url: url } : r));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await getBusinessExpenses()); }
    catch { showToast('Failed to load expenses', 'err'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* filtered view */
  const visible = rows.filter(r => {
    if (monthFilter && !r.date?.startsWith(monthFilter)) return false;
    if (catFilter && r.category !== catFilter) return false;
    if (q) {
      const lq = q.toLowerCase();
      if (!r.description?.toLowerCase().includes(lq) &&
          !r.category?.toLowerCase().includes(lq) &&
          !r.reference?.toLowerCase().includes(lq)) return false;
    }
    return true;
  });

  const totalVisible = visible.reduce((s, r) => s + (r.amount || 0), 0);

  /* summary figures */
  const mk = thisMonth();
  const yk = new Date().getFullYear().toString();
  const totalThisMonth = rows.filter(r => r.date?.startsWith(mk)).reduce((s, r) => s + r.amount, 0);
  const totalThisYear  = rows.filter(r => r.date?.startsWith(yk)).reduce((s, r) => s + r.amount, 0);

  const catTotals = {};
  rows.filter(r => r.date?.startsWith(yk)).forEach(r => { catTotals[r.category] = (catTotals[r.category] || 0) + r.amount; });
  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

  /* category breakdown for filtered view */
  const filterCats = {};
  visible.forEach(r => { filterCats[r.category] = (filterCats[r.category] || 0) + r.amount; });
  const catBreakdown = Object.entries(filterCats).sort((a, b) => b[1] - a[1]);

  /* save */
  const save = async (form) => {
    try {
      if (modal.item) { await updateBusinessExpense(modal.item.id, form); showToast('Updated', 'ok'); }
      else            { await addBusinessExpense(form);                   showToast('Expense added', 'ok'); }
      load();
    } catch { showToast('Failed to save', 'err'); }
  };

  const del = async (id) => {
    try { await deleteBusinessExpense(id); showToast('Deleted', 'ok'); setDelId(null); load(); }
    catch { showToast('Failed to delete', 'err'); }
  };

  const exportXLSX = () => {
    const header = ['Date', 'Category', 'Description', 'Amount (LKR)', 'Reference'];
    const data   = visible.map(r => [fmtD(r.date), r.category, r.description, r.amount, r.reference]);
    data.push([], ['TOTAL', '', '', totalVisible, '']);
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 32 }, { wch: 16 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Business Expenses');
    XLSX.writeFile(wb, `expenses-${monthFilter || 'all'}.xlsx`);
  };

  return (
    <>
      {pdfUrl && <PdfViewer url={pdfUrl} title={pdfTitle} onClose={closePdf} />}

      {/* ── Summary cards ── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(175px,1fr))', marginBottom: 16 }}>
        <div className="stat-card s1">
          <div className="stat-icon"><i className="fa fa-calendar-day" /></div>
          <div className="stat-num" style={{ fontSize: '1.05rem' }}>LKR {fmt(totalThisMonth)}</div>
          <div className="stat-lbl">This Month</div>
        </div>
        <div className="stat-card s4">
          <div className="stat-icon"><i className="fa fa-calendar" /></div>
          <div className="stat-num" style={{ fontSize: '1.05rem' }}>LKR {fmt(totalThisYear)}</div>
          <div className="stat-lbl">This Year</div>
        </div>
        <div className="stat-card s6">
          <div className="stat-icon"><i className="fa fa-chart-pie" /></div>
          <div className="stat-num" style={{ fontSize: '1rem' }}>{topCat ? topCat[0] : '—'}</div>
          <div className="stat-lbl">Top Category (Year)</div>
          {topCat && <div className="stat-sub"><span>LKR {fmt(topCat[1])}</span></div>}
        </div>
        <div className="stat-card s2">
          <div className="stat-icon"><i className="fa fa-filter" /></div>
          <div className="stat-num" style={{ fontSize: '1.05rem' }}>LKR {fmt(totalVisible)}</div>
          <div className="stat-lbl">Filtered Total</div>
          <div className="stat-sub"><span>{visible.length} entries</span></div>
        </div>
      </div>

      {/* ── Category breakdown ── */}
      {catBreakdown.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <h3>CATEGORY BREAKDOWN</h3>
            <span style={{ fontSize: '.65rem', color: 'var(--t3)' }}>{monthFilter || 'All time'}</span>
          </div>
          <div className="card-body">
            {catBreakdown.map(([cat, amt]) => {
              const pct = totalVisible > 0 ? ((amt / totalVisible) * 100).toFixed(1) : 0;
              const col = CAT_COLORS[cat] || '#94a3b8';
              return (
                <div key={cat} style={{ marginBottom: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontSize: '.74rem', color: 'var(--t2)' }}>{cat}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <span style={{ fontSize: '.65rem', color: 'var(--t3)', fontFamily: "'Josefin Sans',sans-serif" }}>{pct}%</span>
                      <span style={{ fontSize: '.78rem', color: '#fff', fontFamily: "'Josefin Sans',sans-serif", fontVariantNumeric: 'tabular-nums' }}>LKR {fmt(amt)}</span>
                    </div>
                  </div>
                  <div style={{ height: 3, background: 'var(--bg5)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 2, transition: 'width .6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Expense ledger ── */}
      <div className="card">
        <div className="card-header">
          <h3>EXPENSE LEDGER</h3>
          <div className="card-header-right">
            <input type="month" value={monthFilter} onChange={e => setMonth(e.target.value)}
              style={{ background: 'var(--bg4)', border: '1px solid var(--br)', borderRadius: 4, color: 'var(--tx)', padding: '6px 10px', fontSize: '.75rem', fontFamily: "'Work Sans',sans-serif", minHeight: 34 }} />
            <select className="filter" value={catFilter} onChange={e => setCat(e.target.value)}>
              <option value="">All Categories</option>
              {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="search-wrap">
              <i className="fa fa-search" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" />
            </div>
            <button className="btn-secondary" onClick={exportXLSX}><i className="fa fa-file-excel" /> Excel</button>
            <button className="btn-primary" onClick={() => setModal({ open: true, item: null })}>
              <i className="fa fa-plus" /> Add Expense
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Category</th><th>Description</th>
                <th>Amount (LKR)</th><th>Reference</th><th>Receipt PDF</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="loading"><span className="spin" />Loading…</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan="7" className="empty">No expenses recorded for this period</td></tr>
              ) : visible.map(r => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtD(r.date)}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: CAT_COLORS[r.category] || '#94a3b8', flexShrink: 0 }} />
                      {r.category}
                    </span>
                  </td>
                  <td style={{ color: 'var(--tx)' }}>{r.description || '—'}</td>
                  <td className="amt neg">− {fmt(r.amount)}</td>
                  <td style={{ fontSize: '.7rem', color: 'var(--t3)' }}>{r.reference || '—'}</td>
                  <td>
                    <ExpensePdfCell
                      expenseId={r.id}
                      currentUrl={r.pdf_url}
                      label={`${fmtD(r.date)} · ${r.category} Receipt`}
                      onUploaded={onPdfUploaded}
                      onView={openPdf}
                      showToast={showToast}
                    />
                  </td>
                  <td>
                    <button className="ac" onClick={() => setModal({ open: true, item: r })}><i className="fa fa-pen" /></button>
                    {delId === r.id ? (
                      <>
                        <button className="ac del" onClick={() => del(r.id)}>Confirm</button>
                        <button className="ac"     onClick={() => setDelId(null)}>✕</button>
                      </>
                    ) : (
                      <button className="ac del" onClick={() => setDelId(r.id)}><i className="fa fa-trash" /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pag">
          <span className="pag-info">{visible.length} records</span>
          <span style={{ fontSize: '.68rem', color: 'var(--rl)', fontFamily: "'Josefin Sans',sans-serif" }}>
            Total Spent: LKR {fmt(totalVisible)}
          </span>
        </div>
      </div>

      <ExpenseModal
        open={modal.open}
        item={modal.item}
        onClose={() => setModal({ open: false, item: null })}
        onSave={save}
        onViewPdf={openPdf}
        showToast={showToast}
      />
    </>
  );
}

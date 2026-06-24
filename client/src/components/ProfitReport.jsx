import React, { useEffect, useState, useCallback } from 'react';
import { getProfitReport } from '../services/dashboardService';
import * as XLSX from 'xlsx';

const fmt = n => n == null ? '—' : Number(n).toLocaleString('en-LK', { maximumFractionDigits: 0 });
const fmtD = d => { if (!d) return '—'; const s = d.split('T')[0]; const [y, m, dy] = s.split('-'); return `${dy}/${m}/${y}`; };

export default function ProfitReport({ showToast }) {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [sortCol, setSortCol] = useState('no');
  const [sortDir, setSortDir] = useState('asc');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getProfitReport(q, sortCol, sortDir);
      setRows(result.data);
      setTotals(result.totals);
    } catch { showToast('Failed to load', 'err'); }
    finally { setLoading(false); }
  }, [q, sortCol, sortDir]);

  useEffect(() => { load(); }, [load]);

  const sort = (col) => {
    setSortCol(col);
    setSortDir(s => sortCol === col ? (s === 'asc' ? 'desc' : 'asc') : 'asc');
  };
  const SortBtn = ({ col }) => (
    <button className={`sort-btn ${sortCol === col ? 'on' : ''}`} onClick={() => sort(col)}>
      {sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </button>
  );

  const exportXLSX = () => {
    const header = ['#', 'Brand', 'Model', 'Type', 'Chassis', 'Cost (LKR)', 'Sell Price (LKR)', 'Income (LKR)', 'Margin %', 'Sell Date', 'Contact'];
    const data = rows.map(v => {
      const margin = v.cost && v.sell_price ? ((v.sell_price - v.cost) / v.sell_price * 100).toFixed(1) : '';
      return [v.no, v.brand, v.model, v.type, v.chassis || '', Number(v.cost) || 0, Number(v.sell_price) || 0, Number(v.income) || 0, margin ? Number(margin) : '', fmtD(v.sell_date), v.contact || ''];
    });
    if (totals) {
      data.push([]);
      data.push(['', 'TOTALS', '', '', '', totals.total_cost, totals.total_sales, totals.total_income, '', '', '']);
      data.push(['', 'Best Profit', '', '', '', '', '', totals.best, '', '', '']);
      data.push(['', 'Worst Result', '', '', '', '', '', totals.worst, '', '', '']);
      data.push(['', 'Total Vehicles', totals.count, '', '', '', '', '', '', '', '']);
    }
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [
      { wch: 8 }, { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 18 },
      { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Profit Report');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `profit-report-${today}.xlsx`);
  };

  const avg = totals?.total_sales > 0 ? ((totals.total_income / totals.total_sales) * 100).toFixed(1) + '%' : '—';

  return (
    <>
      {totals && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))' }}>
          <div className="stat-card s2"><div className="stat-icon"><i className="fa fa-arrow-up" /></div><div className="stat-num" style={{ fontSize: '.95rem' }}>{fmt(totals.total_income)}</div><div className="stat-lbl">Total Income (LKR)</div></div>
          <div className="stat-card s1"><div className="stat-icon"><i className="fa fa-trophy" /></div><div className="stat-num" style={{ fontSize: '.95rem' }}>{fmt(totals.best)}</div><div className="stat-lbl">Best Profit</div></div>
          <div className="stat-card s5"><div className="stat-icon"><i className="fa fa-minus" /></div><div className="stat-num" style={{ fontSize: '.95rem' }}>{fmt(totals.worst)}</div><div className="stat-lbl">Worst Result</div></div>
          <div className="stat-card s4"><div className="stat-icon"><i className="fa fa-percent" /></div><div className="stat-num">{avg}</div><div className="stat-lbl">Avg Margin</div></div>
          <div className="stat-card s6"><div className="stat-icon"><i className="fa fa-hashtag" /></div><div className="stat-num">{totals.count}</div><div className="stat-lbl">Sold Vehicles</div></div>
        </div>
      )}
      <div className="card">
        <div className="card-header">
          <h3>PROFIT LEDGER</h3>
          <div className="card-header-right">
            <div className="search-wrap"><i className="fa fa-search" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" /></div>
            <button className="btn-secondary" onClick={exportXLSX}><i className="fa fa-file-excel" /> Excel</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th><SortBtn col="no" /> #</th>
                <th><SortBtn col="brand" /> Brand</th>
                <th>Model</th><th>Type</th><th>Chassis</th>
                <th><SortBtn col="cost" /> Cost</th>
                <th><SortBtn col="sell_price" /> Sell Price</th>
                <th><SortBtn col="income" /> Income</th>
                <th>Margin</th>
                <th><SortBtn col="sell_date" /> Sell Date</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="11" className="loading"><span className="spin" />Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="11" className="empty">No sold vehicles</td></tr>
              ) : rows.map(v => {
                const loss = parseFloat(v.income) < 0;
                const pct = v.cost && v.sell_price ? ((v.sell_price - v.cost) / v.sell_price * 100).toFixed(1) + '%' : '—';
                return (
                  <tr key={v.no} className={loss ? 'row-loss' : ''}>
                    <td><strong>{v.no}</strong></td>
                    <td><strong>{v.brand}</strong></td>
                    <td>{v.model}</td>
                    <td><span className={`badge ${v.type === 'LOCAL' ? 'b-local' : 'b-import'}`}>{v.type}</span></td>
                    <td style={{ fontSize: '.7rem', color: 'var(--t3)' }}>{v.chassis || '—'}</td>
                    <td className="amt">{fmt(v.cost)}</td>
                    <td className="amt">{fmt(v.sell_price)}</td>
                    <td>
                      {v.income == null ? '—' : (
                        <span className={`badge ${loss ? 'b-loss' : 'b-profit'}`}>
                          {loss ? '− ' : '+ '}{fmt(Math.abs(v.income))}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="pb-w">
                        <span style={{ fontSize: '.72rem', color: loss ? 'var(--rl)' : 'var(--g)' }}>{pct}</span>
                        <div className="pb">
                          <div className={`pb-f ${loss ? 'loss' : ''}`} style={{ width: `${Math.min(Math.abs(parseFloat(pct)) * 4, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>{fmtD(v.sell_date)}</td>
                    <td style={{ fontSize: '.71rem' }}>{v.contact || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="pag">
          <span className="pag-info">{rows.length} records</span>
          <span style={{ fontSize: '.68rem', color: 'var(--t3)' }}>Red rows = loss</span>
        </div>
      </div>
    </>
  );
}

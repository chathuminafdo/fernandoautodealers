import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '../services/dashboardService';

const fmt  = n => n == null ? '—' : Number(n).toLocaleString('en-LK', { maximumFractionDigits: 0 });
const fmtD = d => { if (!d) return '—'; const s = d.split('T')[0]; const [y,m,dy] = s.split('-'); return `${dy}/${m}/${y}`; };

function useCountUp(end, duration = 950) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    const n = Number(end);
    if (!isFinite(n) || n === 0) { setVal(0); return; }
    const t0 = performance.now();
    const tick = t => {
      const p = Math.min((t - t0) / duration, 1);
      const e = 1 - Math.pow(1 - p, 4);
      setVal(Math.round(n * e));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [end, duration]);
  return val;
}

function KpiCard({ num, label, prefix = '', suffix = '', icon, accent, delay = 0, tag, tagColor }) {
  const anim = useCountUp(num);
  const disp = num == null ? '—' : `${prefix}${fmt(anim)}${suffix}`;
  return (
    <div className="kpi-card" style={{ '--ka': accent, animationDelay: `${delay}ms` }}>
      <div className="kpi-top">
        <span className="kpi-lbl">{label}</span>
        <div className="kpi-ico"><i className={`fa ${icon}`} /></div>
      </div>
      <div className="kpi-num">{disp}</div>
      {tag && <div className="kpi-tag" style={{ color: tagColor }}>{tag}</div>}
      <div className="kpi-accent-line" />
    </div>
  );
}

function TargetSection({ target, thisMonth, thisMonthCount }) {
  if (!target) return null;
  const now         = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed  = now.getDate();
  const daysPct     = (daysPassed / daysInMonth) * 100;
  const monthLabel  = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const profitPct = target.profit_target > 0 ? Math.min(100, (thisMonth / target.profit_target) * 100) : 0;
  const unitsPct  = target.units_target > 0  ? Math.min(100, (thisMonthCount / target.units_target) * 100) : 0;
  const profitOk  = profitPct >= daysPct;
  const unitsOk   = unitsPct  >= daysPct;

  const profitBg = profitPct >= 100
    ? 'linear-gradient(90deg,#16a34a,#4ade80)'
    : profitOk ? 'linear-gradient(90deg,var(--r),var(--rl))' : 'linear-gradient(90deg,#b71c1c,#e53935)';
  const unitsBg = unitsPct >= 100
    ? 'linear-gradient(90deg,#2563eb,#60a5fa)'
    : unitsOk ? 'linear-gradient(90deg,#1d4ed8,#3b82f6)' : 'linear-gradient(90deg,#92400e,#f59e0b)';

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <h3><i className="fa fa-bullseye" style={{ marginRight: 8, color: 'var(--r)' }} />MONTHLY TARGET</h3>
        <span style={{ fontSize: '.68rem', color: 'var(--t3)', fontFamily: "'Josefin Sans',sans-serif" }}>
          {monthLabel} · Day {daysPassed}/{daysInMonth}
        </span>
      </div>
      <div className="card-body">
        <div className="target-grid">
          {[
            { label: 'Profit Target', icon: 'fa-coins', current: thisMonth, target: target.profit_target,
              pct: profitPct, ok: profitOk, bg: profitBg,
              oc: profitPct >= 100 ? 'var(--g)' : profitOk ? 'var(--g)' : 'var(--rl)',
              ic: profitOk ? 'var(--g)' : 'var(--rl)',
              status: profitPct >= 100 ? '✓ Target Hit!' : profitOk ? '▲ On Track' : '▼ Behind Pace',
              suffix: '' },
            { label: 'Units Target', icon: 'fa-car', current: thisMonthCount, target: target.units_target,
              pct: unitsPct, ok: unitsOk, bg: unitsBg,
              oc: unitsPct >= 100 ? '#60a5fa' : unitsOk ? '#60a5fa' : '#f59e0b',
              ic: unitsOk ? '#60a5fa' : '#f59e0b',
              status: unitsPct >= 100 ? '✓ Target Hit!' : unitsOk ? '▲ On Track' : '▼ Behind Pace',
              suffix: unitsPct < 100 ? ' vehicles' : '' },
          ].map(({ label, icon, current, target: tgt, pct, bg, oc, ic, status, suffix }) => (
            <div key={label} className="target-item">
              <div className="target-labels">
                <span style={{ color: 'var(--t2)', fontSize: '.72rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className={`fa ${icon}`} style={{ color: ic }} />{label}
                </span>
                <span style={{ fontFamily: "'Josefin Sans',sans-serif", fontSize: '.8rem', color: '#fff' }}>
                  {fmt(current)}<span style={{ color: 'var(--t3)' }}> / {fmt(tgt)}{suffix}</span>
                </span>
              </div>
              <div className="target-track">
                <div className="target-fill" style={{ width: `${pct}%`, background: bg }} />
                <div className="target-day-mark" style={{ left: `${daysPct}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: '.62rem', color: oc }}>{status}</span>
                <span style={{ fontSize: '.62rem', color: 'var(--t3)', fontFamily: "'Josefin Sans',sans-serif" }}>{pct.toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthlyChart({ monthly, thisMonth, lastMonth, avgMonthly, winRate, profitCount, lossCount }) {
  if (!monthly || !monthly.length) return null;
  const maxP = monthly.reduce((m, r) => Math.max(m, Math.abs(parseFloat(r.profit) || 0)), 1);
  const tmPct = lastMonth > 0
    ? `${thisMonth >= lastMonth ? '▲' : '▼'} ${Math.abs(((thisMonth - lastMonth) / lastMonth) * 100).toFixed(0)}% vs last month`
    : 'First month';

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <h3>MONTHLY PROFIT TREND</h3>
        <span style={{ fontSize: '.68rem', color: 'var(--t3)' }}>Last 12 months · Hover for detail</span>
      </div>
      <div className="month-stats">
        {[
          { lbl: 'This Month',   val: `LKR ${fmt(thisMonth)}`,   sub: tmPct, sc: thisMonth >= lastMonth ? 'var(--g)' : 'var(--rl)' },
          { lbl: 'Last Month',   val: `LKR ${fmt(lastMonth)}`,   sub: 'Previous period', sc: 'var(--t3)' },
          { lbl: 'Monthly Avg',  val: `LKR ${fmt(avgMonthly)}`,  sub: 'Per active month', sc: 'var(--t3)' },
          { lbl: 'Win Rate',     val: `${winRate}%`,             sub: `${profitCount}W · ${lossCount}L`, sc: 'var(--t3)', vc: 'var(--g)' },
        ].map(({ lbl, val, sub, sc, vc }) => (
          <div key={lbl} className="mstat">
            <div className="mstat-lbl">{lbl}</div>
            <div className="mstat-val" style={vc ? { color: vc } : {}}>{val}</div>
            <div className="mstat-sub" style={{ color: sc }}>{sub}</div>
          </div>
        ))}
      </div>
      <div className="chart-wrap">
        <div className="chart-bars">
          {monthly.map(m => {
            const profit = parseFloat(m.profit) || 0;
            const h = Math.max(4, Math.round(Math.abs(profit) / maxP * 130));
            const isPos = profit >= 0;
            const col = isPos ? 'linear-gradient(to top,#16a34a,#22c55e)' : 'linear-gradient(to top,#b71c1c,#e53935)';
            const sv  = Math.abs(profit) >= 1e6 ? (profit / 1e6).toFixed(1) + 'M' : fmt(profit);
            const parts = m.month_label.split(' ');
            return (
              <div key={m.month_key} className="chart-col">
                <div className="chart-bar-wrap">
                  <div className="chart-bar" style={{ height: h, background: col }}
                    title={`${m.month_label} | ${m.count} sold | LKR ${fmt(profit)}`}>
                    <div className="chart-val" style={{ color: isPos ? 'var(--g)' : 'var(--rl)' }}>{sv}</div>
                  </div>
                </div>
                <div className="chart-lbl">{parts[0]}<br /><span style={{ fontSize: '.53rem' }}>{parts[1] || ''}</span></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const BANDS = [
  { key: 'fresh', label: '< 30 DAYS',   tag: 'FRESH',    color: '#22c55e', glow: 'rgba(34,197,94,.3)'   },
  { key: 'd30',   label: '30 – 60 DAYS',tag: 'MONITOR',  color: '#94a3b8', glow: 'rgba(148,163,184,.25)' },
  { key: 'd60',   label: '60 – 90 DAYS',tag: 'URGENT',   color: '#f59e0b', glow: 'rgba(245,158,11,.3)'   },
  { key: 'd90',   label: '90+ DAYS',    tag: 'CRITICAL', color: '#e53935', glow: 'rgba(229,57,53,.35)'   },
];

function AgingHudCard({ count, label, tag, color, glow, pct, delay, pulse }) {
  const anim = useCountUp(count);
  return (
    <div className={`ahc ${pulse && count > 0 ? 'ahc-crit' : ''}`}
      style={{ '--ac': color, '--ag': glow, animationDelay: `${delay}ms` }}>
      <div className="ahc-tag">{tag}</div>
      <div className="ahc-count">{anim}</div>
      <div className="ahc-label">{label}</div>
      <div className="ahc-bottom">
        <span className="ahc-pct">{pct}%</span>
        <div className="ahc-bar"><div className="ahc-bar-fill" style={{ width: `${pct}%`, animationDelay: `${delay + 320}ms` }} /></div>
      </div>
    </div>
  );
}

function AgingPanel({ aging, navigate }) {
  if (!aging) return null;
  const counts = { fresh: aging.fresh || 0, d30: aging.d30 || 0, d60: aging.d60 || 0, d90: aging.d90 || 0 };
  const total  = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const pct = n => total > 0 ? ((n / total) * 100).toFixed(1) : '0';

  return (
    <div className="aging-panel">
      {/* Header */}
      <div className="aging-ph">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="aging-live-dot" />
          <span className="aging-ph-title">INVENTORY AGING</span>
          <span className="aging-ph-sub">{total} vehicles tracked</span>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/inhand')}>
          <i className="fa fa-arrow-right" /> View In Hand
        </button>
      </div>

      {/* 4 metric cards */}
      <div className="ahc-grid">
        {BANDS.map(({ key, label, tag, color, glow }, i) => (
          <AgingHudCard key={key} count={counts[key]} label={label} tag={tag}
            color={color} glow={glow} pct={pct(counts[key])}
            delay={i * 90} pulse={key === 'd90'} />
        ))}
      </div>

      {/* Distribution bar */}
      <div className="aging-dist-outer">
        <div className="aging-dist-bar">
          {BANDS.map(({ key, color }, i) => {
            const p = parseFloat(pct(counts[key]));
            return p > 0 ? (
              <div key={key} className="aging-dist-seg"
                style={{ width: `${p}%`, background: color, animationDelay: `${i * 110}ms` }} />
            ) : null;
          })}
        </div>
        <div className="aging-dist-labels">
          {BANDS.map(({ key, tag, color }) => (
            <span key={key} style={{ color, opacity: counts[key] > 0 ? 1 : .25, fontSize: '.56rem', fontFamily: "'Josefin Sans',sans-serif", letterSpacing: '1px' }}>
              {tag} {pct(counts[key])}%
            </span>
          ))}
        </div>
      </div>

      {/* Top longest in stock */}
      {aging.top && aging.top.length > 0 && (
        <div className="aging-top-section">
          <div className="aging-top-hdr">
            <span className="aging-top-ttl">LONGEST IN STOCK</span>
            <div className="aging-trace-line" />
          </div>
          {aging.top.map((v, i) => {
            const isCrit = v.days >= 90, isUrg = v.days >= 60, isMon = v.days >= 30;
            const col = isCrit ? '#e53935' : isUrg ? '#f59e0b' : isMon ? '#94a3b8' : '#22c55e';
            const tag = isCrit ? 'CRITICAL' : isUrg ? 'URGENT' : isMon ? 'MONITOR' : 'FRESH';
            return (
              <div key={v.id} className={`aging-top-row ${isCrit ? 'atr-crit' : ''}`}
                style={{ animationDelay: `${i * 55}ms` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '.6rem', color: 'var(--t3)', fontFamily: "'Josefin Sans',sans-serif" }}>#{v.no}</span>
                  <span style={{ fontSize: '.82rem', color: '#fff', fontWeight: 600 }}>{v.brand} {v.model}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: "'Josefin Sans',sans-serif", fontWeight: 700, fontSize: '.82rem', color: col }}>{v.days}d</span>
                  <span className="aging-stag" style={{ color: col, borderColor: `${col}55`, background: `${col}14` }}>{tag}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BrandList({ brands, navigate }) {
  if (!brands || !brands.length) return null;
  return (
    <div className="card">
      <div className="card-header">
        <h3>TOP BRANDS</h3>
        <span style={{ fontSize: '.62rem', color: 'var(--t3)' }}>{brands.length} brands</span>
      </div>
      <div>
        {brands.slice(0, 8).map((b, i) => {
          const margin = b.total_sales > 0 ? ((b.total_profit / b.total_sales) * 100).toFixed(1) : '0';
          const isPos  = parseFloat(b.total_profit) >= 0;
          return (
            <div key={b.brand} className="brand-row" style={{ animationDelay: `${i * 40}ms` }}>
              <div>
                <div className="brand-name">{b.brand}</div>
                <div className="brand-meta">{b.sold} sold · {b.inhand} in hand · {b.onway} on way</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className={`brand-profit ${isPos ? 'pos' : 'neg'}`}>
                  {isPos ? '+' : '−'} {fmt(Math.abs(b.total_profit))}
                </div>
                <div className="brand-margin">{margin}% margin</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard({ showToast }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboardStats()
      .then(setData)
      .catch(() => showToast('Failed to load dashboard', 'err'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><span className="spin" />Loading dashboard…</div>;
  if (!data)   return <div className="loading">Failed to load data.</div>;

  const winRate   = data.sold > 0 ? ((data.profit_count / data.sold) * 100).toFixed(0) : '0';
  const chg       = data.last_month > 0
    ? `${data.this_month >= data.last_month ? '▲' : '▼'} ${Math.abs(((data.this_month - data.last_month) / data.last_month) * 100).toFixed(0)}% vs last month`
    : 'First month';

  return (
    <>
      {/* ── KPI Cards ── */}
      <div className="kpi-grid">
        <KpiCard num={data.income}      prefix="LKR " label="Total Income"    icon="fa-coins"         accent="#22c55e"              delay={0}   tag={`From ${data.sold} vehicle sales`}                      tagColor="var(--t3)" />
        <KpiCard num={data.this_month}  prefix="LKR " label="This Month"      icon="fa-calendar-alt"  accent="var(--r)"             delay={70}  tag={chg}                                                    tagColor={data.this_month >= data.last_month ? 'var(--g)' : 'var(--rl)'} />
        <KpiCard num={data.total_sales} prefix="LKR " label="Total Revenue"   icon="fa-chart-line"    accent="rgba(255,255,255,.4)" delay={140} tag="Gross turnover"                                         tagColor="var(--t3)" />
        <KpiCard num={data.sold}                      label="Total Sold"       icon="fa-circle-check"  accent="var(--g)"             delay={210} tag={`${data.profit_count} profit · ${data.loss_count} loss`} tagColor="var(--t3)" />
        <KpiCard num={data.inhand}                    label="In Hand"          icon="fa-warehouse"     accent="var(--rl)"            delay={280} tag={`Cost LKR ${fmt(data.inhand_cost)}`}                   tagColor="var(--t3)" />
        <KpiCard num={data.onway}                     label="On The Way"       icon="fa-ship"          accent="rgba(255,255,255,.3)" delay={350} tag="In transit from Japan"                                  tagColor="var(--t3)" />
      </div>

      {/* ── Monthly Target ── */}
      <TargetSection
        target={data.target}
        thisMonth={data.this_month}
        thisMonthCount={data.this_month_count}
      />

      {/* ── Inventory Aging HUD ── */}
      <AgingPanel aging={data.aging} navigate={navigate} />

      {/* ── Monthly Chart ── */}
      <MonthlyChart
        monthly={data.monthly}
        thisMonth={data.this_month}
        lastMonth={data.last_month}
        avgMonthly={data.avg_monthly}
        winRate={winRate}
        profitCount={data.profit_count}
        lossCount={data.loss_count}
      />

      {/* ── Recent Sales + Brands ── */}
      <div className="dash-split">
        <div className="card">
          <div className="card-header">
            <h3>RECENT SALES</h3>
            <button className="btn-primary" onClick={() => navigate('/vehicles', { state: { tab: 'profit' } })}>
              <i className="fa fa-arrow-right" /> Full Report
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>#</th><th>Type</th><th>Brand</th><th>Model</th>
                <th>Sell Price</th><th>Cost</th><th>Income</th><th>Date</th>
              </tr></thead>
              <tbody>
                {data.recent && data.recent.length > 0 ? data.recent.map(r => (
                  <tr key={r.no}>
                    <td><strong>{r.no}</strong></td>
                    <td><span className={`badge ${r.type === 'LOCAL' ? 'b-local' : 'b-import'}`}>{r.type}</span></td>
                    <td><strong>{r.brand}</strong></td>
                    <td>{r.model}</td>
                    <td className="amt">{fmt(r.sell_price)}</td>
                    <td className="amt">{fmt(r.cost)}</td>
                    <td>{r.income == null ? '—' : (
                      <span className={`badge ${parseFloat(r.income) < 0 ? 'b-loss' : 'b-profit'}`}>
                        {parseFloat(r.income) < 0 ? '− ' : '+ '}{fmt(Math.abs(r.income))}
                      </span>
                    )}</td>
                    <td>{fmtD(r.sell_date)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="8" className="empty">No sales yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <BrandList brands={data.brands} navigate={navigate} />
      </div>
    </>
  );
}

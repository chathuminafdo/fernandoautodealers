import { db } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { getVehicles } from './vehicleService';

const sum = (arr, key) => arr.reduce((s, v) => s + (parseFloat(v[key]) || 0), 0);
const count = (arr, ...filters) => filters.reduce((a, [k, val]) => a.filter(v => v[k] === val), arr).length;

const monthKey = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

export const getDashboardStats = async () => {
  /* ── date helpers (needed before Promise.all for target key) ── */
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastDate     = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}`;
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [vehiclesSnap, messagesSnap, priceRequestsSnap, meetingsSnap, targetSnap] = await Promise.all([
    getDocs(collection(db, 'vehicles')),
    getDocs(query(collection(db, 'messages'), where('is_read', '==', false))),
    getDocs(query(collection(db, 'priceRequests'), where('status', '==', 'pending'))),
    getDocs(query(collection(db, 'meetings'), where('status', '==', 'pending'))),
    getDoc(doc(db, 'targets', thisMonthKey)),
  ]);

  const vehicles = vehiclesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const sold    = vehicles.filter(v => v.status === 'SOLD');
  const inhand  = vehicles.filter(v => v.status === 'IN HAND');
  const onway   = vehicles.filter(v => v.status === 'ON THE WAY');
  const localSold  = sold.filter(v => v.type === 'LOCAL');
  const importSold = sold.filter(v => v.type === 'IMPORT');

  const soldWithIncome   = sold.filter(v => v.income != null);
  const profitVehicles   = sold.filter(v => (v.income || 0) > 0);
  const lossVehicles     = sold.filter(v => (v.income || 0) < 0);

  const incomes   = soldWithIncome.map(v => parseFloat(v.income) || 0);
  const income    = incomes.reduce((s, v) => s + v, 0);
  const best      = incomes.length ? Math.max(...incomes) : 0;
  const worst     = incomes.length ? Math.min(...incomes) : 0;
  const avg_profit = incomes.length ? income / incomes.length : 0;

  const inhandCost = inhand.reduce((s, v) => {
    const tt = v.tt_lkr || 0, lc = v.lc_lkr || 0, du = v.duty || 0, ot = v.others || 0, co = v.cost || 0;
    return s + ((tt + lc + du + ot) > 0 ? (tt + lc + du + ot) : co);
  }, 0);

  /* ── inventory aging (uses clear_date = arrival date) ── */
  const agingVehicles = inhand.map(v => {
    const refDate = v.clear_date;
    const days    = refDate ? Math.floor((now - new Date(refDate)) / 86400000) : null;
    return { id: v.id, brand: v.brand, model: v.model, no: v.no, days };
  });
  const ageFresh = agingVehicles.filter(v => v.days != null && v.days < 30).length;
  const age30    = agingVehicles.filter(v => v.days != null && v.days >= 30 && v.days < 60).length;
  const age60    = agingVehicles.filter(v => v.days != null && v.days >= 60 && v.days < 90).length;
  const age90    = agingVehicles.filter(v => v.days != null && v.days >= 90).length;
  const agingTop = agingVehicles.filter(v => v.days != null).sort((a, b) => b.days - a.days).slice(0, 5);

  /* ── this month ── */
  const this_month       = sum(sold.filter(v => monthKey(v.sell_date) === thisMonthKey), 'income');
  const last_month       = sum(sold.filter(v => monthKey(v.sell_date) === lastMonthKey), 'income');
  const this_month_count = sold.filter(v => monthKey(v.sell_date) === thisMonthKey).length;

  /* ── monthly chart data ── */
  const monthlyMap = {};
  sold.filter(v => v.sell_date && v.income != null && new Date(v.sell_date) >= twelveMonthsAgo)
    .forEach(v => {
      const mk = monthKey(v.sell_date);
      if (!monthlyMap[mk]) monthlyMap[mk] = { month_key: mk, month_label: monthLabel(v.sell_date), count: 0, profit: 0, revenue: 0 };
      monthlyMap[mk].count++;
      monthlyMap[mk].profit  += parseFloat(v.income) || 0;
      monthlyMap[mk].revenue += parseFloat(v.sell_price) || 0;
    });
  const monthly = Object.values(monthlyMap).sort((a, b) => a.month_key.localeCompare(b.month_key));

  const monthlyIncomes = Object.values(monthlyMap).map(m => m.profit);
  const avg_monthly    = monthlyIncomes.length ? monthlyIncomes.reduce((s, v) => s + v, 0) / monthlyIncomes.length : 0;

  /* ── brand breakdown ── */
  const brandMap = {};
  vehicles.forEach(v => {
    if (!brandMap[v.brand]) brandMap[v.brand] = { brand: v.brand, total: 0, sold: 0, inhand: 0, onway: 0, total_sales: 0, total_cost: 0, total_profit: 0, profit_count: 0, loss_count: 0 };
    brandMap[v.brand].total++;
    if (v.status === 'SOLD') {
      brandMap[v.brand].sold++;
      brandMap[v.brand].total_sales  += parseFloat(v.sell_price) || 0;
      brandMap[v.brand].total_cost   += parseFloat(v.cost) || 0;
      brandMap[v.brand].total_profit += parseFloat(v.income) || 0;
      if ((v.income || 0) > 0) brandMap[v.brand].profit_count++;
      if ((v.income || 0) < 0) brandMap[v.brand].loss_count++;
    }
    if (v.status === 'IN HAND')    brandMap[v.brand].inhand++;
    if (v.status === 'ON THE WAY') brandMap[v.brand].onway++;
  });
  const brands = Object.values(brandMap).sort((a, b) => b.total - a.total);

  /* ── recent sales ── */
  const recent = sold
    .filter(v => v.sell_date)
    .sort((a, b) => new Date(b.sell_date) - new Date(a.sell_date))
    .slice(0, 8)
    .map(v => ({ no: v.no, brand: v.brand, model: v.model, type: v.type, sell_price: v.sell_price, cost: v.cost, income: v.income, sell_date: v.sell_date, contact: v.contact }));

  const bestVehicle = soldWithIncome.length ? soldWithIncome.reduce((a, b) => (a.income > b.income ? a : b)) : null;
  const topBrand    = brands.length ? brands.reduce((a, b) => (a.total_profit > b.total_profit ? a : b)) : null;

  return {
    total: vehicles.length,
    sold: sold.length,
    inhand: inhand.length,
    onway: onway.length,
    local_sold: localSold.length,
    import_sold: importSold.length,
    income,
    total_sales: sum(sold, 'sell_price'),
    total_cost:  sum(sold, 'cost'),
    local_income:  sum(localSold,  'income'),
    import_income: sum(importSold, 'income'),
    best, worst, avg_profit,
    profit_count: profitVehicles.length,
    loss_count:   lossVehicles.length,
    best_v:    bestVehicle ? { brand: bestVehicle.brand, model: bestVehicle.model, income: bestVehicle.income } : null,
    top_brand: topBrand    ? { brand: topBrand.brand, tot: topBrand.total_profit } : null,
    inhand_cost: inhandCost,
    msgs:  messagesSnap.size,
    prs:   priceRequestsSnap.size,
    meets: meetingsSnap.size,
    brands, recent, monthly,
    this_month, last_month, avg_monthly,
    this_month_count,
    target: targetSnap.exists() ? targetSnap.data() : null,
    aging: { fresh: ageFresh, d30: age30, d60: age60, d90: age90, top: agingTop },
  };
};

export const getProfitReport = async (search = '', sortCol = 'no', sortDir = 'asc') => {
  const all = await getVehicles();
  let data = all.filter(v => v.status === 'SOLD' && v.income != null);

  if (search) {
    const q = search.toLowerCase();
    data = data.filter(v =>
      (v.brand   || '').toLowerCase().includes(q) ||
      (v.model   || '').toLowerCase().includes(q) ||
      (v.chassis || '').toLowerCase().includes(q) ||
      (v.contact || '').toLowerCase().includes(q)
    );
  }

  const allowed = ['no', 'brand', 'model', 'income', 'sell_price', 'cost', 'sell_date'];
  const col = allowed.includes(sortCol) ? sortCol : 'no';
  data.sort((a, b) => {
    const av = a[col] ?? '', bv = b[col] ?? '';
    const res = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === 'desc' ? -res : res;
  });

  const totals = {
    total_income: sum(data, 'income'),
    total_cost:   sum(data, 'cost'),
    total_sales:  sum(data, 'sell_price'),
    best:  data.length ? Math.max(...data.map(v => parseFloat(v.income) || 0)) : 0,
    worst: data.length ? Math.min(...data.map(v => parseFloat(v.income) || 0)) : 0,
    count: data.length,
  };

  return { data, totals };
};

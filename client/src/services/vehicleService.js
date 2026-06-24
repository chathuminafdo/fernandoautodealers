import { db, storage } from '../firebase';
import {
  collection, addDoc, getDocs, getDoc, doc,
  updateDoc, deleteDoc, query, orderBy, where, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const COL = 'vehicles';

const toNum = v => (v !== undefined && v !== null && v !== '' ? parseFloat(v) : null);

export const getVehicles = async () => {
  const q = query(collection(db, COL), orderBy('no', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getVehicle = async (id) => {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getNextNo = async () => {
  const snap = await getDocs(collection(db, COL));
  if (snap.empty) return 1;
  const max = Math.max(...snap.docs.map(d => d.data().no || 0));
  return max + 1;
};

const uploadPdf = async (file, vehicleId, tag) => {
  const pdfRef = ref(storage, `vehicles/${vehicleId}_${tag}_${Date.now()}.pdf`);
  await uploadBytes(pdfRef, file);
  return getDownloadURL(pdfRef);
};

const basePayload = (data) => {
  const cost = toNum(data.cost);
  const sell = toNum(data.sell_price);
  const income = toNum(data.income) ?? (cost && sell ? sell - cost : null);
  return {
    status: data.status || null,
    type: data.type || null,
    brand: data.brand,
    model: data.model,
    year: data.year || null,
    engine_num: data.engine_num || null,
    model_code: data.model_code || null,
    origin: data.origin || null,
    fuel_type: data.fuel_type || null,
    chassis: data.chassis || null,
    colour: data.colour || null,
    mileage: data.mileage || null,
    grade: data.grade || null,
    lc_date: data.lc_date || null,
    lc_num: data.lc_num || null,
    tt_lkr: toNum(data.tt_lkr),
    lc_lkr: toNum(data.lc_lkr),
    duty: toNum(data.duty),
    others: toNum(data.others),
    cusdec: data.cusdec || null,
    clear_date: data.clear_date || null,
    cost,
    sell_date: data.sell_date || null,
    sell_price: sell,
    income,
    contact: data.contact || null,
    customer_name: data.customer_name || null,
    buyer_address: data.buyer_address || null,
    reg_status: data.reg_status || 'UNREGISTERED',
    reg_num: data.reg_num || null,
    payment_type: data.payment_type || null,
    advance_amount: toNum(data.advance_amount),
    advance_date: data.advance_date || null,
    vehicle_price: toNum(data.vehicle_price),
    rmv_fee: toNum(data.rmv_fee),
    lease_amount: toNum(data.lease_amount),
    cash_amount: toNum(data.cash_amount),
    notes: data.notes || null,
    staff: data.staff || null,
  };
};

export const createVehicle = async (data, lcPdfFile = null, cusdecPdfFile = null) => {
  if (data.chassis) {
    const dupSnap = await getDocs(query(collection(db, COL), where('chassis', '==', data.chassis)));
    if (!dupSnap.empty) {
      const ex = dupSnap.docs[0].data();
      throw new Error(`Chassis ${data.chassis} already exists — Vehicle #${ex.no} (${ex.brand} ${ex.model})`);
    }
  }
  const no = await getNextNo();
  const docRef = await addDoc(collection(db, COL), {
    no,
    ...basePayload(data),
    lc_pdf_url: null,
    cusdec_pdf_url: null,
    imageUrl: null,
    createdAt: serverTimestamp(),
  });

  const updates = {};
  if (lcPdfFile)     updates.lc_pdf_url     = await uploadPdf(lcPdfFile,     docRef.id, 'lc');
  if (cusdecPdfFile) updates.cusdec_pdf_url = await uploadPdf(cusdecPdfFile, docRef.id, 'cusdec');
  if (Object.keys(updates).length) await updateDoc(docRef, updates);

  return { id: docRef.id, no };
};

export const updateVehicle = async (id, data, lcPdfFile = null, cusdecPdfFile = null) => {
  const payload = basePayload(data);

  if (lcPdfFile)     payload.lc_pdf_url     = await uploadPdf(lcPdfFile,     id, 'lc');
  if (cusdecPdfFile) payload.cusdec_pdf_url = await uploadPdf(cusdecPdfFile, id, 'cusdec');

  await updateDoc(doc(db, COL, id), payload);
};

export const sellVehicle = async (id, {
  sell_price, sell_date, contact, customer_name, reg_status, reg_num,
  payment_type, advance_amount, advance_date,
  buyer_address, vehicle_price, rmv_fee, lease_amount, cash_amount,
  staff,
}) => {
  const vehicle = await getVehicle(id);
  if (!vehicle) throw new Error('Vehicle not found');

  const sell = parseFloat(sell_price);
  const tt = vehicle.tt_lkr || 0;
  const lc = vehicle.lc_lkr || 0;
  const du = vehicle.duty || 0;
  const ot = vehicle.others || 0;
  const co = vehicle.cost || 0;
  const finalCost = (tt + lc + du + ot) > 0 ? (tt + lc + du + ot) : co;

  const isAdvance = payment_type === 'ADVANCE';
  const income = isAdvance ? null : (finalCost && sell ? sell - finalCost : null);

  const update = {
    sell_price: sell,
    sell_date: sell_date || null,
    contact: contact || null,
    customer_name: customer_name || null,
    reg_status: reg_status || 'UNREGISTERED',
    reg_num: reg_num || null,
    payment_type: payment_type || 'FULL',
    buyer_address: buyer_address || null,
    vehicle_price: parseFloat(vehicle_price) || null,
    rmv_fee: parseFloat(rmv_fee) || null,
    lease_amount: parseFloat(lease_amount) || null,
    cash_amount: parseFloat(cash_amount) || null,
    staff: staff || null,
  };

  if (isAdvance) {
    update.advance_amount = parseFloat(advance_amount) || null;
    update.advance_date = advance_date || sell_date || null;
    // status stays IN HAND
  } else {
    update.status = 'SOLD';
    update.income = income;
  }

  await updateDoc(doc(db, COL, id), update);
  return income;
};

export const completeAdvanceSale = async (id, { final_date } = {}) => {
  const vehicle = await getVehicle(id);
  if (!vehicle) throw new Error('Vehicle not found');

  const sell = vehicle.sell_price || 0;
  const tt = vehicle.tt_lkr || 0;
  const lc = vehicle.lc_lkr || 0;
  const du = vehicle.duty   || 0;
  const ot = vehicle.others || 0;
  const co = vehicle.cost   || 0;
  const finalCost = (tt + lc + du + ot) > 0 ? (tt + lc + du + ot) : co;
  const income = finalCost && sell ? sell - finalCost : null;

  await updateDoc(doc(db, COL, id), {
    status: 'SOLD',
    income,
    sell_date: final_date || vehicle.sell_date || null,
  });

  return income;
};

export const deleteVehicle = async (id) => {
  await deleteDoc(doc(db, COL, id));
};

const COL_MAP = {
  status: 'status', type: 'type', brand: 'brand', model: 'model',
  year: 'year', chassis: 'chassis', 'chassis no': 'chassis',
  colour: 'colour', color: 'colour', mileage: 'mileage', grade: 'grade',
  'lc date': 'lc_date', 'lc-date': 'lc_date', lcdate: 'lc_date',
  'lc number': 'lc_num', 'lc no': 'lc_num', 'lc num': 'lc_num', lc_num: 'lc_num', lcnum: 'lc_num',
  'tt lkr': 'tt_lkr', tt: 'tt_lkr', tt_lkr: 'tt_lkr', ttlkr: 'tt_lkr',
  'lc lkr': 'lc_lkr', lc_lkr: 'lc_lkr', lclkr: 'lc_lkr',
  duty: 'duty', others: 'others', cusdec: 'cusdec',
  'clear date': 'clear_date', 'clearing date': 'clear_date', clear_date: 'clear_date',
  cost: 'cost', 'sell date': 'sell_date', 'selling date': 'sell_date', sell_date: 'sell_date',
  'sell price': 'sell_price', 'selling price': 'sell_price', sell_price: 'sell_price',
  income: 'income', contact: 'contact', notes: 'notes',
};

const normalizeDate = (v) => {
  if (!v) return null;
  if (typeof v === 'number') {
    // Excel serial date
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().split('T')[0];
  }
  const s = String(v).trim();
  if (!s) return null;
  // dd/mm/yyyy
  const dm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dm) return `${dm[3].length === 2 ? '20' + dm[3] : dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
  return s;
};

// ---- Cost sync ----

export const updateVehicleCost = async (vehicleId, cost) => {
  await updateDoc(doc(db, COL, vehicleId), { cost: cost || null });
};

// ---- Expense Ledger (sub-collection) ----

export const getExpenses = async (vehicleId) => {
  const q = query(collection(db, COL, vehicleId, 'expenses'), orderBy('date', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addExpense = async (vehicleId, data) => {
  const docRef = await addDoc(collection(db, COL, vehicleId, 'expenses'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateExpense = async (vehicleId, expenseId, updates) => {
  await updateDoc(doc(db, COL, vehicleId, 'expenses', expenseId), updates);
};

export const deleteExpense = async (vehicleId, expenseId) => {
  await deleteDoc(doc(db, COL, vehicleId, 'expenses', expenseId));
};

export const bulkCreateVehicles = async (rows, onProgress) => {
  let nextNo = await getNextNo();
  let done = 0;
  const errors = [];

  for (const raw of rows) {
    const data = {};
    for (const [k, v] of Object.entries(raw)) {
      const key = COL_MAP[k.toLowerCase().trim()];
      if (key) data[key] = v;
    }
    if (!data.brand || !data.model) { errors.push(`Row ${nextNo}: missing brand/model — skipped`); done++; onProgress?.(done, rows.length); continue; }

    const cost = toNum(data.cost);
    const sell = toNum(data.sell_price);
    const income = toNum(data.income) ?? (cost && sell ? sell - cost : null);

    try {
      await addDoc(collection(db, COL), {
        no: nextNo++,
        status: data.status || null,
        type: data.type || null,
        brand: data.brand,
        model: data.model,
        year: data.year || null,
        chassis: data.chassis || null,
        colour: data.colour || null,
        mileage: data.mileage || null,
        grade: data.grade || null,
        lc_date: normalizeDate(data.lc_date),
        lc_num: data.lc_num || null,
        tt_lkr: toNum(data.tt_lkr),
        lc_lkr: toNum(data.lc_lkr),
        duty: toNum(data.duty),
        others: toNum(data.others),
        cusdec: data.cusdec || null,
        clear_date: normalizeDate(data.clear_date),
        cost,
        sell_date: normalizeDate(data.sell_date),
        sell_price: sell,
        income,
        contact: data.contact || null,
        notes: data.notes || null,
        imageUrl: null,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      errors.push(`Row ${nextNo - 1}: ${e.message}`);
    }
    done++;
    onProgress?.(done, rows.length);
  }
  return errors;
};

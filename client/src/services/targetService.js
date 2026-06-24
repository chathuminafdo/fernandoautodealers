import { db } from '../firebase';
import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore';

const key = (y, m) => `${y}-${String(m).padStart(2, '0')}`;

export const getTarget = async (year, month) => {
  const snap = await getDoc(doc(db, 'targets', key(year, month)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const setTarget = async (year, month, profitTarget, unitsTarget) => {
  await setDoc(doc(db, 'targets', key(year, month)), {
    year: Number(year),
    month: Number(month),
    profit_target: Number(profitTarget) || 0,
    units_target: Number(unitsTarget) || 0,
    updated: new Date().toISOString(),
  });
};

export const getAllTargets = async () => {
  const snap = await getDocs(collection(db, 'targets'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => b.id.localeCompare(a.id));
};

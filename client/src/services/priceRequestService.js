import { db } from '../firebase';
import {
  collection, getDocs, doc, addDoc,
  updateDoc, deleteDoc, query, orderBy, serverTimestamp
} from 'firebase/firestore';

const COL = 'priceRequests';

export const getPriceRequests = async () => {
  const q = query(collection(db, COL), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createPriceRequest = async (data) => {
  return addDoc(collection(db, COL), {
    ...data,
    status: 'pending',
    created_at: serverTimestamp()
  });
};

export const updatePriceRequest = async (id, data) => {
  await updateDoc(doc(db, COL, id), { ...data, updated_at: new Date().toISOString() });
};

export const updatePriceRequestStatus = async (id, status) => {
  await updateDoc(doc(db, COL, id), { status, updated_at: new Date().toISOString() });
};

export const deletePriceRequest = async (id) => {
  await deleteDoc(doc(db, COL, id));
};

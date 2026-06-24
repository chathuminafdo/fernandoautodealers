import { db } from '../firebase';
import {
  collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, query, orderBy, serverTimestamp,
} from 'firebase/firestore';

const COL = 'businessExpenses';

export const EXPENSE_CATS = [
  'Rent', 'Salaries', 'Utilities', 'Marketing', 'Transport',
  'Maintenance', 'Insurance', 'Bank Charges', 'Communication', 'Other',
];

export const CAT_COLORS = {
  Rent: '#e53935', Salaries: '#ef5350', Utilities: '#3b82f6',
  Marketing: '#8b5cf6', Transport: '#f59e0b', Maintenance: '#f97316',
  Insurance: '#22c55e', 'Bank Charges': '#06b6d4', Communication: '#ec4899', Other: '#94a3b8',
};

export const getBusinessExpenses = async () => {
  const q = query(collection(db, COL), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addBusinessExpense = async (data) => {
  const ref = await addDoc(collection(db, COL), {
    date: data.date,
    category: data.category,
    description: data.description || '',
    amount: parseFloat(data.amount) || 0,
    reference: data.reference || '',
    pdf_url: data.pdf_url || null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateBusinessExpense = async (id, data) => {
  await updateDoc(doc(db, COL, id), {
    date: data.date,
    category: data.category,
    description: data.description || '',
    amount: parseFloat(data.amount) || 0,
    reference: data.reference || '',
    pdf_url: data.pdf_url ?? null,
  });
};

export const deleteBusinessExpense = async (id) => {
  await deleteDoc(doc(db, COL, id));
};

export const updateExpensePdf = async (id, pdfUrl) => {
  await updateDoc(doc(db, COL, id), { pdf_url: pdfUrl });
};

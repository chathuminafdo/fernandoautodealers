import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCKm800UExbE0Qc09vPkhi6-uFBSDwq4qE",
  authDomain: "fernando-auto-dealers.firebaseapp.com",
  projectId: "fernando-auto-dealers",
  storageBucket: "fernando-auto-dealers.firebasestorage.app",
  messagingSenderId: "277282668411",
  appId: "1:277282668411:web:279a863e6eb6365dcbc7de",
  measurementId: "G-5GQC8QQ55E",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// We won't use analytics server-side for now to avoid errors

const firebaseConfig = {
    apiKey: "AIzaSyDLFlFsH_6RKqZwxxN_Dkaj-MFTdS9Mmn8",
    authDomain: "minuta-f75a4.firebaseapp.com",
    projectId: "minuta-f75a4",
    storageBucket: "minuta-f75a4.firebasestorage.app",
    messagingSenderId: "643064542850",
    appId: "1:643064542850:web:e629b56f030f98d885e69b",
    measurementId: "G-S7EKEJFDQV"
};

// Initialize Firebase (Singleton pattern to avoid re-initialization errors in Next.js hot reload)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});
const auth = getAuth(app);

export { db, auth };

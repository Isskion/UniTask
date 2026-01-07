import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// We won't use analytics server-side for now to avoid errors

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

console.log("🔥 Firebase Config Loaded:", {
    apiKey: firebaseConfig.apiKey ? "SET" : "MISSING",
    projectId: firebaseConfig.projectId ? "SET" : "MISSING",
    env: process.env.NODE_ENV
});

// Initialize Firebase (Singleton pattern to avoid re-initialization errors in Next.js hot reload)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});
const auth = getAuth(app);

export { db, auth };

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
// We won't use analytics server-side for now to avoid errors

const cleanEnvVar = (val: string | undefined): string | undefined => {
    if (!val) return val;
    // Remove quotes that might have been added in .env.local
    return val.replace(/^["']|["']$/g, '').trim();
};

const firebaseConfig = {
    apiKey: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    authDomain: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    appId: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
    measurementId: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID)
};

console.log("🔥 [Firebase] Configuration Status:", {
    apiKey: firebaseConfig.apiKey ? "PRESENT" : "MISSING",
    projectId: firebaseConfig.projectId || "UNKNOWN",
    env: process.env.NODE_ENV,
    isLocal: typeof window !== 'undefined' ? window.location.hostname === 'localhost' : 'server'
});

// Initialize Firebase (Singleton pattern to avoid re-initialization errors in Next.js hot reload)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore (Singleton pattern)
// Use try-catch: initializeFirestore can only be called once per app.
// On Next.js hot reloads or when the module is re-imported, fall back to getFirestore.
let db: Firestore;
try {
    db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        localCache: typeof window !== 'undefined'
            ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
            : undefined
    });
} catch {
    // Already initialized — reuse existing instance
    db = getFirestore(app);
}
const auth = getAuth(app);
const storage = getStorage(app);
import { getFunctions } from "firebase/functions";
const functions = getFunctions(app, "europe-west1"); // Match deployed function region

export { app, db, auth, storage, functions };

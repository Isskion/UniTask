import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore, connectFirestoreEmulator } from "firebase/firestore";

const cleanEnvVar = (val: string | undefined, isDomain: boolean = false): string | undefined => {
    if (!val) return val;
    // Remove quotes and any trailing hidden characters/spaces
    let cleaned = val.replace(/^["']|["']$/g, '').trim();
    // Strip protocols if it's a domain/bucket (e.g. https://domain.firebaseapp.com -> domain.firebaseapp.com)
    if (isDomain) {
        cleaned = cleaned.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }
    return cleaned;
};

const firebaseConfig = {
    apiKey: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    authDomain: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, true),
    projectId: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, true),
    messagingSenderId: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    appId: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
    measurementId: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID)
};

console.log("🔥 [Firebase] Configuration Status:", {
    projectId: firebaseConfig.projectId || "UNKNOWN",
    authDomain: firebaseConfig.authDomain || "UNKNOWN",
    apiKeyPrefix: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 7)}...` : "MISSING",
    env: process.env.NODE_ENV,
    isLocal: typeof window !== 'undefined' ? window.location.hostname === 'localhost' : 'server',
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
const functions = getFunctions(app, "europe-west1"); // Match deployed function region

// --- EMULATOR SUPPORT ---
if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
    console.log("🛠️ [Firebase] Connecting to EMULATORS (localhost)...");
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "localhost", 8080);
    connectStorageEmulator(storage, "localhost", 9199);
    connectFunctionsEmulator(functions, "localhost", 5001);
}

export { app, db, auth, storage, functions };

import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore - TS doesn't find the export but it works in react-native at runtime
import { initializeAuth, getReactNativePersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let app: any = null;
let auth: any = null;
let db: any = null;
let firebaseInitialized = false;
let initError: string | null = null;

try {
  if (!firebaseConfig.apiKey) {
    throw new Error("Missing EXPO_PUBLIC_FIREBASE_API_KEY environment variable. Check your .env file.");
  }
  
  // Initialize Firebase App
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

  // Initialize Firebase Auth with React Native / Web Persistence
  auth = initializeAuth(app, {
    persistence: Platform.OS === 'web'
      ? browserLocalPersistence
      : (typeof getReactNativePersistence === 'function'
          ? getReactNativePersistence(AsyncStorage)
          : undefined)
  });

  // Initialize Firestore
  db = getFirestore(app);
  firebaseInitialized = true;
} catch (error: any) {
  console.error("Firebase initialization failed:", error);
  initError = error?.message || String(error);
}

export { app, auth, db, firebaseInitialized, initError };



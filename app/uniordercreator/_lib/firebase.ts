"use client";
/**
 * Firebase Configuration — Singleton initialization
 *
 * This file initializes Firebase once and exports the Firestore instance.
 * All Firebase env vars use the NEXT_PUBLIC_ prefix so they are available client-side.
 *
 * SETUP: Copy `.env.example` to `.env.local` and fill in your Firebase credentials.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Check if Firebase is properly configured.
 * Returns false when env vars are missing (e.g. dev without Firebase).
 */
export function isFirebaseConfigured(): boolean {
    return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
}

// Lazy singleton — only initialize when actually needed
let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;

function getApp(): FirebaseApp {
    if (!_app) {
        if (!isFirebaseConfigured()) {
            throw new Error(
                'Firebase not configured. Copy .env.example to .env.local and add your Firebase credentials.'
            );
        }
        _app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    }
    return _app;
}

/**
 * Get Firestore instance — lazy initialized.
 * Throws if Firebase is not configured.
 */
export function getDb(): Firestore {
    if (!_db) {
        _db = getFirestore(getApp());
    }
    return _db;
}

"use client";
/**
 * Firebase Configuration — Reuses UniTask's main Firebase instance
 *
 * Instead of initializing a separate Firebase app (which competes for
 * Firestore leases and causes timeouts), this module reuses the
 * already-initialized Firebase app from the main UniTask application.
 */

import { getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Check if Firebase is properly configured (any app is already initialized).
 */
export function isFirebaseConfigured(): boolean {
    return getApps().length > 0;
}

// Lazy singleton
let _db: Firestore | null = null;

/**
 * Get Firestore instance — reuses the already-initialized Firebase app from UniTask.
 * Throws if no Firebase app is initialized.
 */
export function getDb(): Firestore {
    if (!_db) {
        const apps = getApps();
        if (apps.length === 0) {
            throw new Error(
                'Firebase no inicializado. El módulo UniOrderManager requiere que UniTask tenga Firebase configurado.'
            );
        }
        _db = getFirestore(apps[0] as FirebaseApp);
    }
    return _db;
}

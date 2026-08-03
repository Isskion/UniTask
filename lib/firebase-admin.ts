import "server-only";

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// NOTE: In standard production, you would use a Service Account Key (JSON).
// For simplicity/security in this specific Vercel/Local setup, we might rely on 
// Application Default Credentials (if deployed on GCP) or basic initialization
// assuming the environment has GOOGLE_APPLICATION_CREDENTIALS set.
// HOWEVER, for this specific user task with minimal setup, 
// we generally need a service account. 
// IF running locally on a machine with `gcloud auth application-default login` run, 
// no args are needed. If not, we need credentials.
//
// For now, let's try default init. If it fails, we'll ask user for Service Account JSON.
//
// UPDATE: Since this is "Minuta" project, and user likely doesn't have the JSON handy,
// we'll try to rely on the existing client config? No, Admin SDK needs Service Account.
//
// Wait. To generate password reset links, we need `manage users` permission.
// Standard `firebase-admin` requires a Service Account. 
//
// Let's assume for a moment the user might NOT have a service account JSON ready.
//
// FOR NOW, we'll implement the shell. User might need to provide SERVICE_ACCOUNT key later.

// Parse Service Account from Environment Variable
const serviceAccount = (() => {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) return undefined;
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.client_email && parsed.private_key) {
            return parsed;
        }
        return undefined;
    } catch (e) {
        // Attempt to clean up common copy-paste errors (newline chars)
        try {
            // Replace invalid control characters with escaped versions
            // This handles cases where .env has literal newlines inside the JSON string
            const sanitized = raw.replace(/\n/g, "\\n").replace(/\r/g, "");
            const parsed = JSON.parse(sanitized);
            if (parsed && typeof parsed === 'object' && parsed.client_email && parsed.private_key) {
                return parsed;
            }
            return undefined;
        } catch (e2) {
            console.error("CRITICAL: Failed to parse FIREBASE_SERVICE_ACCOUNT.", e2);
            return undefined;
        }
    }
})();

const firebaseAdminConfig = {
    credential: serviceAccount ? cert(serviceAccount) : undefined,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

// Singleton
let adminAuth: ReturnType<typeof getAuth>;
let adminDb: ReturnType<typeof getFirestore>;
let adminStorage: ReturnType<typeof getStorage>;

try {
    const adminApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseAdminConfig);
    adminAuth = getAuth(adminApp);
    adminDb = getFirestore(adminApp);
    adminStorage = getStorage(adminApp);
} catch (e) {
    console.warn("WARNING: firebase-admin failed to initialize at startup. This is expected during build time if env variables are empty.", e);
    // Provide dummy/proxy objects to prevent immediate destructuring/null reference crashes at runtime imports
    adminAuth = {} as any;
    adminDb = {
        collection: () => ({
            doc: () => ({
                get: async () => ({ exists: false, data: () => ({}) })
            })
        })
    } as any;
    adminStorage = {} as any;
}

export { adminAuth, adminDb, adminStorage };

import "server-only";

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

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
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : undefined;

const firebaseAdminConfig = {
    credential: serviceAccount ? cert(serviceAccount) : undefined,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

// Singleton
const adminApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseAdminConfig);
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

export { adminAuth, adminDb };

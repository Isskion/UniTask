
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const serviceAccountPath = resolve(__dirname, '../serviceAccountKey.json');
if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({ credential: cert(serviceAccount) });
} else {
    initializeApp({ projectId: 'minuta-f75a4' });
}

const auth = getAuth();
const db = getFirestore();

async function fixUser() {
    const email = "daniel.delamo@unigis.com"; // Assuming .com, user said @unigis
    console.log(`Fixing user: ${email}...`);

    let userRecord;
    try {
        userRecord = await auth.getUserByEmail(email);
        console.log(`Auth User found: ${userRecord.uid}`);
    } catch (e) {
        console.log("User not found in Auth. Creating...");
        userRecord = await auth.createUser({
            email: email,
            emailVerified: true,
            password: "password123", // Temporary password if new
            displayName: "Daniel Delamo"
        });
        console.log(`Created Auth User: ${userRecord.uid}`);
    }

    // Set Claims
    const claims = {
        role: "app_admin",
        roleLevel: 80, // App Admin
        tenantId: "2", // Mockup Tenant
        isActive: true
    };
    await auth.setCustomUserClaims(userRecord.uid, claims);
    console.log("Set Custom Claims:", claims);

    // Create/Update Firestore Profile
    await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: email,
        displayName: "Daniel Delamo",
        role: "app_admin",
        roleLevel: 80,
        tenantId: "2",
        isActive: true,
        photoURL: "",
        createdAt: new Date(),
        updatedAt: new Date()
    }, { merge: true });

    console.log("Firestore Profile Updated.");
    console.log("=== DONE ===");
}

fixUser().catch(console.error);

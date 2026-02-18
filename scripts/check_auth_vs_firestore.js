
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Parse Service Account
const raw = envConfig.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
    console.error("❌ FIREBASE_SERVICE_ACCOUNT not found in .env.local");
    process.exit(1);
}

let serviceAccount;
try {
    const sanitized = raw.replace(/\n/g, "\\n").replace(/\r/g, "");
    serviceAccount = JSON.parse(sanitized);
} catch (e) {
    console.error("❌ Failed to parse service account JSON", e);
    process.exit(1);
}

console.log(`🔑 Using Service Account (Project: ${serviceAccount.project_id})`);

const app = initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore(app);
const auth = getAuth(app);

async function inspectUser() {
    const uid = "6C9ZN0mfngNb5glAWw1EMSaQcRR2";
    console.log(`\n🔍 INSPECTING USER: ${uid}\n`);

    // 1. Check Authentication
    try {
        const userRecord = await auth.getUser(uid);
        console.log(`✅ [AUTH] Found User!`);
        console.log(`   - Email: ${userRecord.email}`);
        console.log(`   - Display Name: ${userRecord.displayName}`);
        console.log(`   - Disabled: ${userRecord.disabled}`);
        console.log(`   - Created: ${userRecord.metadata.creationTime}`);
        console.log(`   - Last Sign-in: ${userRecord.metadata.lastSignInTime}`);
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.log(`❌ [AUTH] User NOT FOUND in Authentication.`);
        } else {
            console.error(`⚠️ [AUTH] Error checking Auth:`, error);
        }
    }

    // 2. Check Firestore
    try {
        const docRef = db.collection('users').doc(uid);
        const doc = await docRef.get();

        if (doc.exists) {
            console.log(`✅ [FIRESTORE] Found Document!`);
            console.log(`   - Path: ${docRef.path}`);
            console.log(`   - Data:`, JSON.stringify(doc.data(), null, 2));
        } else {
            console.log(`❌ [FIRESTORE] Document NOT FOUND.`);
        }
    } catch (error) {
        console.error(`⚠️ [FIRESTORE] Error checking Firestore:`, error);
    }
}

inspectUser();

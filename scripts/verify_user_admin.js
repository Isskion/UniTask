
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
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

console.log(`🔑 Using Service Account from .env.local (Project: ${serviceAccount.project_id})`);

const app = initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function verifyUser() {
    const uid = "6C9ZN0mfngNb5glAWw1EMSaQcRR2";
    console.log(`Checking user: ${uid}`);

    try {
        const docRef = db.collection('users').doc(uid);
        const doc = await docRef.get();

        if (doc.exists) {
            console.log('✅ User document EXISTS.');
            console.log('Data:', JSON.stringify(doc.data(), null, 2));
        } else {
            console.log('❌ User document DOES NOT EXIST.');
            // List all users to see if we are crazy
            console.log("Listing first 5 users to verify connection:");
            const snap = await db.collection('users').limit(5).get();
            snap.forEach(d => console.log(` - ${d.id}`));
        }
    } catch (error) {
        console.error('Error fetching user:', error);
    }
}

verifyUser();

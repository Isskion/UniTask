
const admin = require('firebase-admin');
const { resolve } = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: resolve(__dirname, '../.env.local') });

if (!admin.apps.length) {
    try {
        const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (serviceAccountRaw) {
            const serviceAccount = JSON.parse(serviceAccountRaw);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp({ projectId: "minuta-f75a4" });
        }
    } catch (e) {
        admin.initializeApp({ projectId: "minuta-f75a4" });
    }
}

const db = admin.firestore();
const auth = admin.auth();

async function compare(uid) {
    console.log(`Comparing for UID: ${uid}`);
    const doc = await db.collection('users').doc(uid).get();
    const data = doc.data();
    const user = await auth.getUser(uid);

    console.log('--- Firestore Profile ---');
    console.log(JSON.stringify(data, null, 2));
    console.log('--- Auth Claims ---');
    console.log(JSON.stringify(user.customClaims, null, 2));
}

compare('spXyzUi0NUZXRlqUOrMep8').catch(console.error);

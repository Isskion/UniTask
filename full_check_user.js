const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const dotEnvPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(dotEnvPath, 'utf8');
const serviceAccountMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT='(.*?)'/);
const serviceAccount = JSON.parse(serviceAccountMatch[1]);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const auth = admin.auth();

async function checkUser(email) {
    const results = { email, auth: {}, firestore: [] };

    // Auth Check
    try {
        const userRecord = await auth.getUserByEmail(email);
        results.auth = {
            uid: userRecord.uid,
            customClaims: userRecord.customClaims || {}
        };
    } catch (e) {
        results.auth = { error: e.message };
    }

    // Firestore Check
    try {
        const snap = await db.collection('users').where('email', '==', email).get();
        snap.forEach(doc => {
            results.firestore.push({ id: doc.id, ...doc.data() });
        });
    } catch (e) {
        results.firestore_error = e.message;
    }

    fs.writeFileSync('argoss_full.json', JSON.stringify(results, null, 2));
    console.log("Results written to argoss_full.json");
}

checkUser('argoss01@gmail.com').catch(console.error);

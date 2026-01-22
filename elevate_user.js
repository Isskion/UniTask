const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const dotEnvPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(dotEnvPath, 'utf8');
const serviceAccountMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT='(.*?)'/);
const serviceAccount = JSON.parse(serviceAccountMatch[1]);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function elevateUser() {
    const email = 'daniel.delamo@unigis.com';
    const snap = await db.collection('users').where('email', '==', email).get();
    if (snap.empty) {
        console.log(`User ${email} not found.`);
        return;
    }
    const batch = db.batch();
    snap.forEach(doc => {
        console.log(`Elevating User: ${email} (${doc.id})`);
        batch.update(doc.ref, {
            role: 'superadmin',
            roleLevel: 100
        });
    });
    await batch.commit();
    console.log("Elevation complete.");
}

elevateUser().catch(console.error);

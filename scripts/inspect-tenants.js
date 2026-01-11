const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function listTenants() {
    console.log(`\n🔍 Listing Tenants...`);
    try {
        const snap = await db.collection('tenants').get();
        if (snap.empty) {
            console.log("❌ No tenants found.");
            return;
        }

        snap.forEach(doc => {
            const d = doc.data();
            console.log(`\n[${doc.id}] ${d.name}`);
            console.log(` - code: ${d.code}`);
            console.log(` - isActive: ${d.isActive}`);
        });

    } catch (e) {
        console.error("Error:", e);
    }
}

listTenants();

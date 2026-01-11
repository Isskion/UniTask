const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function listTenants() {
    console.log('\n🔍 Listing Tenants from Firestore (Admin SDK)...');
    try {
        const snap = await db.collection('tenants').get();
        if (snap.empty) {
            console.log('❌ No tenants found in collection "tenants"');
        } else {
            console.log(`✅ Found ${snap.size} tenants:`);
            snap.forEach(doc => {
                const d = doc.data();
                console.log(` - [${doc.id}] ${d.name} (Code: ${d.code || 'N/A'}, Active: ${d.isActive})`);
            });
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

listTenants();

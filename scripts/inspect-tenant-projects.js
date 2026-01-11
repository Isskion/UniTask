const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const TENANT_ID = "4"; // Fliping

async function inspect() {
    console.log(`\n🔍 Inspecting Projects for Tenant: ${TENANT_ID}`);
    try {
        const q = db.collection('projects').where('tenantId', '==', TENANT_ID);
        const snap = await q.get();

        if (snap.empty) {
            console.log("❌ No projects found for this tenant.");
            return;
        }

        snap.forEach(doc => {
            const d = doc.data();
            console.log(`\n[${doc.id}] ${d.name}`);
            console.log(` - isActive: ${d.isActive} (${typeof d.isActive})`);
            console.log(` - status: "${d.status}"`);
            console.log(` - tenantId: "${d.tenantId}"`);
        });

    } catch (e) {
        console.error("Error:", e);
    }
}

inspect();

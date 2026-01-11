const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function listUsers() {
    console.log(`\n🔍 Listing Users...`);
    try {
        const snap = await db.collection('users').get();
        if (snap.empty) {
            console.log("❌ No users found.");
            return;
        }

        snap.forEach(doc => {
            const d = doc.data();
            console.log(`\n[${doc.id}] ${d.displayName || d.email}`);
            console.log(` - email: ${d.email}`);
            console.log(` - role: ${d.role} (number)`);
            console.log(` - tenantId: ${d.tenantId}`);
            console.log(` - assignedProjectIds: ${JSON.stringify(d.assignedProjectIds)}`);
        });

    } catch (e) {
        console.error("Error:", e);
    }
}

listUsers();

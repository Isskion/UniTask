const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

async function count() {
    console.log("Counting tasks for Tenant 1...");
    const snap = await db.collection('tasks')
        .where('tenantId', '==', '1')
        .where('title', '>=', '[MOCK]')
        .where('title', '<=', '[MOCK]\uf8ff')
        .get();

    console.log(`Found ${snap.size} mock tasks.`);
}

count().catch(console.error);

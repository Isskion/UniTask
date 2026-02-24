const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function listTenant3Projects() {
    const snapshot = await db.collection('projects')
        .where('tenantId', '==', '3')
        .get();

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`T3|${doc.id}|${data.name}|${data.code}`);
    });
}

listTenant3Projects().catch(console.error);

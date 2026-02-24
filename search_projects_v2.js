const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function listAllProjects() {
    const snapshot = await db.collection('projects').get();
    snapshot.forEach(doc => {
        const data = doc.data();
        const name = (data.name || '').toLowerCase();
        const code = (data.code || '').toLowerCase();
        if (name.includes('logi') || name.includes('time') || code.includes('lgf') || code.includes('ont')) {
            console.log(`FOUND|${doc.id}|${data.name}|${data.code}|${data.tenantId}`);
        }
    });
}

listAllProjects().catch(console.error);

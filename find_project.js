const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function listProjects() {
    const snapshot = await db.collection('projects').get();
    snapshot.forEach(doc => {
        const data = doc.data();
        const allValues = Object.values(data).map(v => String(v).toLowerCase()).join(' ');
        if (allValues.includes('logi') || allValues.includes('time')) {
            console.log(`FOUND|${doc.id}|${data.name}|${data.tenantId}`);
        }
    });
}

listProjects().catch(console.error);

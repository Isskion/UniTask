const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function deepSearch() {
    const snapshot = await db.collection('projects').get();
    snapshot.forEach(doc => {
        const data = doc.data();
        const str = JSON.stringify(data).toLowerCase();
        if (str.includes('logi') || str.includes('ontime')) {
            console.log(`FOUND|${doc.id}|${data.name}|${data.tenantId}`);
        }
    });
}

deepSearch().catch(console.error);

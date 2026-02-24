const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function listT3() {
    const snapshot = await db.collection('projects')
        .where('tenantId', '==', '3')
        .get();

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`ID:${doc.id} | NAME:${data.name} | CODE:${data.code}`);
    });
}

listT3().catch(console.error);

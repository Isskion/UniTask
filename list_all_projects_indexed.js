const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function listAll() {
    const snapshot = await db.collection('projects').get();
    let count = 0;
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`${count}: ${doc.id} | ${data.name} | ${data.tenantId}`);
        count++;
    });
}

listAll().catch(console.error);

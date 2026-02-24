const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function listAlphabetical() {
    const snapshot = await db.collection('projects').get();
    const names = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, tenantId: doc.data().tenantId }));
    names.sort((a, b) => a.name.localeCompare(b.name));

    names.forEach((p, i) => {
        console.log(`${i}: ${p.id} | ${p.name} | ${p.tenantId}`);
    });
}

listAlphabetical().catch(console.error);

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function printMapping() {
    const snapshot = await db.collection('projects').get();
    const projects = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, tenantId: doc.data().tenantId }));

    const folders = ['Delgado', 'Logifrio', 'Luis simoes', 'OnTime', 'SMSA', 'Spar', 'Transpais'];

    folders.forEach(folder => {
        const match = projects.find(p => p.name.toLowerCase().includes(folder.toLowerCase()));
        if (match) {
            console.log(`MAP|${folder}|${match.id}|${match.tenantId}|${match.name}`);
        } else {
            console.log(`MISSING|${folder}`);
        }
    });
}

printMapping().catch(console.error);

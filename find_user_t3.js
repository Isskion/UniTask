const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function findUser() {
    const snapshot = await db.collection('users')
        .where('tenantId', '==', '3')
        .limit(1)
        .get();

    if (snapshot.empty) {
        console.log('No user found for tenant 3');
        return;
    }

    snapshot.forEach(doc => {
        console.log(`User ID: ${doc.id}`);
    });
}

findUser().catch(console.error);

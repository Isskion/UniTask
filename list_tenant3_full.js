
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function listTenant3GroupsFull() {
    console.log("--- FULL GROUP LIST TENANT 3 ---");
    const snapshot = await db.collection('permission_groups').where('tenantId', '==', '3').get();

    if (snapshot.empty) {
        console.log("No groups found.");
    } else {
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`ID: ${doc.id}`);
            console.log(`Name: ${data.name}`);
            console.log(`Description: ${data.description}`);
            console.log(`Updated: ${data.updatedAt?.toDate()}`);
            console.log("---------------------------------------------------");
        });
    }
}

listTenant3GroupsFull();

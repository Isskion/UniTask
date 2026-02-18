const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkMissingIds() {
    console.log("Checking for tasks with missing friendlyId...");
    const snapshot = await db.collection('tasks').get();

    let count = 0;
    snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.friendlyId || data.friendlyId === 'Generando...' || data.friendlyId === 'Generando ID...') {
            console.log(`Task ${doc.id} missing friendlyId. CreatedAt: ${data.createdAt ? data.createdAt.toDate() : 'Unknown'}`);
            count++;
        }
    });

    console.log(`Found ${count} tasks with missing friendlyId.`);
}

checkMissingIds().catch(console.error);

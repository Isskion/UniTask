const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkTask() {
    console.log("Searching for task SAL-260201...");
    // Try code
    let snapshot = await db.collection('tasks').where('code', '==', 'SAL-260201').get();

    if (snapshot.empty) {
        console.log("Not found by code. Searching all tasks...");
        // Maybe it's ID?
        const doc = await db.collection('tasks').doc('SAL-260201').get();
        if (doc.exists) {
            console.log("Found by ID!");
            console.log(JSON.stringify(doc.data(), null, 2));
        } else {
            console.log("Task not found.");
        }
    } else {
        console.log(`Found ${snapshot.size} task(s) by code:`);
        snapshot.forEach(doc => {
            console.log(`ID: ${doc.id}`);
            console.log(JSON.stringify(doc.data(), null, 2));
        });
    }
}

checkTask().catch(console.error);

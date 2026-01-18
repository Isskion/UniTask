const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey-prod.json');

// Initialize App
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkTasks() {
    const tenantId = '1';
    console.log(`Checking tasks for tenantId: ${tenantId} in Production...`);

    const snapshot = await db.collection('tasks')
        .where('tenantId', '==', tenantId)
        .where('isActive', '==', true)
        .get();

    console.log(`✅ Active Tasks Found: ${snapshot.size}`);

    if (snapshot.size > 0) {
        console.log("Sample Task:");
        console.log(JSON.stringify(snapshot.docs[0].data(), null, 2));
    } else {
        console.log("⚠️ No active tasks found. This explains why the dashboard is empty.");
    }
}

checkTasks();

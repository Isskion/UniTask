const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
    console.log("Fetching 10 most recent tasks...");
    const tasks = await db.collection('tasks')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

    if (tasks.empty) {
        console.log("No tasks found.");
    } else {
        console.log(`Found ${tasks.size} tasks:`);
        tasks.forEach(doc => {
            const t = doc.data();
            console.log(`\nID: ${doc.id}`);
            console.log(`Code: ${t.code}`);
            console.log(`Title: ${t.title}`);
            console.log(`TenantId: ${t.tenantId}`);
            console.log(`ProjectId: ${t.projectId}`);
            console.log(`CreatedAt: ${t.createdAt ? t.createdAt.toDate() : 'N/A'}`);
        });
    }
}

check().catch(console.error);

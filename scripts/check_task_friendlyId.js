const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
    console.log("Searching for task with friendlyId 'SAL-260201'...");

    // Check if friendlyId is indexed? If not, we might need to list all or use specific query.
    // It should be indexed by default for single field.
    const tasks = await db.collection('tasks').where('friendlyId', '==', 'SAL-260201').get();

    if (tasks.empty) {
        console.log("Task not found by friendlyId.");
    } else {
        console.log(`Found ${tasks.size} task(s):`);
        tasks.forEach(doc => {
            const t = doc.data();
            console.log(`ID: ${doc.id}`);
            console.log(`Title: ${t.title}`);
            console.log(`FriendlyId: ${t.friendlyId}`);
            console.log(`TenantId: ${t.tenantId} (Type: ${typeof t.tenantId})`);
            console.log(`ProjectId: ${t.projectId}`);
            console.log(`CreatedBy: ${t.createdBy}`);
            console.log(`CreatedAt: ${t.createdAt ? t.createdAt.toDate() : 'N/A'}`);
        });
    }
}

check().catch(console.error);

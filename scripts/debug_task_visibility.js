const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function analyze() {
    console.log("Analyzing Task TSP-260118 Visibility Flags...");

    let task = null;
    // Try by Friendly ID
    const snapshot = await db.collection('tasks').where('friendlyId', '==', 'TSP-260118').get();
    if (!snapshot.empty) {
        task = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }

    if (!task) {
        console.log("❌ Task NOT FOUND.");
        return;
    }

    console.log(`\n--- TASK DATA ---`);
    console.log(`ID: ${task.id}`);
    console.log(`Friendly ID: ${task.friendlyId}`);
    console.log(`Status: ${task.status}`);
    console.log(`isActive: ${task.isActive} (Type: ${typeof task.isActive})`);
    console.log(`tenantId: ${task.tenantId}`);
    console.log(`projectId: ${task.projectId}`);
    console.log(`sprintId: ${task.sprintId}`);

    console.log(`\n--- VISIBILITY CHECK ---`);
    if (task.isActive !== true) {
        console.log("⚠️ VISIBILITY BLOCKER: 'isActive' is not true. Sprint Board filters for 'isActive == true'.");
    }

    if (task.status === 'completed') {
        console.log("⚠️ VISIBILITY BLOCKER: 'status' is 'completed'. Backlog filters out completed tasks.");
    }

    if (task.sprintId) {
        console.log("⚠️ VISIBILITY BLOCKER: 'sprintId' is set. It will appear in the Sprint column, not Backlog.");
    }
}

analyze().catch(console.error);

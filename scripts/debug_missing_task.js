const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function analyze() {
    console.log("Analyzing Task TSP-260118 and Sprint 5...");

    // 1. Find the Task (by friendlyId or ID)
    let task = null;

    // Try by ID first
    let docRef = await db.collection('tasks').doc('TSP-260118').get();
    if (docRef.exists) {
        task = { id: docRef.id, ...docRef.data() };
        console.log("Found task by Document ID.");
    } else {
        // Try by friendlyId
        const snapshot = await db.collection('tasks').where('friendlyId', '==', 'TSP-260118').get();
        if (!snapshot.empty) {
            task = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
            console.log("Found task by friendlyId.");
        }
    }

    if (!task) {
        console.log("❌ Task TSP-260118 NOT FOUND in 'tasks' collection.");
        return;
    }

    console.log("\n--- TASK DETAILS ---");
    console.log(`ID: ${task.id}`);
    console.log(`Friendly ID: ${task.friendlyId}`);
    console.log(`Title: ${task.title}`);
    console.log(`Sprint ID: ${task.sprintId || 'NULL'}`);
    console.log(`Status: ${task.status}`);
    console.log(`Is Active: ${task.isActive}`);
    console.log(`Tenant ID: ${task.tenantId}`);
    console.log(`Project ID: ${task.projectId}`);

    // 2. Find Sprint 5
    console.log("\n--- SPRINT SEARCH ---");
    // Try to find a sprint named "Sprint 5" or similar
    const sprintsSnap = await db.collection('sprints').get();
    const sprints = sprintsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const sprint5 = sprints.find(s => s.name.toLowerCase().includes('sprint 5') || s.name.toLowerCase().includes('sprint 5'));

    if (sprint5) {
        console.log(`Found Sprint: "${sprint5.name}" (ID: ${sprint5.id})`);
        console.log(`Status: ${sprint5.status}`);

        // Analysis
        console.log("\n--- ANALYSIS ---");
        if (task.sprintId === sprint5.id) {
            console.log("✅ Match: Task.sprintId matches Sprint ID.");
        } else {
            console.log(`❌ Mismatch: Task.sprintId is "${task.sprintId}" but Sprint ID is "${sprint5.id}".`);
        }
    } else {
        console.log("⚠️ Could not find a sprint named 'Sprint 5'. Listing all active/planning sprints:");
        sprints.filter(s => s.status === 'active' || s.status === 'planning').forEach(s => {
            console.log(`- ${s.name} (ID: ${s.id})`);
        });
    }
}

analyze().catch(console.error);

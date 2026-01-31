const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function analyze() {
    console.log("Analyzing Task TSP-260118...");

    // 1. Find the Task
    let task = null;
    const snapshot = await db.collection('tasks').where('friendlyId', '==', 'TSP-260118').get();
    if (!snapshot.empty) {
        task = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    } else {
        // Try ID
        const doc = await db.collection('tasks').doc('TSP-260118').get();
        if (doc.exists) task = { id: doc.id, ...doc.data() };
    }

    if (!task) {
        console.log("❌ Task NOT FOUND.");
        return;
    }

    console.log(`Task ID: ${task.id}`);
    console.log(`SprintID on Task: ${task.sprintId}`);
    console.log(`Status: ${task.status}`);

    // 2. Find Sprint
    console.log("\nSearching for 'Sprint W5'...");
    const sprintsSnap = await db.collection('sprints').get();
    const sprint = sprintsSnap.docs.find(d => d.data().name.includes('W5'));

    if (sprint) {
        console.log(`Found 'Sprint W5' ID: ${sprint.id}`);
        if (task.sprintId === sprint.id) {
            console.log("✅ MATCH: Task is assigned to this sprint.");
        } else {
            console.log("❌ MISMATCH: Task is NOT assigned to this sprint.");
        }
    } else {
        console.log("Could not find Sprint W5.");
    }
}

analyze().catch(console.error);

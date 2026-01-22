const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin initialized with Service Account.");
    } catch (e) {
        console.error("❌ Firebase Admin initialization failed:", e.message);
        process.exit(1);
    }
}

const db = admin.firestore();

async function deleteMockData() {
    console.log("🚀 Deleting Mock Data...");

    try {
        const mockProjectId = 'mock-project';

        // 1. Delete Tasks from Mock Project
        console.log(`\n--- DELETING TASKS FOR PROJECT: ${mockProjectId} ---`);
        const tasksSnap = await db.collection('tasks').where('projectId', '==', mockProjectId).get();

        if (tasksSnap.empty) { // Changed from snapshot.empty to tasksSnap.empty
            console.log("ℹ️ No tasks found for mock project.");
        } else {
            const batch = db.batch();
            tasksSnap.docs.forEach(doc => { // Changed from snapshot.docs to tasksSnap.docs
                console.log(`🗑️ Deleting Task: ${doc.id} | Title: ${doc.data().title}`);
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`✅ Deleted ${tasksSnap.size} tasks.`); // Changed from snapshot.size to tasksSnap.size
        }

        // 2. Delete the Project itself
        console.log(`\n--- DELETING PROJECT: ${mockProjectId} ---`);
        await db.collection('projects').doc(mockProjectId).delete();
        console.log(`✅ Deleted Project: ${mockProjectId}`);

        // 3. Search for other tasks with "mock" in title just in case
        console.log("\n--- SEARCHING FOR OTHER MOCK TASKS ---");
        const otherTasksSnap = await db.collection('tasks').get();
        const otherBatch = db.batch();
        let otherCount = 0;

        otherTasksSnap.forEach(doc => {
            const data = doc.data();
            if ((data.title && data.title.toLowerCase().includes('mock')) ||
                (data.description && data.description.toLowerCase().includes('mock'))) {
                console.log(`🗑️ Deleting Unlinked Mock Task: ${doc.id} | Title: ${data.title}`);
                otherBatch.delete(doc.ref);
                otherCount++;
            }
        });

        if (otherCount > 0) {
            await otherBatch.commit();
            console.log(`✅ Deleted ${otherCount} additional mock tasks.`);
        }

    } catch (error) {
        console.error("❌ Error deleting mock data:", error);
    }
}

deleteMockData();

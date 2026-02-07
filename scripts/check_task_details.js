const admin = require("firebase-admin");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
const fs = require('fs');

if (!admin.apps.length) {
    try {
        const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp({
                credential: admin.credential.applicationDefault()
            });
        }
    } catch (e) {
        process.exit(1);
    }
}

const db = admin.firestore();

async function checkTask() {
    const taskId = "xNC6mWuTL6e0J87Vb665";
    console.log(`Checking Task: ${taskId}`);

    const doc = await db.collection('tasks').doc(taskId).get();
    if (!doc.exists) {
        console.log("Task not found.");
        return;
    }

    const data = doc.data();
    console.log(`Title: ${data.title}`);
    console.log(`SprintID: ${data.sprintId}`);
    console.log(`Status: ${data.status}`);
    console.log(`NeedsRollover: ${data.needsRollover}`);

    if (data.updatedAt) {
        const date = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
        console.log(`UpdatedAt: ${date.toISOString()}`);
    } else {
        console.log("UpdatedAt: N/A");
    }
}

checkTask().catch(console.error);

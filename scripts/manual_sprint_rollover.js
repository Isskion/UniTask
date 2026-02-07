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

async function manualRollover() {
    const targetSprintId = "rv4o2aNcyMQ1LGNqI6ZI";
    const logFile = path.join(__dirname, "tasks_status.txt");
    fs.writeFileSync(logFile, `Tasks for Sprint ${targetSprintId}:\n\n`);

    const tasksRef = db.collection('tasks');
    const tasksSnapshot = await tasksRef
        .where('sprintId', '==', targetSprintId)
        .get();

    if (tasksSnapshot.empty) {
        fs.appendFileSync(logFile, "No tasks found in this sprint.\n");
        return;
    }

    fs.appendFileSync(logFile, `Found ${tasksSnapshot.size} total tasks.\n`);

    let movedCount = 0;
    const batch = db.batch();

    tasksSnapshot.forEach(doc => {
        const task = doc.data();
        fs.appendFileSync(logFile, `TASK: ${task.title} (Status: ${task.status})\n`);

        if (task.status !== 'completed' && task.status !== 'done') {
            const ref = tasksRef.doc(doc.id);
            batch.update(ref, {
                sprintId: null,      // Back to backlog
                status: 'pending',   // Reset status
                needsRollover: null, // Clear flag
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            fs.appendFileSync(logFile, `-> Mark for move: ${task.title}\n`);
            movedCount++;
        }
    });

    if (movedCount > 0) {
        await batch.commit();
        fs.appendFileSync(logFile, `\n✅ Successfully moved ${movedCount} tasks to Backlog.\n`);
    } else {
        fs.appendFileSync(logFile, "\nNo incomplete tasks found to move.\n");
    }
    console.log("Done. Check tasks_status.txt");
}

manualRollover().catch(console.error);

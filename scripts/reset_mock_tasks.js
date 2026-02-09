
const admin = require('firebase-admin');
const { resolve } = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: resolve(__dirname, '../.env.local') });

if (!admin.apps.length) {
    try {
        const serviceAccountPath = resolve(__dirname, '../serviceAccountKey.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp({ projectId: "minuta-f75a4" });
        }
    } catch (e) {
        admin.initializeApp({ projectId: "minuta-f75a4" });
    }
}

const db = admin.firestore();

async function resetTasks() {
    const PROJECT_ID = "mockup-product-2026";
    console.log(`Resetting Tasks for Project: ${PROJECT_ID} to 'pending'...`);

    try {
        const tasksSnap = await db.collection('tasks').where('projectId', '==', PROJECT_ID).get();

        if (tasksSnap.empty) {
            console.log("❌ No tasks found.");
            return;
        }

        const batch = db.batch();
        let count = 0;

        tasksSnap.forEach(doc => {
            batch.update(doc.ref, {
                status: 'pending',
                closedAt: null,
                closedBy: null
            });
            count++;
        });

        if (count > 0) {
            await batch.commit();
            console.log(`✅ Successfully reset ${count} tasks to 'pending'.`);
        } else {
            console.log("✅ No tasks needed updating.");
        }

    } catch (err) {
        console.error('Error', err);
    }
}

resetTasks();

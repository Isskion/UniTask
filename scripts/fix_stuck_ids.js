const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load environment config
const dotEnvPath = path.join(__dirname, '..', '.env.local');
let serviceAccount;

try {
    const envContent = fs.readFileSync(dotEnvPath, 'utf8');
    // Match FIREBASE_SERVICE_ACCOUNT="..." or '...' or just ...
    // Using a more robust regex to capture the JSON content
    const serviceAccountMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT=["']?(\{.*\})["']?/);
    if (serviceAccountMatch) {
        serviceAccount = JSON.parse(serviceAccountMatch[1]);
    } else {
        console.error("Could not find FIREBASE_SERVICE_ACCOUNT in .env.local");
        process.exit(1);
    }
} catch (e) {
    console.error("Error reading .env.local:", e);
    // Fallback?
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixStuckIds() {
    console.log("Searching for tasks stuck in 'Generando ID...' state...");

    // Query for tasks that might be stuck
    // Note: 'friendlyId' being null or "Generando ID..."
    // Firestore queries are limited, so we might need to fetch and filter
    const snapshot = await db.collection('tasks').orderBy('createdAt', 'desc').limit(50).get();

    let fixedCount = 0;

    for (const doc of snapshot.docs) {
        const taskData = doc.data();
        const taskId = doc.id;

        const isStuck = !taskData.friendlyId ||
            taskData.friendlyId === 'Generando ID...' ||
            taskData.friendlyId === 'Generando...' ||
            taskData.friendlyId.startsWith('Generando');

        if (isStuck) {
            console.log(`\nFound stuck task: ${taskId} | Title: ${taskData.title}`);

            if (!taskData.projectId) {
                console.warn(`  > Skipping: No projectId found.`);
                continue;
            }

            // --- GENERATION LOGIC ---
            try {
                // 1. Get Project Code
                const projectDoc = await db.collection("projects").doc(taskData.projectId).get();
                let projectCode = "TSK";
                if (projectDoc.exists) {
                    const pData = projectDoc.data();
                    if (pData && pData.code) {
                        projectCode = pData.code.toUpperCase();
                    }
                }

                // 2. Date Components
                // Use createdAt date if possible to keep historical accuracy, otherwise now
                const dateBasis = taskData.createdAt ? taskData.createdAt.toDate() : new Date();
                const yearStr = dateBasis.getFullYear().toString().slice(-2);
                const monthStr = (dateBasis.getMonth() + 1).toString().padStart(2, "0");
                const datePrefix = `${yearStr}${monthStr}`;

                // 3. Transaction
                const counterRef = db.collection("counters").doc(`${taskData.projectId}_${datePrefix}`);

                const newSequence = await db.runTransaction(async (transaction) => {
                    const counterDoc = await transaction.get(counterRef);
                    let currentCount = 0;

                    if (counterDoc.exists) {
                        const d = counterDoc.data();
                        currentCount = d ? (d.count || 0) : 0;
                    } else {
                        transaction.set(counterRef, { count: 0 });
                    }

                    const nextCount = currentCount + 1;
                    transaction.update(counterRef, { count: nextCount });
                    return nextCount;
                });

                // 4. Format ID
                const sequenceStr = newSequence.toString().padStart(2, "0");
                const newFriendlyId = `${projectCode}-${datePrefix}${sequenceStr}`;

                console.log(`  > Generated New ID: ${newFriendlyId}`);

                // 5. Update Task
                await db.collection('tasks').doc(taskId).update({
                    friendlyId: newFriendlyId,
                    projectCode: projectCode,
                    smartIdGenerated: true,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                console.log(`  > Updated successfully.`);
                fixedCount++;

            } catch (err) {
                console.error(`  > Error generating ID:`, err);
            }
        }
    }

    console.log(`\nProcess complete. Fixed ${fixedCount} tasks.`);
}

fixStuckIds().catch(console.error);

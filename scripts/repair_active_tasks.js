const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function repair() {
    console.log("Starting Task Visibility Repair...");

    // Tasks usually have an ID, title, etc.
    // We want to find tasks where isActive is explicitly false OR missing
    // But Firestore query for "missing" is tricky.
    // We'll process in batches.

    const snapshot = await db.collection('tasks').get();
    let count = 0;
    let fixed = 0;

    console.log(`Scanned ${snapshot.size} total tasks.`);

    const batchSize = 400; // conservative batch
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();

        // LOGIC: If isActive is NOT true, set it to true.
        // EXCEPTION: Only if it looks like a real task. 
        // If we had a mechanism for Soft Delete using 'isActive: false', we'd need to be careful.
        // The user asked to "actualiza las tareas a true donde esten inactivas".
        // Assuming 'isActive' is strictly for visibility filter and not deletion in this context unless 'isDeleted' exists?
        // Checking codebase from memory: typically 'isActive' IS the soft delete or visibility toggler.
        // But here user specifically says the task is missing from backlog and implies it SHOULD be there.

        // Let's check if it has a 'deleted' flag or similar just in case? 
        // User prompt: "active document: TaskManagement.tsx" -> line 847 uses deleteDoc, so hard delete.
        // So 'isActive' is likely just a visibility/archival flag.

        if (data.isActive !== true) {
            console.log(`Fixing Task [${doc.id}] ${data.friendlyId || 'NoID'}: ${data.title} (Current: ${data.isActive})`);

            batch.update(doc.ref, {
                isActive: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            fixed++;
            batchCount++;

            if (batchCount >= batchSize) {
                await batch.commit();
                batch = db.batch();
                batchCount = 0;
                console.log("committed batch...");
            }
        }
        count++;
    }

    if (batchCount > 0) {
        await batch.commit();
    }

    console.log(`\nRepair Complete.`);
    console.log(`Total Tasks Scanned: ${count}`);
    console.log(`Total Tasks Fixed: ${fixed}`);
}

repair().catch(console.error);

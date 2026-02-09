
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

async function fixTasks() {
    const PROJECT_ID = "mockup-product-2026";
    const TARGET_TENANT = "2"; // Valid Tenant ID

    console.log(`Fixing Project & Tasks: ${PROJECT_ID} -> Target Tenant: ${TARGET_TENANT}`);

    try {
        const batch = db.batch();
        let opsCount = 0;

        // 1. Fix Project Document
        const projRef = db.collection('projects').doc(PROJECT_ID);
        const projSnap = await projRef.get();
        if (projSnap.exists && projSnap.data().tenantId !== TARGET_TENANT) {
            batch.update(projRef, { tenantId: TARGET_TENANT });
            opsCount++;
            console.log("Buffered update for Project Document.");
        }

        // 2. Fix Tasks
        const tasksSnap = await db.collection('tasks').where('projectId', '==', PROJECT_ID).get();

        if (tasksSnap.empty) {
            console.log("No tasks found for this project.");
        } else {
            console.log(`Found ${tasksSnap.size} tasks.`);
            tasksSnap.forEach(doc => {
                const data = doc.data();
                if (data.tenantId !== TARGET_TENANT) {
                    batch.update(doc.ref, {
                        tenantId: TARGET_TENANT,
                        organizationId: TARGET_TENANT
                    });
                    opsCount++;
                }
            });
        }

        if (opsCount > 0) {
            await batch.commit();
            console.log(`✅ Successfully committed ${opsCount} updates (Project + Tasks) to Tenant ${TARGET_TENANT}`);
        } else {
            console.log("✅ Data is already correct (Tenant 2).");
        }

    } catch (err) {
        console.error('Error', err);
    }
}

fixTasks();

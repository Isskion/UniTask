
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

async function checkTasks() {
    const PROJECT_ID = "mockup-product-2026";
    console.log(`Checking Tasks for Project: ${PROJECT_ID}...`);

    const tasksSnap = await db.collection('tasks').where('projectId', '==', PROJECT_ID).limit(5).get();

    if (tasksSnap.empty) {
        console.log("❌ No tasks found (by projectId query).");
        return;
    }

    console.log(`Found ${tasksSnap.size} sample tasks.`);
    tasksSnap.forEach(t => {
        const data = t.data();
        console.log(`Task ${t.id}:`);
        console.log(`   - isActive: ${data.isActive} (${typeof data.isActive})`);
        console.log(`   - status: ${data.status}`);
        console.log(`   - tenantId: ${data.tenantId}`);
        console.log(`   - createdBy: ${data.createdBy}`);

        if (data.isActive !== true) {
            console.log("   ❌ isActive is NOT explicitly true!");
        }
    });

    console.log("\nQuery Test: tenantId='2' AND isActive=true");
    const qTest = await db.collection('tasks')
        .where('tenantId', '==', '2')
        .where('projectId', '==', PROJECT_ID)
        .where('isActive', '==', true)
        .limit(1)
        .get();

    console.log(`Query Test Result: Found ${qTest.size} tasks.`);
}

checkTasks();

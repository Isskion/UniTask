
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkEntry() {
    const dates = ["2026-01-10", "2025-01-10"]; // check both years just in case user meant 2025
    console.log("Checking Journal Entries for dates:", dates);

    const snapshot = await db.collection('journal_entries').get();

    console.log(`Total entries found: ${snapshot.size}`);

    snapshot.forEach(doc => {
        const data = doc.data();
    });

    console.log("\nChecking RECENT TASKS for Tenant 1...");
    const taskSnap = await db.collection('tasks')
        .where('tenantId', '==', '1')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

    if (taskSnap.empty) {
        console.log("No recent tasks found for Tenant 1.");
    } else {
        taskSnap.forEach(t => {
            const d = t.data();
            console.log(`TASK [Tenant 1]: ${t.id}`);
            console.log(`  - Title: ${d.title}`);
            console.log(`  - WeekId: ${d.weekId}`);
            console.log(`  - CreatedAt: ${d.createdAt ? d.createdAt.toDate().toISOString() : 'N/A'}`);
        });
    }

    console.log("\nChecking TASKS for 2026-01-10 (Week ID match)...");
    // Tasks usually have weekId = YYYY-MM-DD (or tenant_YYYY-MM-DD if updated?)
    // Let's check generally for tasks created recently or matching the date string in weekId
    const taskSnap2 = await db.collection('tasks').get(); // Get all to be safe and filter in memory
    let taskCount = 0;
    taskSnap2.forEach(t => {
        const d = t.data();
        const createdStr = d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt.toString()) : "";
        if ((d.weekId && d.weekId.includes('2026-01-10')) || (createdStr.includes('2010-01-10') /* typo check */)) {
            console.log(`TASK FOUND: ${t.id}`);
            console.log(`  - TenantId: ${d.tenantId}`);
            console.log(`  - ProjectId: ${d.projectId}`);
            console.log(`  - WeekId: ${d.weekId}`);
            console.log(`  - Title: ${d.title}`);
            taskCount++;
        }
        // Also check creation date just in case
        if (createdStr.startsWith('2026-01-10')) {
            console.log(`TASK (by Date) FOUND: ${t.id}`);
            console.log(`  - TenantId: ${d.tenantId}`);
            console.log(`  - Title: ${d.title}`);
            taskCount++;
        }
    });
    console.log(`Total relevant tasks: ${taskCount}`);
}

checkEntry();

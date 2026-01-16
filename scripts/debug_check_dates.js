const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

// Initialize (assuming standard emulator setup)
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
admin.initializeApp({ projectId: 'demo-unitask' });

const db = getFirestore();

async function checkDates() {
    const wrongDate = "2026-01-18";
    const correctDate = "2025-12-18";

    console.log("Checking data...");

    // Check Source
    const wrongDoc = await db.collection('journal_entries').doc(wrongDate).get();

    // Check Target
    const correctDoc = await db.collection('journal_entries').doc(correctDate).get();

    // Check Tasks
    // Assuming tasks are linked via weekId or similar, but checking creation date is a good proxy for recently made errors
    // Or if tasks have 'date' field (depends on schema). Usually they are in subcollections or have date ref.
    // Let's assume standard query by createdAt for the mistaken day.
    const start = new Date('2026-01-18T00:00:00Z');
    const end = new Date('2026-01-18T23:59:59Z');

    const tasksSnapshot = await db.collection('tasks')
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        .get();

    const result = {
        source: {
            date: wrongDate,
            exists: wrongDoc.exists,
            id: wrongDoc.exists ? wrongDoc.id : null,
            data: wrongDoc.exists ? wrongDoc.data() : null
        },
        target: {
            date: correctDate,
            exists: correctDoc.exists,
            id: correctDoc.exists ? correctDoc.id : null,
            data: correctDoc.exists ? correctDoc.data() : null
        },
        tasksFound: tasksSnapshot.size,
        tasks: []
    };

    tasksSnapshot.forEach(t => {
        const d = t.data();
        result.tasks.push({
            id: t.id,
            title: d.title,
            projectId: d.projectId,
            // Safe date conversion
            createdAt: d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt
        });
    });

    fs.writeFileSync('debug_result.json', JSON.stringify(result, null, 2));
    console.log("Done. Written to debug_result.json");
}

checkDates().catch(err => {
    console.error(err);
    fs.writeFileSync('debug_error.log', err.toString());
});

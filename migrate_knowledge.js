
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function migrateEntries() {
    console.log('Starting migration from "lesson_learned" to "solution_record"...');
    const snapshot = await db.collection('knowledge_entries')
        .where('type', '==', 'lesson_learned')
        .get();

    if (snapshot.empty) {
        console.log('No entries to migrate.');
        return;
    }

    console.log(`Found ${snapshot.size} entries. Migrating...`);

    const batch = db.batch();
    snapshot.forEach(doc => {
        const ref = db.collection('knowledge_entries').doc(doc.id);

        // Update type and add a changelog entry for transparency
        const currentData = doc.data();
        const changes = (currentData.changelog || []);
        changes.push({
            userId: 'SYSTEM_MIGRATION',
            userName: 'System Admin',
            timestamp: new Date().toISOString(),
            action: 'updated',
            changes: 'Migrated from Lesson Learned to Solution Record by user request'
        });

        batch.update(ref, {
            type: 'solution_record',
            changelog: changes
        });
    });

    await batch.commit();
    console.log('Migration completed successfully.');
}

migrateEntries().catch(console.error);

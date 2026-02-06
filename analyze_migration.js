
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function analyzeMigration() {
    console.log('Analyzing "lesson_learned" entries for migration...');
    const snapshot = await db.collection('knowledge_entries')
        .where('type', '==', 'lesson_learned')
        .get();

    if (snapshot.empty) {
        console.log('No "lesson_learned" entries found.');
        return;
    }

    console.log(`Found ${snapshot.size} entries to potentially move.`);

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`[${doc.id}] ${data.title} (Created: ${data.createdAt ? data.createdAt.toDate() : 'N/A'})`);
    });
}

analyzeMigration().catch(console.error);

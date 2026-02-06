
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixDuplicates() {
    console.log('Checking for duplicates in knowledge_entries...');
    const snapshot = await db.collection('knowledge_entries').get();

    if (snapshot.empty) {
        console.log('No entries found.');
        return;
    }

    const entries = [];
    snapshot.forEach(doc => {
        entries.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Total entries: ${entries.length}`);

    // Check for duplicates based on title and content
    const duplicates = [];
    const seen = new Map();

    entries.forEach(entry => {
        // Create a signature based on title and key content logic
        // We use type + title + content as unique key
        const signature = `${entry.tenantId}|${entry.type}|${entry.title}|${entry.content}`;

        if (seen.has(signature)) {
            duplicates.push({
                originalId: seen.get(signature),
                duplicateId: entry.id,
                title: entry.title
            });
        } else {
            seen.set(signature, entry.id);
        }
    });

    if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} duplicates. Deleting...`);

        const batch = db.batch();
        duplicates.forEach(d => {
            console.log(`Deleting duplicate ID: ${d.duplicateId} (Original: ${d.originalId}) - Title: ${d.title}`);
            const ref = db.collection('knowledge_entries').doc(d.duplicateId);
            batch.delete(ref);
        });

        await batch.commit();
        console.log('Duplicates deleted successfully.');
    } else {
        console.log('No duplicates found needing deletion.');
    }
}

fixDuplicates().catch(console.error);

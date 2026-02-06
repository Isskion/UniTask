
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkDuplicates() {
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
        // Create a signature based on title and content (and maybe tenantId)
        const signature = `${entry.tenantId}|${entry.type}|${entry.title}|${entry.content}`;

        if (seen.has(signature)) {
            duplicates.push({
                original: seen.get(signature),
                duplicate: entry
            });
        } else {
            seen.set(signature, entry.id);
        }
    });

    if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} POTENTIAL duplicates (same tenant, type, title, and content):`);
        duplicates.forEach((d, index) => {
            console.log(`${index + 1}. Duplicate ID: ${d.duplicate.id} is similar to Original ID: ${d.original}`);
            console.log(`   Title: ${d.duplicate.title}`);
            console.log(`   Created At: ${d.duplicate.createdAt ? d.duplicate.createdAt.toDate() : 'N/A'}`);
        });
    } else {
        console.log('No obvious duplicates found based on title+content matching.');
    }
}

checkDuplicates().catch(console.error);

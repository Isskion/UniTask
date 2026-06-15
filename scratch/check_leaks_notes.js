const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkNotes() {
    console.log('Fetching unileaks_notes...');
    const snapshot = await db.collection('unileaks_notes').get();
    console.log(`Found ${snapshot.size} notes.`);
    
    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.title && data.title.toLowerCase().includes('influencia')) {
            console.log('=== MATCHING NOTE ===');
            console.log('ID:', doc.id);
            console.log('Title:', data.title);
            console.log('Content Keys:', Object.keys(data));
            console.log('Content length:', data.content ? data.content.length : 'undefined');
            console.log('Value of content:', JSON.stringify(data.content));
            console.log('isPublic:', data.isPublic);
            console.log('isInternal:', data.isInternal);
            console.log('folderId:', data.folderId);
            console.log('projectId:', data.projectId);
            console.log('=====================');
        }
    }
}

checkNotes().catch(console.error);

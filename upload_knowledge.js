const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function uploadKnowledge() {
    const knowledgePath = path.join(__dirname, 'knowledge', 'app_map.md');
    try {
        const content = fs.readFileSync(knowledgePath, 'utf8');
        await db.collection('app_config').doc('ai_knowledge').set({
            content: content,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ AI Knowledge (app_map.md) uploaded to Firestore successfully.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error uploading knowledge:', e);
        process.exit(1);
    }
}

uploadKnowledge();

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();
const TARGET_DOC_ID = "draft-1777287458622";

async function fullDump() {
    const doc = await db.collection('uniflux_flows').doc(TARGET_DOC_ID).get();
    const data = doc.data();
    
    console.log("ALL LABELS IN CURRENT DOCUMENT:");
    data.nodes.forEach(n => {
        console.log(`ID: ${n.id} | Type: ${n.type} | Label: ${n.label.substring(0,40)}`);
    });
}
fullDump().catch(console.error);

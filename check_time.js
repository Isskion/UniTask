const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function checkTimestamp() {
    const doc = await db.collection('uniflux_flows').doc("draft-1777287458622").get();
    const data = doc.data();
    console.log("Last Updated At:", data.updatedAt ? data.updatedAt.toDate().toISOString() : "Unknown");
}
checkTimestamp();

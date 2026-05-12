const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const TARGET_DOC_ID = "draft-1777287458622";

async function inspectNodes() {
    const doc = await db.collection('uniflux_flows').doc(TARGET_DOC_ID).get();
    const data = doc.data();
    if (!data) return console.log("No data found.");
    
    console.log("Found", data.nodes.length, "nodes.");
    
    // Inspect text nodes
    const textNodes = data.nodes.filter(n => n.type === 'TEXT');
    console.log("TEXT NODES COUNT:", textNodes.length);
    
    if (textNodes.length > 0) {
        console.log("First text node detailed snapshot:");
        console.log(JSON.stringify(textNodes[0], null, 2));
    }
}

inspectNodes().catch(console.error);

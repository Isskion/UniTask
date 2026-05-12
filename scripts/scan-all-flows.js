const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function scanAllFlows() {
    console.log("🔍 Scanning for ALL iterations of 'Flujo interfaces Intermodal'...");
    const snapshot = await db.collection('uniflux_flows')
        .where('name', '==', 'Flujo interfaces Intermodal')
        .get();

    console.log(`Found ${snapshot.docs.length} documents with this exact name.`);
    
    const results = [];
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const ts = data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : 'Unknown') : 'N/A';
        console.log(`Match: ID=[${doc.id}] Updated=[${ts}] NodesCount=[${data.nodes ? data.nodes.length : 0}]`);
        results.push({id: doc.id, updatedAt: ts, data: data});
    }

    fs.writeFileSync('matching_flows_scan.json', JSON.stringify(results, null, 2));
    console.log("💾 Results saved to matching_flows_scan.json");
    process.exit(0);
}

scanAllFlows().catch(console.error);

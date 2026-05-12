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

async function runDiagnostic() {
    console.log("🚀 Querying most recently modified flows from Firestore...");
    const snapshot = await db.collection('uniflux_flows')
        .orderBy('updatedAt', 'desc')
        .limit(5)
        .get();

    const latestFlows = [];
    for (const doc of snapshot.docs) {
        const data = doc.data();
        // Flatten timestamp objects for readable display
        const ts = data.updatedAt ? data.updatedAt.toDate().toISOString() : 'N/A';
        
        console.log(`Found Flow: ID=[${doc.id}] Name=[${data.name}] Updated=[${ts}] Project=[${data.projectId}]`);
        
        // Now check if it has ANY subcollection snapshots
        const snapsRef = doc.ref.collection('snapshots');
        const snapsSnap = await snapsRef.orderBy('publishedAt', 'desc').get();
        
        const snapshots = [];
        snapsSnap.forEach(s => {
            const sData = s.data();
            const pts = sData.publishedAt ? sData.publishedAt.toDate().toISOString() : 'N/A';
            snapshots.push({
                id: s.id,
                publishedAt: pts,
                version: sData.version,
                data: sData
            });
        });
        
        console.log(`   - Total snapshots found: ${snapshots.length}`);
        
        latestFlows.push({
            id: doc.id,
            name: data.name,
            updatedAt: ts,
            data: data,
            historySnapshots: snapshots
        });
    }

    fs.writeFileSync('recent_flows_diagnostic.json', JSON.stringify(latestFlows, null, 2));
    console.log("\n💾 Full detailed diagnostic dump written to recent_flows_diagnostic.json");
    process.exit(0);
}

runDiagnostic().catch(err => {
    console.error("Fatal Error during diagnostic:", err);
    process.exit(1);
});

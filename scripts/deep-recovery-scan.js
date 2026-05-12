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

async function deepScan() {
    console.log("🔍 Initiating DEEP SCAN for 'Intermodal', 'Maersk', or 'Flujo' in ALL flow documents...");
    
    // Pull all flows from current tenant (tenantId=3) to keep it narrow but complete
    const snapshot = await db.collection('uniflux_flows')
        .where('tenantId', '==', '3')
        .get();

    console.log(`Scanning ${snapshot.docs.length} documents for key metadata match...`);
    
    const results = [];
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const name = data.name || '';
        
        // Check if name contains key parts
        const nameMatch = name.toLowerCase().includes('intermodal') || name.toLowerCase().includes('maersk');
        
        // OR search deep in nodes label just in case the flow had a different name but contains Maersk nodes!
        let labelMatch = false;
        if (data.nodes && Array.isArray(data.nodes)) {
            labelMatch = data.nodes.some(n => n.label && n.label.toLowerCase().includes('maersk'));
        }

        if (nameMatch || labelMatch) {
            const ts = data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : 'Unknown') : 'N/A';
            console.log(`MATCH FOUND: ID=[${doc.id}] Name=[${name}] Updated=[${ts}] HasNodes=${!!data.nodes}`);
            results.push({
                id: doc.id,
                name: name,
                updatedAt: ts,
                data: data
            });
        }
    }

    fs.writeFileSync('deep_match_recovery.json', JSON.stringify(results, null, 2));
    console.log(`💾 Found ${results.length} matches. Detailed records saved to deep_match_recovery.json`);
    process.exit(0);
}

deepScan().catch(console.error);

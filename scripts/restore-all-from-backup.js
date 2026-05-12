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

async function restoreAll() {
    const backupDir = path.join(__dirname, '..', 'backups', 'full_emergency_2026-05-12T13-41-17');
    const consolidatedFile = path.join(backupDir, 'ALL_FLOWS_CONSOLIDATED.json');
    
    if (!fs.existsSync(consolidatedFile)) {
        console.error("❌ No se encontró el archivo de backup consolidado!");
        process.exit(1);
    }

    const allFlows = JSON.parse(fs.readFileSync(consolidatedFile, 'utf8'));
    console.log(`🔄 Restaurando ${allFlows.length} flujos desde backup de las 15:41...`);

    for (const flow of allFlows) {
        const docId = flow.id;
        if (!docId) {
            console.warn("⚠️ Flujo sin ID, saltando...");
            continue;
        }

        // Remove the 'id' field from the data payload (it's the document ID, not a field)
        const { id, ...dataToRestore } = flow;
        
        // Replace updatedAt with server timestamp to mark the restoration
        dataToRestore.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        
        // Remove any stale lock
        delete dataToRestore.lockedBy;

        const docRef = db.collection('uniflux_flows').doc(docId);
        await docRef.set(dataToRestore, { merge: false }); // Full overwrite with backup data
        
        const nodeCount = dataToRestore.nodes ? dataToRestore.nodes.length : 0;
        const edgeCount = dataToRestore.edges ? dataToRestore.edges.length : 0;
        console.log(`  ✅ ${docId} — "${dataToRestore.name}" (${nodeCount} nodos, ${edgeCount} aristas)`);
    }

    console.log(`\n🎉 ¡RESTAURACIÓN COMPLETA! ${allFlows.length} flujos recuperados.`);
    process.exit(0);
}

restoreAll().catch(err => {
    console.error("❌ ERROR CRÍTICO:", err);
    process.exit(1);
});

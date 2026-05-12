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

async function doTotalBackup() {
    const now = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupDir = path.join(__dirname, '..', 'backups', `full_emergency_${now}`);
    
    if (!fs.existsSync(backupDir)){
        fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log("🚀 Iniciando copia de seguridad TOTAL de UniFlux Flows...");
    
    const snapshot = await db.collection('uniflux_flows').get();
    const allFlows = [];
    
    snapshot.forEach(doc => {
        const data = doc.data();
        allFlows.push({
            id: doc.id,
            ...data
        });
        
        // Save individual flow file as well
        const safeName = (data.name || doc.id).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        fs.writeFileSync(path.join(backupDir, `flow_${safeName}_${doc.id}.json`), JSON.stringify(data, null, 2));
    });

    const consolidatedPath = path.join(backupDir, 'ALL_FLOWS_CONSOLIDATED.json');
    fs.writeFileSync(consolidatedPath, JSON.stringify(allFlows, null, 2));
    
    console.log(`✅ Éxito: Se han guardado ${snapshot.docs.length} flujos individualmente.`);
    console.log(`📁 Ubicación de la copia: ${backupDir}`);
    console.log(`📄 Archivo consolidado creado.`);
    
    process.exit(0);
}

doTotalBackup().catch(err => {
    console.error(err);
    process.exit(1);
});

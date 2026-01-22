const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function backupDatabase() {
    console.log('--- Iniciando Copia de Seguridad de Base de Datos "Minuta" ---');

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
        console.error('Error: No se pudo parsear FIREBASE_SERVICE_ACCOUNT desde .env.local');
        return;
    }

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    const db = admin.firestore();
    const collections = [
        'users',
        'tenants',
        'projects',
        'tasks',
        'daily_status',
        'task_activities',
        'notifications',
        'invites',
        'master_data',
        'attribute_definitions',
        'permission_groups'
    ];

    const backupData = {};
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '..', 'backups');

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    let readableText = `# COPIA DE SEGURIDAD - Base de Datos Minuta\n`;
    readableText += `# Fecha: ${new Date().toLocaleString()}\n`;
    readableText += `# Proyecto: ${serviceAccount.project_id}\n\n`;

    for (const collectionName of collections) {
        console.log(`Exportando colección: ${collectionName}...`);
        const snapshot = await db.collection(collectionName).get();
        const docs = {};

        readableText += `\n--- COLECCIÓN: ${collectionName.toUpperCase()} (${snapshot.size} documentos) ---\n`;

        snapshot.forEach(doc => {
            const data = doc.data();
            docs[doc.id] = data;

            readableText += `\nID: ${doc.id}\n`;
            readableText += JSON.stringify(data, null, 2) + '\n';
            readableText += '-'.repeat(40) + '\n';
        });

        backupData[collectionName] = docs;
    }

    const jsonPath = path.join(backupDir, `minuta_backup_${timestamp}.json`);
    const txtPath = path.join(backupDir, `minuta_backup_${timestamp}.txt`);

    fs.writeFileSync(jsonPath, JSON.stringify(backupData, null, 2));
    fs.writeFileSync(txtPath, readableText);

    console.log('\n--- Copia de Seguridad Completada ---');
    console.log(`JSON: ${jsonPath}`);
    console.log(`TXT: ${txtPath}`);

    return { jsonPath, txtPath };
}

backupDatabase().catch(console.error);

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Admin SDK using .env.local
const dotEnvPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(dotEnvPath)) {
    console.error('❌ .env.local not found');
    process.exit(1);
}

const envContent = fs.readFileSync(dotEnvPath, 'utf8');
const serviceAccountMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT='(.*?)'/);

if (!serviceAccountMatch) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT not found in .env.local');
    process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountMatch[1]);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const COLLECTIONS = [
    'projects',
    'tasks',
    'users',
    'notifications',
    'journal_entries',
    'master_data',
    'attribute_definitions',
    'invites',
    'report_templates',
    'permission_groups'
];

async function backupDatabase() {
    console.log('🚀 Starting Database Backup...');
    const backup = {};
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFolder = path.join(__dirname, 'backups');

    if (!fs.existsSync(backupFolder)) {
        fs.mkdirSync(backupFolder);
    }

    const backupFile = path.join(backupFolder, `backup_${timestamp}.json`);

    for (const colName of COLLECTIONS) {
        console.log(`📦 Backing up collection: ${colName}...`);
        const snapshot = await db.collection(colName).get();
        backup[colName] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`   ✅ Done. (${backup[colName].length} documents)`);
    }

    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`\n✨ Backup completed successfully!`);
    console.log(`📄 File: ${backupFile}`);

    // Also create a "latest" symlink/copy for easy reference
    fs.writeFileSync(path.join(backupFolder, 'latest_backup.json'), JSON.stringify(backup, null, 2));
}

backupDatabase().catch(err => {
    console.error('❌ Backup failed:', err);
    process.exit(1);
});

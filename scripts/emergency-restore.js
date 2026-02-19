/**
 * Emergency Firestore Restore Script
 * Supports serviceAccountKey.json (preferred) or env variable.
 * Usage: node scripts/emergency-restore.js <path-to-backup.json>
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// --- Load credentials ---
const saKeyPath = path.join(__dirname, '..', 'serviceAccountKey.json');
let serviceAccount;

if (fs.existsSync(saKeyPath)) {
    console.log('📂 Using serviceAccountKey.json for authentication');
    serviceAccount = JSON.parse(fs.readFileSync(saKeyPath, 'utf8'));
} else {
    // Fallback: read from .env.local
    const dotEnvPath = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(dotEnvPath)) {
        console.error('❌ Neither serviceAccountKey.json nor .env.local found');
        process.exit(1);
    }
    const envContent = fs.readFileSync(dotEnvPath, 'utf8');
    const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT=['"]([\s\S]*?)['"]\s*\n/);
    if (!match) {
        console.error('❌ FIREBASE_SERVICE_ACCOUNT not found in .env.local');
        process.exit(1);
    }
    serviceAccount = JSON.parse(match[1]);
}

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// --- Restore ---
async function fullRestore(backupFilePath) {
    if (!backupFilePath || !fs.existsSync(backupFilePath)) {
        console.error('❌ Backup file not found:', backupFilePath);
        process.exit(1);
    }

    console.log(`📂 Loading backup: ${path.basename(backupFilePath)}`);
    const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
    const collections = Object.keys(backupData);
    const totalDocs = collections.reduce(
        (acc, col) => acc + (Array.isArray(backupData[col]) ? backupData[col].length : 0), 0
    );

    console.log(`\n🚀 Starting Full Restoration`);
    console.log(`   Project     : ${serviceAccount.project_id}`);
    console.log(`   Collections : ${collections.length} → [${collections.join(', ')}]`);
    console.log(`   Total docs  : ${totalDocs}\n`);

    for (const collectionName of collections) {
        const docs = backupData[collectionName];
        if (!Array.isArray(docs)) {
            console.log(`⚠️  Skipping ${collectionName} (not an array)`);
            continue;
        }
        console.log(`📦 Restoring: ${collectionName} (${docs.length} docs)...`);

        const batchSize = 400;
        for (let i = 0; i < docs.length; i += batchSize) {
            const batch = db.batch();
            for (const docData of docs.slice(i, i + batchSize)) {
                const { id, ...data } = docData;
                if (id) batch.set(db.collection(collectionName).doc(id), data);
            }
            await batch.commit();
            process.stdout.write(`   ✅ ${Math.min(i + batchSize, docs.length)}/${docs.length}\r`);
        }
        console.log(`   ✅ ${docs.length}/${docs.length} DONE                  `);
    }

    console.log(`\n✨ Restoration complete!`);
    console.log(`   ${collections.length} collections, ${totalDocs} total documents restored.`);
}

fullRestore(process.argv[2]).catch(err => {
    console.error('\n❌ Restoration failed:', err.message || err);
    process.exit(1);
});

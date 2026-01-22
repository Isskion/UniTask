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

async function fullRestore(backupFilePath) {
    if (!backupFilePath || !fs.existsSync(backupFilePath)) {
        console.error('❌ Please provide a valid backup file path.');
        console.log('Usage: node scripts/full-restore.js backups/YYYY-MM-DD/backup_XYZ.json');
        process.exit(1);
    }

    const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
    const collections = Object.keys(backupData);

    console.log(`🚀 Starting Global Restoration from: ${backupFilePath}`);

    for (const collectionName of collections) {
        const docs = backupData[collectionName];
        console.log(`📦 Restoring collection: ${collectionName} (${docs.length} documents)...`);

        const batchSize = 400;
        for (let i = 0; i < docs.length; i += batchSize) {
            const batch = db.batch();
            const currentBatchDocs = docs.slice(i, i + batchSize);

            for (const docData of currentBatchDocs) {
                const { id, ...data } = docData;
                const docRef = db.collection(collectionName).doc(id);
                // Use set without merge to ensure EXACT state from backup
                batch.set(docRef, data);
            }

            await batch.commit();
            console.log(`   ✅ Committed batch ${Math.floor(i / batchSize) + 1}`);
        }
    }

    console.log('\n✨ Global restoration completed successfully!');
}

// Get path from command line arg
const targetFile = process.argv[2];
fullRestore(targetFile).catch(err => {
    console.error('❌ Restoration failed:', err);
    process.exit(1);
});

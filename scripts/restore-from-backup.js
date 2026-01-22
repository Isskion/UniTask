const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
    process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const backupPath = path.join(__dirname, 'backups/latest_backup.json');

async function restoreFromBackup() {
    if (!fs.existsSync(backupPath)) {
        console.error('Backup file not found at:', backupPath);
        return;
    }

    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const collections = Object.keys(backupData);

    console.log(`Starting restoration from backup: ${new Date().toISOString()}`);

    for (const collectionName of collections) {
        const docs = backupData[collectionName];
        if (!Array.isArray(docs)) {
            console.log(`Skipping ${collectionName} as it is not an array.`);
            continue;
        }

        console.log(`Restoring ${docs.length} documents in collection: ${collectionName}`);

        // Process in batches
        const batchSize = 400;
        for (let i = 0; i < docs.length; i += batchSize) {
            const batch = db.batch();
            const currentBatchDocs = docs.slice(i, i + batchSize);

            for (const docData of currentBatchDocs) {
                if (!docData.id) {
                    console.warn(`Document missing ID in ${collectionName}, skipping.`);
                    continue;
                }

                const docRef = db.collection(collectionName).doc(docData.id);

                // We want to restore tenantId and organizationId specifically.
                // If they existed in the backup, we set them.
                const updateData = {};
                if ('tenantId' in docData) updateData.tenantId = docData.tenantId;
                if ('organizationId' in docData) updateData.organizationId = docData.organizationId;

                // If both are missing in backup (unlikely for these collections), we might still want to mark it.
                if (Object.keys(updateData).length > 0) {
                    batch.set(docRef, updateData, { merge: true });
                }
            }

            await batch.commit();
            console.log(`  Committed batch for ${collectionName} (${Math.min(i + batchSize, docs.length)}/${docs.length})`);
        }
    }

    console.log('Restoration complete!');
}

restoreFromBackup().catch(err => {
    console.error('Restoration failed:', err);
    process.exit(1);
});

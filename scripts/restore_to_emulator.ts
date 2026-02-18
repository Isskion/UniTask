
/**
 * SCRIPT: restore_to_emulator.ts
 * DESCRIPTION: Reads JSON backup files and writes them to the local Firestore Emulator.
 * USAGE: npx ts-node scripts/restore_to_emulator.ts [BACKUP_FOLDER_NAME]
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// FORCE EMULATOR
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.GCLOUD_PROJECT = 'unitask-v1';

// Init (Anonymous for emulator)
if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'unitask-v1' });
}
const db = admin.firestore();

// Locate Backup
// Default to the latest matching folder if not provided
const BACKUPS_DIR = path.join(process.cwd(), 'backups');

function getLatestBackup() {
    const folders = fs.readdirSync(BACKUPS_DIR)
        .filter((f: string) => f.startsWith('safety_snapshot_') && fs.statSync(path.join(BACKUPS_DIR, f)).isDirectory())
        .sort().reverse();
    return folders.length > 0 ? folders[0] : null;
}

const targetFolder = process.argv[2] || getLatestBackup();

if (!targetFolder) {
    console.error("❌ No backup folder found in ./backups");
    process.exit(1);
}

const BACKUP_PATH = path.join(BACKUPS_DIR, targetFolder);
console.log(`📂 Restoring from: ${BACKUP_PATH}`);

async function restoreCollection(colName: string) {
    const filePath = path.join(BACKUP_PATH, `${colName}.json`);
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  Skipping ${colName} (File not found)`);
        return;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // data is Record<docId, docData> based on security_backup.ts structure
    // Let's verify structure. Usually backups are Array or Object. 
    // Assuming security_backup.ts saves as { docId: data, ... } or [ {id:..., ...} ]

    // Check type
    const entries = Array.isArray(data) ? data : Object.entries(data);

    console.log(`⏳ Restoring ${colName} (${entries.length} docs)...`);

    const batchSize = 400;
    let batch = db.batch();
    let count = 0;

    for (const item of entries) {
        // If array, ensure it has ID. If Object.entries, item is [id, data]
        let docId, docData;

        if (Array.isArray(data)) {
            docId = item.id;
            docData = item;
        } else {
            docId = item[0];
            docData = item[1];
        }

        if (!docId) docId = db.collection(colName).doc().id;

        // Convert Timestamps back if needed (JSON loses Firestore Timestamp prototype)
        // For emulator validation, strings/numbers usually suffice or we map specific fields.
        // Quick fix: user 'createdAt' often is object {_seconds, _nanoseconds}

        batch.set(db.collection(colName).doc(docId), docData);
        count++;

        if (count % batchSize === 0) {
            await batch.commit();
            batch = db.batch();
            process.stdout.write('.');
        }
    }

    if (count % batchSize !== 0) await batch.commit();
    console.log(`\n✅ Restored ${colName}`);
}

async function run() {
    const collections = [
        'users',
        'projects',
        'tasks',
        'tenants',
        'sprints',
        'master_data'
    ];

    for (const col of collections) {
        await restoreCollection(col);
    }
    console.log("\n✨ Restore Complete. Emulator should now have data.");
}

run().catch(console.error);

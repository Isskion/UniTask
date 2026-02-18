
/**
 * SCRIPT: migrate_to_hard_isolation.ts
 * DESCRIPTION: Migrates Projects and Tasks from root collections to /tenants/{tenantId}/...
 * SAFETY: Run with --dry-run first.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Config
const DRY_RUN = process.argv.includes('--dry-run');

// Init
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

if (!admin.apps.length) {
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        admin.initializeApp();
    }
}
const db = admin.firestore();

async function migrateCollection(collectionName: string, subCollectionName: string) {
    console.log(`\n📦 Migrating ${collectionName} -> /tenants/{id}/${subCollectionName}... (Dry Run: ${DRY_RUN})`);

    // Get all docs from ROOT collection
    const snapshot = await db.collection(collectionName).get();
    let migratedCount = 0;
    let skippedCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const tenantId = data.tenantId || "1"; // Default to tenant 1 if missing

        if (!tenantId) {
            console.warn(`   ⚠️  [SKIP] ${doc.id} has no tenantId!`);
            skippedCount++;
            continue;
        }

        const targetPath = `tenants/${tenantId}/${subCollectionName}/${doc.id}`;
        const targetRef = db.doc(targetPath);

        const existsSnap = await targetRef.get();
        if (existsSnap.exists) {
            // console.log(`   ⏭️  [SKIP] ${targetPath} already exists.`);
            skippedCount++;
            continue;
        }

        if (!DRY_RUN) {
            await targetRef.set(data);
        }
        console.log(`   ✅ [MOVE] ${collectionName}/${doc.id} -> ${targetPath}`);
        migratedCount++;
    }

    console.log(`   📊 Summary for ${collectionName}: ${migratedCount} migrated, ${skippedCount} skipped.`);
}

async function run() {
    await migrateCollection('projects', 'projects');
    await migrateCollection('tasks', 'tasks');

    // Phase 4: Auxiliary Collections
    await migrateCollection('project_activity_feed', 'project_activity_feed');
    await migrateCollection('journal_entries', 'journal_entries');
    await migrateCollection('task_comments', 'task_comments');
    await migrateCollection('notifications', 'notifications');

    console.log("\n✨ Hard Isolation Migration Complete.");
}

run().catch(console.error);

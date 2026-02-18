
/**
 * SCRIPT: migrate_to_sam.ts
 * DESCRIPTION: Injects default Access Scopes and calculates Access Keys for existing data.
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
const TARGET_TENANT = '1'; // Default tenant for migration, or iterate all?
// Let's iterate all users for safety
const DEFAULT_REGION = 'CL'; // Fallback
const DEFAULT_DIVISION = 'CONS'; // Fallback

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
        // Fallback for emulator or default auth
        admin.initializeApp();
    }
}
const db = admin.firestore();

async function migrateUsers() {
    console.log(`\n👥 Migrating Users... (Dry Run: ${DRY_RUN})`);
    const snapshot = await db.collection('users').get();
    let updated = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();

        // Skip if already migrated
        if (data.accessScopes && data.accessScopes.regionIds) {
            continue;
        }

        const updateData: any = {
            accessScopes: {
                regionIds: ['*'], // Give Full Access initially to avoid lockout
                divisionIds: ['*']
            },
            authVersion: 1,
            lastUpdatedBy: 'MIGRATION_SCRIPT_SAM'
        };

        if (!DRY_RUN) {
            await doc.ref.update(updateData);
        }
        console.log(`   [USER] ${doc.id} -> Added Wildcard Scopes`);
        updated++;
    }
    console.log(`   ✅ Processed ${updated} users.`);
}

async function migrateProjects() {
    console.log(`\n📁 Migrating Projects... (Dry Run: ${DRY_RUN})`);
    const snapshot = await db.collection('projects').get();
    let updated = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();

        // Skip if already has keys
        if (data._accessKey && data._migrated) {
            continue;
        }

        // Determine Region/Division (Logic based on project code or default)
        // For Phase 1: Use defaults
        const regionId = data.regionId || DEFAULT_REGION;
        const divisionId = data.divisionId || DEFAULT_DIVISION;

        const accessKey = `${regionId}:${divisionId}`;
        const tenantAccessKey = `${data.tenantId}:${accessKey}`;

        const updateData = {
            regionId,
            divisionId,
            _accessKey: accessKey,
            _tenantAccessKey: tenantAccessKey,
            _migrated: true
        };

        if (!DRY_RUN) {
            await doc.ref.update(updateData);
        }
        console.log(`   [PROJ] ${doc.id} -> ${accessKey}`);
        updated++;
    }
    console.log(`   ✅ Processed ${updated} projects.`);
}

async function migrateTasks() {
    console.log(`\n✅ Migrating Tasks... (Dry Run: ${DRY_RUN})`);
    // Warning: Huge collection. Should cursor.
    // using limited batch for testing
    const snapshot = await db.collection('tasks').limit(500).get();
    let updated = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();

        if (data._accessKey) continue;

        // Tasks inherit from Project usually, but we need denormalization.
        // Option 1: Look up project (Slow)
        // Option 2: Use default (Fast, risks misalignment)

        // Strategy for Phase 1: Use Default. 
        // LATER: Run integrity script to sync Task->Project

        const regionId = DEFAULT_REGION;
        const divisionId = DEFAULT_DIVISION;
        const accessKey = `${regionId}:${divisionId}`;

        const updateData = {
            regionId,
            divisionId,
            _accessKey: accessKey,
            _migrated: true
        };

        if (!DRY_RUN) {
            await doc.ref.update(updateData);
        }
        updated++;
    }
    console.log(`   ✅ Processed ${updated} tasks (Batch 500).`);
}

async function run() {
    await migrateUsers();
    await migrateProjects();
    await migrateTasks();
    console.log("\n✨ Migration Complete.");
}

run().catch(console.error);

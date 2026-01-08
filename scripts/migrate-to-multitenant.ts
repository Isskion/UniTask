/**
 * Multi-Tenant Migration Script v2.0 (Atomic Tenant Injection)
 * 
 * Security Features:
 * - DRY_RUN mode for validation before execution
 * - Idempotent: Can run multiple times safely
 * - Audit trail with _migratedAt timestamp
 * - Tenant existence verification before migration
 * 
 * Usage: 
 *   DRY RUN:  npx ts-node scripts/migrate-to-multitenant.ts
 *   EXECUTE:  DRY_RUN=false npx ts-node scripts/migrate-to-multitenant.ts
 */

import * as admin from 'firebase-admin';

// ═══════════════════════════════════════════════════════════════
// SECURITY CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const TARGET_TENANT_ID = '1'; // ID del tenant inicial
const TARGET_TENANT_NAME = 'Organización Principal';
const DRY_RUN = process.env.DRY_RUN !== 'false'; // Default to DRY RUN for safety
const BATCH_SIZE = 400; // Firestore batch limit is 500, leave margin

const COLLECTIONS_TO_MIGRATE = [
    'projects',
    'tasks',
    'users',
    'user',
    'journal_entries',
    'weekly_entries',
    'permission_groups',
    'invites'
];

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// ═══════════════════════════════════════════════════════════════
// MIGRATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function verifyTenantExists(): Promise<boolean> {
    const tenantRef = db.collection('tenants').doc(TARGET_TENANT_ID);
    const tenantDoc = await tenantRef.get();

    if (!tenantDoc.exists) {
        console.log(`\n⚠️  Tenant "${TARGET_TENANT_ID}" does not exist. Creating...`);

        if (!DRY_RUN) {
            await tenantRef.set({
                id: TARGET_TENANT_ID,
                name: TARGET_TENANT_NAME,
                description: 'Tenant migrado desde datos legacy',
                isActive: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: 'migration-script-v2'
            });
            console.log(`✅ Created tenant "${TARGET_TENANT_NAME}" with ID: ${TARGET_TENANT_ID}`);
        } else {
            console.log(`[DRY RUN] Would create tenant "${TARGET_TENANT_NAME}"`);
        }
    } else {
        console.log(`✅ Tenant "${TARGET_TENANT_ID}" exists.`);
    }

    return true;
}

async function createSystemConfig(): Promise<void> {
    console.log('\n🔧 Checking system_config/admins...');

    const adminDoc = db.collection('system_config').doc('admins');
    const existing = await adminDoc.get();

    if (existing.exists) {
        console.log('   ✅ Already exists.');
        return;
    }

    if (!DRY_RUN) {
        await adminDoc.set({
            emails: ['argoss01@gmail.com'],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastModified: admin.firestore.FieldValue.serverTimestamp(),
            modifiedBy: 'migration-script-v2'
        });
        console.log('   ✅ Created with argoss01@gmail.com as initial admin.');
    } else {
        console.log('   [DRY RUN] Would create admin config.');
    }
}

async function migrateCollection(collectionName: string): Promise<{ total: number; updated: number; skipped: number }> {
    console.log(`\n📦 Migrating collection: ${collectionName}`);

    const snapshot = await db.collection(collectionName).get();

    if (snapshot.empty) {
        console.log(`   ⚪ Empty collection, skipping.`);
        return { total: 0, updated: 0, skipped: 0 };
    }

    let updated = 0;
    let skipped = 0;
    let batchCount = 0;
    let batch = db.batch();

    for (const doc of snapshot.docs) {
        const data = doc.data();

        // IDEMPOTENCY: Skip if already has tenantId (prevents overwrite)
        if (data.tenantId) {
            skipped++;
            continue;
        }

        if (!DRY_RUN) {
            batch.update(doc.ref, {
                tenantId: TARGET_TENANT_ID,
                _migratedAt: admin.firestore.FieldValue.serverTimestamp() // Audit trail
            });
        }
        updated++;
        batchCount++;

        // Commit batch when reaching limit
        if (batchCount >= BATCH_SIZE) {
            if (!DRY_RUN) {
                await batch.commit();
                console.log(`   📤 Committed batch of ${batchCount} documents...`);
            }
            batch = db.batch();
            batchCount = 0;
        }
    }

    // Commit remaining documents
    if (batchCount > 0 && !DRY_RUN) {
        await batch.commit();
    }

    if (DRY_RUN) {
        console.log(`   [DRY RUN] Would update ${updated} documents, skip ${skipped} (already migrated)`);
    } else {
        console.log(`   ✅ Updated: ${updated}, Skipped: ${skipped}`);
    }

    return { total: snapshot.size, updated, skipped };
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════

async function main() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   MULTI-TENANT MIGRATION SCRIPT v2.0 (Atomic Tenant Injection)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   Mode:        ${DRY_RUN ? '🔍 DRY RUN (No changes will be made)' : '🚀 LIVE EXECUTION'}`);
    console.log(`   Target:      Tenant ID "${TARGET_TENANT_ID}"`);
    console.log(`   Collections: ${COLLECTIONS_TO_MIGRATE.join(', ')}`);
    console.log('═══════════════════════════════════════════════════════════════');

    if (!DRY_RUN) {
        console.log('\n⚠️  WARNING: LIVE EXECUTION MODE');
        console.log('   This will modify your production database.');
        console.log('   Press Ctrl+C within 5 seconds to abort...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    try {
        // 1. Verify/Create Tenant
        await verifyTenantExists();

        // 2. Create system config for admins
        await createSystemConfig();

        // 3. Migrate all collections
        const results: { collection: string; total: number; updated: number; skipped: number }[] = [];

        for (const collectionName of COLLECTIONS_TO_MIGRATE) {
            const result = await migrateCollection(collectionName);
            results.push({ collection: collectionName, ...result });
        }

        // 4. Summary
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('   MIGRATION SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');

        let totalUpdated = 0;
        let totalSkipped = 0;

        results.forEach(r => {
            if (r.total > 0) {
                console.log(`   ${r.collection.padEnd(20)} | Updated: ${String(r.updated).padStart(4)} | Skipped: ${String(r.skipped).padStart(4)}`);
            }
            totalUpdated += r.updated;
            totalSkipped += r.skipped;
        });

        console.log('───────────────────────────────────────────────────────────────');
        console.log(`   TOTAL: ${totalUpdated} documents updated, ${totalSkipped} skipped`);
        console.log('═══════════════════════════════════════════════════════════════');

        if (DRY_RUN) {
            console.log('\n📋 DRY RUN COMPLETE');
            console.log('   To execute for real, run with: DRY_RUN=false npx ts-node scripts/migrate-to-multitenant.ts');
        } else {
            console.log('\n✅ MIGRATION COMPLETE');
            console.log('   You can now deploy the new Firestore Security Rules.');
        }

    } catch (error) {
        console.error('\n❌ MIGRATION FAILED:', error);
        process.exit(1);
    }
}

main();

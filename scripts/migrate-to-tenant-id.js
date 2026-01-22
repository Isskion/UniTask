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

async function migrateToTenantId() {
    console.log('🚀 Starting Global Identifier Purge (Migration to tenantId)...');

    for (const colName of COLLECTIONS) {
        console.log(`📂 Processing collection: ${colName}...`);
        const snapshot = await db.collection(colName).get();
        let migratedCount = 0;
        let deletedFieldCount = 0;

        const batch = db.batch();
        let batchSize = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const updates = {};
            let needsUpdate = false;

            // 1. Ensure tenantId exists
            if (!data.tenantId && data.organizationId) {
                updates.tenantId = data.organizationId;
                needsUpdate = true;
                migratedCount++;
            }

            // 2. Remove organizationId
            if (data.organizationId !== undefined) {
                updates.organizationId = admin.firestore.FieldValue.delete();
                needsUpdate = true;
                deletedFieldCount++;
            }

            if (needsUpdate) {
                batch.update(doc.ref, updates);
                batchSize++;

                // Commit in chunks of 500
                if (batchSize >= 500) {
                    await batch.commit();
                    console.log(`   🔸 Committed batch of 500...`);
                    batchSize = 0;
                }
            }
        }

        if (batchSize > 0) {
            await batch.commit();
        }

        console.log(`   ✅ Done. Migrated: ${migratedCount}, Purged field: ${deletedFieldCount}`);
    }

    console.log('\n✨ Global Identifier Purge completed successfully!');
}

migrateToTenantId().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});

/**
 * Migration Script: Assign tenantId to legacy journal entries
 * Uses Firebase Admin SDK for server-side access
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
// You need to download service account key from Firebase Console
// Go to: Project Settings > Service Accounts > Generate New Private Key
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateJournalEntries() {
    console.log('🚀 Starting migration of legacy journal entries...\n');

    try {
        // 1. Get all journal entries
        const entriesSnapshot = await db.collection('journal_entries').get();

        console.log(`📦 Found ${entriesSnapshot.size} total journal entries`);

        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const docSnap of entriesSnapshot.docs) {
            const entryId = docSnap.id;
            const entry = docSnap.data();

            // Skip if already has tenantId and follows new format
            if (entry.tenantId && entryId.includes('_')) {
                console.log(`⏭️  Skipping ${entryId} (already migrated)`);
                skippedCount++;
                continue;
            }

            console.log(`\n📝 Processing entry: ${entryId}`);

            // 2. Determine tenant from projects
            let determinedTenantId = '1'; // Default

            if (entry.projects && entry.projects.length > 0) {
                const firstProject = entry.projects[0];

                if (firstProject.id) {
                    try {
                        const projectDoc = await db.collection('projects').doc(firstProject.id).get();
                        if (projectDoc.exists) {
                            const projectData = projectDoc.data();
                            determinedTenantId = projectData.tenantId || '1';
                            console.log(`   ✓ Determined tenant from project: ${determinedTenantId}`);
                        } else {
                            console.log(`   ⚠️  Project ${firstProject.id} not found, defaulting to tenant 1`);
                        }
                    } catch (err) {
                        console.log(`   ⚠️  Error fetching project, defaulting to tenant 1`);
                    }
                } else {
                    console.log(`   ⚠️  Project has no ID, defaulting to tenant 1`);
                }
            } else {
                console.log(`   ⚠️  No projects in entry, defaulting to tenant 1`);
            }

            // 3. Create new document with correct format
            const newDocId = `${determinedTenantId}_${entry.date}`;
            const updatedEntry = {
                ...entry,
                tenantId: determinedTenantId
            };

            try {
                // Check if new document already exists
                const existingDoc = await db.collection('journal_entries').doc(newDocId).get();

                if (existingDoc.exists) {
                    console.log(`   ⚠️  Document ${newDocId} already exists, skipping migration`);
                    skippedCount++;
                    continue;
                }

                // Create new document
                await db.collection('journal_entries').doc(newDocId).set(updatedEntry);
                console.log(`   ✅ Created new document: ${newDocId}`);

                // Delete old document only if it has different ID
                if (entryId !== newDocId) {
                    await db.collection('journal_entries').doc(entryId).delete();
                    console.log(`   🗑️  Deleted legacy document: ${entryId}`);
                }

                migratedCount++;
            } catch (error) {
                console.error(`   ❌ Error migrating ${entryId}:`, error);
                errorCount++;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📊 Migration Summary:');
        console.log(`   ✅ Migrated: ${migratedCount}`);
        console.log(`   ⏭️  Skipped: ${skippedCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log('='.repeat(50) + '\n');

        // Close admin
        await admin.app().delete();

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migration
migrateJournalEntries()
    .then(() => {
        console.log('✨ Migration completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    });

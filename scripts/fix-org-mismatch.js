/**
 * Script to fix organizationId mismatch
 * This script updates user organizationId to match where their data is
 * Run with: node scripts/fix-org-mismatch.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

// Configuration: Set to the main organization ID that should be used
const TARGET_ORG_ID = "1";

async function fixMismatch() {
    console.log('🔧 Fixing organizationId mismatch...\n');

    try {
        // Option A: Fix DATA to match users (organizationId: "1")
        console.log('='.repeat(60));
        console.log('📦 Updating ALL projects to organizationId: "' + TARGET_ORG_ID + '"');
        console.log('='.repeat(60));

        const projectsSnapshot = await db.collection('projects').get();
        let projectsUpdated = 0;

        for (const doc of projectsSnapshot.docs) {
            const data = doc.data();
            if (data.organizationId !== TARGET_ORG_ID) {
                await doc.ref.update({ organizationId: TARGET_ORG_ID });
                console.log(`   ✅ ${data.name}: ${data.organizationId || data.tenantId} → ${TARGET_ORG_ID}`);
                projectsUpdated++;
            }
        }
        console.log(`   Updated ${projectsUpdated} projects\n`);

        // Update tasks
        console.log('='.repeat(60));
        console.log('📋 Updating ALL tasks to organizationId: "' + TARGET_ORG_ID + '"');
        console.log('='.repeat(60));

        const tasksSnapshot = await db.collection('tasks').get();
        let tasksUpdated = 0;

        for (const doc of tasksSnapshot.docs) {
            const data = doc.data();
            if (data.organizationId !== TARGET_ORG_ID) {
                await doc.ref.update({ organizationId: TARGET_ORG_ID });
                console.log(`   ✅ ${(data.title || doc.id).substring(0, 40)}: ${data.organizationId || 'null'} → ${TARGET_ORG_ID}`);
                tasksUpdated++;
            }
        }
        console.log(`   Updated ${tasksUpdated} tasks\n`);

        // Update journal_entries
        console.log('='.repeat(60));
        console.log('📔 Updating ALL journal_entries to organizationId: "' + TARGET_ORG_ID + '"');
        console.log('='.repeat(60));

        const entriesSnapshot = await db.collection('journal_entries').get();
        let entriesUpdated = 0;

        for (const doc of entriesSnapshot.docs) {
            const data = doc.data();
            if (data.organizationId !== TARGET_ORG_ID) {
                await doc.ref.update({ organizationId: TARGET_ORG_ID });
                entriesUpdated++;
            }
        }
        console.log(`   Updated ${entriesUpdated} journal entries\n`);

        // Update users to ensure they all have organizationId: "1"
        console.log('='.repeat(60));
        console.log('👥 Updating ALL users to organizationId: "' + TARGET_ORG_ID + '"');
        console.log('='.repeat(60));

        const usersSnapshot = await db.collection('users').get();
        let usersUpdated = 0;

        for (const doc of usersSnapshot.docs) {
            const data = doc.data();
            if (data.organizationId !== TARGET_ORG_ID) {
                await doc.ref.update({ organizationId: TARGET_ORG_ID });
                console.log(`   ✅ ${data.email}: ${data.organizationId || 'null'} → ${TARGET_ORG_ID}`);
                usersUpdated++;
            }

            // Also update the custom claims
            try {
                const userRecord = await auth.getUser(doc.id);
                const currentClaims = userRecord.customClaims || {};
                if (currentClaims.organizationId !== TARGET_ORG_ID) {
                    await auth.setCustomUserClaims(doc.id, {
                        ...currentClaims,
                        organizationId: TARGET_ORG_ID
                    });
                    console.log(`   ✅ Auth claims updated for ${data.email}`);
                }
            } catch (e) {
                console.log(`   ⚠️  Could not update claims for ${data.email}: ${e.message}`);
            }
        }
        console.log(`   Updated ${usersUpdated} users\n`);

        console.log('='.repeat(60));
        console.log('✅ COMPLETE! All data now uses organizationId: "' + TARGET_ORG_ID + '"');
        console.log('='.repeat(60));
        console.log('\n⚠️  IMPORTANT: Users must log out and log back in for changes to take effect!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await admin.app().delete();
    }
}

fixMismatch()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });

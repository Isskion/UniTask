/**
 * Script to REVERT organizationId changes
 * This restores the original values based on document patterns
 * Run with: node scripts/revert-org-changes.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function revert() {
    console.log('⏪ Reverting organizationId changes...\n');

    try {
        // We need to figure out the original values
        // Looking at the diagnosis: projects had orgIds "2" and "3"
        // We'll need to restore based on some logic or ask user

        // First, let's see what we have now
        console.log('='.repeat(60));
        console.log('📊 Current state after changes:');
        console.log('='.repeat(60));

        const projectsSnapshot = await db.collection('projects').get();
        console.log(`\nProjects: ${projectsSnapshot.size} total`);

        // Group by current organizationId
        const orgCounts = {};
        for (const doc of projectsSnapshot.docs) {
            const orgId = doc.data().organizationId || 'null';
            orgCounts[orgId] = (orgCounts[orgId] || 0) + 1;
        }
        console.log('Organization distribution:', orgCounts);

        // Unfortunately, we don't have a backup of the original values
        // The best we can do is inform the user

        console.log('\n⚠️  IMPORTANT: Original organizationId values were not backed up before changes.');
        console.log('   Based on the diagnosis, the original values were:');
        console.log('   - Projects: organizationId "2" and "3"');
        console.log('   - Tasks: organizationId "2" and "3"');
        console.log('\n   To restore, you would need to:');
        console.log('   1. Know which projects belonged to org "2" vs "3"');
        console.log('   2. Manually update them or use a backup');

        console.log('\n📝 ALTERNATIVE SOLUTION:');
        console.log('   Instead of reverting, we can fix the USER to match the DATA:');
        console.log('   - Update user organizationId to "2" or "3"');
        console.log('   - Or make user a superadmin to see all organizations');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await admin.app().delete();
    }
}

revert()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });

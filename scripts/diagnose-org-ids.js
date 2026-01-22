/**
 * Diagnostic script to check organizationId values across collections
 * Run with: node scripts/diagnose-org-ids.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function diagnose() {
    console.log('🔍 Diagnosing organizationId values...\n');

    try {
        // 1. Check users
        console.log('='.repeat(60));
        console.log('👥 USERS');
        console.log('='.repeat(60));
        const usersSnapshot = await db.collection('users').get();

        const userOrgMap = new Map();
        for (const doc of usersSnapshot.docs) {
            const data = doc.data();
            const orgId = data.organizationId || data.tenantId || 'MISSING';
            userOrgMap.set(doc.id, orgId);

            // Get the auth claims for this user
            try {
                const userRecord = await auth.getUser(doc.id);
                const claims = userRecord.customClaims || {};
                console.log(`📧 ${data.email}`);
                console.log(`   Firestore organizationId: ${orgId}`);
                console.log(`   Auth Claim organizationId: ${claims.organizationId || 'NOT SET'}`);
                console.log(`   Auth Claim roleLevel: ${claims.roleLevel || 'NOT SET'}`);
                console.log(`   Role: ${data.role || 'N/A'}`);
                console.log('');
            } catch (e) {
                console.log(`📧 ${data.email} (UID: ${doc.id})`);
                console.log(`   Firestore organizationId: ${orgId}`);
                console.log(`   ⚠️  Could not get auth record: ${e.message}`);
                console.log('');
            }
        }

        // 2. Check projects
        console.log('\n' + '='.repeat(60));
        console.log('📁 PROJECTS');
        console.log('='.repeat(60));
        const projectsSnapshot = await db.collection('projects').limit(10).get();

        const projectOrgs = new Set();
        for (const doc of projectsSnapshot.docs) {
            const data = doc.data();
            const orgId = data.organizationId || data.tenantId || 'MISSING';
            projectOrgs.add(orgId);
            console.log(`📂 ${data.name}: organizationId = "${orgId}"`);
        }

        // 3. Check tasks
        console.log('\n' + '='.repeat(60));
        console.log('📋 TASKS (first 10)');
        console.log('='.repeat(60));
        const tasksSnapshot = await db.collection('tasks').limit(10).get();

        const taskOrgs = new Set();
        for (const doc of tasksSnapshot.docs) {
            const data = doc.data();
            const orgId = data.organizationId || data.tenantId || 'MISSING';
            taskOrgs.add(orgId);
            console.log(`✅ ${data.title || doc.id}: organizationId = "${orgId}"`);
        }

        // 4. Check journal_entries
        console.log('\n' + '='.repeat(60));
        console.log('📔 JOURNAL ENTRIES (first 5)');
        console.log('='.repeat(60));
        const entriesSnapshot = await db.collection('journal_entries').limit(5).get();

        for (const doc of entriesSnapshot.docs) {
            const data = doc.data();
            const orgId = data.organizationId || data.tenantId || 'MISSING';
            console.log(`📝 ${doc.id}: organizationId = "${orgId}"`);
        }

        // 5. Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 SUMMARY');
        console.log('='.repeat(60));
        console.log('User organizationIds:', [...userOrgMap.values()].filter((v, i, a) => a.indexOf(v) === i));
        console.log('Project organizationIds:', [...projectOrgs]);
        console.log('Task organizationIds:', [...taskOrgs]);

        // Check for mismatches
        const allUserOrgs = new Set(userOrgMap.values());
        const allDataOrgs = new Set([...projectOrgs, ...taskOrgs]);

        const missingForUsers = [...allDataOrgs].filter(o => !allUserOrgs.has(o));
        const missingForData = [...allUserOrgs].filter(o => !allDataOrgs.has(o) && o !== 'MISSING');

        if (missingForUsers.length > 0) {
            console.log('\n⚠️  Data exists with organizationIds that no user has:', missingForUsers);
        }
        if (missingForData.length > 0) {
            console.log('\n⚠️  Users have organizationIds with no matching data:', missingForData);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await admin.app().delete();
    }
}

diagnose()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });

/**
 * Script to analyze documents and find original organizationId
 * Looking for any field that might help us restore original values
 * Run with: node scripts/analyze-for-restore.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function analyze() {
    console.log('🔍 Analyzing documents to find original organizationId clues...\n');

    try {
        // Check projects for any field that might have the original orgId
        console.log('='.repeat(60));
        console.log('📁 PROJECTS - Looking for original organizationId clues');
        console.log('='.repeat(60));

        const projectsSnapshot = await db.collection('projects').get();

        for (const doc of projectsSnapshot.docs) {
            const data = doc.data();
            console.log(`\n📂 Project: ${data.name} (ID: ${doc.id})`);
            console.log(`   Current organizationId: ${data.organizationId}`);
            console.log(`   tenantId field: ${data.tenantId || 'NOT PRESENT'}`);
            console.log(`   createdBy: ${data.createdBy || 'N/A'}`);

            // Check if doc ID has org prefix
            if (doc.id.includes('_')) {
                const parts = doc.id.split('_');
                console.log(`   Doc ID parts: ${parts[0]} might be original orgId`);
            }

            // List all fields to look for clues
            console.log(`   All fields: ${Object.keys(data).join(', ')}`);
        }

        // Check tasks
        console.log('\n' + '='.repeat(60));
        console.log('📋 TASKS - Sample for clues');
        console.log('='.repeat(60));

        const tasksSnapshot = await db.collection('tasks').limit(5).get();

        for (const doc of tasksSnapshot.docs) {
            const data = doc.data();
            console.log(`\n✅ Task: ${(data.title || doc.id).substring(0, 50)}`);
            console.log(`   Current organizationId: ${data.organizationId}`);
            console.log(`   tenantId field: ${data.tenantId || 'NOT PRESENT'}`);
            console.log(`   projectId: ${data.projectId || 'N/A'}`);
        }

        // Check journal_entries
        console.log('\n' + '='.repeat(60));
        console.log('📔 JOURNAL ENTRIES - Sample for clues');
        console.log('='.repeat(60));

        const entriesSnapshot = await db.collection('journal_entries').limit(5).get();

        for (const doc of entriesSnapshot.docs) {
            const data = doc.data();
            console.log(`\n📝 Entry: ${doc.id}`);
            console.log(`   Current organizationId: ${data.organizationId}`);
            console.log(`   tenantId field: ${data.tenantId || 'NOT PRESENT'}`);

            // Doc ID often has format: orgId_date
            if (doc.id.includes('_')) {
                const parts = doc.id.split('_');
                console.log(`   ⭐ Doc ID prefix: "${parts[0]}" - THIS IS LIKELY THE ORIGINAL ORG ID!`);
            }
        }

        // Check tenants collection to see what organizations exist
        console.log('\n' + '='.repeat(60));
        console.log('🏢 TENANTS/ORGANIZATIONS Collection');
        console.log('='.repeat(60));

        const tenantsSnapshot = await db.collection('tenants').get();

        for (const doc of tenantsSnapshot.docs) {
            const data = doc.data();
            console.log(`   Tenant ID: ${doc.id}, Name: ${data.name || 'N/A'}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 RESTORATION STRATEGY');
        console.log('='.repeat(60));
        console.log(`
Based on the analysis, we can restore using:
1. Document ID prefixes (e.g., "2_2024-01-15" means orgId = "2")
2. The tenantId field if it still exists
3. Matching projects to their tasks via projectId
        `);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await admin.app().delete();
    }
}

analyze()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });

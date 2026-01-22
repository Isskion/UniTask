/**
 * Script to RESTORE original organizationId values
 * Uses document ID prefixes to determine original organization
 * Run with: node scripts/restore-org-ids.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function restore() {
    console.log('⏪ RESTORING original organizationId values...\n');

    let totalRestored = 0;

    try {
        // 1. Restore journal_entries using doc ID prefix
        console.log('='.repeat(60));
        console.log('📔 Restoring JOURNAL_ENTRIES from doc ID prefix');
        console.log('='.repeat(60));

        const entriesSnapshot = await db.collection('journal_entries').get();
        let entriesRestored = 0;

        for (const doc of entriesSnapshot.docs) {
            // Doc ID format is typically: orgId_date (e.g., "2_2024-01-15")
            const docId = doc.id;
            if (docId.includes('_')) {
                const originalOrgId = docId.split('_')[0];
                const currentOrgId = doc.data().organizationId;

                if (originalOrgId !== currentOrgId && /^\d+$/.test(originalOrgId)) {
                    await doc.ref.update({ organizationId: originalOrgId });
                    console.log(`   ✅ ${docId}: "${currentOrgId}" → "${originalOrgId}"`);
                    entriesRestored++;
                }
            }
        }
        console.log(`   Restored ${entriesRestored} journal entries\n`);
        totalRestored += entriesRestored;

        // 2. For tasks, we need to match them to their projects
        // First, let's check if tasks have projectId and restore based on project
        console.log('='.repeat(60));
        console.log('📋 Analyzing TASKS for restoration');
        console.log('='.repeat(60));

        const tasksSnapshot = await db.collection('tasks').get();

        // Group tasks by projectId to understand the mapping
        const tasksByProject = new Map();
        for (const doc of tasksSnapshot.docs) {
            const data = doc.data();
            const projectId = data.projectId;
            if (projectId) {
                if (!tasksByProject.has(projectId)) {
                    tasksByProject.set(projectId, []);
                }
                tasksByProject.get(projectId).push({ id: doc.id, ref: doc.ref, data });
            }
        }

        console.log(`   Found ${tasksByProject.size} unique projectIds in tasks`);

        // 3. For projects, check if there's tenantId field or createdBy pattern
        console.log('\n' + '='.repeat(60));
        console.log('📁 Analyzing PROJECTS for restoration');
        console.log('='.repeat(60));

        const projectsSnapshot = await db.collection('projects').get();
        const projectOrgMap = new Map();

        for (const doc of projectsSnapshot.docs) {
            const data = doc.data();

            // Check if tenantId field exists (original value)
            if (data.tenantId && data.tenantId !== data.organizationId) {
                projectOrgMap.set(doc.id, data.tenantId);
                console.log(`   📂 ${data.name}: Will restore from tenantId field → "${data.tenantId}"`);
            }
            // Check if doc ID has org prefix
            else if (doc.id.includes('_')) {
                const originalOrgId = doc.id.split('_')[0];
                if (/^\d+$/.test(originalOrgId)) {
                    projectOrgMap.set(doc.id, originalOrgId);
                    console.log(`   📂 ${data.name}: Will restore from doc ID → "${originalOrgId}"`);
                }
            }
        }

        // 4. Restore projects
        console.log('\n' + '='.repeat(60));
        console.log('📁 Restoring PROJECTS');
        console.log('='.repeat(60));

        let projectsRestored = 0;
        for (const doc of projectsSnapshot.docs) {
            const data = doc.data();
            const originalOrgId = projectOrgMap.get(doc.id);

            if (originalOrgId && originalOrgId !== data.organizationId) {
                await doc.ref.update({ organizationId: originalOrgId });
                console.log(`   ✅ ${data.name}: "${data.organizationId}" → "${originalOrgId}"`);
                projectsRestored++;
            }
        }
        console.log(`   Restored ${projectsRestored} projects\n`);
        totalRestored += projectsRestored;

        // 5. Restore tasks based on their project's organizationId
        console.log('='.repeat(60));
        console.log('📋 Restoring TASKS based on project mapping');
        console.log('='.repeat(60));

        let tasksRestored = 0;
        for (const [projectId, tasks] of tasksByProject) {
            const originalOrgId = projectOrgMap.get(projectId);
            if (originalOrgId) {
                for (const task of tasks) {
                    if (task.data.organizationId !== originalOrgId) {
                        await task.ref.update({ organizationId: originalOrgId });
                        tasksRestored++;
                    }
                }
                console.log(`   ✅ Tasks for project ${projectId}: restored ${tasks.length} tasks to orgId "${originalOrgId}"`);
            }
        }
        console.log(`   Restored ${tasksRestored} tasks\n`);
        totalRestored += tasksRestored;

        // Summary
        console.log('='.repeat(60));
        console.log('📊 RESTORATION COMPLETE');
        console.log('='.repeat(60));
        console.log(`Total documents restored: ${totalRestored}`);
        console.log('\n⚠️  Users must log out and log back in to see changes.');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await admin.app().delete();
    }
}

restore()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });

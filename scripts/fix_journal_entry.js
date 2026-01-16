const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Force Emulator usage (DISABLED for Production/Cloud fix)
// process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
// process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

// Initialize with Production Project ID
var serviceAccount;
try {
    serviceAccount = require("../serviceAccountKey.json.json");
    console.log("✅ Loaded serviceAccountKey.json.json");
} catch (e) {
    try {
        serviceAccount = require("../serviceAccountKey.json");
        console.log("✅ Loaded serviceAccountKey.json");
    } catch (e2) {
        console.log("⚠️ No serviceAccountKey found. Trying Application Default Credentials...");
    }
}

const config = { projectId: 'minuta-f75a4' };
if (serviceAccount) config.credential = admin.credential.cert(serviceAccount);

admin.initializeApp(config);

const db = getFirestore();

async function fixJournalEntry() {
    const WRONG_DATE = '2026-01-18';
    const CORRECT_DATE = '2025-12-18';
    const PROJECT_KEYWORD = 'delgado';
    const TENANT_ID_HINT = '3'; // Unigis, but we'll try to detect

    console.log(`🚀 Starting correction: Search for date ${WRONG_DATE} containing '${PROJECT_KEYWORD}'`);

    // 1. FIND Source Entry (Query by date, don't assume ID)
    const sourceQuery = db.collection('journal_entries').where('date', '==', WRONG_DATE);
    const sourceSnap = await sourceQuery.get();

    if (sourceSnap.empty) {
        console.error(`❌ No journal entries found for date ${WRONG_DATE}!`);
        // Fallback check by ID direct just in case
        const directDoc = await db.collection('journal_entries').doc(WRONG_DATE).get();
        if (directDoc.exists) {
            console.log("⚠️ Found entry by direct ID match though query failed? Using it.");
            await processEntry(directDoc);
        }
        return;
    }

    // Process all matching entries (usually just 1, maybe per tenant)
    for (const doc of sourceSnap.docs) {
        await processEntry(doc);
    }

    async function processEntry(sourceDoc) {
        const sourceData = sourceDoc.data();
        const sourceId = sourceDoc.id; // THE REAL ID used in tasks
        console.log(`\n📄 Processing Doc ID: ${sourceId} (Tenant: ${sourceData.tenantId})`);

        const sourceProjects = sourceData.projects || [];
        const projIndex = sourceProjects.findIndex(p => p.name.toLowerCase().includes(PROJECT_KEYWORD.toLowerCase()));

        if (projIndex === -1) {
            console.log(`⚠️ Project matching '${PROJECT_KEYWORD}' not found in this doc. Skipping.`);
            return;
        }

        const projectToMove = sourceProjects[projIndex];
        console.log(`✅ Found project logic: ${projectToMove.name}`);

        // 2. Prepare Target
        // Logic: Target ID should follow same pattern as source if possible, or standard pattern
        // If sourceId is '3_2026-01-18', target should ideally be '3_2025-12-18'
        let targetId = CORRECT_DATE;
        if (sourceId.includes('_')) {
            const prefix = sourceId.split('_')[0];
            targetId = `${prefix}_${CORRECT_DATE}`;
        }

        console.log(`Target ID calculated: ${targetId}`);
        const targetRef = db.collection('journal_entries').doc(targetId);
        const targetDoc = await targetRef.get();

        if (targetDoc.exists) {
            console.log(`ℹ️ Target entry exists. Merging...`);
            const targetData = targetDoc.data();
            let targetProjects = targetData.projects || [];

            const existingTargetIndex = targetProjects.findIndex(p => p.name.toLowerCase().includes(PROJECT_KEYWORD.toLowerCase()));

            if (existingTargetIndex !== -1) {
                console.warn(`⚠️ Overwriting existing project entry in target.`);
                targetProjects[existingTargetIndex] = projectToMove;
            } else {
                targetProjects.push(projectToMove);
            }

            await targetRef.update({
                projects: targetProjects,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

        } else {
            console.log(`ℹ️ Creating new target entry...`);
            await targetRef.set({
                ...sourceData,
                id: targetId,
                date: CORRECT_DATE,
                projects: [projectToMove],
                createdAt: sourceData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // 3. Move Tasks using SOURCE ID
        console.log(`🔍 Looking for tasks with relatedJournalEntryId == '${sourceId}'...`);
        let tasksQuery = db.collection('tasks').where('relatedJournalEntryId', '==', sourceId);
        let tasksSnap = await tasksQuery.get();

        // Fallback: Check if tasks used the date string only?
        if (tasksSnap.empty && sourceId !== WRONG_DATE) {
            console.log(`🔍 No tasks found by ID. Checking by date string '${WRONG_DATE}'...`);
            tasksQuery = db.collection('tasks').where('relatedJournalEntryId', '==', WRONG_DATE);
            tasksSnap = await tasksQuery.get();
        }

        console.log(`Found ${tasksSnap.size} tasks to update.`);

        const batch = db.batch();
        tasksSnap.forEach(tDoc => {
            console.log(` - Updating Task: ${tDoc.data().title}`);
            batch.update(tDoc.ref, {
                relatedJournalEntryId: targetId,
                weekId: targetId.includes('_') ? targetId.split('_')[1] : targetId, // Best effort legacy weekId
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        if (!tasksSnap.empty) {
            await batch.commit();
            console.log(`✅ Tasks committed.`);
        }

        // 4. Cleanup Source
        if (sourceProjects.length === 1) {
            await sourceDoc.ref.delete();
            console.log(`🗑️ Source entry deleted (was empty).`);
        } else {
            const newSourceProjects = sourceProjects.filter((_, i) => i !== projIndex);
            await sourceDoc.ref.update({ projects: newSourceProjects });
            console.log(`✂️ Project removed from source.`);
        }
    }

    console.log(`\n🎉 FIXED Successfully.`);
}

fixJournalEntry().catch(console.error);

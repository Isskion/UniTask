
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function syncTaskCodes() {
    const projectId = 'DWXtB3YW0vii8A55ZQYR';
    const correctCode = 'VMS';
    const tenantId = '3';

    console.log(`--- SYNCING TASKS FOR PROJECT ${projectId} (${correctCode}) ---`);

    const snapshot = await db.collection('tasks')
        .where('tenantId', '==', tenantId)
        .where('projectId', '==', projectId)
        .get();

    if (snapshot.empty) {
        console.log("No tasks found for this project.");
        return;
    }

    const batch = db.batch();
    let count = 0;

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.projectCode !== correctCode) {
            console.log(`Updating Task ${doc.id} (${data.friendlyId}): Code '${data.projectCode}' -> '${correctCode}'`);
            // Optional: If friendlyId starts with old code, we *could* update it, but requested ONLY code update.
            // Keeping it safe: Only updating metadata field 'projectCode'.
            batch.update(doc.ref, { projectCode: correctCode });
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`✅ Successfully updated ${count} tasks to code '${correctCode}'.`);
    } else {
        console.log("All tasks already have the correct project code.");
    }
}

syncTaskCodes();

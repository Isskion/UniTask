
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function inspectConsultantGroup() {
    console.log("--- INSPECTING CONSULTANT GROUP ---");

    // Query for groups named "Consultant" or "Consultor"
    // We'll check tenant "1" (template) and maybe the user's tenant if known (from previous turn it was likely '12' or '20' or the one associated with 'daniel.delamo@unigis.com' -> '1')
    // Actually the user fix script set them to 'EzwcMQ72J3gCSuRYt9XJ' which is a group ID. Let's iterate all groups.

    const snapshot = await db.collection('permission_groups').get();

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.name.includes('Consult') || data.name.includes('onsult')) {
            console.log(`\nFound Group: ${data.name} (ID: ${doc.id})`);
            console.log(`- TenantId: ${data.tenantId}`);
            console.log(`- viewAccess:`, JSON.stringify(data.viewAccess, null, 2));
        }
    });
}

inspectConsultantGroup();

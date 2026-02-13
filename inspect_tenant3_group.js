
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function inspectTenant3Group() {
    const groupId = 'CzxVf8b4QEA0dAfE9qIH';
    console.log(`--- INSPECTING GROUP ${groupId} ---`);

    const doc = await db.collection('permission_groups').doc(groupId).get();

    if (!doc.exists) {
        console.log("Group does not exist!");
        return;
    }

    const data = doc.data();
    console.log(`Name: ${data.name}`);
    console.log(`TenantId: ${data.tenantId}`);
    // Check for new keys
    console.log(`viewAccess.knowledgeBase: ${data.viewAccess?.knowledgeBase}`);
    console.log(`viewAccess.dispoPlan: ${data.viewAccess?.dispoPlan}`);
    console.log(`viewAccess.unavailabilityRegistry: ${data.viewAccess?.unavailabilityRegistry}`);
    console.log(`viewAccess FULL:`, JSON.stringify(data.viewAccess, null, 2));
}

inspectTenant3Group();

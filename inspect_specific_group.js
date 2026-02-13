
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function inspectTargetGroup() {
    const groupId = 'EzwcMQ72J3gCSuRYt9XJ';
    console.log(`--- INSPECTING GROUP ${groupId} ---`);

    const doc = await db.collection('permission_groups').doc(groupId).get();

    if (!doc.exists) {
        console.log("Group does not exist!");
        return;
    }

    const data = doc.data();
    console.log(`Name: ${data.name}`);
    console.log(`TenantId: ${data.tenantId}`);
    console.log(`viewAccess:`, JSON.stringify(data.viewAccess, null, 2));
}

inspectTargetGroup();

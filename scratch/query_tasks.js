const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function run() {
    const snapshot = await db.collection('tasks').get();
    console.log(`Total tasks in Firestore: ${snapshot.size}`);

    const tenants = {};
    let activeCount = 0;
    let inactiveCount = 0;

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const tenant = data.tenantId || 'no_tenant';
        if (!tenants[tenant]) {
            tenants[tenant] = { active: 0, inactive: 0 };
        }
        if (data.isActive !== false) {
            tenants[tenant].active++;
            activeCount++;
        } else {
            tenants[tenant].inactive++;
            inactiveCount++;
        }
    });

    console.log('\nBreakdown by Tenant:');
    console.table(tenants);

    console.log(`\nGlobal stats:`);
    console.log(`Active: ${activeCount}`);
    console.log(`Inactive: ${inactiveCount}`);
}

run().catch(console.error);

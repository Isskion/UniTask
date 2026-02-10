const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
    console.log("Searching for tenant 'Gabriel Arcos'...");
    // Try exact match or partial
    const tenants = await db.collection('tenants').get();
    let targetTenantId = null;

    tenants.forEach(doc => {
        const data = doc.data();
        if (data.name && data.name.toLowerCase().includes('gabriel')) {
            console.log(`Found Tenant: ${data.name} (ID: ${doc.id})`);
            targetTenantId = doc.id;
        }
    });

    if (!targetTenantId) {
        console.log("Tenant not found.");
        return;
    }

    console.log(`Listing tasks for Tenant ${targetTenantId}...`);
    const tasks = await db.collection('tasks').where('tenantId', '==', targetTenantId).get();

    if (tasks.empty) {
        console.log("No tasks found for this tenant.");
    } else {
        console.log(`Found ${tasks.size} tasks:`);
        tasks.forEach(doc => {
            const t = doc.data();
            console.log(`- [${t.code || doc.id}] ${t.title} (Status: ${t.status})`);
        });
    }

    // Also check if tasks exist WITHOUT tenantId but with project related to this tenant?
    // That's harder.
}

check().catch(console.error);

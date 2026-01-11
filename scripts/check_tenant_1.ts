
const admin = require('firebase-admin');

// Service Account setup (assuming standard environment or local emulator)
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function checkAndFixTenant1() {
    console.log("Checking Tenant 1...");
    const tenantRef = db.collection('tenants').doc('1');
    const doc = await tenantRef.get();

    if (!doc.exists) {
        console.log("Tenant 1 does not exist. Creating...");
        await tenantRef.set({
            id: '1',
            name: 'UniTaskController',
            code: 'UTC',
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log("Tenant 1 created: UniTaskController");
    } else {
        const data = doc.data();
        if (data.name !== 'UniTaskController') {
            console.log(`Tenant 1 exists but name is '${data.name}'. Updating to 'UniTaskController'...`);
            await tenantRef.update({
                name: 'UniTaskController',
                code: 'UTC',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log("Tenant 1 updated.");
        } else {
            console.log("Tenant 1 is already correct: UniTaskController");
        }
    }
}

checkAndFixTenant1().catch(console.error);


const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function relinkConsultants() {
    console.log("--- RELINKING CONSULTANTS IN TENANT 3 ---");

    const newGroupId = 'zkHq8MpGD0SnkgAWdFbx'; // Restored 'Consultor' group

    // Check for both 'consultor' and 'consultant' roles
    const roles = ['consultor', 'consultant', 'Consultor', 'Consultant'];

    const snapshot = await db.collection('users')
        .where('tenantId', '==', '3')
        .where('role', 'in', roles)
        .get();

    if (snapshot.empty) {
        console.log("No consultant users found to update.");
        return;
    }

    const batch = db.batch();
    let count = 0;

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.permissionGroupId !== newGroupId) {
            console.log(`Updating ${data.email} (${doc.id}) -> Group: ${newGroupId}`);
            batch.update(doc.ref, { permissionGroupId: newGroupId });
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`✅ Successfully updated ${count} users.`);
    } else {
        console.log("All consultants are already linked correctly.");
    }
}

relinkConsultants();


const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function inspectNewConsultant() {
    console.log("--- FINDING 'Consultor' IN TENANT 3 ---");
    const snapshot = await db.collection('permission_groups')
        .where('tenantId', '==', '3')
        .where('name', '==', 'Consultor')
        .get();

    if (snapshot.empty) {
        console.log("No 'Consultor' group found in Tenant 3!");
    } else {
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`\nID: ${doc.id}`);
            console.log(`Name: ${data.name}`);
            console.log(`Desc: ${data.description}`);
            console.log(`viewAccess:`, JSON.stringify(data.viewAccess, null, 2));
        });
    }

    console.log("\n--- CHECKING USER ASSIGNMENT ---");
    const userEmail = 'daniel.delamo@unigis.com';
    const usersSnap = await db.collection('users').where('email', '==', userEmail).get();
    if (!usersSnap.empty) {
        const uData = usersSnap.docs[0].data();
        console.log(`User ${userEmail} is assigned to group: ${uData.permissionGroupId}`);
        console.log(`User Tenant: ${uData.tenantId}`);
        console.log(`User Role (legacy): ${uData.role}`);
    }
}

inspectNewConsultant();

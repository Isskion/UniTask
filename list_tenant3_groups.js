
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function listTenant3Groups() {
    console.log("--- LISTING GROUPS FOR TENANT 3 ---");
    const snapshot = await db.collection('permission_groups').where('tenantId', '==', '3').get();

    if (snapshot.empty) {
        console.log("No groups found in Tenant 3.");
    } else {
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`[${doc.id}] Name: ${data.name}, CreatedBy: ${data.createdBy || 'unknown'}, UpdatedAt: ${data.updatedAt?.toDate()}`);
        });
    }

    console.log("\n--- CHECKING USER ASSIGNMENT ---");
    const userEmail = 'daniel.delamo@unigis.com';
    const usersSnap = await db.collection('users').where('email', '==', userEmail).get();
    if (!usersSnap.empty) {
        const uData = usersSnap.docs[0].data();
        console.log(`User ${userEmail} is assigned to group: ${uData.permissionGroupId}`);
    }
}

listTenant3Groups();

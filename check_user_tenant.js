
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkUserTenant() {
    const userEmail = 'daniel.delamo@unigis.com';
    const usersSnap = await db.collection('users').where('email', '==', userEmail).get();

    if (usersSnap.empty) {
        console.log("User not found!");
        return;
    }

    const userData = usersSnap.docs[0].data();
    console.log(`User: ${userEmail}`);
    console.log(`TenantId: ${userData.tenantId}`);
    console.log(`Assigned Group: ${userData.permissionGroupId}`);
}

checkUserTenant();

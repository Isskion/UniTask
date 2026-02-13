
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function inspectUserSafe() {
    const userEmail = 'daniel.delamo@unigis.com';
    console.log(`--- INSPECTING USER: ${userEmail} ---`);

    const usersSnap = await db.collection('users').where('email', '==', userEmail).get();

    if (usersSnap.empty) {
        console.log("User not found!");
        return;
    }

    const userData = usersSnap.docs[0].data();
    console.log(`TenantId: ${userData.tenantId}`);
    console.log(`Role (Legacy): ${userData.role}`);
    console.log(`Role Level: ${userData.roleLevel}`);
    console.log(`Assigned Group ID: ${userData.permissionGroupId}`);

    if (userData.permissionGroupId) {
        const groupDoc = await db.collection('permission_groups').doc(userData.permissionGroupId).get();
        if (groupDoc.exists) {
            const gData = groupDoc.data();
            console.log(`\n--- ASSIGNED GROUP (${userData.permissionGroupId}) ---`);
            console.log(`Group Name: ${gData.name}`);
            console.log(`Group Tenant: ${gData.tenantId}`);
            console.log(`Special Permissions:`, JSON.stringify(gData.specialPermissions, null, 2));
        } else {
            console.log(`\n--- ASSIGNED GROUP (${userData.permissionGroupId}) ---`);
            console.log("DOES NOT EXIST");
        }
    }
}

inspectUserSafe();

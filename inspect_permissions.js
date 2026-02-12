
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function inspectMismatch() {
    console.log("--- INSPECTING PERMISSION MISMATCH ---");

    // 1. Check User
    const userEmail = 'daniel.delamo@unigis.com';
    console.log(`\nLooking for user: ${userEmail}`);
    const usersSnap = await db.collection('users').where('email', '==', userEmail).get();

    if (usersSnap.empty) {
        console.log("❌ User not found!");
        return;
    }

    const userDoc = usersSnap.docs[0];
    const userData = userDoc.data();
    console.log(`User Found: ${userDoc.id}`);
    console.log(`- Role: ${userData.role}`);
    console.log(`- TenantId: ${userData.tenantId}`);
    console.log(`- Assigned PermissionGroupId: ${userData.permissionGroupId}`);

    // 2. Check Assigned Group (The "Ghost" one)
    const ghostId = userData.permissionGroupId; // likely lXL2stBtlFrxNfUJQKFc
    if (ghostId) {
        const ghostSnap = await db.collection('permission_groups').doc(ghostId).get();
        console.log(`\nChecking Assigned Group (${ghostId}):`);
        if (ghostSnap.exists) {
            const data = ghostSnap.data();
            console.log(`- Exists: YES`);
            console.log(`- Name: ${data.name}`);
            console.log(`- TenantId: ${data.tenantId}`);
            console.log(`- UnavailabilityRegistry Access: ${data.viewAccess?.unavailabilityRegistry}`);
        } else {
            console.log(`- Exists: NO (Deleted?)`);
        }
    }

    // 3. Check The Group User Expects (EzwcMQ72J3gCSuRYt9XJ)
    const correctId = 'EzwcMQ72J3gCSuRYt9XJ';
    console.log(`\nChecking Expected Group (${correctId}):`);
    const correctSnap = await db.collection('permission_groups').doc(correctId).get();
    if (correctSnap.exists) {
        const data = correctSnap.data();
        console.log(`- Exists: YES`);
        console.log(`- Name: ${data.name}`);
        console.log(`- TenantId: ${data.tenantId}`);
        console.log(`- UnavailabilityRegistry Access: ${data.viewAccess?.unavailabilityRegistry}`);
    } else {
        console.log(`- Exists: NO`);
    }

    console.log("\n--- SUGGESTED FIX ---");
    if (ghostId !== correctId) {
        console.log(`Update user ${userDoc.id} to use group ${correctId}`);
    }
}

inspectMismatch();

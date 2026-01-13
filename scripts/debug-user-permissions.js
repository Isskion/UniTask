const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function inspectUser() {
    const email = 'daniel.delamo@unigis.com';
    console.log(`Inspecting user: ${email}...`);

    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log(`Auth UID: ${userRecord.uid}`);

        const userDoc = await db.collection('users').doc(userRecord.uid).get();
        if (!userDoc.exists) {
            console.log('No Firestore profile found!');
            return;
        }

        const data = userDoc.data();
        console.log('Firestore Profile:', JSON.stringify(data, null, 2));

        if (data.permissionGroupId) {
            console.log(`\nChecking Permission Group: ${data.permissionGroupId}`);
            const groupDoc = await db.collection('permission_groups').doc(data.permissionGroupId).get();
            if (groupDoc.exists) {
                console.log('Group Data:', JSON.stringify(groupDoc.data(), null, 2));
                if (groupDoc.data().tenantId !== data.tenantId) {
                    console.error(`\n[CRITICAL MISMATCH] User Tenant (${data.tenantId}) != Group Tenant (${groupDoc.data().tenantId})`);
                    console.log('This is likely the cause of the "Missing Permissions" error in the client.');
                }
            } else {
                console.log('Permission Group document does not exist.');
            }
        } else {
            console.log('\nNo permissionGroupId assigned. Using Legacy Role Map.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

inspectUser();

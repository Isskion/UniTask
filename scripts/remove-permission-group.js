const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixUser() {
    const email = 'daniel.delamo@unigis.com';
    console.log(`Fixing user: ${email}...`);

    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log(`Auth UID: ${userRecord.uid}`);

        // Remove permissionGroupId to fallback to legacy role
        await db.collection('users').doc(userRecord.uid).update({
            permissionGroupId: admin.firestore.FieldValue.delete()
        });

        console.log('✅ Successfully removed invalid permissionGroupId.');
        console.log('User will now use LEGACY_ROLE_MAP["consultor"].');

    } catch (error) {
        console.error('Error:', error);
    }
}

fixUser();

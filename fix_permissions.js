
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function fixPermissions() {
    const userEmail = 'daniel.delamo@unigis.com';
    const usersSnap = await db.collection('users').where('email', '==', userEmail).get();

    if (usersSnap.empty) {
        console.log("User not found!");
        return;
    }

    const userDoc = usersSnap.docs[0];
    const newGroupId = 'EzwcMQ72J3gCSuRYt9XJ'; // Confirmed by user as the correct group in UI

    console.log(`Updating user ${userDoc.id} (${userEmail}) to use group ${newGroupId}...`);

    await userDoc.ref.update({
        permissionGroupId: newGroupId
    });

    console.log("✅ User permissions updated successfully.");
}

fixPermissions();

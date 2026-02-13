
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function moveUserToTenant1() {
    const userEmail = 'daniel.delamo@unigis.com';
    const usersSnap = await db.collection('users').where('email', '==', userEmail).get();

    if (usersSnap.empty) {
        console.log("User not found!");
        return;
    }

    const userDoc = usersSnap.docs[0];
    console.log(`Moving user ${userDoc.id} from Tenant ${userDoc.data().tenantId} to Tenant 1...`);

    await userDoc.ref.update({
        tenantId: '1'
    });

    console.log("✅ User tenant updated successfully.");
}

moveUserToTenant1();

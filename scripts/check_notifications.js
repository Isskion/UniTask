
const admin = require('firebase-admin');
const serviceAccount = require('../minuta-f75a4-firebase-adminsdk-fbsvc-b6ad547134.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkNotifications() {
    const targetUserId = 'YYmPVQhCJUXrjgKgDj07G4aeuQ42'; // cursoia
    console.log(`Checking notifications for user: ${targetUserId}...`);

    const snapshot = await db.collection('notifications')
        .where('userId', '==', targetUserId)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

    if (snapshot.empty) {
        console.log("No notifications found for this user.");
        return;
    }

    snapshot.forEach(doc => {
        console.log(`[${doc.id}] FOUND! | Title: ${doc.data().title} | Time: ${doc.data().createdAt?.toDate()}`);
    });
}

checkNotifications().catch(console.error);

const admin = require('firebase-admin');

const admin = require('firebase-admin');

// Initialize Firebase Admin (Using Environment Variable or Default Google Application Credentials)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
}

const db = admin.firestore();

async function cleanupInvites() {
    console.log("🗑️  Starting cleanup of 'invites' collection...");

    const invitesParams = await db.collection('invites').get();

    if (invitesParams.empty) {
        console.log("✅ No invites found to delete.");
        return;
    }

    const batch = db.batch();
    let count = 0;

    invitesParams.docs.forEach(doc => {
        batch.delete(doc.ref);
        count++;
    });

    await batch.commit();
    console.log(`✅ Successfully deleted ${count} invites.`);
}

cleanupInvites().catch(console.error);

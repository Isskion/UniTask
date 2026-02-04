const admin = require('firebase-admin');
const path = require('path');

// Resolve path to the root serviceAccountKey.json
const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function main() {
    // List all invites
    console.log("Listing invites...");
    try {
        const snapshot = await db.collection('invites').get();
        if (snapshot.empty) {
            console.log("No invites found.");
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`Code: ${doc.id}`);
            console.log(`  - Used: ${data.isUsed}`);
            console.log(`  - UsedBy: ${data.usedBy}`);
            console.log(`  - Role: ${data.role}`);
            console.log(`  - Tenant: ${data.tenantId}`);
            console.log('---');

            // NOTE: If you know the specific code that is "stuck", you can uncomment the lines below to delete it safely.
            // if (doc.id === 'YOUR_STUCK_CODE') {
            //    await db.collection('invites').doc(doc.id).delete();
            //    console.log(`Deleted stuck invite: ${doc.id}`);
            // }
        });
    } catch (error) {
        console.error("Error fetching invites:", error);
    }
}

main();

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const auth = admin.auth();

async function checkUser(email) {
    console.log(`\n🔍 Checking User: ${email}`);
    try {
        // 1. Check Auth User
        const userRecord = await auth.getUserByEmail(email);
        console.log(`\n[Auth System]`);
        console.log(`UID: ${userRecord.uid}`);
        console.log(`Custom Claims:`, JSON.stringify(userRecord.customClaims, null, 2));

        // 2. Check Firestore Profile
        console.log(`\n[Firestore 'users' Collection]`);
        const docRef = db.collection('users').doc(userRecord.uid);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            console.log(`found document:`, JSON.stringify(docSnap.data(), null, 2));
        } else {
            console.error(`❌ No User Profile found in Firestore for ID ${userRecord.uid}`);
        }

    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        process.exit();
    }
}

checkUser('daniel.delamo@unigis.com');

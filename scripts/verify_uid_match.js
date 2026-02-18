const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Read .env.local
const dotEnvPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(dotEnvPath, 'utf8');
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT="({.*})"/);
let serviceAccount;

if (match && match[1]) {
    serviceAccount = JSON.parse(match[1]);
} else {
    // Try single quotes
    const match2 = envContent.match(/FIREBASE_SERVICE_ACCOUNT='({.*})'/);
    if (match2) serviceAccount = JSON.parse(match2[1]);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function verifyUser() {
    const email = 'daniel.delamo@unigis.com';
    const result = { email, authUid: null, firestoreDocId: null, match: false, firestoreData: null };

    try {
        // 1. Get Auth UID
        try {
            const userRecord = await admin.auth().getUserByEmail(email);
            result.authUid = userRecord.uid;
        } catch (e) {
            result.authError = e.message;
        }

        // 2. Get Firestore Doc
        const snapshot = await db.collection('users').where('email', '==', email).get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            result.firestoreDocId = doc.id;
            result.firestoreData = doc.data();
            // Checking only the first match, assuming email uniqueness in FS
            if (snapshot.size > 1) {
                result.warning = "Multiple Firestore documents found with this email!";
            }
        } else {
            result.firestoreError = "No document found in 'users' collection with this email.";
        }

        // 3. Compare
        if (result.authUid && result.firestoreDocId) {
            result.match = (result.authUid === result.firestoreDocId);
        }

        fs.writeFileSync('uid_verification.json', JSON.stringify(result, null, 2));
        console.log("Verification complete. Written to uid_verification.json");

    } catch (error) {
        console.error("Script error:", error);
    }
}

verifyUser();

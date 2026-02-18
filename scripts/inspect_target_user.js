const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const dotEnvPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(dotEnvPath)) {
    console.error(".env.local not found at", dotEnvPath);
    process.exit(1);
}

const envContent = fs.readFileSync(dotEnvPath, 'utf8');
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT="({.*})"/);
let serviceAccount;

if (match && match[1]) {
    try {
        serviceAccount = JSON.parse(match[1]);
    } catch (e) {
        console.error("Error parsing JSON:", e);
        process.exit(1);
    }
} else {
    // Try single quotes
    const match2 = envContent.match(/FIREBASE_SERVICE_ACCOUNT='({.*})'/);
    if (match2) {
        serviceAccount = JSON.parse(match2[1]);
    } else {
        console.error("Could not find FIREBASE_SERVICE_ACCOUNT");
        process.exit(1);
    }
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function inspectUser() {
    const email = 'daniel.delamo@unigis.com';
    console.log(`Looking for user with email: ${email}`);

    try {
        // 1. Check Auth (listing by email)
        try {
            const userRecord = await admin.auth().getUserByEmail(email);
            console.log("✅ Auth Record Found:");
            console.log(JSON.stringify(userRecord.toJSON(), null, 2));
        } catch (authError) {
            console.log("❌ Auth Record NOT FOUND or error:", authError.message);
        }

        // 2. Check Firestore (query by email)
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', email).get();

        if (snapshot.empty) {
            console.log("❌ No Firestore profile found with this email!");
            return;
        }

        snapshot.forEach(doc => {
            console.log(`\n✅ Firestore Profile Found (ID: ${doc.id}):`);
            const data = doc.data();
            console.log(JSON.stringify(data, null, 2));

            // Logic Checks
            if (!data.tenantId) console.log("⚠️ WARNING: Missing tenantId");
            if (data.tenantId === "unknown") console.log("⚠️ WARNING: tenantId is 'unknown'");
            if (data.isActive === false) console.log("⚠️ WARNING: User is marked inactive (isActive: false)");
        });

    } catch (error) {
        console.error("Error during inspection:", error);
    }
}

inspectUser();

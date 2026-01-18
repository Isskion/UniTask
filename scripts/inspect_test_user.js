const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey-prod.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: "minuta-f75a4"
    });
}
const db = admin.firestore();

async function inspect() {
    const email = "daniel.delamo@unigis.com";
    console.log(`Inspecting user: ${email}`);

    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log("Auth User Found:");
        console.log(`- UID: ${userRecord.uid}`);
        console.log(`- Claims:`, userRecord.customClaims);

        const userDoc = await db.collection("users").doc(userRecord.uid).get();
        if (userDoc.exists) {
            console.log("Firestore Profile:");
            console.log(JSON.stringify(userDoc.data(), null, 2));
        } else {
            console.error("Firestore Profile NOT FOUND in 'users' collection");
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

inspect();

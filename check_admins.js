const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const dotEnvPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(dotEnvPath, 'utf8');
const serviceAccountMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT='(.*?)'/);
const serviceAccount = JSON.parse(serviceAccountMatch[1]);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAdmins() {
    console.log("Searching for admins...");

    console.log("\n--- Users with roleLevel >= 100 ---");
    const snapLevel = await db.collection('users').where('roleLevel', '>=', 100).get();
    snapLevel.forEach(doc => {
        console.log(`- [${doc.id}] Email: ${doc.data().email}, Role: ${doc.data().role}, Level: ${doc.data().roleLevel}`);
    });

    console.log("\n--- Users with role == 'superadmin' ---");
    const snapRole = await db.collection('users').where('role', '==', 'superadmin').get();
    snapRole.forEach(doc => {
        console.log(`- [${doc.id}] Email: ${doc.data().email}, Role: ${doc.data().role}, Level: ${doc.data().roleLevel}`);
    });
}

checkAdmins().catch(console.error);

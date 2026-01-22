const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const dotEnvPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(dotEnvPath, 'utf8');
const serviceAccountMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT='(.*?)'/);
if (!serviceAccountMatch) {
    console.error("Could not find FIREBASE_SERVICE_ACCOUNT in .env.local");
    process.exit(1);
}
const serviceAccount = JSON.parse(serviceAccountMatch[1]);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listUsers() {
    console.log("Listing all users...");
    const snap = await db.collection('users').get();
    console.log(`Found ${snap.size} users.`);
    snap.forEach(doc => {
        const data = doc.data();
        console.log(`- [${doc.id}] Email: ${data.email}, Role: ${data.role}, Level: ${data.roleLevel}, Tenant: ${data.tenantId || data.organizationId}`);
    });
}

listUsers().catch(console.error);

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

async function findUser() {
    const email = 'daniel.delamo@unigis.com';
    const snap = await db.collection('users').where('email', '==', email).get();
    if (snap.empty) {
        console.log(`User ${email} not found.`);
        return;
    }
    snap.forEach(doc => {
        const data = doc.data();
        console.log(`User: ${email}`);
        console.log(`Role: ${data.role}`);
        console.log(`RoleLevel: ${data.roleLevel}`);
        console.log(`OrganizationId: ${data.organizationId}`);
        console.log(`TenantId: ${data.tenantId}`);
    });
}

findUser().catch(console.error);

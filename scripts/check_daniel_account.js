
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const auth = admin.auth();
const TARGET_EMAIL = 'daniel.delamo@unigis.com';

async function checkAccount() {
    console.log(`\n🔍 CHECKING ACCOUNT STATUS FOR: ${TARGET_EMAIL}`);
    try {
        const user = await auth.getUserByEmail(TARGET_EMAIL);
        console.log(`✅ User found: ${user.uid}`);
        console.log(`📊 Provider: ${JSON.stringify(user.providerData.map(p => p.providerId))}`);
        console.log(`📊 Disabled: ${user.disabled}`);
        console.log(`📊 Email Verified: ${user.emailVerified}`);
        console.log(`📊 Metadata: ${JSON.stringify(user.metadata)}`);
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit();
    }
}

checkAccount();

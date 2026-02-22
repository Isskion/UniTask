
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const auth = admin.auth();
const TARGET_EMAIL = 'daniel.delamo@unigis.com';

async function verifyAuth() {
    console.log(`\n🔍 VERIFYING AUTH STATE FOR: ${TARGET_EMAIL}`);

    try {
        const user = await auth.getUserByEmail(TARGET_EMAIL);
        console.log(`✅ UID: ${user.uid}`);
        console.log(`📊 Email Verified: ${user.emailVerified}`);
        console.log(`📊 Disabled: ${user.disabled}`);
        console.log(`📊 Metadata:`, JSON.stringify(user.metadata, null, 2));
        console.log(`📊 Providers:`, JSON.stringify(user.providerData.map(p => ({
            providerId: p.providerId,
            email: p.email,
            uid: p.uid
        })), null, 2));

        const claims = user.customClaims || {};
        console.log(`📊 Custom Claims:`, JSON.stringify(claims, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit();
    }
}

verifyAuth();

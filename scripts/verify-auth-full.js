
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const auth = admin.auth();
const TARGET_EMAIL = 'daniel.delamo@unigis.com';

async function diagnose() {
    console.log(`\n--- FINAL DIAGNOSIS for ${TARGET_EMAIL} ---`);
    console.log(`Current Time (UTC): ${new Date().toISOString()}`);

    try {
        const user = await auth.getUserByEmail(TARGET_EMAIL);
        console.log(`UID: ${user.uid}`);
        console.log(`Creation Time: ${user.metadata.creationTime}`);
        console.log(`Last Sign-In: ${user.metadata.lastSignInTime}`);
        console.log(`Last Refresh: ${user.metadata.lastRefreshTime || 'N/A'}`);

        console.log(`\nProviders:`);
        user.providerData.forEach(p => {
            console.log(`  - ${p.providerId} (${p.email})`);
        });

        console.log(`\nClaims:`, JSON.stringify(user.customClaims, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit();
    }
}

diagnose();

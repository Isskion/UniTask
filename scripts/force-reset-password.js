
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const TARGET_EMAIL = 'daniel.delamo@unigis.com';
const NEW_PASSWORD = 'password123'; // Temporary known password

async function forceReset() {
    console.log(`🚀 Attempting to find and reset password for: ${TARGET_EMAIL}`);

    try {
        const user = await auth.getUserByEmail(TARGET_EMAIL);
        console.log(`✅ Found user: ${user.uid}`);
        console.log(`📊 Metadata - Last Login: ${user.metadata.lastSignInTime}`);
        console.log(`📊 Metadata - Last Updated: ${user.metadata.lastRefreshTime || 'N/A'}`);

        await auth.updateUser(user.uid, {
            password: NEW_PASSWORD
        });

        console.log(`\n✅ SUCCESS: Password for ${TARGET_EMAIL} has been reset to: ${NEW_PASSWORD}`);
        console.log(`⚠️ Please ask the user to log in with this password and then change it immediately.`);

    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.error(`❌ User ${TARGET_EMAIL} not found in Firebase Auth.`);
        } else {
            console.error('❌ Error during force reset:', error);
        }
    } finally {
        process.exit();
    }
}

forceReset();


const admin = require('firebase-admin');
const { resolve } = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const serviceAccountPath = resolve(__dirname, '../serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();

async function checkClaims() {
    const email = 'daniel.delamo@unigis.com';
    try {
        const user = await auth.getUserByEmail(email);
        console.log(`User: ${user.email} (${user.uid})`);
        console.log('Custom Claims:', JSON.stringify(user.customClaims, null, 2));
    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit(0);
    }
}

checkClaims();

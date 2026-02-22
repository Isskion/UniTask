
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const auth = admin.auth();
const TARGET_EMAIL = 'daniel.delamo@unigis.com';

async function checkDuplicates() {
    console.log(`\n🔍 CHECKING FOR MULTIPLE ACCOUNTS: ${TARGET_EMAIL}`);

    try {
        const users = [];
        let nextPageToken;

        do {
            const result = await auth.listUsers(1000, nextPageToken);
            result.users.forEach(u => {
                if (u.email && u.email.toLowerCase() === TARGET_EMAIL.toLowerCase()) {
                    users.push({
                        uid: u.uid,
                        email: u.email,
                        creationTime: u.metadata.creationTime,
                        lastSignIn: u.metadata.lastSignInTime,
                        providers: u.providerData.map(p => p.providerId)
                    });
                }
            });
            nextPageToken = result.pageToken;
        } while (nextPageToken);

        console.log(`Found ${users.length} accounts for ${TARGET_EMAIL}`);
        console.log(JSON.stringify(users, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit();
    }
}

checkDuplicates();

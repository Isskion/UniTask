
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const auth = admin.auth();

async function findDuplicates() {
    console.log('🔍 SEARCHING FOR ALL DUPLICATE EMAILS IN AUTH...');

    try {
        const emailMap = new Map();
        let nextPageToken;

        do {
            const result = await auth.listUsers(1000, nextPageToken);
            result.users.forEach(u => {
                if (u.email) {
                    const email = u.email.toLowerCase();
                    if (!emailMap.has(email)) {
                        emailMap.set(email, []);
                    }
                    emailMap.get(email).push({
                        uid: u.uid,
                        creationTime: u.metadata.creationTime,
                        lastSignIn: u.metadata.lastSignInTime
                    });
                }
            });
            nextPageToken = result.pageToken;
        } while (nextPageToken);

        const duplicates = [];
        emailMap.forEach((users, email) => {
            if (users.length > 1) {
                duplicates.push({ email, users });
            }
        });

        console.log(`Found ${duplicates.length} duplicate emails.`);
        console.log(JSON.stringify(duplicates, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit();
    }
}

findDuplicates();

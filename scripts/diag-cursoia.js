const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function findUser() {
    console.log('🔍 Searching for user: cursoiadaniel...');

    try {
        const usersSnap = await db.collection('users').get();
        let targetUser = null;

        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.email && data.email.toLowerCase().includes('cursoiadaniel')) {
                targetUser = { uid: doc.id, ...data };
            }
        });

        if (targetUser) {
            console.log('✅ User found in Firestore:');
            console.log(JSON.stringify(targetUser, null, 2));

            const authUser = await auth.getUser(targetUser.uid);
            console.log('\n🔐 Auth Custom Claims:');
            console.log(JSON.stringify(authUser.customClaims || {}, null, 2));
        } else {
            console.log('❌ User not found in Firestore "users" collection.');

            // Try searching by Auth email
            try {
                const authUser = await auth.getUserByEmail('cursoiadaniel@gmail.com'); // guessing common domain or search suffix
                console.log('❓ Found in Auth but not Firestore:', authUser.uid);
            } catch (authError) {
                console.log('❌ Also not found in Firebase Auth by guessed email.');
            }

            // List some recent users
            console.log('\n📋 Recent users in Firestore:');
            const recentUsers = await db.collection('users').orderBy('updatedAt', 'desc').limit(5).get();
            recentUsers.forEach(doc => {
                console.log(`- ${doc.data().email} (${doc.id})`);
            });
        }

    } catch (error) {
        console.error('💥 Error:', error);
    } finally {
        process.exit(0);
    }
}

findUser();

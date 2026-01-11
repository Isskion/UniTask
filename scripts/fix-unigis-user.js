const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const auth = admin.auth();

const TARGET_EMAIL = 'daniel.delamo@unigis.com';
const TARGET_TENANT = '3'; // Unigis
const TARGET_ROLE = 40; // Consultor

async function fixUser() {
    console.log(`\n🔧 Fixing user: ${TARGET_EMAIL}...`);
    try {
        // 1. Get Auth Record
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(TARGET_EMAIL);
            console.log(`✅ Found Auth User: ${userRecord.uid}`);
        } catch (e) {
            console.log(`❌ User not found in Auth. Creating...`);
            userRecord = await auth.createUser({
                email: TARGET_EMAIL,
                password: 'password123', // Temporary
                displayName: 'Daniel Del Amo (Unigis)'
            });
            console.log(`✅ Created Auth User: ${userRecord.uid}`);
        }

        // 2. Check/Create Firestore Doc
        const userRef = db.collection('users').doc(userRecord.uid);
        const doc = await userRef.get();

        if (doc.exists) {
            console.log(`⚠️ Firestore doc exists. Updating...`);
            await userRef.update({
                tenantId: TARGET_TENANT,
                role: TARGET_ROLE,
                isActive: true
            });
        } else {
            console.log(`✅ Firestore doc missing. Creating...`);
            await userRef.set({
                uid: userRecord.uid,
                email: TARGET_EMAIL,
                displayName: userRecord.displayName || 'Daniel Unigis',
                role: TARGET_ROLE, // Consultor
                tenantId: TARGET_TENANT,
                isActive: true,
                assignedProjectIds: [], // Empty for now
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // 3. Set Custom Claims (Just in case)
        await auth.setCustomUserClaims(userRecord.uid, {
            role: TARGET_ROLE,
            tenantId: TARGET_TENANT
        });
        console.log(`✅ Custom Claims set.`);

        console.log(`\n🎉 User fixed successfully! Ask user to refresh.`);

    } catch (e) {
        console.error("Error:", e);
    }
}

fixUser();

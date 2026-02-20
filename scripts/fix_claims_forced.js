
const admin = require('firebase-admin');
const { resolve } = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: resolve(__dirname, '../.env.local') });

if (!admin.apps.length) {
    try {
        const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (serviceAccountRaw) {
            const serviceAccount = JSON.parse(serviceAccountRaw);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp({ projectId: "minuta-f75a4" });
        }
    } catch (e) {
        admin.initializeApp({ projectId: "minuta-f75a4" });
    }
}

const db = admin.firestore();
const auth = admin.auth();

async function fixUser(uid) {
    console.log(`🚀 Fixing user claims for UID: ${uid}...`);

    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            console.error('❌ User not found in Firestore.');
            return;
        }

        const data = userDoc.data();
        const claims = {
            tenantId: String(data.tenantId || '1'),
            roleLevel: Number(data.roleLevel || 20),
            role: String(data.role || 'team_member'),
            isActive: true
        };

        console.log('📦 Setting claims:', JSON.stringify(claims, null, 2));
        await auth.setCustomUserClaims(uid, claims);

        // Verify
        const updatedUser = await auth.getUser(uid);
        console.log('✅ Updated Auth Claims:', JSON.stringify(updatedUser.customClaims, null, 2));

        console.log('\n✨ DONE!');
    } catch (error) {
        console.error('💥 Error:', error);
    } finally {
        process.exit(0);
    }
}

const uidToFix = process.argv[2] || 'spXyzUi0NUZXRlqUOrMep8';
fixUser(uidToFix);

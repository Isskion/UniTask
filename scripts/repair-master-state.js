
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const auth = admin.auth();

const TARGET_EMAIL = 'daniel.delamo@unigis.com';
const TARGET_UID = '6C9ZN0mfngNb5gIAWw1EMSaQcRR2';
const CORRECT_TENANT = '3';
const CORRECT_ROLE_LEVEL = 80;

async function repairMasterState() {
    console.log('🚀 Starting MASTER REPAIR for:', TARGET_EMAIL);

    try {
        // 1. Verify Auth Record
        const user = await auth.getUser(TARGET_UID);
        console.log('✅ Auth user found:', user.uid);

        // 2. Repair Firestore Profile
        const userRef = db.collection('users').doc(TARGET_UID);
        const doc = await userRef.get();

        const updateData = {
            tenantId: CORRECT_TENANT,
            roleLevel: CORRECT_ROLE_LEVEL,
            role: 'app_admin',
            isActive: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (doc.exists) {
            console.log('🔄 Updating existing Firestore profile...');
            await userRef.update(updateData);
        } else {
            console.log('➕ Creating missing Firestore profile...');
            await userRef.set({
                uid: TARGET_UID,
                email: TARGET_EMAIL,
                displayName: user.displayName || 'Daniel Del Amo',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                ...updateData
            });
        }
        console.log('✅ Firestore state enforced.');

        // 3. Force Custom Claims
        const newClaims = {
            role: 'app_admin',
            roleLevel: CORRECT_ROLE_LEVEL,
            tenantId: CORRECT_TENANT,
            isActive: true,
            syncId: Date.now()
        };
        await auth.setCustomUserClaims(TARGET_UID, newClaims);
        console.log('✅ Custom Claims enforced:', newClaims);

        // 4. Force token refresh
        await auth.revokeRefreshTokens(TARGET_UID);
        console.log('✅ Refresh tokens revoked.');

        console.log('\n✨ MASTER REPAIR COMPLETE.');

    } catch (error) {
        console.error('❌ Repair failed:', error);
    } finally {
        process.exit();
    }
}

repairMasterState();

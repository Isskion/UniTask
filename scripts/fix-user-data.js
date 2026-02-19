const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function fixUserData(email) {
    console.log(`🚀 Repairing Firestore profile for: ${email}...`);

    try {
        const usersSnap = await db.collection('users').get();
        let targetDoc = null;
        let userData = null;

        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.email && data.email.toLowerCase().includes(email.toLowerCase())) {
                targetDoc = doc.ref;
                userData = data;
            }
        });

        if (!targetDoc) {
            console.error('❌ User not found in Firestore.');
            return;
        }

        const repairPayload = {
            accessScopes: {
                regionIds: ['*'],
                divisionIds: ['*']
            },
            isActive: true, // Ensure they are active
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        console.log('📦 Applying repair to Firestore profile:', JSON.stringify(repairPayload, null, 2));
        await targetDoc.update(repairPayload);

        // Also sync claims just in case fix-user-claims wasn't enough or run before
        const claims = {
            tenantId: String(userData.tenantId || '3'), // Ensure correct tenant
            roleLevel: Number(userData.roleLevel || 40),
            role: String(userData.role || 'consultant'),
            isActive: true
        };

        console.log('🔐 Synchronizing Auth Claims:', JSON.stringify(claims, null, 2));
        await auth.setCustomUserClaims(targetDoc.id, claims);

        console.log('\n✅ Profile and Claims repaired successfully!');
        console.log('✨ IMPORTANT: Please ask the user to perform a hard refresh (Ctrl+Shift+R) and check again.');

    } catch (error) {
        console.error('💥 Error:', error);
    } finally {
        process.exit(0);
    }
}

const emailToFix = process.argv[2] || 'cursoiadaniel';
fixUserData(emailToFix);

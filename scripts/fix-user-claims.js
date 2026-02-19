const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function fixUser(email) {
    console.log(`🚀 Fixing user claims for: ${email}...`);

    try {
        const usersSnap = await db.collection('users').get();
        let targetUser = null;

        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.email && data.email.toLowerCase().includes(email.toLowerCase())) {
                targetUser = { uid: doc.id, ...data };
            }
        });

        if (!targetUser) {
            console.error('❌ User not found in Firestore.');
            return;
        }

        const claims = {
            tenantId: String(targetUser.tenantId || '1'),
            roleLevel: Number(targetUser.roleLevel || 20),
            role: String(targetUser.role || 'team_member'),
            isActive: true
        };

        console.log('📦 Setting claims:', JSON.stringify(claims, null, 2));

        await auth.setCustomUserClaims(targetUser.uid, claims);

        // Verify
        const updatedUser = await auth.getUser(targetUser.uid);
        console.log('✅ Updated Auth Claims:', JSON.stringify(updatedUser.customClaims, null, 2));

        console.log('\n✨ DONE! Please ask the user to sign out and sign back in (or perform a hard refresh).');

    } catch (error) {
        console.error('💥 Error:', error);
    } finally {
        process.exit(0);
    }
}

// Get email from command line or default
const emailToFix = process.argv[2] || 'cursoiadaniel';
fixUser(emailToFix);

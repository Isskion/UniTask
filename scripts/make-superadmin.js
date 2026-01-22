/**
 * Script to make a user SuperAdmin so they can see ALL organizations
 * This is the correct fix - update USER claims, not production data
 * Run with: node scripts/make-superadmin.js <email>
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function makeSuperAdmin() {
    const email = process.argv[2];

    if (!email) {
        console.log('Usage: node scripts/make-superadmin.js <email>');
        console.log('\nThis will:');
        console.log('  1. Set user role to "superadmin" in Firestore');
        console.log('  2. Set roleLevel to 100 in Auth custom claims');
        console.log('  3. Allow user to see ALL organizations');
        process.exit(1);
    }

    console.log(`👑 Making ${email} a SuperAdmin...\n`);

    try {
        // Find user by email in Firestore
        const usersSnapshot = await db.collection('users')
            .where('email', '==', email)
            .get();

        if (usersSnapshot.empty) {
            console.error('❌ User not found in Firestore');
            process.exit(1);
        }

        const userDoc = usersSnapshot.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();

        console.log(`📋 Found user: ${userData.email} (UID: ${userId})`);
        console.log(`   Current role: ${userData.role || 'N/A'}`);
        console.log(`   Current organizationId: ${userData.organizationId || userData.tenantId || 'N/A'}`);

        // Update Firestore document
        await userDoc.ref.update({
            role: 'superadmin',
            roleLevel: 100
        });
        console.log('\n✅ Firestore updated: role = "superadmin", roleLevel = 100');

        // Update Auth custom claims
        const userRecord = await auth.getUser(userId);
        const currentClaims = userRecord.customClaims || {};

        await auth.setCustomUserClaims(userId, {
            ...currentClaims,
            role: 'superadmin',
            roleLevel: 100
        });
        console.log('✅ Auth claims updated: role = "superadmin", roleLevel = 100');

        console.log('\n' + '='.repeat(50));
        console.log('🎉 SUCCESS! User is now a SuperAdmin');
        console.log('='.repeat(50));
        console.log('\n⚠️  The user must LOG OUT and LOG BACK IN for changes to take effect.');
        console.log('   As SuperAdmin, they will see ALL data from ALL organizations.');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await admin.app().delete();
    }
}

makeSuperAdmin()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });

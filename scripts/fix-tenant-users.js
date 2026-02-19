const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function fixTenantUsers(tenantId) {
    console.log(`🚀 Repairing ALL users for Tenant: ${tenantId}...`);

    try {
        const usersSnap = await db.collection('users').where('tenantId', '==', tenantId).get();
        console.log(`📦 Found ${usersSnap.size} users in Firestore for this tenant.`);

        for (const userDoc of usersSnap.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();
            console.log(`\n👤 Processing: ${userData.email || userId}`);

            // 1. Repair Firestore Profile
            const repairPayload = {
                accessScopes: userData.accessScopes || {
                    regionIds: ['*'],
                    divisionIds: ['*']
                },
                isActive: userData.isActive ?? true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            await userDoc.ref.update(repairPayload);
            console.log(`   ✅ Firestore profile updated (scopes ensured).`);

            // 2. Sync Custom Claims
            const claims = {
                tenantId: String(tenantId),
                roleLevel: Number(userData.roleLevel || 20),
                role: String(userData.role || 'team_member'),
                isActive: true
            };

            await auth.setCustomUserClaims(userId, claims);
            console.log(`   🔐 Custom claims synchronized.`);
        }

        console.log('\n✅ Tenant repair completed!');
        console.log('✨ IMPORTANT: Users must perform a hard refresh (Ctrl+Shift+R) for changes to take effect.');

    } catch (error) {
        console.error('💥 Error:', error);
    } finally {
        process.exit(0);
    }
}

const targetTenant = process.argv[2] || '3';
fixTenantUsers(targetTenant);

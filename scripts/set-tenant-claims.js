/**
 * Script to set tenantId as custom claim for all users
 * This allows Firestore rules to check tenantId without needing get()
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function setTenantClaims() {
    console.log('🚀 Setting tenantId custom claims for all users...\n');

    try {
        // Get all users from Firestore
        const usersSnapshot = await db.collection('users').get();

        console.log(`📦 Found ${usersSnapshot.size} users in Firestore`);

        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();
            const tenantId = userData.tenantId || '1'; // Default to tenant 1

            console.log(`\n👤 Processing user: ${userData.email || userId}`);
            console.log(`   Tenant ID: ${tenantId}`);

            try {
                // Get current custom claims
                const userRecord = await auth.getUser(userId);
                const currentClaims = userRecord.customClaims || {};

                // Check if claim already set (DISABLED TO FORCE ROLE UPDATE)
                // if (currentClaims.tenantId === tenantId) {
                //    console.log(`   ⏭️  Claim already set correctly`);
                //    skippedCount++;
                //    continue;
                // }

                // Map string role to number
                const ROLE_MAP = {
                    'usuario_externo': 10,
                    'usuario_base': 20,
                    'consultor': 40,
                    'global_pm': 60,
                    'app_admin': 80,
                    'superadmin': 100
                };
                const stringRole = userData.role || 'usuario_base';
                const numericRole = ROLE_MAP[stringRole] || 10; // Default to Externo if unknown

                // Set custom claim
                await auth.setCustomUserClaims(userId, {
                    ...currentClaims,
                    tenantId: tenantId,
                    role: numericRole
                });

                console.log(`   ✅ Custom claim set: tenantId=${tenantId}`);
                updatedCount++;

            } catch (error) {
                console.error(`   ❌ Error setting claim for ${userId}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📊 Summary:');
        console.log(`   ✅ Updated: ${updatedCount}`);
        console.log(`   ⏭️  Skipped: ${skippedCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log('='.repeat(50) + '\n');

        console.log('⚠️  IMPORTANT: Users must log out and log back in for claims to take effect!');

    } catch (error) {
        console.error('❌ Script failed:', error);
        throw error;
    } finally {
        await admin.app().delete();
    }
}

// Run script
setTenantClaims()
    .then(() => {
        console.log('✨ Script completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });

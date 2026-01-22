/**
 * Script to CLEAR custom claims that were incorrectly set
 * This removes organizationId and roleLevel claims, restoring defaults
 * Run with: node scripts/clear-custom-claims.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function clearClaims() {
    console.log('🧹 Clearing incorrectly set custom claims...\n');

    try {
        const usersSnapshot = await db.collection('users').get();

        for (const doc of usersSnapshot.docs) {
            const userId = doc.id;
            const userData = doc.data();

            try {
                // Get current claims
                const userRecord = await auth.getUser(userId);
                const currentClaims = userRecord.customClaims || {};

                console.log(`👤 ${userData.email}`);
                console.log(`   Current claims: ${JSON.stringify(currentClaims)}`);

                // Remove the incorrectly set claims
                // Keep only claims that were there before (if any)
                const cleanedClaims = {};

                // We'll completely clear organizationId and roleLevel
                // that were set by the buggy scripts
                for (const key of Object.keys(currentClaims)) {
                    if (key !== 'organizationId' && key !== 'roleLevel' && key !== 'role' && key !== 'tenantId') {
                        cleanedClaims[key] = currentClaims[key];
                    }
                }

                await auth.setCustomUserClaims(userId, cleanedClaims);
                console.log(`   ✅ Cleared claims. New claims: ${JSON.stringify(cleanedClaims)}`);

            } catch (e) {
                console.log(`   ⚠️  Could not process ${userData.email}: ${e.message}`);
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('✅ Claims cleared. Users must log out and log back in.');
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await admin.app().delete();
    }
}

clearClaims()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const auth = getAuth();

async function fixDanielTenant() {
    const TARGET_UID = '6C9ZN0mfngNb5gIAWw1EMSaQcRR2';
    const CORRECT_TENANT = '3'; // Unigis is Tenant 3, not 2!

    console.log('=== FIXING daniel.delamo@unigis.com TENANT ===');

    // 1. Update Firestore document
    const userRef = db.collection('users').doc(TARGET_UID);
    const doc = await userRef.get();

    if (!doc.exists) {
        console.error('User document not found!');
        return;
    }

    const currentData = doc.data()!;
    console.log(`Current: email=${currentData.email}, tenantId=${currentData.tenantId}, role=${currentData.role}`);

    await userRef.update({
        tenantId: CORRECT_TENANT,
        updatedAt: new Date()
    });
    console.log(`Updated Firestore: tenantId -> "${CORRECT_TENANT}"`);

    // 2. Update Custom Claims to match
    await auth.setCustomUserClaims(TARGET_UID, {
        tenantId: CORRECT_TENANT,
        roleLevel: currentData.roleLevel || 80,
        syncId: Date.now()
    });
    console.log(`Updated Auth Claims: tenantId -> "${CORRECT_TENANT}"`);

    // 3. Verify
    const updated = await userRef.get();
    const updatedClaims = await auth.getUser(TARGET_UID);
    console.log('\n=== VERIFICATION ===');
    console.log(`Firestore tenantId: ${updated.data()?.tenantId}`);
    console.log(`Auth Claims tenantId: ${updatedClaims.customClaims?.tenantId}`);
    console.log(`Auth Claims roleLevel: ${updatedClaims.customClaims?.roleLevel}`);
    console.log('\nDONE. User should now see all Unigis (Tenant 3) resources after refreshing.');
}

fixDanielTenant().catch(console.error);

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// --- CONFIGURATION ---
const SERVICE_ACCOUNT_PATH = 'service-account.json'; // Put your JSON file name here
const TARGET_EMAIL = 'daniel.delamo@unigis.com';   // The user to fix
// ---------------------

async function main() {
    console.log("🔧 STARTING LOCAL USER REPAIR...");

    // 1. Initialize Admin SDK
    try {
        // Try to find service account
        const keyPath = path.resolve(process.cwd(), SERVICE_ACCOUNT_PATH);
        if (!fs.existsSync(keyPath)) {
            console.error(`❌ ERROR: Service account file not found at: ${keyPath}`);
            console.log("👉 Please download your service account JSON from Firebase Console");
            console.log("👉 Rename it to 'service-account.json' and place it in the project root.");
            process.exit(1);
        }

        const serviceAccount = require(keyPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin Initialized.");
    } catch (e: any) {
        console.error("❌ Init Error:", e.message);
        process.exit(1);
    }

    const db = admin.firestore();
    const auth = admin.auth();

    try {
        // 2. Find User
        console.log(`🔍 Searching for user: ${TARGET_EMAIL}`);
        const user = await auth.getUserByEmail(TARGET_EMAIL);
        console.log(`✅ User Found: ${user.uid}`);

        // 3. Check Profile
        const userRef = db.collection('users').doc(user.uid);
        const doc = await userRef.get();

        if (doc.exists) {
            console.log("✅ Firestore Profile Exists.");
            const data = doc.data();
            console.log("   Tenant:", data?.tenantId);
            console.log("   Role:", data?.role);

            // Allow update of claims anyway
        } else {
            console.warn("⚠️ Firestore Profile MISSING. Creating default...");
            const newProfile = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'Repaired User',
                photoURL: user.photoURL || '',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                tenantId: '1', // Default
                role: 'usuario_externo',
                accessScopes: { regionIds: [], divisionIds: [] },
                isActive: true
            };
            await userRef.set(newProfile);
            console.log("✅ Profile Created.");
        }

        // 4. Force Custom Claims
        const finalDoc = await userRef.get();
        const userData = finalDoc.data();

        const claims = {
            tId: userData?.tenantId || '1',
            role: userData?.role || 'usuario_externo',
            roleLevel: 10
        };

        await auth.setCustomUserClaims(user.uid, claims);
        console.log("✅ Custom Claims Synced:", claims);

        // 5. Revoke Tokens (Force Logout)
        await auth.revokeRefreshTokens(user.uid);
        console.log("✅ Tokens Revoked (Application will force correct re-login via 'Local Repair').");

        console.log("\n🎉 REPAIR COMPLETE.");
        console.log("👉 Now go to the app, use 'Local Repair' (Option A) in /repair page, and login.");

    } catch (e: any) {
        console.error("❌ Fatal Error:", e.message);
    }
}

main();

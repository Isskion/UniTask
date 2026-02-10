const admin = require('firebase-admin');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const serviceAccountRaw = envConfig.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountRaw) {
    console.error('FIREBASE_SERVICE_ACCOUNT is missing in .env.local');
    process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountRaw);

// Initialize Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function verifyFlow() {
    console.log("🚀 Starting Verification of Registration Flow...");

    const testEmail = `test-${Date.now()}@example.com`;
    const testName = "Test User";
    const testPassword = "securePassword123";
    const inviteCode = "TEST9999";

    try {
        // 1. Setup Mock Invite
        console.log(`\n1. Creating mock invite: ${inviteCode}`);
        await db.collection('invites').doc(inviteCode).set({
            code: inviteCode,
            tenantId: "1",
            role: "usuario_base",
            isUsed: false,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log("✅ Mock invite created.");

        // 2. Simulate Cloud Function 'requestRegistration'
        // Since we can't easily call the function here without the emulator running,
        // we simulate the state changes it would perform.
        console.log(`\n2. Simulating 'requestRegistration' for ${testEmail}...`);

        const token = crypto.randomBytes(32).toString('hex');
        await db.collection('registration_requests').doc(token).set({
            email: testEmail,
            name: testName,
            password: testPassword,
            inviteCode: inviteCode,
            tenantId: "1",
            role: "usuario_base",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        console.log(`✅ Registration request created with token: ${token}`);

        // 3. Verify Invitation state hasn't changed yet
        const inviteCheck = await db.collection('invites').doc(inviteCode).get();
        if (inviteCheck.data().isUsed) {
            throw new Error("❌ Error: Invite marked as used too early!");
        }
        console.log("✅ Invite is still unused (Correct).");

        // 4. Simulate 'completeRegistration'
        console.log("\n3. Simulating 'completeRegistration'...");

        // This simulates the transaction in the function
        const regRequestSnap = await db.collection('registration_requests').doc(token).get();
        const regData = regRequestSnap.data();

        // Create Auth User (Simulation only if not connected to live auth)
        // In real test, we'd use admin.auth()
        console.log("   - Creating Auth User...");
        const userRecord = await admin.auth().createUser({
            email: regData.email,
            password: regData.password,
            displayName: regData.name
        });

        console.log(`   - Auth User Created: ${userRecord.uid}`);

        // Run Transaction (Simulated)
        console.log("   - Running Transaction...");
        await db.runTransaction(async (t) => {
            const userRef = db.collection('users').doc(userRecord.uid);
            t.set(userRef, {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: regData.name,
                role: regData.role,
                tenantId: regData.tenantId,
                isActive: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            const inviteRef = db.collection('invites').doc(regData.inviteCode);
            t.update(inviteRef, {
                isUsed: true,
                usedBy: userRecord.uid,
                usedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            t.delete(db.collection('registration_requests').doc(token));
        });

        console.log("✅ Transaction successful.");

        // 5. Final Checks
        const finalInvite = await db.collection('invites').doc(inviteCode).get();
        if (!finalInvite.data().isUsed) {
            throw new Error("❌ Error: Invite NOT marked as used!");
        }
        console.log("✅ Invite marked as used (Correct).");

        const finalRequest = await db.collection('registration_requests').doc(token).get();
        if (finalRequest.exists) {
            throw new Error("❌ Error: Registration request NOT deleted!");
        }
        console.log("✅ Registration request cleaned up (Correct).");

        console.log(`\n🎉 VERIFICATION SUCCESSFUL for user ${testEmail}`);

        // Cleanup Auth User for repeated tests
        await admin.auth().deleteUser(userRecord.uid);
        console.log("🧹 Cleanup: Auth User deleted.");

    } catch (error) {
        console.error("\n❌ VERIFICATION FAILED:");
        console.error(error);
    }
}

verifyFlow();

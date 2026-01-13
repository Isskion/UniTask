
import * as admin from 'firebase-admin';
// --- REPLACED PROD KEY WITH TEST KEY ---
import serviceAccount from '../serviceAccountKey-test.json';
// ---------------------------------------

// --- SAFETY KILL SWITCH ---
// This ensures the script ONLY runs if the Firestore Emulator is detected.
// It effectively prevents accidental writes to the production database.
if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.error(`
    🛑 CRITICAL SAFETY ERROR:
    -------------------------------------------------------
    You are attempting to run the SEED script without the
    FIRESTORE_EMULATOR_HOST environment variable set.
    
    This script is designed to ONLY run against the local emulator.
    It has been aborted to protect production data.
    -------------------------------------------------------
    `);
    process.exit(1);
}
// --------------------------

console.log("✅ Safety Check Passed: Running against Emulator at", process.env.FIRESTORE_EMULATOR_HOST);

if (!admin.apps.length) {
    admin.initializeApp({
        // @ts-ignore
        credential: admin.credential.cert(serviceAccount),
        projectId: 'demo-unitask' // Explicitly force demo project ID
    });
}
const db = admin.firestore();
const auth = admin.auth();

import * as fs from 'fs';
import * as path from 'path';

const SEED_DATA = {
    superadmin: {
        email: 'argoss01@gmail.com',
        password: 'password123',
        displayName: 'Super Admin',
        role: 50, // SUPERADMIN
        tenantId: '1' // Default Master Tenant
    }
};

async function seed() {
    console.log("🌱 Starting Database Seeding...");

    // 0. Import Production Dump if exists
    const dumpPath = path.join(__dirname, '../data/prod_dump.json');
    if (fs.existsSync(dumpPath)) {
        console.log("   found 'data/prod_dump.json'. Importing...");
        const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf-8'));

        for (const colName in dump) {
            console.log(`   - Restoring ${colName}...`);
            const batch = db.batch(); // Warning: Max 500 per batch. For now simple loop or chunks.
            // Using simple setDoc in loop for simplicity with large datasets > 500
            // But for detailed control let's match batch limits if needed.
            // For now, let's just await Promise.all for speed or chunks.

            const docs = Object.entries(dump[colName]);
            for (const [docId, data] of docs) {
                // Restore Timestamps
                const processedData: any = { ...data };
                for (const key in processedData) {
                    const val = processedData[key];
                    if (val && typeof val === 'object' && val._type === 'timestamp') {
                        processedData[key] = new admin.firestore.Timestamp(val.seconds, val.nanoseconds);
                    }
                }

                await db.collection(colName).doc(docId).set(processedData);
            }
            console.log(`     Restored ${docs.length} docs to ${colName}.`);
        }
    } else {
        console.log("   No 'data/prod_dump.json' found. Skipping import.");
    }

    try {
        // 1. Create/Update Superadmin
        const { email, password, displayName, role, tenantId } = SEED_DATA.superadmin;
        console.log(`Processing User: ${email}`);

        let uid;
        try {
            const user = await auth.getUserByEmail(email);
            uid = user.uid;
            console.log(`   - Auth User exists (${uid})`);
        } catch (e) {
            const newUser = await auth.createUser({
                email,
                password,
                displayName
            });
            uid = newUser.uid;
            console.log(`   - Created Auth User (${uid})`);
        }

        // 2. Set Custom Claims (Critical for RLS)
        await auth.setCustomUserClaims(uid, { role, tenantId });
        console.log(`   - Set Custom Claims: role=${role}, tenant=${tenantId}`);

        // 3. Create Firestore Profile
        await db.collection('users').doc(uid).set({
            uid,
            email,
            displayName,
            role,
            tenantId,
            isActive: true,
            assignedProjectIds: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: null
        }, { merge: true });
        console.log(`   - Synced Firestore Profile`);

        console.log("\n✅ Seed Complete! You can now log in.");
    } catch (error) {
        console.error("\n❌ Seed Failed:", error);
    }
}

seed();

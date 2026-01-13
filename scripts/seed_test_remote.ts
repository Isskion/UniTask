
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import serviceAccount from '../serviceAccountKey-test.json';

// --- CONFIGURATION ---
const TARGET_PROJECT_ID = "unitask-test-env";
const PROD_PROJECT_ID = "unitask-v1";

console.log(`🚀 Initializing REMOTE SEED for project: ${TARGET_PROJECT_ID}`);

// 1. Initialize App with Test Credentials
if (!admin.apps.length) {
    admin.initializeApp({
        // @ts-ignore
        credential: admin.credential.cert(serviceAccount),
        projectId: TARGET_PROJECT_ID
    });
}

const db = admin.firestore();
const auth = admin.auth();

const SEED_DATA = {
    superadmin: {
        email: 'argoss01@gmail.com',
        password: 'password123',
        displayName: 'Super Admin',
        role: 50, // SUPERADMIN
        tenantId: '1' // Default Master Tenant
    }
};

async function seedRemote() {
    try {
        // --- SAFETY CHECKS ---
        const projectId = db.projectId || (db as any)._settings?.projectId;
        console.log(`   Connected to: ${projectId}`);

        if (projectId === PROD_PROJECT_ID) {
            throw new Error("⛔ FATAL: Script is attempting to write to PRODUCTION. Aborting immediately.");
        }
        if (projectId !== TARGET_PROJECT_ID) {
            throw new Error(`⛔ MISMATCH: Expected ${TARGET_PROJECT_ID}, but connected to ${projectId}`);
        }
        // ---------------------

        // 2. Import Dump
        const dumpPath = path.join(__dirname, '../data/prod_dump.json');
        if (fs.existsSync(dumpPath)) {
            console.log("📦 Found 'data/prod_dump.json'. Importing to Cloud...");
            const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf-8'));

            for (const colName in dump) {
                console.log(`   - Restoring ${colName}...`);
                const docs = Object.entries(dump[colName]);

                // Use Batches for Cloud Firestore (limit 500)
                const BATCH_SIZE = 400;
                let batch = db.batch();
                let count = 0;
                let total = 0;

                for (const [docId, data] of docs) {
                    // Restore Timestamps
                    const processedData: any = { ...data };
                    for (const key in processedData) {
                        const val = processedData[key];
                        if (val && typeof val === 'object' && val._type === 'timestamp') {
                            processedData[key] = new admin.firestore.Timestamp(val.seconds, val.nanoseconds);
                        }
                    }

                    batch.set(db.collection(colName).doc(docId), processedData);
                    count++;
                    total++;

                    if (count >= BATCH_SIZE) {
                        await batch.commit();
                        console.log(`     ...committed ${count} docs`);
                        batch = db.batch();
                        count = 0;
                    }
                }

                if (count > 0) {
                    await batch.commit();
                    console.log(`     ...committed remaining ${count} docs`);
                }
                console.log(`     ✅ Restored ${total} docs to ${colName}.`);
            }
        } else {
            console.log("⚠️ No dump file found. Skipping data import.");
        }

        // 3. Ensure Superadmin Exists in Auth
        const { email, password, displayName, role, tenantId } = SEED_DATA.superadmin;
        console.log(`\n👤 Processing Superadmin: ${email}`);

        let uid;
        try {
            const user = await auth.getUserByEmail(email);
            uid = user.uid;
            console.log(`   - Auth User exists (${uid})`);
        } catch (e) {
            console.log(`   - Creating Auth User...`);
            const newUser = await auth.createUser({
                email,
                password,
                displayName
            });
            uid = newUser.uid;
        }

        // 4. Set Custom Claims
        await auth.setCustomUserClaims(uid, { role, tenantId });
        console.log(`   - Claims set: role=${role}, tenant=${tenantId}`);

        // 5. Ensure Profile exists (dump might have overwritten it, but let's be sure)
        await db.collection('users').doc(uid).set({
            uid,
            email,
            displayName,
            role,
            tenantId,
            isActive: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`   - Firestore Profile ensured.`);

        console.log("\n✅ REMOTE SEED COMPLETE. 'unitask-test-env' is ready.");

    } catch (error) {
        console.error("\n❌ Seed Failed:", error);
        process.exit(1);
    }
}

seedRemote();


import * as admin from 'firebase-admin';
import * as path from 'path';

// Initialize Firebase Admin (Assumes Service Account or Local Emulator/Auth)
// For local usage with 'firebase-admin', we often need credentials.
// However, if we run this in the 'functions' context or with GOOGLE_APPLICATION_CREDENTIALS, it works.
// Let's assume the user has a way to run admin scripts or we guide them.

// SIMPLER APPROACH: use the existing 'firebase-admin' setup if possible, 
// OR just ask the user to run it via their existing tooling.
// I will create a standalone script that connects using default credentials.

const serviceAccountVal = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!admin.apps.length) {
    try {
        admin.initializeApp();
    } catch (e) {
        console.error("Failed to init admin:", e);
        process.exit(1);
    }
}

const db = admin.firestore();

async function migrateTenant3() {
    console.log("Starting migration for Tenant 3...");
    const TENANT_ID = '3';
    const NEW_REGION = 'EU';
    const NEW_DIVISION = 'OPS';
    const ACCESS_KEY = `${NEW_REGION}:${NEW_DIVISION}`;

    // 1. Get all projects for Tenant 3
    // Note: projects are in root 'projects' collection in Legacy, 
    // BUT we are moving to 'tenants/{id}/projects'.
    // The user said "projects OF tenant 3". 
    // They might be in root with tenantId=3 OR in tenants/3/projects.
    // I should check BOTH or Ask.
    // Given the codebase uses `getTenantCollection`, they are likely in `tenants/3/projects` if created recently,
    // OR in root `projects` with `tenantId: 3`.

    // Strategy: Check tenants/3/projects first (Target Architecture).
    const tenantRef = db.collection('tenants').doc(TENANT_ID).collection('projects');
    const snap = await tenantRef.get();

    console.log(`Found ${snap.size} projects in tenants/${TENANT_ID}/projects`);

    const batch = db.batch();
    let count = 0;

    snap.docs.forEach(doc => {
        batch.update(doc.ref, {
            regionId: NEW_REGION,
            divisionId: NEW_DIVISION,
            _accessKey: ACCESS_KEY,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        count++;
    });

    if (count > 0) {
        await batch.commit();
        console.log(`Updated ${count} projects in Tenant 3 Collection.`);
    }

    // 2. Also check Root projects (Legacy) just in case
    const rootRef = db.collection('projects').where('tenantId', '==', TENANT_ID);
    const rootSnap = await rootRef.get();

    console.log(`Found ${rootSnap.size} projects in Root 'projects' for Tenant 3`);

    if (!rootSnap.empty) {
        const rootBatch = db.batch();
        rootSnap.docs.forEach(doc => {
            rootBatch.update(doc.ref, {
                regionId: NEW_REGION,
                divisionId: NEW_DIVISION,
                _accessKey: ACCESS_KEY,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        await rootBatch.commit();
        console.log(`Updated ${rootSnap.size} projects in Root Collection.`);
    }

    console.log("Migration Complete.");
}

migrateTenant3().catch(console.error);

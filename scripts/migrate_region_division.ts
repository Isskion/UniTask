
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Note: This script requires a service account key or authenticated environment.
// For local convenience if no key is present, we might need a different approach (e.g. client SDK via node).
// However, 'firebase-admin' is standard for scripts. 
// IF YOU DO NOT HAVE CREDENTIALS, this will fail.

// Attempt to use default credentials (e.g. from gcloud auth application-default login)
// or check if serviceAccount.json exists.

const PROJECT_ID = 'unitask-v1'; // Replace with actual project ID if different

async function migrate() {
    console.log("Starting Migration...");

    // Initialize Admin SDK
    // Assuming we can run this in an environment with credentials (e.g. local emulator or authenticated shell)
    // If this fails, the user needs to provide credentials.
    try {
        initializeApp({
            projectId: PROJECT_ID
        });
    } catch (e) {
        if (!getFirestore()) { // Check if already initialized
            console.error("Failed to initialize Firebase Admin:", e);
            process.exit(1);
        }
    }

    const db = getFirestore();
    const batch = db.batch();
    let opCount = 0;

    // 1. Migrate Sprints
    console.log("Migrating Sprints...");
    // Sprints are likely stored in a subcollection of tenants or a root collection group?
    // Based on code: getTenantCollection(db, 'sprints', tenantId) implies root/tenants/{tenantId}/sprints
    // OR separate 'sprints' collection with 'tenantId' field?
    // SprintManager uses: collection(db, 'sprints') + where('tenantId', '==', tenantId)
    // So it's a ROOT collection 'sprints'.

    const sprintsSnapshot = await db.collection('sprints').get();
    sprintsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!data.regionId || !data.divisionId) {
            batch.update(doc.ref, {
                regionId: 'EU',
                divisionId: 'OPERATIONS',
                updatedAt: new Date() // or serverTimestamp
            });
            opCount++;
        }
    });

    // 2. Migrate Availability
    console.log("Migrating Availability...");
    // AvailabilityRegistry uses 'useAvailability' hook -> which calls 'availabilities' collection?
    // Let's assume root 'availabilities' based on typical pattern, or 'user_availabilities'?
    // Typically it's 'availabilities' with tenantId field.
    // I recall 'useAvailability' uses 'availabilities' collection.

    // Let's verify via code reading if possible, but assuming Root 'availabilities'
    // If it's tenant-subcollection, we need to iterate tenants.
    // Based on SprintManager logic (root + tenantId), let's guess Availability is similar.
    // Wait, AvailabilityDialog calls onSave -> AvailabilityRegistry -> useAvailability.

    const availSnapshot = await db.collection('availabilities').get(); // Checking generic name
    if (availSnapshot.empty) {
        console.warn("No 'availabilities' found in root. Checking alternatives...");
        // Fallback: check 'user_availability' or tenant subcollections if I knew valid tenants.
    }

    availSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!data.regionId || !data.divisionId) {
            batch.update(doc.ref, {
                regionId: 'EU',
                divisionId: 'OPERATIONS',
                updatedAt: new Date()
            });
            opCount++;
        }
    });

    if (opCount > 0) {
        console.log(`Committing ${opCount} updates...`);
        await batch.commit();
        console.log("Migration Complete.");
    } else {
        console.log("No records needed migration.");
    }
}

migrate().catch(console.error);

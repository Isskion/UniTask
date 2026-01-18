const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey-prod.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: "minuta-f75a4" // Production Project ID
    });
}
const db = admin.firestore();

async function reproduce() {
    const userEmail = "argoss01@gmail.com";
    const targetTenantId = "1"; // The value causing the error

    console.log(`[REPRO] Simulating CheckDeadlines for ${userEmail} in Tenant ${targetTenantId}`);

    // 1. Get User UID
    const userRecord = await admin.auth().getUserByEmail(userEmail);
    const uid = userRecord.uid;
    console.log(`[REPRO] UID: ${uid}`);
    console.log(`[REPRO] Claims:`, userRecord.customClaims);

    // 2. Simulate the Query
    // NOTE: Node SDK bypasses Rules. This script mainly verifies DATA EXISTENCE and CLAIMS.
    // To truly test rules, we rely on the browser behavior we observed.

    const tasksRef = db.collection("tasks");
    const snapshot = await tasksRef
        .where("tenantId", "==", targetTenantId)
        .where("assignedTo", "==", uid)
        .get();

    console.log(`[REPRO] Query found ${snapshot.size} tasks.`);
    if (snapshot.size > 0) {
        snapshot.docs.forEach(d => {
            console.log(` - Task ${d.id}: tenantId=${d.data().tenantId}, assignedTo=${d.data().assignedTo}`);
        });
    } else {
        console.log("[REPRO] No tasks found matching criteria.");
    }

    // 3. Verify User Profile in Firestore
    const userDoc = await db.collection("users").doc(uid).get();
    console.log(`[REPRO] User Profile exists? ${userDoc.exists}`);
    if (userDoc.exists) {
        console.log(`[REPRO] User Profile:`, userDoc.data());
    }
}

reproduce().catch(console.error);

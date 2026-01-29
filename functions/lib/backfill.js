"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerBackfill = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
if (admin.apps.length === 0)
    admin.initializeApp();
/**
 * HTTP Trigger to force-run the sync logic for ALL users.
 * USAGE: Visit the URL provided after deploy.
 */
exports.triggerBackfill = functions.region('europe-west1').https.onRequest(async (req, res) => {
    // Basic security: Check for a secret query param if needed, or just relying on Admin/Dev triggering it.
    // For now, open (developer tool).
    const db = admin.firestore();
    const usersSnap = await db.collection('users').get();
    let count = 0;
    const batchArray = [];
    let currentBatch = db.batch();
    let batchCount = 0;
    for (const doc of usersSnap.docs) {
        // Just touch the doc to trigger onWrite (syncUserClaims)
        // We use a dummy field '_forceSync'
        currentBatch.update(doc.ref, { _forceSync: Date.now() });
        batchCount++;
        if (batchCount >= 400) {
            batchArray.push(currentBatch.commit());
            currentBatch = db.batch();
            batchCount = 0;
        }
        count++;
    }
    if (batchCount > 0) {
        batchArray.push(currentBatch.commit());
    }
    await Promise.all(batchArray);
    res.send(`✅ Backfill Triggered! Touched ${count} user profiles. \n\nCheck the Firebase Functions logs to see 'syncUserClaims' processing each user.`);
});
//# sourceMappingURL=backfill.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFriendlyId = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();
/**
 * Generates a "Smart ID" for new tasks: [PROJECT_CODE]-[YY][MM][XX]
 * Example: TSP-260101 (First task of Jan 2026 for Transpais)
 *
 * Trigger: onCreate of a task document.
 */
exports.generateFriendlyId = functions.firestore
    .document("tasks/{taskId}")
    .onCreate(async (snap, context) => {
    const taskId = context.params.taskId;
    const taskData = snap.data();
    // Safety check: Avoid infinite loops or reprocessing if ID already looks correct (unlikely on create)
    if (taskData.friendlyId && !taskData.friendlyId.startsWith("TSK-")) {
        console.log(`Task ${taskId} already has a smart ID: ${taskData.friendlyId}`);
        return null;
    }
    const projectId = taskData.projectId;
    if (!projectId) {
        console.error(`Task ${taskId} has no projectId. Skipping Smart ID generation.`);
        return null;
    }
    try {
        // 1. Get Project Code
        const projectDoc = await db.collection("projects").doc(projectId).get();
        let projectCode = "TSK"; // Default fallback
        if (projectDoc.exists) {
            const projectData = projectDoc.data();
            if (projectData && projectData.code) {
                projectCode = projectData.code.toUpperCase();
            }
        }
        // 2. Determine Date Components (YY, MM)
        const now = new Date();
        const yearStr = now.getFullYear().toString().slice(-2); // "26"
        const monthStr = (now.getMonth() + 1).toString().padStart(2, "0"); // "01"
        const datePrefix = `${yearStr}${monthStr}`; // "2601"
        // 3. Counter Transaction
        // Counter ID: {projectId}_{YYMM} -> "proj123_2601"
        // This ensures monthly reset PER PROJECT.
        const counterRef = db.collection("counters").doc(`${projectId}_${datePrefix}`);
        const newSequence = await db.runTransaction(async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            let currentCount = 0;
            if (counterDoc.exists) {
                const data = counterDoc.data();
                currentCount = data ? (data.count || 0) : 0;
            }
            else {
                // Initialize counter doc if it doesn't exist (First task of the month)
                transaction.set(counterRef, { count: 0 }); // Will be incremented to 1 below
            }
            const nextCount = currentCount + 1;
            transaction.update(counterRef, { count: nextCount });
            return nextCount;
        });
        // 4. Format ID
        // Format: [CODE]-[YY][MM][XX] (XX is at least 2 digits, padding with 0)
        const sequenceStr = newSequence.toString().padStart(2, "0");
        const friendlyId = `${projectCode}-${datePrefix}${sequenceStr}`;
        console.log(`Generated Smart ID for task ${taskId}: ${friendlyId}`);
        // 5. Update Task
        return snap.ref.update({
            friendlyId: friendlyId,
            smartIdGenerated: true // Flag to signal UI
        });
    }
    catch (error) {
        console.error(`Error generating Smart ID for task ${taskId}:`, error);
        // Fallback? Provide a timestamp-based ID to avoid "Pending"?
        // For now, let's stick to error logging. UI will show "Pending...".
        return null;
    }
});
//# sourceMappingURL=tasks.js.map
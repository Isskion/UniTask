import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getDb } from "./utils";

/**
 * Aggregates task counters for the assignee whenever a task is created, updated, or deleted.
 * A task is considered "active/pending" if its status is NOT 'completed'.
 */
export const aggregateCounters = functions.region("europe-west1").firestore
    .document("tasks/{taskId}")
    .onWrite(async (change, context) => {
        const before = change.before.exists ? change.before.data() : null;
        const after = change.after.exists ? change.after.data() : null;

        const prevActive = before && before.status !== 'completed';
        const nextActive = after && after.status !== 'completed';

        // Same user, status changed
        if (before && after && before.assigneeId === after.assigneeId) {
            if (prevActive !== nextActive) {
                const delta = nextActive ? 1 : -1;
                await updateUserCounter(after.assigneeId, delta);
            }
        } 
        // Reassigned to someone else
        else if (before && after && before.assigneeId !== after.assigneeId) {
            if (prevActive && before.assigneeId) {
                await updateUserCounter(before.assigneeId, -1);
            }
            if (nextActive && after.assigneeId) {
                await updateUserCounter(after.assigneeId, 1);
            }
        }
        // Task created
        else if (!before && after) {
            if (nextActive && after.assigneeId) {
                await updateUserCounter(after.assigneeId, 1);
            }
        }
        // Task deleted
        else if (before && !after) {
            if (prevActive && before.assigneeId) {
                await updateUserCounter(before.assigneeId, -1);
            }
        }

        return null;
    });

async function updateUserCounter(userId: string, delta: number) {
    if (delta === 0) return;
    const db = getDb();
    const userRef = db.collection("users").doc(userId);
    await userRef.set({
        counters: {
            pendingTasks: admin.firestore.FieldValue.increment(delta)
        }
    }, { merge: true });
}

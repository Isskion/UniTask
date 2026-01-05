import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { getAllEntries } from "@/lib/storage";
// import { syncShadowProjects } from "@/lib/projects";

/**
 * WIPES all Business Data:
 * 1. All Tasks
 * 2. All Weekly Entries (History & Projects)
 * 
 * Preserves:
 * - Users
 * - System Settings (if any)
 */
export const resetDatabase = async () => {
    try {
        console.warn("⚠️ STARTING DATABASE RESET...");

        // 1. Delete ALL Tasks
        const tasksRef = collection(db, "tasks");
        const tasksSnapshot = await getDocs(tasksRef);

        // Use batches (limit 500)
        const batchSize = 400;
        let batch = writeBatch(db);
        let count = 0;

        for (const d of tasksSnapshot.docs) {
            batch.delete(d.ref);
            count++;
            if (count >= batchSize) {
                await batch.commit();
                batch = writeBatch(db);
                count = 0;
            }
        }
        if (count > 0) await batch.commit();
        console.log(`✅ Deleted ${tasksSnapshot.size} tasks.`);

        // 2. Delete ALL Weekly Entries (This clears projects history too)
        const entriesRef = collection(db, "weekly_entries");
        const entriesSnapshot = await getDocs(entriesRef);

        batch = writeBatch(db);
        count = 0;
        for (const d of entriesSnapshot.docs) {
            batch.delete(d.ref);
            count++;
            if (count >= batchSize) {
                await batch.commit();
                batch = writeBatch(db);
                count = 0;
            }
        }
        if (count > 0) await batch.commit();
        console.log(`✅ Deleted ${entriesSnapshot.size} weekly entries.`);

        return { success: true, message: "Base de datos inicializada correctamente." };

    } catch (error) {
        console.error("❌ Reset failed:", error);
        throw error;
    }
};

/**
 * MIGRATION V2: Populate 'projects' collection from 'weekly_entries'
 */
// export const migrateLegacyProjects = async () => {
//     console.log("Migration disabled temporarily.");
//     return { success: false };
// };

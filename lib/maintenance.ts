import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";

/**
 * WIPES all Business Data for a fresh start.
 * ...
 */
export interface WipeOptions {
    tasks?: boolean;
    journal?: boolean;
    projects?: boolean;
    tenants?: boolean;
    tenantIdFilter?: string | null; // NEW: Constraint for non-superadmins
}

/**
 * WIPES selected Business Data for a fresh start.
 */
export const resetDatabase = async (options: WipeOptions = { tasks: true, journal: true, projects: true, tenants: false }) => {
    try {
        console.warn("⚠️ STARTING DATABASE RESET with options:", options);

        // --- CRITICAL SAFETY CHECK ---
        // Prevent execution on Production Project ID
        // @ts-ignore - _databaseId is internal but reliable, or use app.options
        const projectId = db.app.options.projectId;
        if (projectId === "unitask-v1") {
            throw new Error("⛔ FATAL SAFETY ERROR: Cannot wipe data on PRODUCTION project (unitask-v1). Action Aborted.");
        }
        // -----------------------------

        // 1. Tasks (Safe-ish)
        if (options.tasks) {
            await deleteCollection("tasks", options.tenantIdFilter);
        }

        // 2. Journal/History (Safe-ish)
        if (options.journal) {
            await deleteCollection("journal_entries", options.tenantIdFilter);
            await deleteCollection("weekly_entries", options.tenantIdFilter);
        }

        // 3. Projects (DESTRUCTIVE)
        if (options.projects) {
            await deleteCollection("projects", options.tenantIdFilter);
        }

        // 4. Tenants (NUCLEAR)
        if (options.tenants) {
            console.log("Cleaning tenants (preserving '1')...");
            const tenantsSnapshot = await getDocs(collection(db, "tenants"));
            if (!tenantsSnapshot.empty) {
                const batch = writeBatch(db);
                let deletedTenants = 0;
                for (const d of tenantsSnapshot.docs) {
                    if (d.id !== "1") {
                        batch.delete(d.ref);
                        deletedTenants++;
                    }
                }
                if (deletedTenants > 0) {
                    await batch.commit();
                    console.log(`✅ Deleted ${deletedTenants} tenants.`);
                }
            }
            // Reset counters only if tenants are wiped? Or maybe we keep counters?
            // Usually if we wipe tenants we want to reset the tenant ID counter.
            await setDoc(doc(db, "system", "counters"), { tenants: 2 }, { merge: true });
        }

        return { success: true, message: "Datos seleccionados eliminados correctamente." };

    } catch (error) {
        console.error("❌ Reset failed:", error);
        throw error;
    }
};

import { query, where } from "firebase/firestore"; // Ensure import

const deleteCollection = async (collectionName: string, tenantId?: string | null) => {
    console.log(`Deleting ${collectionName} (Filter: ${tenantId || 'ALL'})...`);

    let q;
    if (tenantId) {
        // Safe Delete: Only delete documents belonging to this tenant
        // This satisfies the "allow list if tenantId matches" rule
        q = query(collection(db, collectionName), where("tenantId", "==", tenantId));
    } else {
        // Superadmin Wipe: Delete everything
        q = collection(db, collectionName);
    }

    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const batchSize = 400;
    let batch = writeBatch(db);
    let count = 0;
    for (const d of snapshot.docs) {
        batch.delete(d.ref);
        count++;
        if (count >= batchSize) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
        }
    }
    if (count > 0) await batch.commit();
    console.log(`✅ Deleted from ${collectionName}.`);
};

/**
 * Migrates documents from 'user' (singular/legacy) to 'users' (plural).
 */
export const migrateLegacyUsers = async () => {
    console.log("Migrating users from 'user' to 'users'...");
    const oldSnap = await getDocs(collection(db, "user"));
    if (oldSnap.empty) {
        console.log("No legacy users found in 'user'.");
        return { success: true, message: "No había usuarios legacy." };
    }

    let moved = 0;
    for (const oldDoc of oldSnap.docs) {
        const data = oldDoc.data();
        const uid = oldDoc.id;

        // Check if exists in new
        const newRef = doc(db, "users", uid);
        const newSnap = await getDoc(newRef);

        if (!newSnap.exists()) {
            await setDoc(newRef, data);
            await deleteDoc(oldDoc.ref);
            moved++;
            console.log(`Migrated user ${uid} (${data.email})`);
        } else {
            console.log(`User ${uid} already exists in 'users'. Deleting legacy copy.`);
            await deleteDoc(oldDoc.ref); // Delete duplicate
        }
    }

    return { success: true, message: `Migrados ${moved} usuarios legacy a colección 'users'.` };
};

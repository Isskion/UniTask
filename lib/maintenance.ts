import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";

/**
 * WIPES all Business Data for a fresh start.
 * ...
 */
export const resetDatabase = async () => {
    // ... content same as before ... 
    // Note: I am rewriting this file, so I need to include previous logic or just append/modify.
    // I will rewrite the whole file to be safe and include migrateUsers.
    try {
        console.warn("⚠️ STARTING DATABASE RESET...");
        const collectionsToWipe = ["tasks", "projects", "journal_entries", "weekly_entries"];

        for (const colName of collectionsToWipe) {
            await deleteCollection(colName);
        }

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

        await setDoc(doc(db, "system", "counters"), { tenants: 2 }, { merge: true });
        console.log("✅ System counters reset to 2.");

        return { success: true, message: "Base de datos inicializada." };

    } catch (error) {
        console.error("❌ Reset failed:", error);
        throw error;
    }
};

const deleteCollection = async (collectionName: string) => {
    // ... same as before
    const ref = collection(db, collectionName);
    const snapshot = await getDocs(ref);
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

import { WeeklyEntry, DailyStatus } from "@/types";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, getDocs, orderBy, query, limit, where } from "firebase/firestore";
import { getTenantCollection, getTenantDoc } from "./tenant_db";

// --- DAILY STATUS LOGS (Formerly Journal Entries) ---
// [UPDATED] Supports Multiple Entries per Date
export async function getDailyStatusLogsForDate(tenantId: string, date: string): Promise<DailyStatus[]> {
    try {
        const q = query(
            getTenantCollection(db, "journal_entries", tenantId),
            // where("tenantId", "==", tenantId), // Implicit
            where("date", "==", date)
        );

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const entries = snapshot.docs.map(doc => doc.data() as DailyStatus);
            // Sort in memory (newest first)
            return entries.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            });
        }

        return [];
    } catch (e) {
        console.error("Error getting status logs", e);
        return [];
    }
}

// Backward compatibility wrapper
export async function getDailyStatus(tenantId: string, date: string): Promise<DailyStatus | null> {
    const entries = await getDailyStatusLogsForDate(tenantId, date);
    return entries.length > 0 ? entries[0] : null;
}

export async function saveDailyStatus(entry: DailyStatus): Promise<void> {
    try {
        let docId = entry.id;

        // Ensure ID is namespaced if it assumes legacy format but lacks organization prefix
        if (docId === entry.date) {
            docId = `${entry.tenantId}_${entry.date}`;
        }

        console.log(`[Storage] SAVING Daily Status: ${docId}, Organization: ${entry.tenantId}`);
        const docRef = getTenantDoc(db, "journal_entries", docId, entry.tenantId);

        // Ensure ID in body matches document ID
        const payload = { ...entry, id: docId };

        await setDoc(docRef, payload);
    } catch (e) {
        console.error("Error saving daily status", e);
        throw e;
    }
}

export async function getRecentDailyStatusEntries(tenantId: string, limitCount: number = 30): Promise<DailyStatus[]> {
    try {
        const q = query(
            getTenantCollection(db, "journal_entries", tenantId),
            // where("tenantId", "==", tenantId),
            orderBy("date", "desc"),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as DailyStatus);
    } catch (e) {
        console.error("Error fetching recent status entries", e);
        return [];
    }
}

export async function getAllDailyStatusEntries(tenantId: string): Promise<DailyStatus[]> {
    try {
        const q = query(
            collection(db, "journal_entries"),
            where("tenantId", "==", tenantId),
            orderBy("date", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as DailyStatus);
    } catch (e) {
        console.error("Error fetching all status entries", e);
        return [];
    }
}

// --- LEGACY WEEKLY ENTRIES ---
const COLLECTION_NAME = "weekly_entries";

export async function saveWeeklyEntry(entry: WeeklyEntry): Promise<void> {
    try {
        const docRef = getTenantDoc(db, COLLECTION_NAME, entry.id, entry.tenantId || "1");
        await setDoc(docRef, entry);
        console.log(`[Firestore] Saved weekly entry ${entry.id}`);
    } catch (error) {
        console.error(`[Firestore] Error saving weekly entry ${entry.id}:`, error);
        throw error;
    }
}

export async function getWeeklyEntry(id: string): Promise<WeeklyEntry | null> {
    try {
        const tenantId = "1"; // FIXME: Legacy need tenantId
        // This function is problematic as it requires tenantId to find the doc.
        // Assuming legacy or requires id to contain tenant info?
        // Since we are moving to hard isolation, reading by just ID is hard if ID implies tenant.
        // Let's assume we can't easily support this without signature change OR strict ID format.
        // For now, attempting to read from tenant "1" or we should throw error.
        const docRef = getTenantDoc(db, COLLECTION_NAME, id, tenantId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return { ...data, id: docSnap.id } as WeeklyEntry;
        } else {
            console.log(`[Firestore] No weekly entry found for ${id}`);
            return null;
        }
    } catch (error) {
        console.error(`[Firestore] Error fetching weekly entry ${id}:`, error);
        return null;
    }
}

export async function getAllEntries(tenantId: string): Promise<WeeklyEntry[]> {
    try {
        const q = query(
            getTenantCollection(db, COLLECTION_NAME, tenantId),
            // where("tenantId", "==", tenantId)
        );
        const querySnapshot = await getDocs(q);
        const entries: WeeklyEntry[] = [];
        querySnapshot.forEach((doc) => {
            entries.push(doc.data() as WeeklyEntry);
        });
        return entries.sort((a, b) => b.id.localeCompare(a.id));
    } catch (error) {
        console.error("[Firestore] Error fetching all weekly entries:", error);
        return [];
    }
}

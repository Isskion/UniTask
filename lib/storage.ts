import { WeeklyEntry, JournalEntry } from "@/types";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, getDocs, orderBy, query, limit, where } from "firebase/firestore";

// --- JOURNAL ENTRIES (DAILY) ---
// --- JOURNAL ENTRIES (DAILY) ---
// [UPDATED] Supports Multiple Entries per Date
export async function getJournalEntriesForDate(tenantId: string, date: string): Promise<JournalEntry[]> {
    try {
        const q = query(
            collection(db, "journal_entries"),
            where("tenantId", "==", tenantId),
            where("date", "==", date)
            // orderBy("createdAt", "desc") // [REMOVED] To avoid complex index error. Sorting in JS.
        );

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const entries = snapshot.docs.map(doc => doc.data() as JournalEntry);
            // Sort in memory (newest first)
            return entries.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            });
        }

        return [];
    } catch (e) {
        console.error("Error getting journal entries", e);
        return [];
    }
}

// Backward compatibility wrapper
export async function getJournalEntry(tenantId: string, date: string): Promise<JournalEntry | null> {
    const entries = await getJournalEntriesForDate(tenantId, date);
    return entries.length > 0 ? entries[0] : null;
}

export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
    try {
        // [CHANGE] TRUST the Entry ID. Do not force composite if the ID is already unique.
        // Legacy IDs were "Tenant_Date". New IDs might be "Tenant_Date_Timestamp".
        // Use entry.id strictly.

        // Fallback for safety: if entry.id looks like just a date "YYYY-MM-DD", preserve legacy behavior (single doc)
        // If it's a new unique ID, it will be saved as such.
        let docId = entry.id;

        // Ensure ID is namespaced if it assumes legacy format but lacks tenant (Edge case safety)
        if (docId === entry.date) {
            docId = `${entry.tenantId}_${entry.date}`;
        }

        console.log(`[Storage] SAVING Entry: ${docId}, Tenant: ${entry.tenantId}`);
        const docRef = doc(db, "journal_entries", docId);

        // Ensure ID in body matches document ID
        const payload = { ...entry, id: docId };

        await setDoc(docRef, payload);
    } catch (e) {
        console.error("Error saving journal entry", e);
        throw e;
    }
}

export async function getRecentJournalEntries(tenantId: string, limitCount: number = 30): Promise<JournalEntry[]> {
    try {
        const q = query(
            collection(db, "journal_entries"),
            where("tenantId", "==", tenantId),
            orderBy("date", "desc"),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as JournalEntry);
    } catch (e) {
        console.error("Error fetching recent entries", e);
        return [];
    }
}

export async function getAllJournalEntries(tenantId: string): Promise<JournalEntry[]> {
    try {
        const q = query(
            collection(db, "journal_entries"),
            where("tenantId", "==", tenantId),
            orderBy("date", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as JournalEntry);
    } catch (e) {
        console.error("Error fetching all entries", e);
        return [];
    }
}

// --- LEGACY WEEKLY ENTRIES ---
const COLLECTION_NAME = "weekly_entries";

export async function saveWeeklyEntry(entry: WeeklyEntry): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, entry.id);
        await setDoc(docRef, entry);
        console.log(`[Firestore] Saved entry ${entry.id}`);
    } catch (error) {
        console.error(`[Firestore] Error saving entry ${entry.id}:`, error);
        throw error;
    }
}

export async function getWeeklyEntry(id: string): Promise<WeeklyEntry | null> {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return { ...data, id: docSnap.id } as WeeklyEntry;
        } else {
            console.log(`[Firestore] No entry found for ${id}`);
            return null;
        }
    } catch (error) {
        console.error(`[Firestore] Error fetching entry ${id}:`, error);
        return null;
    }
}

export async function getAllEntries(tenantId: string): Promise<WeeklyEntry[]> {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("tenantId", "==", tenantId)
        );
        const querySnapshot = await getDocs(q);
        const entries: WeeklyEntry[] = [];
        querySnapshot.forEach((doc) => {
            entries.push(doc.data() as WeeklyEntry);
        });
        return entries.sort((a, b) => b.id.localeCompare(a.id));
    } catch (error) {
        console.error("[Firestore] Error fetching all entries:", error);
        return [];
    }
}

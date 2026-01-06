import { WeeklyEntry, JournalEntry } from "@/types";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, getDocs, orderBy, query, limit } from "firebase/firestore";

// --- JOURNAL ENTRIES (DAILY) ---
export async function getJournalEntry(dateId: string): Promise<JournalEntry | null> {
    try {
        const docRef = doc(db, "journal_entries", dateId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? (docSnap.data() as JournalEntry) : null;
    } catch (e) {
        console.error("Error getting journal entry", e);
        return null;
    }
}

export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
    try {
        const docRef = doc(db, "journal_entries", entry.id);
        await setDoc(docRef, entry);
    } catch (e) {
        console.error("Error saving journal entry", e);
        throw e;
    }
}

export async function getRecentJournalEntries(limitCount: number = 30): Promise<JournalEntry[]> {
    try {
        const q = query(
            collection(db, "journal_entries"),
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

export async function getAllEntries(): Promise<WeeklyEntry[]> {
    try {
        const q = query(collection(db, COLLECTION_NAME));
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



import { WeeklyEntry } from "@/types";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, getDocs, orderBy, query, limit } from "firebase/firestore";
// import { syncShadowProjects } from "@/lib/projects";

// Collection Reference
const COLLECTION_NAME = "weekly_entries";

export async function saveWeeklyEntry(entry: WeeklyEntry): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, entry.id);
        await setDoc(docRef, entry);
        console.log(`[Firestore] Saved entry ${entry.id}`);

        // V2 Shadow Write
        // await syncShadowProjects(entry);
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
        // Sort by id descending (date)
        return entries.sort((a, b) => b.id.localeCompare(a.id));
    } catch (error) {
        console.error("[Firestore] Error fetching all entries:", error);
        return [];
    }
}

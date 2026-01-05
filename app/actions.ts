"use server";

import { getWeeklyEntry, saveWeeklyEntry, getAllEntries } from "@/lib/storage";
import { WeeklyEntry } from "@/types";
import { revalidatePath } from "next/cache";

export async function submitEntry(entry: WeeklyEntry) {
    await saveWeeklyEntry(entry);
    revalidatePath("/");
    return { success: true };
}

export async function fetchEntry(id: string) {
    return await getWeeklyEntry(id);
}

export async function fetchAllEntries() {
    return await getAllEntries();
}

export async function fetchExistingIds(): Promise<string[]> {
    const entries = await getAllEntries();
    return entries.map(e => e.id);
}

export async function fetchPreviousEntry(currentId: string) {
    const all = await getAllEntries(); // Sorted by newest first (descending id)
    // Find the first entry that is strictly smaller than currentId
    return all.find(e => e.id < currentId) || null;
}

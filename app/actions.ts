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

export async function fetchAllEntries(tenantId: string = "1") {
    return await getAllEntries(tenantId);
}

export async function fetchExistingIds(tenantId: string = "1"): Promise<string[]> {
    const entries = await getAllEntries(tenantId);
    return entries.map(e => e.id);
}

export async function fetchPreviousEntry(currentId: string, tenantId: string = "1") {
    const all = await getAllEntries(tenantId); // Sorted by newest first (descending id)
    // Find the first entry that is strictly smaller than currentId
    return all.find(e => e.id < currentId) || null;
}

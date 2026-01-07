import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    where,
    limit,
    doc,
    deleteDoc,
    serverTimestamp,
    Timestamp
} from "firebase/firestore";
import { ProjectUpdate, Task, JournalEntry } from "@/types";

const PROJECTS_COLLECTION = "projects";
const UPDATES_SUBCOLLECTION = "updates";
const TASKS_COLLECTION = "tasks";
const JOURNAL_COLLECTION = "journal_entries";

/**
 * Creates a new update (event) for a specific project.
 */
export async function createUpdate(projectId: string, data: Omit<ProjectUpdate, 'id' | 'createdAt'>) {
    try {
        const subCollectionRef = collection(db, PROJECTS_COLLECTION, projectId, UPDATES_SUBCOLLECTION);
        const docRef = await addDoc(subCollectionRef, {
            ...data,
            createdAt: serverTimestamp(),
            // Ensure date is a Timestamp if passed as Date
            date: data.date instanceof Date ? Timestamp.fromDate(data.date) : data.date
        });
        return docRef.id;
    } catch (error) {
        console.error(`Error creating update for project ${projectId}:`, error);
        throw error;
    }
}

/**
 * Fetches the UNIFIED activity feed for a project.
 * Merges: Manual Updates + Tasks + Journal Entries
 */
export async function getProjectUpdates(projectId: string, limitCount = 50): Promise<ProjectUpdate[]> {
    try {
        const results: ProjectUpdate[] = [];

        // 1. Fetch Manual Updates
        const updatesRef = collection(db, PROJECTS_COLLECTION, projectId, UPDATES_SUBCOLLECTION);
        const qUpdates = query(updatesRef, orderBy("date", "desc"), limit(limitCount));
        const snapUpdates = await getDocs(qUpdates);
        snapUpdates.forEach(d => results.push({ id: d.id, ...d.data() } as ProjectUpdate));

        // 2. Fetch Tasks Linked to Project
        const tasksRef = collection(db, TASKS_COLLECTION);
        const qTasks = query(tasksRef, where("projectId", "==", projectId), orderBy("createdAt", "desc"), limit(limitCount));
        const snapTasks = await getDocs(qTasks);

        snapTasks.forEach(d => {
            const t = d.data() as Task;
            // Map Task creation to Update Event
            results.push({
                id: `task-create-${d.id}`,
                projectId,
                date: t.createdAt, // Created At Timestamp
                authorId: t.createdBy,
                authorName: "Sistema", // Or fetch user
                type: 'daily', // Abuse 'daily' type for tasks for now, or add 'task' type
                content: {
                    notes: `Nueva Tarea Creada: ${t.title}`,
                    nextSteps: t.status === 'completed' ? [] : [t.title],
                    flags: t.isBlocking ? ['Bloqueante'] : []
                }
            });

            // If completed, maybe add another event? (Simpler to just track creation for now, or last update)
        });

        // 3. Fetch Journal Entries (Project Updates inside Daily Entries)
        // This is tricky efficiently without a subcollection, but we will query recent entries and filter in memory for now
        // Optimization: In real app, we should duplicate ProjectEntry into a subcollection of Project (fan-out)
        // For now: Fetch last 30 daily entries and look for this project
        const journalRef = collection(db, JOURNAL_COLLECTION);
        const qJournal = query(journalRef, orderBy("date", "desc"), limit(30));
        const snapJournal = await getDocs(qJournal);

        snapJournal.forEach(d => {
            const entry = d.data() as JournalEntry;
            const projEntry = entry.projects?.find(p => p.projectId === projectId);

            if (projEntry) {
                // Determine date from entry ID (YYYY-MM-DD) or date field
                const entryDate = new Date(entry.date);

                results.push({
                    id: `journal-${entry.id}-${projectId}`,
                    projectId,
                    date: Timestamp.fromDate(entryDate),
                    authorId: 'system',
                    authorName: 'Resumen Diario',
                    type: 'weekly', // Use 'weekly' visual style for Journal Entries (or mapping correctly)
                    content: {
                        notes: projEntry.pmNotes || projEntry.conclusions || "Sin notas adicionales.",
                        nextSteps: projEntry.nextSteps ? projEntry.nextSteps.split('\n').filter(s => s.trim().length > 0) : [],
                        blockers: ""
                    }
                });
            }
        });

        // Sort unified list descending
        return results.sort((a, b) => {
            const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
            const db = b.date?.toDate ? b.date.toDate() : new Date(b.date);
            return db.getTime() - da.getTime();
        });

    } catch (error) {
        console.error(`Error fetching updates for project ${projectId}:`, error);
        return [];
    }
}

/**
 * Deletes a specific update (Admin/Author only ideally).
 */
export async function deleteUpdate(projectId: string, updateId: string) {
    try {
        const docRef = doc(db, PROJECTS_COLLECTION, projectId, UPDATES_SUBCOLLECTION, updateId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting update:", error);
        throw error;
    }
}

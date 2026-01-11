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
export async function createUpdate(projectId: string, tenantId: string, data: Omit<ProjectUpdate, 'id' | 'createdAt' | 'tenantId'>) {
    try {
        const subCollectionRef = collection(db, PROJECTS_COLLECTION, projectId, UPDATES_SUBCOLLECTION);
        const docRef = await addDoc(subCollectionRef, {
            ...data,
            tenantId, // CRITICAL: Security Rules require this field
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
// [UPDATED] Scoped Project Updates
export async function getProjectUpdates(projectId: string, tenantId: string, limitCount = 50): Promise<ProjectUpdate[]> {
    try {
        const results: ProjectUpdate[] = [];

        // 1. Fetch Manual Updates (Subcollection)
        // REQUIRES: Recursive rules or specific subcollection rule
        // REQUIRES: Documents have tenantId (if rule checks it)
        try {
            const updatesRef = collection(db, PROJECTS_COLLECTION, projectId, UPDATES_SUBCOLLECTION);
            // Note: Subcollections might typically be owned by the parent project implicitly, 
            // but for strict rules, we might need to filter. 
            // Currently assuming parent access implies subcollection access if rules allow.
            const qUpdates = query(updatesRef, orderBy("date", "desc"), limit(limitCount));
            const snapUpdates = await getDocs(qUpdates);
            snapUpdates.forEach(d => results.push({ id: d.id, ...d.data() } as ProjectUpdate));
        } catch (e) {
            console.warn("Manual updates fetch failed (possibly permissions or empty):", e);
        }

        // 2. Fetch Tasks Linked to Project
        // CRITICAL: Must filter by tenantId to satisfy row-level security
        try {
            const tasksRef = collection(db, TASKS_COLLECTION);
            const qTasks = query(
                tasksRef,
                where("projectId", "==", projectId),
                where("tenantId", "==", tenantId), // Added Security Constraint
                orderBy("createdAt", "desc"),
                limit(limitCount)
            );
            const snapTasks = await getDocs(qTasks);
            snapTasks.forEach(d => {
                const t = d.data() as Task;
                results.push({
                    id: `task-create-${d.id}`,
                    projectId,
                    date: t.createdAt,
                    authorId: t.createdBy,
                    authorName: "Sistema",
                    type: 'daily',
                    content: {
                        notes: `Nueva Tarea Creada: ${t.title}`,
                        nextSteps: t.status === 'completed' ? [] : [t.title],
                        flags: t.isBlocking ? ['Bloqueante'] : []
                    }
                });
            });
        } catch (e) {
            console.warn("Tasks fetch failed:", e);
        }

        // 3. Fetch Journal Entries
        // CRITICAL: Must filter by tenantId
        try {
            const journalRef = collection(db, JOURNAL_COLLECTION);
            const qJournal = query(
                journalRef,
                where("tenantId", "==", tenantId), // Added Security Constraint
                orderBy("date", "desc"),
                limit(30)
            );
            const snapJournal = await getDocs(qJournal);

            snapJournal.forEach(d => {
                const entry = d.data() as JournalEntry;
                const projEntry = entry.projects?.find(p => p.projectId === projectId);

                if (projEntry) {
                    const entryDate = new Date(entry.date);
                    results.push({
                        id: `journal-${d.id}-${projectId}`,
                        projectId,
                        date: Timestamp.fromDate(entryDate),
                        authorId: 'system',
                        authorName: 'Resumen Diario',
                        type: 'weekly',
                        content: {
                            notes: projEntry.pmNotes || projEntry.conclusions || "Sin notas adicionales.",
                            nextSteps: projEntry.nextSteps ? projEntry.nextSteps.split('\n').filter(s => s.trim().length > 0) : [],
                            blockers: ""
                        }
                    });
                }
            });
        } catch (e) {
            console.warn("Journal fetch failed:", e);
        }

        // 4. Deduplicate results
        const uniqueResults = Array.from(new Map(results.map(item => [item.id, item])).values());

        // Sort unified list descending
        return uniqueResults.sort((a, b) => {
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

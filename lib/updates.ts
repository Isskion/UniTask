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
import { TimelineEvent, Task, DailyStatus } from "@/types";

const PROJECTS_COLLECTION = "projects";
const TIMELINE_SUBCOLLECTION = "updates"; // Keeping "updates" in Firestore for now
const TASKS_COLLECTION = "tasks";
const DAILY_LOG_COLLECTION = "journal_entries"; // Ubiquitous name for the collection constant

/**
 * Creates a new timeline event for a specific project.
 */
export async function createTimelineEvent(projectId: string, tenantId: string, data: Omit<TimelineEvent, 'id' | 'createdAt' | 'tenantId'>) {
    try {
        const eventsRef = collection(db, 'project_activity_feed');
        const docRef = await addDoc(eventsRef, {
            ...data,
            projectId,
            tenantId, // CRITICAL: Security Rules require this field
            createdAt: serverTimestamp(),
            // Ensure date is a Timestamp if passed as Date
            date: data.date instanceof Date ? Timestamp.fromDate(data.date) : data.date
        });
        return docRef.id;
    } catch (error) {
        console.error(`Error creating event for project ${projectId}:`, error);
        throw error;
    }
}

/**
 * Fetches the UNIFIED activity timeline for a project.
 * Merges: Manual Events + Tasks + Daily Status Logs
 */
// [UPDATED] Scoped Project Timeline
export async function getProjectTimeline(projectId: string, tenantId: string, limitCount = 50, projectName?: string): Promise<TimelineEvent[]> {
    try {
        const results: TimelineEvent[] = [];

        // 1. Fetch Manual Events (Subcollection)
        try {
            const eventsRef = collection(db, 'project_activity_feed');
            let qEvents;
            if (limitCount === 0) {
                qEvents = query(eventsRef, where("tenantId", "==", tenantId), orderBy("date", "desc"));
            } else {
                qEvents = query(eventsRef, where("tenantId", "==", tenantId), orderBy("date", "desc"), limit(limitCount));
            }
            const snapEvents = await getDocs(qEvents);
            snapEvents.forEach(d => results.push({ id: d.id, ...d.data() } as TimelineEvent));
        } catch (e) {
            console.warn("Manual events fetch failed (possibly permissions or empty):", e);
        }

        // 2. Fetch Tasks Linked to Project
        try {
            const tasksRef = collection(db, TASKS_COLLECTION);
            let qTasks;

            if (limitCount === -1) {
                qTasks = query(
                    tasksRef,
                    where("projectId", "==", projectId),
                    where("tenantId", "==", tenantId),
                    orderBy("createdAt", "desc")
                );
            } else {
                qTasks = query(
                    tasksRef,
                    where("projectId", "==", projectId),
                    where("tenantId", "==", tenantId),
                    orderBy("createdAt", "desc"),
                    limit(limitCount)
                );
            }

            const snapTasks = await getDocs(qTasks);
            snapTasks.forEach(d => {
                const t = d.data() as Task;
                results.push({
                    id: `task-create-${d.id}`,
                    projectId,
                    date: t.createdAt,
                    authorId: t.createdBy,
                    authorName: "System",
                    type: 'daily',
                    content: {
                        notes: `New Task Created: ${t.title}`,
                        nextSteps: t.status === 'completed' ? [] : [t.title],
                        flags: t.isBlocking ? ['Blocking'] : []
                    }
                });
            });
        } catch (e) {
            console.warn("Tasks fetch failed:", e);
        }

        // 3. Fetch Daily Status Logs
        try {
            let qDailyLog;

            if (limitCount === -1) {
                const qDaily = query(
                    collection(db, "journal_entries"),
                    where("tenantId", "==", tenantId),
                    orderBy("date", "desc"),
                    limit(limitCount || 5)
                );
                const qWeekly = query(
                    collection(db, "weekly_entries"),
                    where("tenantId", "==", tenantId),
                    orderBy("year", "desc"),
                    limit(30)
                );
                // Assuming qDailyLog should be assigned one of these or a combined result
                // For now, let's assume it's still fetching from DAILY_LOG_COLLECTION
                qDailyLog = qDaily; // Or handle qWeekly separately
            } else {
                qDailyLog = query(
                    collection(db, DAILY_LOG_COLLECTION),
                    where("tenantId", "==", tenantId),
                    orderBy("date", "desc"),
                    limit(30)
                );
            }
            const snapDailyLog = await getDocs(qDailyLog);

            snapDailyLog.forEach(d => {
                const statusEntry = d.data() as DailyStatus;
                const targetName = projectName?.trim().toLowerCase();
                const projEntry = statusEntry.projects?.find(p =>
                    p.projectId === projectId ||
                    (targetName && p.name?.trim().toLowerCase() === targetName)
                );

                if (projEntry) {
                    const entryDate = new Date(statusEntry.date);

                    const contentBlocks = projEntry.blocks?.map(b => `${b.title ? `### ${b.title}\n` : ''}${b.content}`).join('\n\n') || "";
                    const combinedNotes = [projEntry.pmNotes, projEntry.conclusions, contentBlocks]
                        .filter(text => text && text.trim().length > 0)
                        .join('\n\n') || "No additional notes.";

                    results.push({
                        id: `journal-${d.id}-${projectId}`,
                        projectId,
                        date: Timestamp.fromDate(entryDate),
                        authorId: 'system',
                        authorName: 'Daily Summary',
                        type: 'weekly',
                        content: {
                            notes: combinedNotes,
                            nextSteps: projEntry.nextSteps ? projEntry.nextSteps.split('\n').filter(s => s.trim().length > 0) : [],
                            blockers: ""
                        }
                    });
                }
            });
        } catch (e) {
            console.warn("Daily status fetch failed:", e);
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
        console.error(`Error fetching timeline for project ${projectId}:`, error);
        return [];
    }
}

/**
 * Deletes a specific event.
 */
export async function deleteTimelineEvent(projectId: string, eventId: string) {
    try {
        const docRef = doc(db, PROJECTS_COLLECTION, projectId, TIMELINE_SUBCOLLECTION, eventId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting event:", error);
        throw error;
    }
}

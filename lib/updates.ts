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
    updateDoc, // Added for soft delete
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
        console.log(`[Updates] Event created for project ${projectId} in collection project_activity_feed`);
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
            if (limitCount === -1 || limitCount === 0) {
                console.log(`[Updates] Querying: Project=${projectId}, Tenant=${tenantId}, Sort=Date DESC (Full)`);
                qEvents = query(
                    eventsRef,
                    where("projectId", "==", projectId),
                    where("tenantId", "==", tenantId),
                    // where("isTrashed", "!=", true), // REMOVED: Hides legacy data
                    // orderBy("isTrashed"),
                    orderBy("date", "desc")
                );
            } else {
                console.log(`[Updates] Querying: Project=${projectId}, Tenant=${tenantId}, Sort=Date DESC (Limit=${limitCount})`);
                qEvents = query(
                    eventsRef,
                    where("projectId", "==", projectId),
                    where("tenantId", "==", tenantId),
                    // where("isTrashed", "!=", true),
                    // orderBy("isTrashed"),
                    orderBy("date", "desc"),
                    limit(limitCount)
                );
            }
            const snapEvents = await getDocs(qEvents);
            console.log(`[Updates] Fetched ${snapEvents.size} manual events for project ${projectId}`);
            snapEvents.forEach(d => {
                const data = d.data();
                // Client-side filtering to support mixed legacy data (isTrashed missing vs isTrashed=true)
                if (data.isTrashed !== true) {
                    results.push({ id: d.id, ...data } as TimelineEvent);
                }
            });
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
                    limit(limitCount || 50)
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
                qDailyLog = query(
                    collection(db, "journal_entries"),
                    where("tenantId", "==", tenantId),
                    orderBy("date", "desc")
                );
            } else {
                qDailyLog = query(
                    collection(db, DAILY_LOG_COLLECTION),
                    where("tenantId", "==", tenantId),
                    orderBy("date", "desc"),
                    limit(limitCount || 30)
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
 * Soft deletes (trashes) a specific event.
 */
export async function trashTimelineEvent(eventId: string, userId: string) {
    try {
        const docRef = doc(db, 'project_activity_feed', eventId);
        await updateDoc(docRef, {
            isTrashed: true,
            deletedAt: serverTimestamp(),
            deletedBy: userId
        });
        console.log(`[Updates] Event ${eventId} moved to trash by ${userId}`);
    } catch (error) {
        console.error("Error trashing event:", error);
        throw error;
    }
}

/**
 * Permanently Deletes a specific event (Admin Only).
 */
export async function deleteTimelineEvent(projectId: string, eventId: string) {
    try {
        const docRef = doc(db, 'project_activity_feed', eventId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting event:", error);
        throw error;
    }
}

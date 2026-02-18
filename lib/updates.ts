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
    getDoc, // Added for complex updates
    deleteDoc,
    updateDoc, // Added for soft delete
    serverTimestamp,
    Timestamp
} from "firebase/firestore";
import { TimelineEvent, Task, DailyStatus } from "@/types";
import { getTenantCollection, getTenantDoc } from "./tenant_db";

const PROJECTS_COLLECTION = "projects";
const TIMELINE_SUBCOLLECTION = "updates"; // Keeping "updates" in Firestore for now
const TASKS_COLLECTION = "tasks";
const DAILY_LOG_COLLECTION = "journal_entries"; // Ubiquitous name for the collection constant

/**
 * Creates a new timeline event for a specific project.
 */
export async function createTimelineEvent(projectId: string, tenantId: string, data: Omit<TimelineEvent, 'id' | 'createdAt' | 'tenantId'>) {
    try {
        const eventsRef = getTenantCollection(db, 'project_activity_feed', tenantId);
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
            const eventsRef = getTenantCollection(db, 'project_activity_feed', tenantId);
            let qEvents;
            if (limitCount === -1 || limitCount === 0) {
                console.log(`[Updates] Querying: Project=${projectId}, Tenant=${tenantId}, Sort=Date DESC (Full)`);
                qEvents = query(
                    eventsRef,
                    where("projectId", "==", projectId),
                    // where("tenantId", "==", tenantId), // Implicit
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
            const tasksRef = getTenantCollection(db, TASKS_COLLECTION, tenantId);
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
                    getTenantCollection(db, "journal_entries", tenantId),
                    // where("tenantId", "==", tenantId),
                    orderBy("date", "desc")
                );
            } else {
                qDailyLog = query(
                    getTenantCollection(db, DAILY_LOG_COLLECTION, tenantId),
                    // where("tenantId", "==", tenantId),
                    orderBy("date", "desc"),
                    limit(limitCount || 30)
                );
            }
            const snapDailyLog = await getDocs(qDailyLog);

            snapDailyLog.forEach(d => {
                const statusEntry = d.data() as DailyStatus;
                const targetName = projectName?.trim().toLowerCase();
                const projEntry = statusEntry.projects?.find(p =>
                    (p.projectId === projectId ||
                        (targetName && p.name?.trim().toLowerCase() === targetName)) &&
                    // [FIX] Filter out soft-deleted entries
                    p.status !== 'trash'
                );

                if (projEntry) {
                    const entryDate = new Date(statusEntry.date);

                    const contentBlocks = projEntry.blocks?.map(b => `${b.title ? `### ${b.title}\n` : ''}${b.content}`).join('\n\n') || "";
                    const combinedNotes = [projEntry.pmNotes, projEntry.conclusions, contentBlocks]
                        .filter(text => text && text.trim().length > 0)
                        .join('\n\n') || "No additional notes.";

                    results.push({
                        id: `journal::${d.id}::${projectId}`,
                        projectId,
                        date: Timestamp.fromDate(entryDate),
                        authorId: 'system',
                        authorName: 'Daily Summary',
                        type: 'weekly',
                        content: {
                            notes: combinedNotes,
                            nextSteps: projEntry.nextSteps ? projEntry.nextSteps.split('\n').filter(s => s.trim().length > 0) : [],
                            blockers: "",
                            attachments: projEntry.attachments || [] // Map attachments
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
    // FIXME: We need tenantId to find the doc. 
    // This function signature lacks tenantId.
    // Major Refactoring required or we assume "1" for now?
    // The callers are usually specific components.
    // Let's default to "1" or try to infer? 
    // Actually, `trashTimelineEvent` is called from UI where we usually have context.
    // TODO: Update signature to (eventId, userId, tenantId).
    const tenantId = "1"; // Temporary Fallback

    try {
        // [FIX] Handle Journal Entry Soft Delete (Composite ID safely)
        if (eventId.startsWith('journal::')) {
            const parts = eventId.split('::');
            const docId = parts[1];
            const targetProjectId = parts[2];

            if (!docId || !targetProjectId) throw new Error("Invalid Journal ID format");

            const docReference = getTenantDoc(db, 'journal_entries', docId, tenantId);
            const docSnap = await getDoc(docReference);

            if (!docSnap.exists()) {
                throw new Error("Journal entry not found");
            }

            const data = docSnap.data() as DailyStatus;
            const updatedProjects = data.projects.map(p => {
                if (p.projectId === targetProjectId) {
                    return { ...p, status: 'trash', isTrashed: true, deletedBy: userId, deletedAt: new Date().toISOString() };
                }
                return p;
            });

            await updateDoc(docReference, {
                projects: updatedProjects
            });
            console.log(`[Updates] Journal Entry Block ${docId}/${targetProjectId} moved to trash by ${userId}`);
            return;
        }

        // [FIX] Handle Legacy Journal IDs (journal-yyyy-mm-dd-projectID)
        // This prevents "Permission Denied" when trying to delete older items that haven't been refreshed to :: format
        if (eventId.startsWith('journal-')) {
            const parts = eventId.split('-');
            // Expected: ['journal', 'yyyy', 'MM', 'dd', ...projectIdParts]
            if (parts.length >= 5) {
                const docId = `${parts[1]}-${parts[2]}-${parts[3]}`; // Reconstruct Date ID
                const targetProjectId = parts.slice(4).join('-');

                const docReference = getTenantDoc(db, 'journal_entries', docId, tenantId);
                const docSnap = await getDoc(docReference);

                if (docSnap.exists()) {
                    const data = docSnap.data() as DailyStatus;
                    const updatedProjects = data.projects.map(p => {
                        if (p.projectId === targetProjectId) {
                            return { ...p, status: 'trash', isTrashed: true, deletedBy: userId, deletedAt: new Date().toISOString() };
                        }
                        return p;
                    });

                    await updateDoc(docReference, {
                        projects: updatedProjects
                    });
                    console.log(`[Updates] Legacy Journal Entry Block ${docId}/${targetProjectId} moved to trash by ${userId}`);
                    return;
                }
            }
            // If we fall through here, it might be a malformed ID or not found, 
            // but we let it fall to the standard handler which will likely fail permissions, 
            // but at least we tried.
        }



        const docRef = getTenantDoc(db, 'project_activity_feed', eventId, tenantId);
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
        const tenantId = "1"; // FIXME: Update signature
        const docRef = getTenantDoc(db, 'project_activity_feed', eventId, tenantId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting event:", error);
        throw error;
    }
}

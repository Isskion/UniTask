import { db } from "@/lib/firebase";
import { WeeklyEntry, ProjectEntry } from "@/types";
import { doc, runTransaction, collection, query, where, getDocs, writeBatch, serverTimestamp } from "firebase/firestore";
import { formatDateId, getWeekNumber, getYearNumber } from "@/lib/utils";
import { startOfWeek } from "date-fns";

/**
 * Moves a specific project (notes + tasks) from one week to another.
 * Handles:
 * 1. Removing project from Source Entry.
 * 2. Adding/Merging project to Target Entry.
 * 3. Updating weekId for all associated tasks.
 */
export async function moveProjectToWeek(
    tenantId: string,
    sourceWeekId: string,
    targetDate: Date,
    projectName: string
): Promise<{ success: boolean; message: string }> {
    try {
        console.log(`[MoveProject] Moving '${projectName}' from ${sourceWeekId} to ${targetDate.toISOString()}`);

        if (!tenantId) throw new Error("Tenant ID is required");

        // 1. Calculate Target ID
        const targetMonday = startOfWeek(targetDate, { weekStartsOn: 1 });
        const targetDateId = formatDateId(targetMonday);
        const targetWeekId = tenantId === "1" ? targetDateId : `${tenantId}_${targetDateId}`;

        if (sourceWeekId === targetWeekId) {
            return { success: false, message: "La fecha de destino es la misma que la actual." };
        }

        // 2. Perform Transaction/Batch
        // We use runTransaction to ensure consistency between reading Source/Target and updating them.

        // Define outside to use for Task Query later
        let projectToMove: ProjectEntry | undefined;

        await runTransaction(db, async (transaction) => {
            // A. Read Source Entry
            const sourceRef = doc(db, "weekly_entries", sourceWeekId);
            const sourceDoc = await transaction.get(sourceRef);

            if (!sourceDoc.exists()) {
                throw new Error("La semana de origen no existe.");
            }

            const sourceData = sourceDoc.data() as WeeklyEntry;
            projectToMove = sourceData.projects.find(p => p.name === projectName);

            if (!projectToMove) {
                throw new Error(`El proyecto '${projectName}' no existe en la semana de origen.`);
            }

            // B. Read Target Entry
            const targetRef = doc(db, "weekly_entries", targetWeekId);
            const targetDoc = await transaction.get(targetRef);

            let targetData: WeeklyEntry;

            if (targetDoc.exists()) {
                targetData = targetDoc.data() as WeeklyEntry;
            } else {
                // Initialize new Target Entry
                targetData = {
                    id: targetWeekId,
                    weekNumber: getWeekNumber(targetMonday),
                    year: getYearNumber(targetMonday),
                    tenantId: tenantId,
                    pmNotes: "",
                    conclusions: "",
                    nextSteps: "",
                    projects: [],
                    createdAt: new Date().toISOString()
                };
            }

            // C. Prepare Modified Source Data (Remove Project)
            const remainingProjects = sourceData.projects.filter(p => p.name !== projectName);
            // Don't delete the whole week even if empty, to preserve simple notes. 
            // Only update the projects list.
            transaction.update(sourceRef, {
                projects: remainingProjects,
                tenantId: tenantId // Ensure tenantId ensures rule compliance/backfill
            });

            // D. Prepare Modified Target Data (Add/Merge Project)
            const existingTargetProjectIndex = targetData.projects.findIndex(p => p.name === projectName);
            const updatedTargetProjects = [...targetData.projects];

            if (existingTargetProjectIndex >= 0) {
                // Merge logic
                const existing = updatedTargetProjects[existingTargetProjectIndex];
                updatedTargetProjects[existingTargetProjectIndex] = {
                    ...existing,
                    pmNotes: mergeText(existing.pmNotes, projectToMove.pmNotes, "Notas Movidas"),
                    conclusions: mergeText(existing.conclusions, projectToMove.conclusions, "Conclusiones Movidas"),
                    // We don't merge 'nextSteps' text usually if we are moving Real Tasks, but if legacy text exists, merge it.
                    nextSteps: mergeText(existing.nextSteps, projectToMove.nextSteps, "Futuros Pasos Movidos"),
                    // Ensure status is active if it was trash
                    status: 'active'
                };
            } else {
                // Add new
                updatedTargetProjects.push({
                    ...projectToMove,
                    status: 'active' // Reset status just in case
                });
            }

            if (targetDoc.exists()) {
                transaction.update(targetRef, {
                    projects: updatedTargetProjects,
                    tenantId: tenantId
                });
            } else {
                transaction.set(targetRef, {
                    ...targetData,
                    projects: updatedTargetProjects,
                    tenantId: tenantId // Redundant (in targetData) but safe
                });
            }

            // E. Handle Tasks (Needs to be done AFTER transaction usually, or concurrent?)
            // Firestore Transactions require all reads before writes. 
            // Querying tasks (unknown number) might be too heavy for a transaction lock or not allowed.
            // STRATEGY: We'll update tasks in a separate Batch immediately after. 
            // The "Notes" move is critical. The "Tasks" move is secondary but important.
        });

        // 3. Move Tasks - Outside Transaction (Constraint: Query not allowed inside transaction cleanly for arbitrary docs)
        // We query all tasks for this project and week.
        if (projectToMove && projectToMove.projectId) {
            const tasksQuery = query(
                collection(db, "tasks"),
                where("tenantId", "==", tenantId),
                where("weekId", "==", sourceWeekId),
                where("projectId", "==", projectToMove.projectId)
            );

            const tasksSnap = await getDocs(tasksQuery);

            if (!tasksSnap.empty) {
                const batch = writeBatch(db);
                tasksSnap.forEach(docSnap => {
                    batch.update(docSnap.ref, {
                        weekId: targetWeekId,
                        updatedAt: serverTimestamp()
                    });
                });
                await batch.commit();
                console.log(`[MoveProject] Moved ${tasksSnap.size} tasks.`);
            }
        } else {
            console.warn("[MoveProject] Project has no global projectId, skipping task migration (only notes moved).");
        }

        return { success: true, message: "Proyecto movido y tareas actualizadas." };

    } catch (error: any) {
        console.error("Error moving project:", error);
        return { success: false, message: error.message || "Error desconocido al mover el proyecto." };
    }
}

function mergeText(original: string, incoming: string, label: string): string {
    if (!original || !original.trim()) return incoming;
    return `${original}\n\n--- ${label} ---\n${incoming}`;
}

/**
 * [NEW] Moves a project from one DATE to another (Daily System)
 * Targets 'journal_entries' instead of 'weekly_entries'
 */
export async function moveProjectToDate(
    tenantId: string,
    sourceDateId: string, // YYYY-MM-DD
    targetDateId: string, // YYYY-MM-DD
    projectName: string
): Promise<{ success: boolean; message: string }> {
    try {
        console.log(`[MoveProjectDay] Moving '${projectName}' from ${sourceDateId} to ${targetDateId}`);

        if (!tenantId) throw new Error("Tenant ID is required");
        if (sourceDateId === targetDateId) {
            return { success: false, message: "La fecha de destino es la misma que la actual." };
        }

        const sourceDocId = `${tenantId}_${sourceDateId}`;
        const targetDocId = `${tenantId}_${targetDateId}`;

        // Define outside for Task Query
        let projectToMove: ProjectEntry | undefined;

        await runTransaction(db, async (transaction) => {
            // A. Read Source
            const sourceRef = doc(db, "journal_entries", sourceDocId);
            const sourceDoc = await transaction.get(sourceRef);

            if (!sourceDoc.exists()) {
                throw new Error("El día de origen no existe o no tiene datos.");
            }

            const sourceData = sourceDoc.data() as any; // JournalEntry
            projectToMove = sourceData.projects.find((p: any) => p.name === projectName);

            if (!projectToMove) {
                throw new Error(`El proyecto '${projectName}' no existe en este día.`);
            }

            // B. Read Target
            const targetRef = doc(db, "journal_entries", targetDocId);
            const targetDoc = await transaction.get(targetRef);

            let targetData: any; // JournalEntry

            if (targetDoc.exists()) {
                targetData = targetDoc.data();
            } else {
                targetData = {
                    id: targetDocId,
                    date: targetDateId,
                    tenantId: tenantId,
                    generalNotes: "",
                    projects: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
            }

            // C. Remove from Source
            const remainingProjects = sourceData.projects.filter((p: any) => p.name !== projectName);
            transaction.update(sourceRef, {
                projects: remainingProjects,
                updatedAt: new Date().toISOString()
            });

            // D. Add to Target
            const updatedTargetProjects = [...(targetData.projects || [])];
            const existingIndex = updatedTargetProjects.findIndex((p: any) => p.name === projectName);

            if (existingIndex >= 0) {
                // Merge
                const existing = updatedTargetProjects[existingIndex];
                updatedTargetProjects[existingIndex] = {
                    ...existing,
                    pmNotes: mergeText(existing.pmNotes, projectToMove?.pmNotes || "", "Notas Movidas"),
                    conclusions: mergeText(existing.conclusions, projectToMove?.conclusions || "", "Conclusiones Movidas"),
                    nextSteps: mergeText(existing.nextSteps, projectToMove?.nextSteps || "", "Futuros Pasos Movidos"),
                    blocks: [...(existing.blocks || []), ...(projectToMove?.blocks || [])],
                    status: 'active'
                };
            } else {
                updatedTargetProjects.push({
                    ...projectToMove,
                    status: 'active'
                });
            }

            if (targetDoc.exists()) {
                transaction.update(targetRef, {
                    projects: updatedTargetProjects,
                    updatedAt: new Date().toISOString()
                });
            } else {
                transaction.set(targetRef, {
                    ...targetData,
                    projects: updatedTargetProjects
                });
            }
        });

        // 3. Move Tasks
        if (projectToMove && projectToMove.projectId) {
            const tasksQuery = query(
                collection(db, "tasks"),
                where("tenantId", "==", tenantId),
                where("weekId", "==", sourceDateId),
                where("projectId", "==", projectToMove.projectId)
            );

            const tasksSnap = await getDocs(tasksQuery);

            if (!tasksSnap.empty) {
                const batch = writeBatch(db);
                tasksSnap.forEach(docSnap => {
                    batch.update(docSnap.ref, {
                        weekId: targetDateId,
                        relatedJournalEntryId: targetDocId,
                        updatedAt: serverTimestamp()
                    });
                });
                await batch.commit();
                console.log(`[MoveProjectDay] Moved ${tasksSnap.size} tasks.`);
            }
        }

        return { success: true, message: "Proyecto movido al día seleccionado." };

    } catch (error: any) {
        console.error("Error moving project (Day):", error);
        return { success: false, message: error.message || "Error al mover proyecto." };
    }
}

import { db } from "@/lib/firebase";
import { getAllEntries } from "@/lib/storage";
import { ensureProjectExists } from "@/lib/projects"; // Reuse logic
import { createUpdate } from "@/lib/updates";
import { ProjectUpdate } from "@/types";
import { Timestamp } from "firebase/firestore";
import { parse, set } from "date-fns";

export interface MigrationLog {
    totalWeeks: number;
    processedWeeks: number;
    projectsMigrated: number;
    errors: string[];
}

/**
 * Main ETL Function
 * Reads all WeeklyEntries -> Explodes -> Writes to projects/{id}/updates
 */
export async function migrateAllData(onProgress: (log: MigrationLog) => void): Promise<void> {
    const log: MigrationLog = {
        totalWeeks: 0,
        processedWeeks: 0,
        projectsMigrated: 0,
        errors: []
    };

    try {
        // 1. Extract (Read Old Data)
        const allWeeks = await getAllEntries();
        log.totalWeeks = allWeeks.length;
        onProgress({ ...log });

        // 2. Transform & Load (Process each week)
        for (const week of allWeeks) {

            // Helper to get a valid Date object from week ID (YYYYMMDD) or fallback
            // Week ID is usually Monday's date string e.g. "20240101"
            let weekDate = new Date();
            try {
                if (week.id.length === 8) {
                    const y = parseInt(week.id.substring(0, 4));
                    const m = parseInt(week.id.substring(4, 6)) - 1; // Month is 0-index
                    const d = parseInt(week.id.substring(6, 8));
                    weekDate = new Date(y, m, d);
                }
            } catch (e) {
                console.warn(`Invalid date ID ${week.id}, using now`);
            }

            for (const p of week.projects) {
                try {
                    // A. Ensure Parent Project Exists
                    const projectId = await ensureProjectExists(p);

                    if (projectId) {
                        // B. Create the Update Event
                        const updateData: Omit<ProjectUpdate, 'id' | 'createdAt'> = {
                            projectId: projectId,
                            date: Timestamp.fromDate(weekDate), // Use Monday as the event date
                            weekId: week.id,
                            authorId: "legacy-migration", // System User
                            authorName: "Migrated Data",
                            type: 'weekly',
                            content: {
                                notes: p.pmNotes || "",
                                nextSteps: p.nextWeekTasks ? p.nextWeekTasks.split('\n').filter(t => t.trim().length > 0) : [],
                                blockers: "", // Legacy didn't have specific blockers field
                                flags: []
                            },
                            tags: ["Legacy Import"]
                        };

                        await createUpdate(projectId, updateData);
                        log.projectsMigrated++;
                    }
                } catch (err: any) {
                    log.errors.push(`Failed to migrate project ${p.name} in week ${week.id}: ${err.message}`);
                }
            }

            log.processedWeeks++;
            onProgress({ ...log });
        }

    } catch (error: any) {
        log.errors.push(`Fatal Error: ${error.message}`);
        onProgress({ ...log });
    }
}

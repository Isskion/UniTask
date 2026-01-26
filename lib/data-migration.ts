import { Task } from "@/types";

/**
 * [MIGRATION V13]
 * Data Adapters for Hybrid Phase (Shadow Strategy)
 * 
 * Purpose: Bridge the gap between legacy "flat" tasks and V13 "hierarchical" tasks
 * without breaking the UI during the transition period.
 */

// Define V13 Progress Structure explicitly locally to avoid circular dep issues during refactor
export interface ProgressV13 {
    actual: number;
    planned: number;
    aggregated?: number;
}

/**
 * @deprecated TEMPORAL – Eliminar tras finalize_v13_migration.ts
 * Ticket: V13.1.0 (#Cleanup)
 * 
 * Safely resolves progress from a task entity that might be in Legacy (v12) or Shadow (v13) state.
 * Priority: progressV13 > progress (if object) > progress (if number) -> Default 0
 */
export function getProgressSafe(task: Partial<Task> | null | undefined): ProgressV13 {
    if (!task) return { actual: 0, planned: 0 };

    // 1. Shadow Field (Primary Source of Truth in V13)
    if (task.progressV13) {
        return task.progressV13;
    }

    // 2. Legacy Field (Fallback)
    // Check if progress is already an object (migrated in-place? shouldn't happen in Shadow strategy but good defense)
    if (typeof task.progress === 'object' && task.progress !== null) {
        // @ts-ignore - Defensive coding
        return { actual: task.progress.actual || 0, planned: task.progress.planned || 0 };
    }

    // 3. Legacy Field (Number)
    if (typeof task.progress === 'number') {
        return { actual: task.progress, planned: 0 };
    }

    // 4. Default
    return { actual: 0, planned: 0 };
}

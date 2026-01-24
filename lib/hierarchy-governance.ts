import { Task } from "@/types";

/**
 * [V3 Governance]
 * Hierarchy Governance Rules
 * Enforces the strict structural contracts defined in the V3 Implementation Plan.
 */

export const MAX_HIERARCHY_DEPTH = 5;

/**
 * Validates the hierarchy integrity of a task.
 * Intended for use primarily during Imports, Migrations, or Re-parenting.
 * 
 * Rules:
 * 1. Ancestor chain must not contain the task's own ID (Cycle Prevention).
 * 2. Parent ID must match the last ancestor (if ancestors exist).
 * 3. Depth must not exceed MAX_HIERARCHY_DEPTH.
 */
export function assertValidHierarchy(task: Partial<Task>): { valid: boolean; error?: string } {
    if (!task.ancestorIds) return { valid: true }; // Root or detached

    // 1. Cycle Prevention
    if (task.id && task.ancestorIds.includes(task.id)) {
        return { valid: false, error: `Cycle detected: Task ${task.id} is in its own ancestor path.` };
    }

    // 2. Parent Logic
    if (task.parentId) {
        const lastAncestor = task.ancestorIds[task.ancestorIds.length - 1];
        if (lastAncestor !== task.parentId) {
            return { valid: false, error: `Integrity Mismatch: ParentId (${task.parentId}) != Last Ancestor (${lastAncestor})` };
        }
    } else {
        // If no parent, should have no ancestors (unless it's a special root case, but usually []).
        if (task.ancestorIds.length > 0) {
            return { valid: false, error: "Orphaned Task: Has ancestors but no ParentID" };
        }
    }

    // 3. Depth Check
    // Depth = Ancestors + Self (1)
    if (task.ancestorIds.length + 1 > MAX_HIERARCHY_DEPTH) {
        return { valid: false, error: `Depth Limit Exceeded: Current ${task.ancestorIds.length + 1} > Max ${MAX_HIERARCHY_DEPTH}` };
    }

    return { valid: true };
}

/**
 * Recalculates the ancestor path for a task given its new parent.
 * NOTE: This is a read-only calculation. The caller must fetch the parent object.
 */
export function recalculateAncestors(parentTask: Task | null): string[] {
    if (!parentTask) return []; // Root or detached
    // Parent's ancestors + Parent Itself
    return [...(parentTask.ancestorIds || []), parentTask.id];
}

/**
 * Normalizes ordering using a robust float strategy.
 * If tasks crowd too closely (epsilon < 0.001), returns a flag suggesting re-index.
 */
export function calculateMidpointOrder(prevOrder: number, nextOrder: number): { order: number; needsReindex: boolean } {
    const mid = (prevOrder + nextOrder) / 2;
    const needsReindex = Math.abs(prevOrder - nextOrder) < 0.005;
    return { order: mid, needsReindex };
}

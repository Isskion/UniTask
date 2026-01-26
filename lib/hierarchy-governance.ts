import { Task } from "@/types";

/**
 * [V3 Governance] Hierarchy Rules
 * 
 * Centralizes logic for maintaining tree integrity:
 * 1. Ancestor Recalculation (Prevent cycles)
 * 2. Order Normalization (Float math)
 */

export const MAX_DEPTH = 5;

/**
 * Recalculates the ancestor path for a task given a new parent.
 * @param parentId ID of the new parent task
 * @param allTasks List of all available tasks (or at least potential ancestors)
 * @param currentTaskId ID of the task being moved (to check for cycles)
 * @returns Ordered array of ancestor IDs [Root, Epic, Parent]
 * @throws Error if depth exceeded or cycle detected
 */
export function recalculateAncestors(parentId: string | null | undefined, allTasks: Task[], currentTaskId?: string): string[] {
    if (!parentId) return []; // Root level

    const parent = allTasks.find(t => t.id === parentId);
    if (!parent) throw new Error(`Parent task ${parentId} not found`);

    // Cycle Check
    if (currentTaskId) {
        if (parent.id === currentTaskId) throw new Error("Self-reference: Task cannot be its own parent");
        if (parent.ancestorIds?.includes(currentTaskId)) throw new Error("Cycle detected: Parent is a descendant of the current task");
    }

    // Depth Check (Parent's ancestors + Parent itself)
    const newAncestors = [...(parent.ancestorIds || []), parent.id];
    if (newAncestors.length >= MAX_DEPTH) {
        throw new Error(`Max hierarchy depth (${MAX_DEPTH}) exceeded.`);
    }

    return newAncestors;
}

/**
 * Calculates a new order value between two existing order values.
 * Uses simple float averaging. 
 * TODO: Implement "epsilon check" to trigger rebalancing if precision gets too low.
 */
export function calculateOrderBetween(prev: number | null, next: number | null): number {
    // If no prev, we are at start. If no next, we are at end.
    // Base scale: 1000, 2000, 3000...

    if (prev === null && next === null) return 1000; // First item ever
    if (prev === null && next !== null) return next / 2; // Insert at start
    if (prev !== null && next === null) return prev + 1000; // Append at end

    // Insert between
    // @ts-ignore
    return (prev + next) / 2;
}

/**
 * Validates if the task type is allowed as a child of the parent type.
 * STRICT ENFORCEMENT: Root -> Epic -> Feature -> Task -> Subtask
 */
export function isValidChildType(parentType: string | undefined, childType: string): boolean {
    if (!parentType) return childType === 'root_epic' || childType === 'epic'; // Top level

    switch (parentType) {
        case 'root_epic': return childType === 'epic';
        case 'epic': return childType === 'task' || childType === 'milestone'; // Simplified for MVP
        case 'task': return childType === 'subtask';
        case 'subtask': return false; // No children allowed (Leaf)
        default: return true; // Flexible for now
    }
}

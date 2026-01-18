
import { useMemo } from 'react';
import { Task } from '@/types';

export interface TaskFiltersState {
    projectIds: string[]; // Multi-project
    status: ('pending' | 'in_progress' | 'review' | 'completed')[];
    priority: string[];
    area: string[];
    scope: string[];
    module: string[];
    assignedTo: string[];
    search: string;
}

export const initialFilters: TaskFiltersState = {
    projectIds: [],
    status: ['pending', 'in_progress', 'review'], // Default text
    priority: [],
    area: [],
    scope: [],
    module: [],
    assignedTo: [],
    search: ''
};

export function useTaskAdvancedFilters(
    tasks: Task[],
    filters: TaskFiltersState,
    allowedProjectIds: string[], // Security Whitelist
    isAdmin: boolean
) {
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            // ---------------------------------------------------------
            // 1. SECURITY & SCOPE (Critical)
            // ---------------------------------------------------------

            // If task has no project, only admins see it
            if (!task.projectId) {
                if (!isAdmin) return false;
            } else {
                // If task has a project, it MUST be in the allowed list
                if (!allowedProjectIds.includes(task.projectId)) return false;
            }

            // ---------------------------------------------------------
            // 2. USER FILTERS
            // ---------------------------------------------------------

            // Project Filter (Multi-Select)
            // If user selected specific projects, we filter by them.
            // BUT we only honor projects that are ALSO in allowedProjectIds (Double Check)
            if (filters.projectIds.length > 0) {
                // The Check: Is the task's project in the user's SELECTED list?
                // Note: The UI should prevent selecting forbidden projects, but this is a fail-safe.
                if (task.projectId && !filters.projectIds.includes(task.projectId)) return false;

                // Handle "No Project" tasks if they are somehow selected (e.g. by 'unknown' id)
                if (!task.projectId && !filters.projectIds.includes('unknown')) return false;
            }

            // Status Filter
            if (filters.status.length > 0) {
                if (!filters.status.includes(task.status)) return false;
            }

            // Priority Filter
            if (filters.priority.length > 0) {
                if (!task.priority || !filters.priority.includes(task.priority)) return false;
            }

            // Area Filter
            if (filters.area.length > 0) {
                if (!task.area || !filters.area.includes(task.area)) return false;
            }

            // Scope Filter
            if (filters.scope.length > 0) {
                if (!task.scope || !filters.scope.includes(task.scope)) return false;
            }

            // Module Filter
            if (filters.module.length > 0) {
                if (!task.module || !filters.module.includes(task.module)) return false;
            }

            // Assigned To Filter
            if (filters.assignedTo.length > 0) {
                if (!task.assignedTo || !filters.assignedTo.includes(task.assignedTo)) return false;
            }

            // Text Search (Friendly ID, Title, Description)
            if (filters.search.trim()) {
                const q = filters.search.toLowerCase();
                const match = (
                    (task.title?.toLowerCase().includes(q)) ||
                    (task.description?.toLowerCase().includes(q)) ||
                    (task.friendlyId?.toLowerCase().includes(q))
                );
                if (!match) return false;
            }

            return true;
        });
    }, [tasks, filters, allowedProjectIds, isAdmin]);

    return filteredTasks;
}

import { db } from "./firebase";
import { collection, addDoc, updateDoc, doc, query, where, getDocs, orderBy, serverTimestamp, onSnapshot, limit } from "firebase/firestore";
import { Task } from "@/types";

const TASKS_COLLECTION = "tasks";

export async function createTask(
    taskData: Omit<Task, 'id' | 'createdAt' | 'friendlyId' | 'taskNumber'>,
    userId: string,
    addDocFn: any, // Injected Safe Add
    projectNameForId?: string
) {
    try {
        let friendlyId: string | undefined;
        let taskNumber: number | undefined;

        // Generate Friendly ID if Project ID is present
        if (taskData.projectId && projectNameForId) {
            // Get ALL tasks to calculate max (Avoids Index requirement for now)
            // TODO: Create Index and revert to orderBy/limit for scale > 1000 tasks
            const q = query(
                collection(db, TASKS_COLLECTION),
                where('projectId', '==', taskData.projectId),
                // FIX: Must filter by tenantId to satisfy "allow list" security rule
                // and to prevent counting tasks from other tenants (if valid)
                where('tenantId', '==', taskData.tenantId)
            );
            const snapshot = await getDocs(q);

            let maxNum = 0;
            snapshot.forEach(doc => {
                const num = doc.data().taskNumber || 0;
                if (num > maxNum) maxNum = num;
            });

            taskNumber = maxNum + 1;

            // Generate Prefix (First 3 chars of name, or 'TSK')
            const prefix = projectNameForId.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
            friendlyId = `${prefix}-${taskNumber}`;
        }

        const docRef = await addDocFn(collection(db, TASKS_COLLECTION), {
            ...taskData,
            friendlyId: friendlyId || null,
            taskNumber: taskNumber || null,
            createdBy: userId,
            createdAt: serverTimestamp(),
            isActive: true,
            status: taskData.status || 'pending'
        });
        return docRef.id;
    } catch (error) {
        console.error("Error creating task:", error);
        throw error;
    }
}

export async function getTasksByWeek(weekId: string, tenantId: string): Promise<Task[]> {
    try {
        const q = query(
            collection(db, TASKS_COLLECTION),
            where("tenantId", "==", tenantId),
            where("weekId", "==", weekId),
            where("isActive", "==", true)
        );
        const snapshot = await getDocs(q);
        // Client-side Filter: Remove completed
        return snapshot.docs
            .map(d => ({ id: d.id, ...d.data() } as Task))
            .filter(t => t.status !== 'completed');
    } catch (error) {
        console.error("Error fetching tasks for week:", error);
        return [];
    }
}

export async function getAllOpenTasks(tenantId: string): Promise<Task[]> {
    try {
        const q = query(
            collection(db, TASKS_COLLECTION),
            where("tenantId", "==", tenantId),
            where("isActive", "==", true)
        );
        const snapshot = await getDocs(q);
        // Client-side Filter: Remove completed
        return snapshot.docs
            .map(d => ({ id: d.id, ...d.data() } as Task))
            .filter(t => t.status !== 'completed');
    } catch (error) {
        console.error("Error fetching open tasks:", error);
        return [];
    }
}

export function subscribeToOpenTasks(tenantId: string, callback: (tasks: Task[]) => void) {
    const q = query(
        collection(db, TASKS_COLLECTION),
        where("tenantId", "==", tenantId),
        where("isActive", "==", true)
    );
    return onSnapshot(q,
        (snapshot) => {
            const tasks = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as Task))
                .filter(t => t.status !== 'completed');
            callback(tasks);
        },
        (error) => {
            console.error("Permission error subscribing to tasks:", error);
            // Return empty array on permission error
            callback([]);
        }
    );
}

// Subscribe to tasks for a specific project (Real-time list for Editor)
export function subscribeToProjectTasks(tenantId: string, projectId: string, callback: (tasks: Task[]) => void) {
    const q = query(
        collection(db, TASKS_COLLECTION),
        where("tenantId", "==", tenantId),
        where("projectId", "==", projectId),
        where("isActive", "==", true)
    );
    return onSnapshot(q,
        (snapshot) => {
            const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
            // Sort in memory
            tasks.sort((a, b) => (b.taskNumber || 0) - (a.taskNumber || 0));
            callback(tasks);
        },
        (error) => {
            console.error("Permission error subscribing to project tasks:", error);
            callback([]);
        }
    );
}


export async function updateTaskStatus(taskId: string, status: 'pending' | 'completed', userId: string, updateDocFn: any) {
    try {
        const ref = doc(db, TASKS_COLLECTION, taskId);
        const updateData: any = { status };

        if (status === 'completed') {
            updateData.closedAt = serverTimestamp();
            updateData.closedBy = userId;
        } else {
            // Re-opening or blocking
            updateData.closedAt = null;
            updateData.closedBy = null;
        }

        await updateDocFn(ref, updateData);
    } catch (error) {
        console.error("Error updating task status:", error);
        throw error;
    }
}

export async function toggleTaskBlock(taskId: string, isBlocking: boolean, userId: string, updateDocFn: any) {
    try {
        const ref = doc(db, TASKS_COLLECTION, taskId);
        await updateDocFn(ref, { isBlocking });
    } catch (error) {
        console.error("Error toggling block:", error);
        throw error;
    }
}

export function subscribeToWeekTasks(tenantId: string, weekId: string, callback: (tasks: Task[]) => void) {
    const q = query(
        collection(db, TASKS_COLLECTION),
        where("tenantId", "==", tenantId),
        where("weekId", "==", weekId),
        where("isActive", "==", true)
    );
    return onSnapshot(q,
        (snapshot) => {
            const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
            callback(tasks);
        },
        (error) => {
            console.error("Permission error subscribing to week tasks:", error);
            callback([]);
        }
    );
}

import { deleteDoc } from "firebase/firestore";

// DANGER: Delete all tasks
export async function deleteAllTasks() {
    try {
        const q = query(collection(db, TASKS_COLLECTION));
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
        console.log("All tasks deleted.");
    } catch (error) {
        console.error("Error deleting tasks:", error);
        throw error;
    }
}

// Global Sort Comparator
// 1. Blockers (High Priority)
// 2. Descending ID (Newest First)
export function sortTasks(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
        // Priority: Blocking > Pending/In Progress
        const aBlock = a.isBlocking || false;
        const bBlock = b.isBlocking || false;

        if (aBlock && !bBlock) return -1;
        if (!aBlock && bBlock) return 1;

        // Secondary: Task Number Descending (Newest first)
        const aNum = a.taskNumber || 0;
        const bNum = b.taskNumber || 0;
        return bNum - aNum;
    });
}
// Subscribe to ALL active tasks (for global dashboard)
export function subscribeToAllTasks(tenantId: string, callback: (tasks: Task[]) => void) {
    const q = query(
        collection(db, TASKS_COLLECTION),
        where("tenantId", "==", tenantId),
        where("isActive", "==", true)
    );
    return onSnapshot(q,
        (snapshot) => {
            const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
            callback(tasks);
        },
        (error) => {
            console.error("Permission error subscribing to all tasks:", error);
            callback([]);
        }
    );
}

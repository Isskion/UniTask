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
import { ProjectUpdate } from "@/types";

const PROJECTS_COLLECTION = "projects";
const UPDATES_SUBCOLLECTION = "updates";

/**
 * Creates a new update (event) for a specific project.
 */
export async function createUpdate(projectId: string, data: Omit<ProjectUpdate, 'id' | 'createdAt'>) {
    try {
        const subCollectionRef = collection(db, PROJECTS_COLLECTION, projectId, UPDATES_SUBCOLLECTION);
        const docRef = await addDoc(subCollectionRef, {
            ...data,
            createdAt: serverTimestamp(),
            // Ensure date is a Timestamp if passed as Date
            date: data.date instanceof Date ? Timestamp.fromDate(data.date) : data.date
        });
        return docRef.id;
    } catch (error) {
        console.error(`Error creating update for project ${projectId}:`, error);
        throw error;
    }
}

/**
 * Fetches the activity feed for a project.
 */
export async function getProjectUpdates(projectId: string, limitCount = 50): Promise<ProjectUpdate[]> {
    try {
        const subCollectionRef = collection(db, PROJECTS_COLLECTION, projectId, UPDATES_SUBCOLLECTION);
        const q = query(
            subCollectionRef,
            orderBy("date", "desc"),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        } as ProjectUpdate));
    } catch (error) {
        console.error(`Error fetching updates for project ${projectId}:`, error);
        return [];
    }
}

/**
 * Deletes a specific update (Admin/Author only ideally).
 */
export async function deleteUpdate(projectId: string, updateId: string) {
    try {
        const docRef = doc(db, PROJECTS_COLLECTION, projectId, UPDATES_SUBCOLLECTION, updateId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting update:", error);
        throw error;
    }
}

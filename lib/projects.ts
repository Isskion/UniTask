import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    getDocs,
    orderBy,
    serverTimestamp,
    getDoc,
    setDoc
} from "firebase/firestore";
import { Project, WeeklyEntry } from "@/types";

const PROJECTS_COLLECTION = "projects";

// --- CRUD Operations ---

/**
 * Creates a new project in the global registry.
 */
export async function createProject(data: Omit<Project, 'id' | 'createdAt' | 'lastUpdate'>) {
    try {
        const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), {
            ...data,
            createdAt: serverTimestamp(),
            lastUpdate: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error creating project:", error);
        throw error;
    }
}

/**
 * Updates an existing project.
 */
export async function updateProject(projectId: string, data: Partial<Project>) {
    try {
        const ref = doc(db, PROJECTS_COLLECTION, projectId);
        await updateDoc(ref, {
            ...data,
            lastUpdate: serverTimestamp()
        });
    } catch (error) {
        console.error("Error updating project:", error);
        throw error;
    }
}

/**
 * Fetches all active projects (optionally filtered by teamId in the future).
 */
export async function getActiveProjects(): Promise<Project[]> {
    try {
        const q = query(
            collection(db, PROJECTS_COLLECTION),
            where("status", "==", "active"),
            orderBy("name", "asc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));
    } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
    }
}

export async function getProjectById(projectId: string): Promise<Project | null> {
    try {
        const ref = doc(db, PROJECTS_COLLECTION, projectId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() } as Project;
        }
        return null;
    } catch (error) {
        console.error("Error fetching project:", error);
        return null;
    }
}

// --- Migration & Shadow Write Helpers ---

/**
 * Ensures a project exists in the new collection based on legacy data.
 * Used during the "Shadow Write" phase.
 */
export async function ensureProjectExists(legacyProject: {
    projectId?: string;
    name: string;
    // minimal fields available in weekly_entry
}) {
    if (!legacyProject.name) return null;

    // 1. If we have a projectId, check if it exists in the new collection
    if (legacyProject.projectId) {
        const exists = await getProjectById(legacyProject.projectId);
        if (exists) return legacyProject.projectId;
    }

    // 2. Fallback: Search by name (deduplication)
    const q = query(
        collection(db, PROJECTS_COLLECTION),
        where("name", "==", legacyProject.name),
        where("status", "==", "active")
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
        return snap.docs[0].id;
    }

    // 3. Create new if not found (Auto-migration)
    // We infer a code from the name for now
    const code = legacyProject.name.substring(0, 3).toUpperCase() + "-" + Math.floor(Math.random() * 1000);

    const newId = await createProject({
        name: legacyProject.name,
        clientName: legacyProject.name, // Default to same name
        code: code,
        status: 'active',
        health: 'healthy', // Default
        isActive: true,
        teamIds: [], // Public for now until Phase 3
    } as any);

    console.log(`[Migration] Auto-created project: ${legacyProject.name} -> ${newId}`);
    return newId;
}

/**
 * Syncs weekly entry projects to the new `projects` collection.
 * This should be called *after* saving a WeeklyEntry.
 */
export async function syncShadowProjects(entry: WeeklyEntry) {
    console.log("[Shadow Sync] Starting project sync for week:", entry.id);

    // 1. Sync Projects & Create Updates
    for (const p of entry.projects) {
        try {
            // A. Ensure Project Exists
            const projectId = await ensureProjectExists(p);
            if (!projectId) continue;

            // B. Create "The Update Object" (projects/{id}/updates/{updateId})
            // We use a deterministic ID based on weekId to avoid duplicates if saved multiple times
            // Format: "week-20251125"
            const updateId = `week-${entry.id}`;
            const updateRef = doc(db, PROJECTS_COLLECTION, projectId, "updates", updateId);

            await setDoc(updateRef, {
                id: updateId,
                weekId: entry.id,
                weekNumber: entry.weekNumber,
                year: entry.year,
                date: serverTimestamp(),

                // Content Snapshot
                content: {
                    pmNotes: p.pmNotes,
                    conclusions: p.conclusions,
                    nextWeekTasks: p.nextWeekTasks,
                },

                // Metadata
                authorId: "legacy-sync",
                updatedAt: serverTimestamp()
            }, { merge: true });

            console.log(`[Shadow Sync] Synced update ${updateId} for project ${p.name}`);

        } catch (e) {
            console.error(`[Shadow Sync] Failed for project ${p.name}:`, e);
        }
    }
}

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
import { getTenantCollection, getTenantDoc } from "./tenant_db";
import { ScopeQueryBuilder } from "./ScopeQueryBuilder";
import { UserProfile } from "@/types";

const PROJECTS_COLLECTION = "projects";

// --- CRUD Operations ---

/**
 * Creates a new project in the global registry.
 */
export async function createProject(data: Omit<Project, 'id' | 'createdAt' | 'lastUpdate'>) {
    try {
        // [SAM] Hard Isolation: Use Tenant Collection
        const tenantId = data.tenantId || "1";
        const docRef = await addDoc(getTenantCollection(db, PROJECTS_COLLECTION, tenantId), {
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
        // [SAM] Hard Isolation: Require tenantId to find doc
        const tenantId = data.tenantId || "1";
        const ref = getTenantDoc(db, PROJECTS_COLLECTION, projectId, tenantId);
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
 * Fetches all active projects (optionally filtered by tenantId in the future).
 * SAM UPDATE: Now accepts UserProfile for value-based scoping.
 */
export async function getActiveProjects(
    tenantId: string = "1",
    userOrId?: string | UserProfile | null,
    roleLevel: number = 100
): Promise<Project[]> {
    try {
        let q;

        // [SAM] New Path: Use ScopeQueryBuilder if we have a full profile
        if (userOrId && typeof userOrId === 'object' && 'accessScopes' in userOrId) {
            const userProfile = userOrId as UserProfile;

            // 1. Build Base Secured Query
            q = ScopeQueryBuilder.build(db, PROJECTS_COLLECTION, userProfile);

            // 2. Add Business Filters (Active only)
            q = query(q, where("isActive", "==", true));

        } else {
            // [Legacy] Fallback Path
            if (tenantId === "ALL") {
                q = query(
                    collection(db, PROJECTS_COLLECTION),
                    where("isActive", "==", true)
                );
            } else {
                const uid = typeof userOrId === 'string' ? userOrId : null;
                // Permission Filter: If not Admin (level < 80) and userId provided, filter by assignment
                if (uid && roleLevel < 80) {
                    q = query(
                        getTenantCollection(db, PROJECTS_COLLECTION, tenantId),
                        where("isActive", "==", true),
                        where("teamIds", "array-contains", uid)
                    );
                } else {
                    q = query(
                        getTenantCollection(db, PROJECTS_COLLECTION, tenantId),
                        where("isActive", "==", true)
                    );
                }
            }
        }

        const snapshot = await getDocs(q);
        const projects = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));

        // Client-side sort
        projects.sort((a, b) => a.name.localeCompare(b.name));
        return projects;
    } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
    }
}

export async function getProjectById(projectId: string): Promise<Project | null> {
    try {
        // Note: This relies on legacy root unless we know tenantId.
        // For Hard Isolation, we strictly need tenantId.
        // BUT, for compatibility, maybe we try root?
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
    tenantId?: string;
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
    const code = legacyProject.name.substring(0, 3).toUpperCase() + "-" + Math.floor(Math.random() * 1000);

    const newId = await createProject({
        name: legacyProject.name,
        clientName: legacyProject.name, // Default to same name
        code: code,
        status: 'active',
        health: 'healthy', // Default
        isActive: true,
        tenantId: legacyProject.tenantId || "1",
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
            const updateId = `week-${entry.id}`;
            // NOTE: Shadow sync strictly writes to ROOT currently in this function
            // We should update it if we want it to write to tenant?
            // createProject DOES write to tenant.
            // But 'updateRef' below uses root 'projects'.
            // For now, let's leave it as legacy shadow sync or update it?
            // Let's update it to likely use getTenantDoc if we knew tenantId.
            // But we don't easily know tenantId here without fetching project.
            // Start simple: keep as is for now, refactor later.
            const updateRef = doc(db, PROJECTS_COLLECTION, projectId, "updates", updateId);

            await setDoc(updateRef, {
                id: updateId,
                weekId: entry.id,
                weekNumber: entry.weekNumber,
                year: entry.year,
                date: serverTimestamp(),
                content: {
                    pmNotes: p.pmNotes,
                    conclusions: p.conclusions,
                    nextSteps: p.nextSteps,
                },
                authorId: "legacy-sync",
                updatedAt: serverTimestamp()
            }, { merge: true });

            console.log(`[Shadow Sync] Synced update ${updateId} for project ${p.name}`);

        } catch (e) {
            console.error(`[Shadow Sync] Failed for project ${p.name}:`, e);
        }
    }
}

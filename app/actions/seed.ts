"use server";

import { adminDb } from "@/lib/firebase-admin";
import { format, addDays, eachDayOfInterval } from 'date-fns';
import { Timestamp } from 'firebase-admin/firestore';

// Helper to serialize Firestore Timestamps
function serialize(data: any): any {
    if (!data) return data;
    if (typeof data.toDate === 'function') {
        return data.toDate().toISOString();
    }
    if (data && typeof data === 'object') {
        // Handle nested
        if (data._seconds !== undefined && data._nanoseconds !== undefined) {
            return new Date(data._seconds * 1000 + data._nanoseconds / 1000000).toISOString();
        }
        // Array
        if (Array.isArray(data)) {
            return data.map(serialize);
        }
        // Object
        const out: any = {};
        for (const key in data) {
            out[key] = serialize(data[key]);
        }
        return out;
    }
    return data;
}

export async function getProjectsAction(organizationId: string) {
    try {
        console.log(`[Server] Fetching projects for Organization ${organizationId}`);
        const snap = await adminDb.collection('projects')
            .where('organizationId', '==', organizationId)
            .get();
        console.log(`[Server] Found ${snap.size} projects.`);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return { success: true, data: serialize(data) };
    } catch (e: any) {
        console.error("Server Action getProjects error:", e);
        return { success: false, error: e.message, code: e.code };
    }
}

export async function seedDataAction(organizationId: string, projectId: string) {
    try {
        console.log(`[Server] Seeding Organization ${organizationId} Project ${projectId}`);
        const start = new Date(2026, 0, 1); // Jan 1 2026
        const end = new Date(2026, 0, 31);
        const days = eachDayOfInterval({ start, end });
        const batchSize = 500; // Firestore batch limit
        let batch = adminDb.batch();
        let opCount = 0;

        // Fetch Project Name
        const pDoc = await adminDb.collection('projects').doc(projectId).get();
        const pData = pDoc.data();
        const projectName = pData?.name || 'Proy';

        for (const day of days) {
            const dateStr = format(day, 'yyyy-MM-dd');

            // 1. Journal Entry
            const entryRef = adminDb.collection('journal_entries').doc();
            batch.set(entryRef, {
                date: dateStr,
                organizationId: organizationId,
                generalNotes: `[MOCK] Notas ${dateStr}`,
                projects: [{
                    projectId: projectId,
                    name: projectName,
                    pmNotes: '[MOCK] Avance normal.',
                    conclusions: 'Todo OK.',
                    nextSteps: 'Seguir.',
                    status: 'active'
                }],
                createdAt: Timestamp.fromDate(new Date()),
                updatedAt: Timestamp.fromDate(new Date())
            });
            opCount++;

            // 2. Tasks
            const numTasks = Math.floor(Math.random() * 4) + 1;
            for (let i = 0; i < numTasks; i++) {
                const statusPool = ['pending', 'in_progress', 'review', 'completed'];
                const status = statusPool[Math.floor(Math.random() * statusPool.length)];
                const created = day;
                let closedAt = null;
                if (status === 'completed') closedAt = addDays(created, 2);

                const taskRef = adminDb.collection('tasks').doc();
                batch.set(taskRef, {
                    friendlyId: `M-${format(day, 'dd')}-${i}`,
                    organizationId: organizationId,
                    projectId: projectId,
                    title: `[MOCK] Tarea ${i + 1} (${dateStr})`,
                    description: 'Generada auto.',
                    status: status,
                    priority: 'medium',
                    weekId: format(day, 'yyyy-Iw'),
                    createdAt: Timestamp.fromDate(created),
                    updatedAt: Timestamp.fromDate(created),
                    startDate: Timestamp.fromDate(created),
                    endDate: Timestamp.fromDate(addDays(created, 3)),
                    closedAt: closedAt ? Timestamp.fromDate(closedAt) : null,
                    isActive: true,
                    createdBy: 'server-seed',
                    relatedJournalEntryId: entryRef.id,
                    attributes: { mock: 'true' }
                });
                opCount++;

                if (opCount >= 450) {
                    await batch.commit();
                    batch = adminDb.batch();
                    opCount = 0;
                }
            }
        }
        if (opCount > 0) await batch.commit();

        return { success: true, message: `Seeded Jan 2026 for Project ${projectId}` };
    } catch (e: any) {
        console.error("Seed Error:", e);
        return { success: false, error: e.message };
    }
}

export async function cleanupMockDataAction(organizationId: string) {
    try {
        console.log(`[Server] Cleaning Organization ${organizationId}`);

        // 1. Delete Mock Tasks
        const tasksSnap = await adminDb.collection('tasks')
            .where('organizationId', '==', organizationId)
            .where('attributes.mock', '==', 'true')
            .get();

        // 2. Delete Mock Journal Entries
        // Strategy: Filter significantly to avoid memory issues if DB is large
        // We look for entries created by the seeder which puts [MOCK] in notes
        const entriesSnap = await adminDb.collection('journal_entries')
            .where('organizationId', '==', organizationId)
            .get();

        const mockEntries = entriesSnap.docs.filter(d => {
            const data = d.data();
            return data.generalNotes?.includes('[MOCK]') ||
                (data.projects && data.projects.some((p: any) => p.name?.includes('[MOCK]')));
        });

        // 3. Delete Mock Projects (Optional but requested)
        // We delete projects that explicitly have [MOCK] in the name to be safe
        const projectsSnap = await adminDb.collection('projects')
            .where('organizationId', '==', organizationId)
            .get();

        const mockProjects = projectsSnap.docs.filter(d => {
            const name = d.data().name || '';
            return name.includes('[MOCK]') || name.includes('Mock Data');
        });

        console.log(`[Server - Cleanup] Found: ${tasksSnap.size} tasks, ${mockEntries.length} entries, ${mockProjects.length} projects.`);

        let batch = adminDb.batch();
        let count = 0;
        let totalDeleted = 0;

        const commitBatch = async () => {
            if (count > 0) {
                await batch.commit();
                batch = adminDb.batch();
                totalDeleted += count;
                count = 0;
                console.log(`[Server - Cleanup] Committed batch. Total so far: ${totalDeleted}`);
            }
        };

        // Tasks
        for (const d of tasksSnap.docs) {
            batch.delete(d.ref);
            count++;
            if (count >= 400) await commitBatch();
        }

        // Entries
        for (const d of mockEntries) {
            batch.delete(d.ref);
            count++;
            if (count >= 400) await commitBatch();
        }

        // Projects
        for (const d of mockProjects) {
            batch.delete(d.ref);
            count++;
            if (count >= 400) await commitBatch();
        }

        await commitBatch(); // Final commit

        return { success: true, message: `Cleanup Complete. Deleted ${tasksSnap.size} tasks, ${mockEntries.length} entries, ${mockProjects.length} projects.` };

    } catch (e: any) {
        console.error("[Cleanup Error]", e);
        return { success: false, error: e.message };
    }
}

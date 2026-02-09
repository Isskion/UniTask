import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { addDays, eachDayOfInterval, format } from "date-fns";
import { revalidatePath } from "next/cache";

export default function MockSeedPage() {
    async function seedMockData() {
        "use server";

        const TENANT_ID = '1';
        console.log("Starting Mock Seed for Tenant:", TENANT_ID);

        if (!adminDb) {
            throw new Error("Firebase Admin not initialized");
        }

        // 1. Ensure Project
        let projectId = '';
        const projectRef = adminDb.collection('projects').where('tenantId', '==', TENANT_ID).where('name', '==', 'Mock Project').limit(1);
        const pSnap = await projectRef.get();

        if (pSnap.empty) {
            console.log("Creating Mock Project...");
            const newProj = await adminDb.collection('projects').add({
                name: 'Mock Project',
                code: 'MOCK',
                clientName: 'Mock Client',
                status: 'active',
                health: 'healthy',
                tenantId: TENANT_ID,
                teamIds: [],
                isActive: true,
                createdAt: FieldValue.serverTimestamp()
            });
            projectId = newProj.id;
        } else {
            projectId = pSnap.docs[0].id;
            console.log("Found Mock Project:", projectId);
        }

        // 2. Generate Jan 2026 Data
        const start = new Date(2026, 0, 1); // Jan 1 2026
        const end = new Date(2026, 0, 31);

        const days = eachDayOfInterval({ start, end });

        for (const day of days) {
            const dateStr = format(day, 'yyyy-MM-dd');
            console.log(`Processing ${dateStr}...`);

            // A. Create Journal Entry
            // Ensure uniqueness for the day (optional but good for re-running)
            const entryRef = adminDb.collection('journal_entries').doc(`${TENANT_ID}_${dateStr}_MOCK`);

            await entryRef.set({
                date: dateStr,
                tenantId: TENANT_ID,
                generalNotes: `[MOCK] Notas generales para el día ${dateStr}. Todo avanza según lo previsto.`,
                projects: [
                    {
                        projectId: projectId,
                        name: 'Mock Project',
                        pmNotes: '[MOCK] Avance estable.',
                        conclusions: 'Sin bloqueos mayores.',
                        nextSteps: 'Continuar iteración.',
                        status: 'active'
                    }
                ],
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
            });

            // B. Create Tasks (1-4)
            const numTasks = Math.floor(Math.random() * 4) + 1; // 1 to 4
            for (let i = 0; i < numTasks; i++) {
                const statusPool = ['pending', 'in_progress', 'review', 'completed'];
                const status = statusPool[Math.floor(Math.random() * statusPool.length)];

                // Randomly set dates
                const created = day;
                let closedAt = null;
                if (status === 'completed') {
                    closedAt = addDays(created, Math.floor(Math.random() * 5)); // Closed 0-5 days later
                }

                await adminDb.collection('tasks').add({
                    friendlyId: `MOCK-${format(day, 'dd')}-${i}`,
                    organizationId: TENANT_ID,
                    projectId: projectId,
                    title: `[MOCK] Tarea simulada ${i + 1} del ${dateStr}`,
                    description: `Descripción detallada de la tarea simulada ${i + 1}. Generada automáticamente para pruebas de UI.`,
                    status: status,
                    priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],

                    // Links
                    relatedJournalEntryId: entryRef.id,
                    weekId: format(day, 'yyyy-Iw'),

                    // Dates
                    createdAt: Timestamp.fromDate(created),
                    updatedAt: Timestamp.fromDate(created),
                    startDate: Timestamp.fromDate(created),
                    endDate: Timestamp.fromDate(addDays(created, 3)),
                    closedAt: closedAt ? Timestamp.fromDate(closedAt) : null,

                    isActive: true,
                    createdBy: 'script_mock_seed',
                    attributes: {
                        mock: 'true' // For deletion
                    }
                });
            }
        }
        console.log("Seeding Complete.");
        revalidatePath('/mock-seed');
    }

    return (
        <div className="p-10 flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Mock Data Generator</h1>
            <p className="mb-8 text-gray-600 max-w-md text-center">
                Generates sample data (Projects, Journal Entries, Tasks) for January 2026.
                <br />
                <span className="font-semibold text-red-500">Warning: Changes database state.</span>
            </p>

            <form action={seedMockData}>
                <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors font-semibold"
                >
                    GENERATE JAN 2026 MOCK DATA
                </button>
            </form>
        </div>
    );
}

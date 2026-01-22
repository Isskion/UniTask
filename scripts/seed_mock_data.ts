const admin = require('firebase-admin');
const { startOfMonth, endOfMonth, eachDayOfInterval, format, addDays } = require('date-fns');

// Initialize
if (!admin.apps.length) {
    // Attempt to use local emulator if available, or finding creds
    // Assuming this environment is pre-configured or running in emulator context
    admin.initializeApp();
}

const db = admin.firestore();
const TENANT_ID = '1';

async function seed() {
    console.log("Starting Mock Seed for Tenant:", TENANT_ID);

    // 1. Ensure Project
    let projectId = '';
    const projectRef = db.collection('projects').where('tenantId', '==', TENANT_ID).where('name', '==', 'Mock Project').limit(1);
    const pSnap = await projectRef.get();

    if (pSnap.empty) {
        console.log("Creating Mock Project...");
        const newProj = await db.collection('projects').add({
            name: 'Mock Project',
            code: 'MOCK',
            clientName: 'Mock Client',
            status: 'active',
            health: 'healthy',
            tenantId: TENANT_ID,
            teamIds: [],
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        projectId = newProj.id;
    } else {
        projectId = pSnap.docs[0].id;
        console.log("Found Mock Project:", projectId);
    }

    // 2. Generate Jan 2026 Data
    // NOTE: Generating for 2026 as per User Context seems to be the target year, but let's check current Date?
    // User asked "todos los días de enero". Assuming current year relative to app context which is 2026 in logs.
    const start = new Date(2026, 0, 1); // Jan 1 2026
    const end = new Date(2026, 0, 31);

    const days = eachDayOfInterval({ start, end });

    for (const day of days) {
        const dateStr = format(day, 'yyyy-MM-dd');
        console.log(`Processing ${dateStr}...`);

        // A. Create Journal Entry
        // ID format usually YYYY-MM-DD for uniqueness per tenant? 
        // Logic in app seems to allow one per day?
        // Let's create a JournalEntry document.
        const entryRef = db.collection('journal_entries').doc(`${TENANT_ID}_${dateStr}`); // ID Pattern?
        // Actually, just auto-id or checking app logic?
        // JournalEntry ID is usually YYYY-MM-DD if singleton? 
        // App uses `date` field. Let's use auto-ID for safety.

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
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
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

            await db.collection('tasks').add({
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
                createdAt: admin.firestore.Timestamp.fromDate(created),
                updatedAt: admin.firestore.Timestamp.fromDate(created),
                startDate: admin.firestore.Timestamp.fromDate(created),
                endDate: admin.firestore.Timestamp.fromDate(addDays(created, 3)),
                closedAt: closedAt ? admin.firestore.Timestamp.fromDate(closedAt) : null,

                isActive: true,
                createdBy: 'script',
                attributes: {
                    mock: 'true' // For deletion
                }
            });
        }
    }
    console.log("Seeding Complete.");
}

seed().catch(console.error);

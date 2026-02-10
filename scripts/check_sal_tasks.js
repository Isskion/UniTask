const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
    console.log("Checking Projects for Tenant 12...");
    const projects = await db.collection('projects').where('tenantId', '==', '12').get();
    projects.forEach(p => {
        console.log(`Project: ${p.data().name} (Code: ${p.data().code})`);
    });

    console.log("\nSearching for tasks starting with 'SAL-'...");
    // Firestore lacks startsWith natively easily without range.
    // We'll fetch all tasks with code >= "SAL-" and code < "SAL."?
    // Or just fetch ALL tasks (if small) or search by prefix manually?

    // Better: Fetch tasks where "code" >= "SAL" and "code" <= "SAL\uf8ff"
    const tasks = await db.collection('tasks')
        .where('code', '>=', 'SAL') // Relaxed search
        .where('code', '<=', 'SAL\uf8ff')
        .get();

    if (tasks.empty) {
        console.log("No tasks found starting with SAL.");
    } else {
        console.log(`Found ${tasks.size} SAL tasks:`);
        tasks.forEach(t => {
            const d = t.data();
            console.log(`- [${d.code}] ${d.title} (TenantId: ${d.tenantId}, ProjectId: ${d.projectId})`);
        });
    }
}

check().catch(console.error);

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const TARGET_ID = "0G3rqiehGrimYU2e3oSG";

const COLLECTIONS = ['projects', 'tasks', 'journal_entries', 'users', 'tenants', 'project_updates'];

async function inspect() {
    console.log(`\n🔍 Listing ALL Projects in DB...`);
    try {
        const snap = await db.collection('projects').get();
        console.log(`Total Documents: ${snap.size}`);

        snap.forEach(doc => {
            const data = doc.data();
            const issues = [];
            if (!data.name) issues.push("MISSING NAME");
            if (!data.tenantId) issues.push("MISSING TENANT");

            // Print only if specific ID matches OR if it looks "empty"
            if (doc.id === TARGET_ID || issues.length > 0 || data.name === "Nuevo Proyecto") {
                console.log(`\nfound [${doc.id}] matches suspect criteria:`);
                console.log(` - Name: "${data.name}"`);
                console.log(` - Tenant: ${data.tenantId}`);
                console.log(` - Issues: ${issues.join(', ') || 'None (Just suspicious)'}`);
            }
        });
        console.log("\nScan complete.");
    } catch (e) {
        console.error("Error:", e);
    }
}

inspect();


const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function findProject() {
    console.log("--- FINDING VISUALMAPPER PROJECT IN TENANT 3 ---");
    // Search by name approximation or list all in tenant 3
    const snapshot = await db.collection('projects')
        .where('tenantId', '==', '3')
        .get();

    if (snapshot.empty) {
        console.log("No projects found in Tenant 3.");
    } else {
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.name.toLowerCase().includes('visual') || data.name.toLowerCase().includes('mapper')) {
                console.log(`\nTARGET FOUND:`);
                console.log(`ID: ${doc.id}`);
                console.log(`Name: ${data.name}`);
                console.log(`Code: ${data.code}`); // This is the source of truth
            } else {
                console.log(`Other Project: ${data.name} (${data.code})`);
            }
        });
    }
}

findProject();

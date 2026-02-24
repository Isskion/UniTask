const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

const projectsToFind = [
    'delgado',
    'logifrio',
    'luis simoes',
    'ontime',
    'smsa',
    'spar',
    'transpais'
];

async function findProjects() {
    const snapshot = await db.collection('projects').get();
    const results = {};

    snapshot.forEach(doc => {
        const data = doc.data();
        const name = data.name.toLowerCase();

        projectsToFind.forEach(term => {
            if (name.includes(term)) {
                if (!results[term]) results[term] = [];
                results[term].push({
                    id: doc.id,
                    name: data.name,
                    tenantId: data.tenantId
                });
            }
        });
    });

    console.log(JSON.stringify(results, null, 2));
}

findProjects().catch(console.error);


const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function findGroups() {
    console.log("--- SEARCHING GROUPS IN TENANT 3 ---");

    const names = ['Consultor', 'Consultores', 'Managers', 'Manager'];

    for (const name of names) {
        // Precise match
        let q = db.collection('permission_groups')
            .where('tenantId', '==', '3')
            .where('name', '==', name);

        let snap = await q.get();
        if (!snap.empty) {
            console.log(`FOUND '${name}':`);
            snap.docs.forEach(d => console.log(`- ID: ${d.id}, ViewAccessKeys: ${Object.keys(d.data().viewAccess || {}).length}`));
        } else {
            console.log(`NOT FOUND: '${name}'`);
        }
    }

    // List all just in case via iteration (less data per line)
    console.log("\n--- ALL IDs in Tenant 3 ---");
    const all = await db.collection('permission_groups').where('tenantId', '==', '3').get();
    all.docs.forEach(d => console.log(`${d.id} : ${d.data().name}`));
}

findGroups();

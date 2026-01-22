const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const dotEnvPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(dotEnvPath, 'utf8');
const serviceAccountMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT='(.*?)'/);
const serviceAccount = JSON.parse(serviceAccountMatch[1]);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkCollections() {
    console.log("Checking collections...");

    const collections = await db.listCollections();
    console.log("Found collections:", collections.map(c => c.id).join(", "));

    for (const coll of collections) {
        const snap = await coll.limit(5).get();
        console.log(`\nCollection: ${coll.id} (${snap.size} docs)`);
        if (coll.id === 'tenants' || coll.id === 'organizations') {
            snap.forEach(doc => {
                console.log(`- [${doc.id}] ${JSON.stringify(doc.data().name || doc.data())}`);
            });
        }
    }
}

checkCollections().catch(console.error);

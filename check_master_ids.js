const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const dotEnvPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(dotEnvPath, 'utf8');
const serviceAccountMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT='(.*?)'/);
const serviceAccount = JSON.parse(serviceAccountMatch[1]);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkCollections() {
    const collections = ['master_data', 'attribute_definitions'];
    for (const col of collections) {
        console.log(`\n--- Collection: ${col} ---`);
        const snap = await db.collection(col).limit(5).get();
        if (snap.empty) {
            console.log("Empty.");
        } else {
            snap.forEach(doc => {
                const data = doc.data();
                console.log(`ID: ${doc.id} | tenantId: ${data.tenantId} | organizationId: ${data.organizationId}`);
            });
        }
    }
}

checkCollections().catch(console.error);

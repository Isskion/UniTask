
const admin = require('firebase-admin');
const { resolve } = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: resolve(__dirname, '../.env.local') });

if (!admin.apps.length) {
    try {
        const serviceAccountPath = resolve(__dirname, '../serviceAccountKey.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp({ projectId: "minuta-f75a4" });
        }
    } catch (e) {
        admin.initializeApp({ projectId: "minuta-f75a4" });
    }
}

const db = admin.firestore();

async function listTenants() {
    console.log("Listing Tenants...");
    const snapshot = await db.collection('tenants').get();
    snapshot.forEach(doc => {
        console.log(`[${doc.id}] ${doc.data().name} (OrgCode: ${doc.data().orgCode})`);
    });

    console.log("\nChecking specific IDs:");
    const t2 = await db.collection('tenants').doc('2').get();
    console.log("Tenant '2':", t2.exists ? t2.data() : "DOES NOT EXIST");

    const t2ct = await db.collection('tenants').doc('2ct').get();
    console.log("Tenant '2ct':", t2ct.exists ? t2ct.data() : "DOES NOT EXIST");
}

listTenants();

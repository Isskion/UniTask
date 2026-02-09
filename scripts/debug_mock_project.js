
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

async function checkProject() {
    const PROJECT_ID = "mockup-product-2026";
    console.log(`Checking Project: ${PROJECT_ID}...`);

    const doc = await db.collection('projects').doc(PROJECT_ID).get();
    if (!doc.exists) {
        console.log("❌ Project does not exist.");
        return;
    }

    const data = doc.data();
    console.log("✅ Project Found:", JSON.stringify(data, null, 2));

    if (data.isActive === true) {
        console.log("✅ isActive is TRUE");
    } else {
        console.log("❌ isActive is NOT TRUE (val: " + data.isActive + ")");
    }

    if (data.tenantId === "2") {
        console.log("✅ TenantId is '2'");
    } else {
        console.log("❌ TenantId is mismatch: " + data.tenantId);
    }
}

checkProject();

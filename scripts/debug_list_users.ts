
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load ENV
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Init Firebase
const serviceAccountPath = resolve(__dirname, '../serviceAccountKey.json');
if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
        credential: cert(serviceAccount)
    });
} else {
    initializeApp({
        projectId: "minuta-f75a4"
    });
}

const db = getFirestore();

async function listUsers() {
    console.log("=== USERS LIST ===");
    const snapshot = await db.collection('users').get();

    if (snapshot.empty) {
        console.log("No users found in 'users' collection.");
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`User: ${data.displayName} (${data.email})`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Role: ${data.role} (Level: ${data.roleLevel})`);
        console.log(`   Tenant ID: ${data.tenantId}`);
        console.log(`   Is Consultant: ${data.isConsultant}`);
        console.log(`   Works on Weekends: ${data.worksOnWeekends}`);
        console.log("------------------------------------------------");
    });
}

listUsers().catch(console.error);

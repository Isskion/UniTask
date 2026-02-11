
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const serviceAccountPath = resolve(__dirname, '../serviceAccountKey.json');
if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({ credential: cert(serviceAccount) });
} else {
    initializeApp({ projectId: 'minuta-f75a4' });
}

const db = getFirestore();

async function listAll() {
    console.log("=== ALL USERS ===");
    const snapshot = await db.collection('users').get();
    console.log('Total Users:', snapshot.size);
    snapshot.forEach(doc => {
        const d = doc.data();
        console.log(`User: ${d.email} | ID: ${doc.id} | Tenant: ${d.tenantId} | Role: ${d.role}`);
    });
}

listAll().catch(console.error);


import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
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

async function cleanPermissions() {
    console.log("Searching for daniel users...");
    // Search by email prefix (manual iteration as firestore doesn't support startsWith well on email without index)
    const snapshot = await db.collection('users').get();

    let count = 0;
    const batch = db.batch();

    snapshot.forEach(doc => {
        const data = doc.data();
        const email = data.email || "";
        if (email.toLowerCase().includes("daniel")) {
            console.log(`Found: ${email} (${doc.id})`);
            if (data.permissionGroupId) {
                console.log(`   - Removing permissionGroupId: ${data.permissionGroupId}`);
                const ref = db.collection('users').doc(doc.id);
                batch.update(ref, {
                    permissionGroupId: FieldValue.delete(),
                    updatedAt: new Date()
                });
                count++;
            } else {
                console.log("   - No permissionGroupId set.");
            }
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`Updated ${count} users.`);
    } else {
        console.log("No users needed updates.");
    }
}

cleanPermissions().catch(console.error);

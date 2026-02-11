import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

async function checkAllUsers() {
    const snapshot = await db.collection('users').get();

    const tenantGroups: Record<string, any[]> = {};

    snapshot.forEach(doc => {
        const data = doc.data();
        const tid = data.tenantId || 'NO_TENANT';
        if (!tenantGroups[tid]) tenantGroups[tid] = [];
        tenantGroups[tid].push({
            uid: doc.id,
            email: data.email,
            displayName: data.displayName,
            role: data.role,
            roleLevel: data.roleLevel,
            tenantId: data.tenantId,
            isActive: data.isActive
        });
    });

    console.log(`\n=== TOTAL USERS: ${snapshot.size} ===\n`);

    for (const [tid, users] of Object.entries(tenantGroups).sort()) {
        console.log(`\n--- TENANT: "${tid}" (${users.length} users) ---`);
        users.forEach(u => {
            console.log(`  ${u.email} | role: ${u.role} (${u.roleLevel}) | active: ${u.isActive}`);
        });
    }

    // Also check tenants collection
    console.log('\n\n=== TENANTS COLLECTION ===');
    const tenants = await db.collection('tenants').get();
    tenants.forEach(doc => {
        const d = doc.data();
        console.log(`  ID: ${doc.id} | Name: ${d.name} | Active: ${d.isActive}`);
    });
}

checkAllUsers().catch(console.error);

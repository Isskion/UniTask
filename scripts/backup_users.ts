
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Load service account
const serviceAccount = require('../service-account-key.json');

const app = initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function backupUsers() {
    console.log('Starting backup of "users" collection...');
    const snapshot = await db.collection('users').get();
    const users = [];

    snapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(__dirname, `../backups/users_backup_${timestamp}.json`);

    // Ensure backup dir exists
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    fs.writeFileSync(backupPath, JSON.stringify(users, null, 2));
    console.log(`Backup completed! Saved ${users.length} users to ${backupPath}`);
}

backupUsers().catch(console.error);

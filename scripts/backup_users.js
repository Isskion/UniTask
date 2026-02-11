
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Load service account (adjust path if needed)
const serviceAccountPath = path.join(__dirname, '../service-account-key.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error(`Service account key not found at: ${serviceAccountPath}`);
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

const app = initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function backupUsers() {
    console.log('Starting backup of "users" collection...');
    try {
        const snapshot = await db.collection('users').get();
        const users = [];

        snapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        // Create backups folder in the root, not inside scripts
        const backupDir = path.join(__dirname, '../backups');
        const backupPath = path.join(backupDir, `users_backup_${timestamp}.json`);

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        fs.writeFileSync(backupPath, JSON.stringify(users, null, 2));
        console.log(`Backup completed! Saved ${users.length} users to ${backupPath}`);
    } catch (error) {
        console.error("Backup failed:", error);
    }
}

backupUsers();

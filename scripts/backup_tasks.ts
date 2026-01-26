
import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require(path.join(process.cwd(), 'serviceAccountKey.json'));

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function backupTasks() {
    console.log('🚀 Starting Tasks Backup...');

    try {
        const snapshot = await db.collection('tasks').get();
        const tasks: any[] = [];

        snapshot.forEach(doc => {
            tasks.push({
                _id: doc.id,
                ...doc.data()
            });
        });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `tasks_backup_${timestamp}.json`;
        const backupPath = path.join(process.cwd(), 'backup', 'v12_restore_point', filename);

        // Ensure directory exists
        const dir = path.dirname(backupPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(backupPath, JSON.stringify(tasks, null, 2));

        console.log(`✅ Backup success! ${tasks.length} documents saved.`);
        console.log(`📂 Location: ${backupPath}`);

    } catch (error) {
        console.error('❌ Backup failed:', error);
        process.exit(1);
    }
}

backupTasks();


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

// Safety Lock
const EXPECTED_VERSION = '13.0.0';
// In a real app, we might fetch this from a config doc. 
// For now, we simulate check or require explicit arg.
const args = process.argv.slice(2);
const force = args.includes('--force-finalize');

async function finalizeV13() {
    console.log('⚠️  STARTING V13 FINALIZATION ⚠️');
    console.log('   This will DESTROY legacy `progress` fields and enforce V13 structure.');

    if (!force) {
        console.error('❌ Safety Lock: You must pass --force-finalize to execute this destructive action.');
        console.error('   Ensure V13 has been running in production stably for at least 24h.');
        process.exit(1);
    }

    try {
        const tasksRef = db.collection('tasks');
        const snapshot = await tasksRef.get();
        let batch = db.batch();
        let count = 0;

        snapshot.docs.forEach(doc => {
            const t = doc.data();

            // Logic:
            // 1. If progressV13 exists, copy it to progress (making progress an object structure officially)
            // 2. Delete progressV13 (cleanup)

            if (t.progressV13) {
                batch.update(doc.ref, {
                    progress: t.progressV13,
                    progressV13: getFirestore().FieldValue.delete() as any,
                    // Optional: remove other legacy fields if defined
                });
                count++;
            }

            if (count >= 400) {
                batch.commit();
                batch = db.batch();
                count = 0;
            }
        });

        if (count > 0) await batch.commit();

        console.log(`✅ Finalization Complete. V13 is now the law.`);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

finalizeV13();


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

async function rollbackShadow() {
    console.log('🚨 Starting SHADOW ROLLBACK (Emergency Only)...');
    console.log('   This will DELETE all V13 fields (progressV13, type, order, ancestorIds) from ALL tasks.');
    console.log('   Waiting 5 seconds... Press Ctrl+C to abort.');

    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
        const batchSize = 500;
        const collectionRef = db.collection('tasks');
        const snapshot = await collectionRef.get();

        if (snapshot.empty) {
            console.log('No matching documents.');
            return;
        }

        let batch = db.batch();
        let count = 0;
        let totalUpdated = 0;

        snapshot.docs.forEach((doc) => {
            // Delete V13 specific fields
            batch.update(doc.ref, {
                progressV13: getFirestore().FieldValue.delete() as any, // Cast to any to avoid annoying type issues locally
                type: getFirestore().FieldValue.delete() as any,
                order: getFirestore().FieldValue.delete() as any,
                ancestorIds: getFirestore().FieldValue.delete() as any,
                parentId: getFirestore().FieldValue.delete() as any,
                planId: getFirestore().FieldValue.delete() as any
                // We DO NOT touch 'progress'
            });

            count++;

            if (count >= batchSize) {
                batch.commit();
                batch = db.batch();
                totalUpdated += count;
                console.log(`   Rolled back ${totalUpdated} tasks...`);
                count = 0;
            }
        });

        if (count > 0) {
            await batch.commit();
            totalUpdated += count;
        }

        console.log(`✅ Rollback complete. ${totalUpdated} tasks cleaned.`);

    } catch (error) {
        console.error('❌ Rollback failed:', error);
        process.exit(1);
    }
}

rollbackShadow();

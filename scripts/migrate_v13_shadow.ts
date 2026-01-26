
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

// Helper to parse flags
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

async function migrateShadow() {
    console.log(`🚀 Starting V13 Shadow Migration ${isDryRun ? '[DRY RUN]' : ''}...`);
    console.log('   Strategy: Write progressV13, type, order, ancestorIds. Preserve progress.');

    try {
        const tasksRef = db.collection('tasks');
        const snapshot = await tasksRef.get();

        if (snapshot.empty) {
            console.log('No tasks found to migrate.');
            return;
        }

        let batch = db.batch();
        let batchCount = 0;
        let totalProcessed = 0;
        let totalSkipped = 0;

        for (const doc of snapshot.docs) {
            const task = doc.data();

            // SKIP if already migrated (check for progressV13 existence)
            // Unless --force is passed (omitted for safety in this version)
            if (task.progressV13 && task.type && task.order !== undefined) {
                totalSkipped++;
                continue;
            }

            // 1. Calculate Progress V13
            // If legacy is number, use it as actual. Planned = 0.
            const legacyProgress = typeof task.progress === 'number' ? task.progress : (task.progress?.actual || 0);
            const progressV13 = {
                actual: legacyProgress,
                planned: 0
            };

            // 2. Calculate New Fields
            const type = 'task'; // All legacy items become standard tasks
            const order = task.createdAt && task.createdAt.toMillis
                ? task.createdAt.toMillis() / 1000
                : Date.now() / 1000; // Preserve chronological order roughly

            const ancestorIds: string[] = []; // Initial flat structure
            const planStatus = 'detached'; // Initially detached from any Plan

            // 3. Prepare Update
            const updateData = {
                progressV13,
                type,
                order,
                ancestorIds,
                planStatus
                // We intentionally do NOT set parentId (defaults to undefined/top-level)
            };

            if (isDryRun) {
                console.log(`   [DRY] Would update ${doc.id} (${task.friendlyId || 'NoID'}):`, JSON.stringify(updateData));
            } else {
                batch.update(doc.ref, updateData);
                batchCount++;
            }

            totalProcessed++;

            // Commit Batch
            if (batchCount >= 400) {
                if (!isDryRun) await batch.commit();
                console.log(`   Committed batch of ${batchCount} tasks...`);
                batch = db.batch();
                batchCount = 0;
            }
        }

        // Final Batch
        if (batchCount > 0 && !isDryRun) {
            await batch.commit();
        }

        console.log(`✅ Migration complete.`);
        console.log(`   Total Scanned: ${snapshot.size}`);
        console.log(`   Processed: ${totalProcessed}`);
        console.log(`   Skipped (Already Migrated): ${totalSkipped}`);
        if (isDryRun) console.log('   (No changes made to DB)');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateShadow();

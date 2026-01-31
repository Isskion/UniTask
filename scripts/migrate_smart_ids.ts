/**
 * SCRIPT: migrate_smart_ids.ts
 * DESCRIPTION: Backfills Smart IDs (e.g., TSP-260101) for existing tasks 
 * based on their creation date and project.
 * 
 * USAGE: npx ts-node scripts/migrate_smart_ids.ts
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// FORCE CJS require for firebase-admin to avoid ESM/Interop issues
const admin = require('firebase-admin');

import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load ENV
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Init Firebase (Assumes GOOGLE_APPLICATION_CREDENTIALS or similar is set, 
// or standard local emulator/admin SDK init)
if (!admin.apps.length) {
    // Attempt local service account if available, or default
    try {
        const serviceAccountPath = resolve(__dirname, '../serviceAccountKey.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp({
                projectId: "minuta-f75a4"
            });
        }
    } catch (e) {
        // Fallback for emulator or default env
        admin.initializeApp({
            projectId: "minuta-f75a4" // Hardcoded from context if needed
        });
    }
}

const db = admin.firestore();

async function migrate() {
    console.log("=== STARTING SMART ID MIGRATION ===");

    // 1. Get All Projects
    const projectsSnap = await db.collection("projects").get();
    console.log(`Found ${projectsSnap.size} projects.`);

    for (const projectDoc of projectsSnap.docs) {
        const projectData = projectDoc.data();
        const projectId = projectDoc.id;
        const projectCode = (projectData.code || "TSK").toUpperCase();

        console.log(`\nProcessing Project: ${projectData.name} (${projectCode})...`);

        // 2. Get All Tasks for Project, Ordered by Date
        const tasksQuery = await db.collection("tasks")
            .where("projectId", "==", projectId)
            .get();

        const tasksDocs = tasksQuery.docs.sort((a: any, b: any) => {
            const dateA = a.data().createdAt?.toDate ? a.data().createdAt.toDate() : new Date(a.data().createdAt);
            const dateB = b.data().createdAt?.toDate ? b.data().createdAt.toDate() : new Date(b.data().createdAt);
            return dateA.getTime() - dateB.getTime();
        });


        if (tasksDocs.length === 0) {
            console.log("  No tasks found.");
            continue;
        }

        console.log(`  Found ${tasksDocs.length} tasks.`);

        // 3. Process Tasks
        // We need to track counters locally for the migration to ensure consistency
        // Format: { "2601": 5, "2602": 1 ... }
        const localCounters: Record<string, number> = {};

        const batchSize = 400;
        let batch = db.batch();
        let opCount = 0;

        for (const taskDoc of tasksDocs) {
            const task = taskDoc.data();

            // Skip if already migrated (optional check, dependent on user preference)
            // if (task.friendlyId && task.friendlyId.startsWith(projectCode + "-")) continue;

            // Determine Date
            let date = new Date();
            if (task.createdAt && task.createdAt.toDate) {
                date = task.createdAt.toDate();
            } else if (task.createdAt) {
                date = new Date(task.createdAt);
            }

            const year = date.getFullYear().toString().slice(-2);
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            const prefix = `${year}${month}`; // YYMM

            // Increment Counter
            if (!localCounters[prefix]) localCounters[prefix] = 0;
            localCounters[prefix]++;

            const sequence = localCounters[prefix];
            const newId = `${projectCode}-${prefix}${sequence.toString().padStart(2, '0')}`;

            // Update Operation
            // console.log(`    Mapping ${task.friendlyId} -> ${newId}`);
            batch.update(taskDoc.ref, {
                friendlyId: newId,
                smartIdGenerated: true
            });
            opCount++;

            if (opCount >= batchSize) {
                await batch.commit();
                batch = db.batch();
                opCount = 0;
                process.stdout.write(".");
            }
        }

        if (opCount > 0) {
            await batch.commit();
        }

        // 4. Update Database Counters
        // We must update the `counters` collection so future Cloud Functions start correctly.
        // We set the counter to the MAX value used in migration.
        console.log(`  Updating DB Counters for ${projectId}...`);
        for (const [prefix, count] of Object.entries(localCounters)) {
            const counterRef = db.collection("counters").doc(`${projectId}_${prefix}`);

            // Transactional update to be safe (though this script should be run solo)
            await db.runTransaction(async (t: any) => {
                const doc = await t.get(counterRef);
                const currentDBCount = doc.exists ? (doc.data()?.count || 0) : 0;

                if (count > currentDBCount) {
                    t.set(counterRef, { count: count }, { merge: true });
                }
            });
        }
    }

    console.log("\n\n=== MIGRATION COMPLETE ===");
}

migrate().catch(console.error);

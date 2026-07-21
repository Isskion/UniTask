/**
 * SCRIPT: security_backup.ts
 * DESCRIPTION: Performs a safety backup of critical collections before operations.
 * USES: serviceAccountKey.json (Bypassing env var issues)
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initial Setup
const rootDir = path.resolve(__dirname, '..');
const backupsDir = path.join(rootDir, 'backups');

// 1. Initialize Firebase
function initFirebase() {
    // Try serviceAccountKey.json
    const serviceAccountPath = path.join(rootDir, 'serviceAccountKey.json');

    if (fs.existsSync(serviceAccountPath)) {
        console.log("🔑 Using serviceAccountKey.json...");
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
    } else {
        console.error("❌ serviceAccountKey.json not found! Cannot proceed with backup.");
        process.exit(1);
    }
}

// 2. Collections to Backup
const COLLECTIONS = [
    'projects',
    'tasks',
    'users',
    'journal_entries', // Critical data
    'sprints',
    // Added for SAM Architecture Backup
    'tenants',
    'permission_groups',
    'attribute_definitions',
    'master_data',
    'knowledge_entries',
    // --- Sincronizada 2026-07-21 con scripts/run-dated-backup.js (ver docs/kpi-builder-design.md) ---
    'notifications',
    'invites',
    'report_templates',
    'agenda_entries',
    'agenda_consultants',
    'user_availability',
    'consultantTasks',
    'activeTimers',
    'taskTypes',
    'task_activities',
    'task_comments',
    'document_types',
    'interfaces',
    'project_hierarchy',
    'project_interfaces',
    'support_tickets',
    'tenant_dictionary',
    'unidocs_templates',
    'unileaks_folders',
    'unileaks_notes',
    'ai_corrections',
    'ai_performance_logs',
];

async function runBackup() {
    initFirebase();
    const db = admin.firestore();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFolder = path.join(backupsDir, `safety_snapshot_${timestamp}`);

    // Create Dirs
    if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir);
    if (!fs.existsSync(backupFolder)) fs.mkdirSync(backupFolder);

    console.log(`📂 Backup Folder: ${backupFolder}`);

    for (const colName of COLLECTIONS) {
        process.stdout.write(`📦 Backing up ${colName}... `);
        try {
            const snapshot = await db.collection(colName).get();
            const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

            fs.writeFileSync(
                path.join(backupFolder, `${colName}.json`),
                JSON.stringify(data, null, 2)
            );
            console.log(`✅ ${data.length} docs`);
        } catch (e: any) {
            console.log(`❌ Error: ${e.message}`);
        }
    }

    console.log("\n✨ Safety Backup Complete.");
}

runBackup().catch(console.error);

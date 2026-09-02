const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Admin SDK using process.env or .env.local
let serviceAccount;
const customKeyPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const dotEnvPath = path.join(__dirname, '..', '.env.local');

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log('🌍 Using process.env.FIREBASE_SERVICE_ACCOUNT for authentication');
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
        console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT from process.env:', e.message);
        process.exit(1);
    }
} else if (fs.existsSync(customKeyPath)) {
    console.log('📂 Using serviceAccountKey.json for authentication');
    serviceAccount = JSON.parse(fs.readFileSync(customKeyPath, 'utf8'));
} else if (fs.existsSync(dotEnvPath)) {
    console.log('📂 Reading credentials from .env.local');
    const envContent = fs.readFileSync(dotEnvPath, 'utf8');
    const serviceAccountMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT=['"](.*?)['"]/);
    if (!serviceAccountMatch) {
        console.error('❌ FIREBASE_SERVICE_ACCOUNT not found in .env.local');
        process.exit(1);
    }
    try {
        serviceAccount = JSON.parse(serviceAccountMatch[1]);
    } catch (e) {
        console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT from .env.local:', e.message);
        process.exit(1);
    }
} else {
    console.error('❌ No authentication method found (process.env, serviceAccountKey.json or .env.local)');
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const COLLECTIONS = [
    'projects',
    'tasks',
    'users',
    'notifications',
    'journal_entries',
    'master_data',
    'attribute_definitions',
    'invites',
    'report_templates',
    'permission_groups',
    // --- Añadidas 2026-07-21: no tenían backup automático (auditoría al diseñar KPIs de Agenda) ---
    'tenants',
    'agenda_entries',
    'agenda_consultants',
    'user_availability',
    'consultantTasks',
    'activeTimers',
    'sprints',
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
    'uniswaggerCache',
    // Cuando exista kpiDefinitions (feature de KPIs dinámicos, ver docs/kpi-builder-design.md), añadirla aquí también.
];

async function backupDatabase() {
    console.log('🚀 Starting Dated Database Backup...');
    const backup = {};
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timestamp = now.toISOString().replace(/[:.]/g, '-');

    const rootBackupFolder = path.join(__dirname, '..', 'backups');
    const datedBackupFolder = path.join(rootBackupFolder, dateStr);

    if (!fs.existsSync(rootBackupFolder)) {
        fs.mkdirSync(rootBackupFolder);
    }
    if (!fs.existsSync(datedBackupFolder)) {
        fs.mkdirSync(datedBackupFolder);
        console.log(`📁 Created dated folder: ${dateStr}`);
    }

    const backupFile = path.join(datedBackupFolder, `backup_${timestamp}.json`);

    // --- NEW: Copy Rules Files ---
    console.log('📄 Copying project rules and security rules...');
    const projectRoot = path.join(__dirname, '..');
    const rulesToCopy = [
        'firestore.rules',
        'storage.rules',
        '.agent/rules.md'
    ];

    for (const rulePath of rulesToCopy) {
        const fullSourcePath = path.join(projectRoot, rulePath);
        if (fs.existsSync(fullSourcePath)) {
            const destPath = path.join(datedBackupFolder, path.basename(rulePath));
            fs.copyFileSync(fullSourcePath, destPath);
            console.log(`   ✅ Copied: ${rulePath}`);
        } else {
            console.warn(`   ⚠️  Rule file not found: ${rulePath}`);
        }
    }
    // ----------------------------

    for (const colName of COLLECTIONS) {
        console.log(`📦 Backing up collection: ${colName}...`);
        try {
            const snapshot = await db.collection(colName).get();
            backup[colName] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`   ✅ Done. (${backup[colName].length} documents)`);
        } catch (error) {
            console.error(`   ❌ Error backing up ${colName}:`, error.message);
        }
    }

    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`\n✨ Backup completed successfully!`);
    console.log(`📄 File: ${backupFile}`);

    // Update latest pointer in root
    fs.writeFileSync(path.join(rootBackupFolder, 'latest_backup.json'), JSON.stringify(backup, null, 2));
}

backupDatabase().catch(err => {
    console.error('❌ Backup failed:', err);
    process.exit(1);
});

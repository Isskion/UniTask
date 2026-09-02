const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let serviceAccount;
let db;

async function initAdmin() {
    const dotEnvPath = path.join(__dirname, '..', '.env.local');
    const saPath = path.join(__dirname, '..', 'serviceAccountKey.json');

    // Try .env.local
    if (fs.existsSync(dotEnvPath)) {
        const envContent = fs.readFileSync(dotEnvPath, 'utf8');
        const lines = envContent.split(/\r?\n/);
        const saLine = lines.find(l => l.startsWith('FIREBASE_SERVICE_ACCOUNT='));

        if (saLine) {
            let val = saLine.split('=')[1].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length - 1);
            }
            // Handle escaped newlines and quotes
            val = val.replace(/\\n/g, '\n').replace(/\\"/g, '"');

            try {
                serviceAccount = JSON.parse(val);
                console.log('✅ Found .env.local credentials');
            } catch (e) {
                console.warn('⚠️ JSON.parse for .env.local failed, trying raw substring extraction...');
                try {
                    const start = val.indexOf('{');
                    const end = val.lastIndexOf('}');
                    if (start !== -1 && end !== -1) {
                        serviceAccount = JSON.parse(val.substring(start, end + 1));
                        console.log('✅ Found .env.local credentials (extracted from substring)');
                    }
                } catch (e2) {
                    console.warn('⚠️ Substring extraction also failed.');
                }
            }
        }
    }

    // Try serviceAccountKey.json if still not found
    if (!serviceAccount && fs.existsSync(saPath)) {
        try {
            serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
            console.log('✅ Found serviceAccountKey.json credentials');
        } catch (e) {
            console.error('❌ Failed to load serviceAccountKey.json:', e.message);
        }
    }

    if (!serviceAccount) {
        console.error('❌ No valid service account found.');
        process.exit(1);
    }

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    db = admin.firestore();
}

const COLLECTIONS = [
    'projects', 'tasks', 'users', 'notifications', 'journal_entries',
    'master_data', 'attribute_definitions', 'invites', 'report_templates',
    'permission_groups', 'tenants', 'daily_status', 'weekly_entries',
    'sprints', 'support_tickets', 'knowledge_entries', 'knowledge_tags',
    'document_types', 'ai_pricing', 'tenant_ai_config', 'usage_shards',
    'monthly_summary', 'ai_executions',
    'unileaks', 'unidocs_templates', 'product_proposals', 'uniswaggerCache'
];

async function backupDatabase() {
    console.log('🚀 Starting COMPLETE Database Backup...');
    const backup = {};
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFolder = path.join(__dirname, 'backups');

    if (!fs.existsSync(backupFolder)) fs.mkdirSync(backupFolder);
    const backupFile = path.join(backupFolder, `backup_FULL_${timestamp}.json`);

    for (const colName of COLLECTIONS) {
        process.stdout.write(`📦 Backing up ${colName}... `);
        try {
            const snapshot = await db.collection(colName).get();
            if (snapshot.empty) {
                console.log('🔸 Empty');
                backup[colName] = [];
            } else {
                backup[colName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                console.log(`✅ ${backup[colName].length} docs`);
            }
        } catch (err) {
            console.log(`❌ Failed: ${err.message}`);
        }
    }

    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`\n✨ Full Backup completed: ${backupFile}`);
    fs.writeFileSync(path.join(backupFolder, 'latest_backup.json'), JSON.stringify(backup, null, 2));
}

(async () => {
    await initAdmin();
    await backupDatabase();
})().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});

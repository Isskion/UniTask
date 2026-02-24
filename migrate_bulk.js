const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

const TENANT_ID = '3';
const USER_ID = '6C9ZN0mfngNb5gIAWw1EMSaQcRR2';
const SOURCE_BASE_PATH = 'C:\\Users\\daniel.delamo\\.gemini\\antigravity\\scratch\\contexto_unigis\\Unileaks\\Proyectos';

const MAPPING = {
    "Delgado": "Au1xfXgivgl6VYj2zscs",
    "Luis simoes": "OH4sjML9byhLuzMXSTss",
    "SMSA": "c0HRtaCkKXxeiQf897sY",
    "Spar": "WcF8wTccm1LkaFBfWvug",
    "Transpais": "aAb2HIajQVhXnLAzmVo8"
};

async function migrateProject(folderName, projectId) {
    const projectPath = path.join(SOURCE_BASE_PATH, folderName);
    if (!fs.existsSync(projectPath)) {
        console.log(`Folder not found: ${projectPath}`);
        return;
    }

    console.log(`>>> Migrating project: ${folderName} (ID: ${projectId})`);

    const subfolders = fs.readdirSync(projectPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory());

    for (const subDirent of subfolders) {
        const subfolderName = subDirent.name;
        const subfolderPath = path.join(projectPath, subfolderName);

        console.log(`  Processing subfolder: ${subfolderName}`);

        // Create folder in Firestore
        const folderRef = db.collection('unileaks_folders').doc();
        await folderRef.set({
            name: subfolderName,
            parentId: null,
            projectId: projectId,
            tenantId: TENANT_ID,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        const folderId = folderRef.id;

        // Process files in folder
        const files = fs.readdirSync(subfolderPath);
        for (const fileName of files) {
            if (fileName.endsWith('.md')) {
                const filePath = path.join(subfolderPath, fileName);
                const title = fileName.replace('.md', '');
                const content = fs.readFileSync(filePath, 'utf8');

                console.log(`    Creating note: ${title}`);

                const noteRef = db.collection('unileaks_notes').doc();
                await noteRef.set({
                    title: title,
                    content: content,
                    projectId: projectId,
                    tenantId: TENANT_ID,
                    userId: USER_ID,
                    isPublic: true,
                    folderId: folderId,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp()
                });
            }
        }
    }
}

async function bulkMigrate() {
    for (const [folderName, projectId] of Object.entries(MAPPING)) {
        await migrateProject(folderName, projectId);
    }
    console.log('Bulk migration completed successfully.');
}

bulkMigrate().catch(console.error);

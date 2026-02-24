const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

const PROJECT_ID = '9iqygviz3AGJnbJOLc8E'; // EUROPASTRY
const TENANT_ID = '3';
const USER_ID = '6C9ZN0mfngNb5gIAWw1EMSaQcRR2';
const SOURCE_BASE_PATH = 'C:\\Users\\daniel.delamo\\.gemini\\antigravity\\scratch\\contexto_unigis\\Unileaks\\Proyectos\\Europastry';

async function migrate() {
    const folders = fs.readdirSync(SOURCE_BASE_PATH, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory());

    for (const folderDirent of folders) {
        const folderName = folderDirent.name;
        const folderPath = path.join(SOURCE_BASE_PATH, folderName);

        console.log(`Processing folder: ${folderName}`);

        // Create folder in Firestore
        const folderRef = db.collection('unileaks_folders').doc();
        await folderRef.set({
            name: folderName,
            parentId: null,
            projectId: PROJECT_ID,
            tenantId: TENANT_ID,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        const folderId = folderRef.id;

        // Process files in folder
        const files = fs.readdirSync(folderPath);
        for (const fileName of files) {
            if (fileName.endsWith('.md')) {
                const filePath = path.join(folderPath, fileName);
                const title = fileName.replace('.md', '');
                const content = fs.readFileSync(filePath, 'utf8');

                console.log(`  Creating note: ${title}`);

                const noteRef = db.collection('unileaks_notes').doc();
                await noteRef.set({
                    title: title,
                    content: content,
                    projectId: PROJECT_ID,
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
    console.log('Migration completed successfully.');
}

migrate().catch(console.error);

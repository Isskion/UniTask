
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();
const TENANT_ID = '3r'; // Tenant 3
const PROJECT_ID = 'DWXtB3YW0vii8A55ZQYR'; // VisualMapper
const EXPECTED_CODE = 'VMS';

async function verifyAutoFix() {
    console.log('--- VERIFYING PROJECT CODE AUTO-FIX ---');

    // 1. Create a task WITHOUT projectCode
    const taskRef = db.collection('tasks').doc();
    const taskData = {
        title: 'Test Auto-Fix Project Code',
        status: 'pending',
        projectId: PROJECT_ID,
        tenantId: TENANT_ID,
        createdAt: new Date(),
        // projectCode is MISSING intentionally
    };

    console.log(`Creating task ${taskRef.id} without projectCode...`);
    await taskRef.set(taskData);

    // 2. Listen for updates (Cloud Function should trigger)
    console.log('Waiting for Cloud Function update...');

    const unsubscribe = taskRef.onSnapshot(snap => {
        const data = snap.data();
        if (data.friendlyId) {
            console.log(`Update Detected!`);
            console.log(`Friendly ID: ${data.friendlyId}`);
            console.log(`Project Code: ${data.projectCode}`);

            if (data.projectCode === EXPECTED_CODE) {
                console.log('✅ SUCCESS: Project Code was automatically set to', EXPECTED_CODE);
            } else {
                console.error('❌ FAILURE: Project Code is', data.projectCode);
            }
            unsubscribe();
            process.exit(0);
        }
    }, err => {
        console.error('Error listening to task:', err);
        process.exit(1);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
        console.error('❌ TIMEOUT: Cloud Function did not update the task in time.');
        unsubscribe();
        process.exit(1);
    }, 30000);
}

verifyAutoFix();

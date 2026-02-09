
const admin = require('firebase-admin');
const { resolve } = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: resolve(__dirname, '../.env.local') });

if (!admin.apps.length) {
    try {
        const serviceAccountPath = resolve(__dirname, '../serviceAccountKey.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp({ projectId: "minuta-f75a4" });
        }
    } catch (e) {
        admin.initializeApp({ projectId: "minuta-f75a4" });
    }
}

const db = admin.firestore();

async function findUser() {
    const email = "cursoiadaniel@gmail.com";

    try {
        // 1. Find User
        console.log(`Searching for user: ${email}...`);
        const userSnap = await db.collection('users').where('email', '==', email).get();

        if (userSnap.empty) {
            console.log('❌ No user found in "users" collection.');
            return;
        }

        const userDoc = userSnap.docs[0];
        const userData = userDoc.data();
        const userId = userDoc.id;
        const tenantId = userData.tenantId;

        console.log(`✅ User Found: ${userId}`);
        console.log(`   Tenant ID: ${tenantId}`);
        console.log(`   Role: ${userData.role || 'N/A'}`);

        // 2. Check User Profile (Assignments)
        console.log(`\nChecking "user_profiles/${userId}"...`);
        const profileSnap = await db.collection('user_profiles').doc(userId).get();
        let assignedIds = [];

        if (!profileSnap.exists) {
            console.log("❌ No user_profile document found.");
        } else {
            const profile = profileSnap.data();
            assignedIds = profile.assignedProjectIds || [];
            console.log(`✅ Profile Found.`);
            console.log(`   Assigned Project IDs:`, assignedIds);
        }

        // 3. Find "Mockup" Project
        console.log(`\nSearching for project "mockup"...`);
        // Search loosely by name
        const projectsSnap = await db.collection('projects').get();
        const mockProjects = projectsSnap.docs.filter(d =>
            d.data().name.toLowerCase().includes('mock')
        );

        if (mockProjects.length === 0) {
            console.log("❌ No project found with 'mock' in name.");
        } else {
            mockProjects.forEach(p => {
                const pData = p.data();
                const isAssigned = assignedIds.includes(p.id);
                console.log(`   Found Project: "${pData.name}" (ID: ${p.id})`);
                console.log(`   - Tenant: ${pData.tenantId}`);
                console.log(`   - Status: ${pData.status}`);
                console.log(`   - Is User Assigned? ${isAssigned ? "YES ✅" : "NO ❌"}`);

                if (pData.tenantId !== tenantId) {
                    console.log(`   ⚠️ WARNING: Tenant Mismatch! User is ${tenantId}, Project is ${pData.tenantId}`);
                }
            });
        }

        // 4. Check Tasks for Mock Project
        if (mockProjects.length > 0) {
            const pid = mockProjects[0].id;
            console.log(`\nChecking tasks for project ID: ${pid}...`);
            const tasksSnap = await db.collection('tasks').where('projectId', '==', pid).limit(5).get();
            console.log(`   Found ${tasksSnap.size} tasks.`);
            tasksSnap.forEach(t => {
                const data = t.data();
                console.log(`   - Task: ${data.title}`);
                console.log(`     Data Dump: `, JSON.stringify(data));
            });
        }

    } catch (err) {
        console.error('Error', err);
    }
}

findUser();

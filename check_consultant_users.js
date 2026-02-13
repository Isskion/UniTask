
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkConsultantUsers() {
    console.log("--- CHECKING CONSULTANT USERS IN TENANT 3 ---");

    // Check for both 'consultor' and 'consultant' roles
    const roles = ['consultor', 'consultant', 'Consultor', 'Consultant'];

    // Note: 'in' query supports up to 10 values
    const snapshot = await db.collection('users')
        .where('tenantId', '==', '3')
        .where('role', 'in', roles)
        .get();

    const newGroupId = 'zkHq8MpGD0SnkgAWdFbx'; // The ID we just restored (from previous log)

    if (snapshot.empty) {
        console.log("No consultant users found in Tenant 3.");
    } else {
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const groupStatus = data.permissionGroupId === newGroupId ? "✅ CORRECT" : `❌ WRONG (${data.permissionGroupId})`;
            console.log(`User: ${data.email} | Role: ${data.role} | Group: ${groupStatus}`);
        });
    }
}

checkConsultantUsers();

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkUsers() {
    console.log("--- USERS IN TENANT 3 ---");
    const snapshot = await db.collection('users').where('tenantId', '==', '3').get();
    
    if (snapshot.empty) {
        console.log("No users found.");
        return;
    }
    
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`UserID: ${doc.id} | email: ${data.email} | role: ${data.role} | regionIds: ${JSON.stringify(data.accessScopes?.regionIds || [])} | divisionIds: ${JSON.stringify(data.accessScopes?.divisionIds || [])}`);
    });
}

checkUsers();

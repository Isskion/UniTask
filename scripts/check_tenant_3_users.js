
const admin = require('firebase-admin');
const { resolve } = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: resolve(__dirname, '../.env.local') });

if (!admin.apps.length) {
    try {
        const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (serviceAccountRaw) {
            const serviceAccount = JSON.parse(serviceAccountRaw);
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

async function listTenantUsers(tid) {
    console.log(`Listing all users in Tenant ${tid}...`);
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('tenantId', '==', tid).get();

    if (snapshot.empty) {
        console.log('No users found.');
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- ID: ${doc.id}, Name: ${data.displayName}, Email: ${data.email}, Role: ${data.role}, Level: ${data.roleLevel}`);
    });
}

listTenantUsers('3').catch(console.error);

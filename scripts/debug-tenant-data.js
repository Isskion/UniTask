const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkTenantData() {
    console.log('\n🔍 Checking Data Distribution...');

    // 1. Check Tenants
    const tenants = await db.collection('tenants').get();
    const tenantMap = {};
    tenants.forEach(t => tenantMap[t.id] = t.data().name);
    console.log('Tenants:', tenantMap);

    // 2. Count Projects per Tenant
    const projects = await db.collection('projects').get();
    const projCounts = {};
    projects.forEach(p => {
        const tid = p.data().tenantId || 'unknown';
        if (!projCounts[tid]) projCounts[tid] = 0;
        projCounts[tid]++;
    });
    console.log('\nProjects by Tenant:', projCounts);

    // 3. Count Users per Tenant
    const users = await db.collection('users').get();
    const userCounts = {};
    users.forEach(u => {
        const tid = u.data().tenantId || 'unknown';
        if (!userCounts[tid]) userCounts[tid] = 0;
        userCounts[tid]++;
    });
    console.log('Users by Tenant:', userCounts);
}

checkTenantData();

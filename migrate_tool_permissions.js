const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function migrateToolPermissions() {
    console.log('🚀 Starting tool permissions migration...');
    const groupsSnap = await db.collection('permission_groups').get();
    
    console.log(`Found ${groupsSnap.size} groups to process.`);
    
    const batch = db.batch();
    let count = 0;

    groupsSnap.docs.forEach(doc => {
        const data = doc.data();
        const name = (data.name || '').toLowerCase();
        const viewAccess = data.viewAccess || {};

        // Define new tool permissions
        const newTools = {
            unileaks: name.includes('admin') || name.includes('manager') || name.includes('pm'),
            uniordercreator: name.includes('admin') || name.includes('manager') || name.includes('pm'),
            swagger: name.includes('admin') || name.includes('manager') || name.includes('pm'),
            soap: name.includes('admin') || name.includes('manager') || name.includes('pm'),
            unidocs: name.includes('admin') || name.includes('manager') || name.includes('pm'),
            uniflux: name.includes('admin') || name.includes('manager') || name.includes('pm'),
            inbox: name.includes('admin') || name.includes('manager') || name.includes('pm')
        };

        // Only update if missing
        let needsUpdate = false;
        const updatedViewAccess = { ...viewAccess };

        Object.keys(newTools).forEach(tool => {
            if (updatedViewAccess[tool] === undefined) {
                updatedViewAccess[tool] = newTools[tool];
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
            batch.update(doc.ref, { 
                viewAccess: updatedViewAccess,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            count++;
            console.log(`✅ Queueing update for group: ${data.name} (${doc.id})`);
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`🎉 Migration complete! Updated ${count} groups.`);
    } else {
        console.log('✨ No groups needed updates.');
    }
}

migrateToolPermissions().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});

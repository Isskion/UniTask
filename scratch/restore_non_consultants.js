const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function runRestore() {
    console.log("=== RESTORING VALID ADMIN/PM AGENDA CONSULTANTS ===");
    
    const docsToReactivate = [
        { id: '87ilq5te0LFyWSs31QHG', region: 'España' },
        { id: 'wk4ScaHfx86dJDCeTmuS', region: 'España' },
        { id: 'WYqCtEqjjXMAir5Aa2oM', region: 'España' },
        { id: '4U12muw8gkp0Ork0XGno', region: 'España' } // Also setting region to España since it was empty
    ];
    
    const batch = db.batch();
    
    for (const item of docsToReactivate) {
        console.log(`Reactivating DocID: ${item.id} with region: ${item.region}`);
        batch.update(db.collection('agenda_consultants').doc(item.id), {
            isActive: true,
            region: item.region
        });
    }
    
    await batch.commit();
    console.log("🎉 Successfully reactivated and updated admin/PM consultants.");
}

runRestore().catch(err => {
    console.error("Restore failed:", err);
});

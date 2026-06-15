const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function inspect() {
    console.log("--- CONSULTANTS IN agenda_consultants ---");
    const snapshot = await db.collection('agenda_consultants').get();
    
    if (snapshot.empty) {
        console.log("No consultants found.");
        return;
    }
    
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`DocID: ${doc.id} | tenantId: ${data.tenantId} | userId: ${data.userId} | name: ${data.name} | region: ${data.region} | isActive: ${data.isActive}`);
    });
}

inspect();

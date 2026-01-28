const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const dotEnvPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(dotEnvPath, 'utf8');
const serviceAccountMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT='(.*?)'/);
const serviceAccount = JSON.parse(serviceAccountMatch[1]);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function elevateUser() {
    const email = 'daniel.delamo@unigis.com';

    try {
        // 1. Auth Claims (La clave del 403)
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log(`Found Auth User: ${userRecord.uid}`);

        await admin.auth().setCustomUserClaims(userRecord.uid, {
            role: 'superadmin',
            roleLevel: 100,
            tenantId: 'SYSTEM',
            isActive: true
        });
        console.log("✅ Custom Claims (Auth) updated successfully.");

        // 2. Firestore Profile
        const snap = await db.collection('users').where('email', '==', email).get();
        if (snap.empty) {
            console.log(`User doc for ${email} not found in Firestore. Creating...`);
            await db.collection('users').doc(userRecord.uid).set({
                email: email,
                uid: userRecord.uid,
                role: 'superadmin',
                roleLevel: 100,
                tenantId: 'SYSTEM',
                isActive: true
            }, { merge: true });
        } else {
            const batch = db.batch();
            snap.forEach(doc => {
                console.log(`Elevating Firestore Doc: ${doc.id}`);
                batch.update(doc.ref, {
                    role: 'superadmin',
                    roleLevel: 100,
                    tenantId: 'SYSTEM',
                    isActive: true
                });
            });
            await batch.commit();
        }
        console.log("✅ Firestore updated successfully.");

    } catch (e) {
        console.error("Error elevating user:", e);
    }
}

elevateUser().catch(console.error);

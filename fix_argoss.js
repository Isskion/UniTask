const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const dotEnvPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(dotEnvPath, 'utf8');
const serviceAccountMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT='(.*?)'/);
const serviceAccount = JSON.parse(serviceAccountMatch[1]);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const auth = admin.auth();

async function fixUser(email) {
    console.log(`Fixing user: ${email}`);

    try {
        const userRecord = await auth.getUserByEmail(email);
        const uid = userRecord.uid;

        // 1. Update Auth Claims
        await auth.setCustomUserClaims(uid, {
            role: 'superadmin',
            roleLevel: 100,
            tenantId: '1'
        });
        console.log("✅ Custom claims updated.");

        // 2. Update Firestore Doc
        const snap = await db.collection('users').where('email', '==', email).get();
        if (snap.empty) {
            console.log("❌ No firestore document found to update.");
        } else {
            const batch = db.batch();
            snap.forEach(doc => {
                const data = doc.data();
                console.log(`Updating Doc ID: ${doc.id}`);

                // Using FieldValue.delete() to remove organizationId
                batch.update(doc.ref, {
                    role: 'superadmin',
                    roleLevel: 100,
                    tenantId: '1',
                    organizationId: admin.firestore.FieldValue.delete()
                });
            });
            await batch.commit();
            console.log("✅ Firestore document updated (organizationId removed).");
        }
    } catch (e) {
        console.error(`Error fixing user: ${e.message}`);
    }
}

fixUser('argoss01@gmail.com').catch(console.error);

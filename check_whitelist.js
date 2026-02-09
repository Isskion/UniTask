const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const dotEnvPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(dotEnvPath, 'utf8');

// Better regex or just simple parsing
const saMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT="(.*?)"/);
if (!saMatch) {
    console.error("Could not find FIREBASE_SERVICE_ACCOUNT in .env.local");
    process.exit(1);
}

const serviceAccount = JSON.parse(saMatch[1].replace(/\\n/g, '\n'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkWhitelist() {
    const doc = await db.collection('system_config').doc('admins').get();
    if (!doc.exists) {
        console.log("system_config/admins NOT FOUND");
        return;
    }
    console.log("Whitelisted Emails:", JSON.stringify(doc.data().emails, null, 2));
}

checkWhitelist().catch(error => {
    console.error(error);
    process.exit(1);
});

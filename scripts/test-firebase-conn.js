
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const serviceAccountRaw = envConfig.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountRaw) {
    console.error('FIREBASE_SERVICE_ACCOUNT is missing');
    process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountRaw);

console.log('Initializing Firebase Admin...');
try {
    const app = initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore(app);
    console.log('Attempting to read from Firestore...');

    // Attempt to list collections or just get a doc
    db.listCollections().then(collections => {
        console.log('Successfully connected!');
        console.log('Collections:', collections.map(c => c.id).join(', '));
        process.exit(0);
    }).catch(err => {
        console.error('Error connecting to Firestore:');
        console.error(err);
        process.exit(1);
    });

} catch (error) {
    console.error('Initialization Error:', error);
    process.exit(1);
}

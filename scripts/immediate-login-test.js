
const admin = require('firebase-admin');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { initializeApp } = require('firebase/app');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local for client config
const envPath = path.resolve(__dirname, '../.env.local');
const envData = fs.readFileSync(envPath, 'utf8');
const env = {};
envData.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim();
});

const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);

// Initialize Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

// Initialize Client (to test login)
const firebaseConfig = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const clientAuth = getAuth(app);

const TARGET_EMAIL = 'daniel.delamo@unigis.com';
const TEST_PASSWORD = 'password123';

async function testCycle() {
    console.log(`\n--- START TEST CYCLE for ${TARGET_EMAIL} ---`);

    try {
        // 1. Reset Password via Admin SDK
        console.log('1. Resetting password via Admin SDK...');
        const user = await admin.auth().getUserByEmail(TARGET_EMAIL);
        await admin.auth().updateUser(user.uid, {
            password: TEST_PASSWORD
        });
        console.log('✅ Password set to "password123"');

        // 2. Wait 2 seconds
        console.log('2. Waiting for sync (2s)...');
        await new Promise(r => setTimeout(r, 2000));

        // 3. Attempt Client Login
        console.log('3. Attempting Client Login...');
        try {
            const creds = await signInWithEmailAndPassword(clientAuth, TARGET_EMAIL, TEST_PASSWORD);
            console.log(`✅ SUCCESS! Logged in as: ${creds.user.uid}`);
        } catch (loginErr) {
            console.error(`❌ LOGIN FAILED IMMEDIATELY: ${loginErr.message}`);
        }

        // 4. Check custom claims while we are at it
        const authUser = await admin.auth().getUser(user.uid);
        console.log('📊 Current Custom Claims:', JSON.stringify(authUser.customClaims, null, 2));

    } catch (err) {
        console.error('💥 FATAL ERROR during test:', err);
    } finally {
        process.exit();
    }
}

testCycle();

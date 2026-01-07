const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim();
        if (key && !key.startsWith('#')) {
            env[key] = val;
        }
    }
});

const firebaseConfig = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

console.log("Using Config (masked):", {
    apiKey: firebaseConfig.apiKey ? "SET" : "MISSING",
    projectId: firebaseConfig.projectId
});

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkTasks() {
    console.log("Checking tasks collection...");
    try {
        const querySnapshot = await getDocs(collection(db, "tasks"));
        console.log(`Found ${querySnapshot.size} documents in 'tasks' collection.`);

        if (querySnapshot.size > 0) {
            console.log("Sample task:", JSON.stringify(querySnapshot.docs[0].data(), null, 2));
        } else {
            console.log("Collection is empty.");
        }
    } catch (error) {
        console.error("Error fetching tasks:", error);
    }
}

checkTasks();

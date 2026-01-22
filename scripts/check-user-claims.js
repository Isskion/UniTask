/**
 * Simple diagnostic script to check user claims
 * Run with: node scripts/check-user-claims.js
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Your Firebase config (from .env.local or firebase config)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDjqxOLXWJpBYxcGjVQx0FqZYxQxQxQxQx",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "minuta-f75a4.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "minuta-f75a4",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function checkClaims() {
    console.log('🔍 Checking user custom claims...\n');

    // You'll need to sign in first
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
        console.error('❌ Usage: node scripts/check-user-claims.js <email> <password>');
        process.exit(1);
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log(`✅ Signed in as: ${user.email}`);
        console.log(`   UID: ${user.uid}\n`);

        // Get the ID token and decode it
        const idTokenResult = await user.getIdTokenResult();

        console.log('📋 Custom Claims:');
        console.log(JSON.stringify(idTokenResult.claims, null, 2));

        console.log('\n🔑 Required Claims for Firestore Rules:');
        console.log(`   organizationId: ${idTokenResult.claims.organizationId || '❌ MISSING'}`);
        console.log(`   roleLevel: ${idTokenResult.claims.roleLevel || '❌ MISSING'}`);
        console.log(`   role: ${idTokenResult.claims.role || '❌ MISSING'}`);

        if (!idTokenResult.claims.organizationId || !idTokenResult.claims.roleLevel) {
            console.log('\n⚠️  PROBLEM FOUND: Missing required custom claims!');
            console.log('   This is why you\'re getting permission errors.');
            console.log('\n   Solution: Run the set-tenant-claims.js script with Admin SDK');
        } else {
            console.log('\n✅ All required claims are present!');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    process.exit(0);
}

checkClaims();

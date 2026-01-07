const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');

const content = `GOOGLE_API_KEY=AIzaSyA1kd3fkLzcztkSIK7W9nS6fj6jKBy_VL4
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDLFlFsH_6RKqZwxxN_Dkaj-MFTdS9Mmn8
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=minuta-f75a4.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=minuta-f75a4
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=minuta-f75a4.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=643064542850
NEXT_PUBLIC_FIREBASE_APP_ID=1:643064542850:web:e629b56f030f98d885e69b
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-S7EKEJFDQV`;

fs.writeFileSync(envPath, content, 'utf8');
console.log("✅ .env.local reconstructed locally!");

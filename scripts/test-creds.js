
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const serviceAccountRaw = envConfig.FIREBASE_SERVICE_ACCOUNT;

console.log('--- Raw Value Length ---');
console.log(serviceAccountRaw ? serviceAccountRaw.length : 'undefined');

if (!serviceAccountRaw) {
    console.error('FIREBASE_SERVICE_ACCOUNT is missing');
    process.exit(1);
}

try {
    const serviceAccount = JSON.parse(serviceAccountRaw);
    console.log('--- JSON Parse Success ---');
    console.log('Project ID:', serviceAccount.project_id);
    console.log('Client Email:', serviceAccount.client_email);
    console.log('Private Key Length:', serviceAccount.private_key ? serviceAccount.private_key.length : 0);
    console.log('Private Key Content:', serviceAccount.private_key);
} catch (error) {
    console.error('--- JSON Parse Error ---');
    console.error(error.message);
    console.log('First 50 chars:', serviceAccountRaw.substring(0, 50));
    console.log('Last 50 chars:', serviceAccountRaw.substring(serviceAccountRaw.length - 50));
}

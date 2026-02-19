const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '.env.local');
console.log('Loading from:', envPath);
console.log('Exists:', fs.existsSync(envPath));

const result = dotenv.config({ path: envPath });
if (result.error) {
    console.error('Dotenv error:', result.error);
}

console.log('Parsed keys:', Object.keys(result.parsed || {}));
console.log('FIREBASE_SERVICE_ACCOUNT in process.env:', !!process.env.FIREBASE_SERVICE_ACCOUNT);
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log('First 50 chars:', process.env.FIREBASE_SERVICE_ACCOUNT.substring(0, 50));
} else {
    console.log('Raw file content snippet:');
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/FIREBASE_SERVICE_ACCOUNT=.*/);
    console.log(match ? match[0].substring(0, 100) : 'Not found in file');
}

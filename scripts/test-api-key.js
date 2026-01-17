
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const https = require('https');

const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const apiKey = envConfig.NEXT_PUBLIC_FIREBASE_API_KEY;
const projectId = envConfig.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!apiKey) {
    console.error('NEXT_PUBLIC_FIREBASE_API_KEY is missing');
    process.exit(1);
}

console.log(`Testing API Key: ${apiKey.substring(0, 5)}... for Project: ${projectId}`);

// URL to check recaptcha params (public auth endpoint)
const url = `https://identitytoolkit.googleapis.com/v1/recaptchaParams?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        if (res.statusCode === 200) {
            console.log('API Key is VALID and working.');
        } else {
            console.error('API Key Check FAILED.');
            console.log('Response:', data);
        }
    });
}).on('error', (err) => {
    console.error('Network Error:', err);
});

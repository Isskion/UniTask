
const https = require('https');

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY";
const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

const data = JSON.stringify({
    email: "daniel.delamo@unigis.com",
    password: "ANY_PASSWORD",
    returnSecureToken: true
});

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(url, options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log('Response Body:', body);
    });
});

req.on('error', (err) => {
    console.error('Error:', err);
});

req.write(data);
req.end();

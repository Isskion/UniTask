
const https = require('https');

const apiKey = "AIzaSyD_XYb-Ra9LWchmKYza_de4sfBHVm0P8Ow";
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

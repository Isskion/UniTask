const https = require('https');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("No API Key found");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        if (res.statusCode === 200) {
            const result = JSON.parse(data);
            if (result.models) {
                const names = result.models.map(m => m.name).join('\n');
                fs.writeFileSync('models.txt', names);
                console.log("Models written to models.txt");
            } else {
                console.log("No models found.");
            }
        } else {
            console.error(`Request Failed: ${res.statusCode}`);
            console.error(data);
        }
    });
}).on("error", (err) => {
    console.error("Error: " + err.message);
});

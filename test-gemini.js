const https = require('https');

const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "YOUR_API_KEY";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log("Status Code:", res.statusCode);
        if (res.statusCode === 200) {
            const models = JSON.parse(data);
            console.log("Available Models:");
            models.models.forEach(m => {
                console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
            });
        } else {
            console.log("Error Body:", data);
        }
    });
}).on("error", (err) => {
    console.log("Error: " + err.message);
});

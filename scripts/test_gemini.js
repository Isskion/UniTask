const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
    console.error("Error: GEMINI_API_KEY is not set in .env.local");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function test() {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        console.log("Status:", response.status);
        if (data.models) {
            console.log("Models found:", data.models.length);
            data.models.slice(0, 5).forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log("Response:", JSON.stringify(data, null, 2));
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

test();


const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const apiKey = envConfig.GEMINI_API_KEY || envConfig.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
    console.error("No API Key found");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        console.log("Fetching models with Key:", apiKey.substring(0, 10) + "...");
        // Not all SDK versions expose listModels directly on genAI, usually it's via a model manager or just fallback.
        // Actually, for @google/generative-ai, there is no direct listModels on the main client in some versions.
        // But let's try to just Instantiate a model and see if it works, or use the REST API fallback if SDK fails.

        // Wait, version 0.24.1 might allow it via `getGenerativeModel`.
        // There is no listModels on the text-only client.
        // We will use REST API for listing to be sure.

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            const names = data.models.map(m => m.name).join('\n');
            fs.writeFileSync(path.resolve(__dirname, 'models.txt'), names);
            console.log("Models written to models.txt");
        } else {
            console.error("Failed to list models:", data);
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();

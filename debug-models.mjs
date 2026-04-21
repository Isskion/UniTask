import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const apiKey = process.env.GEMINI_API_KEY;

async function debugModels() {
    if (!apiKey) {
        console.error("No API key found in .env.local");
        return;
    }

    console.log(`Using Key: ${apiKey.substring(0, 6)}...`);
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // List models is not directly exposed in a clear way in all SDK versions, 
        // but we can try to use a dummy call or check the env.
        console.log("Attempting to list models via direct fetch if possible...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        console.log("Available Models:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error listing models:", e);
    }
}

debugModels();

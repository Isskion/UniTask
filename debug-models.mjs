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
        console.log("Fetching available models...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
            headers: {
                "Referer": "http://localhost:3000/univisio"
            }
        });
        const data = await response.json();
        if (response.ok) {
            console.log("Available Gemini models:");
            data.models
                .filter(m => m.name.toLowerCase().includes("gemini"))
                .forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log("❌ Failed to list models:", data.error?.message);
        }
    } catch (e) {
        console.error("❌ Debug script failed:", e);
    }
}

debugModels();

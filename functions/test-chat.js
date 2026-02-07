const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env' });

async function testChat() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("Testing with API Key:", apiKey ? "Present" : "Missing");

    if (!apiKey) {
        console.error("No API Key found");
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Explicitly use the model name we found in the list
        const modelName = "gemini-2.0-flash";
        console.log(`Getting model: ${modelName}`);

        const systemInstruction = `
            You are a helpful assistant.
            Reply concisely.
        `;

        const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemInstruction
        });

        console.log("Starting chat...");
        const chat = model.startChat({
            history: [],
            generationConfig: { maxOutputTokens: 100 },
        });

        console.log("Sending message...");
        const result = await chat.sendMessage("Hello, are you working?");
        const response = await result.response;
        console.log("Response received:");
        console.log(response.text());

    } catch (e) {
        console.error("Test Failed:");
        console.error(e);
    }
}

testChat();

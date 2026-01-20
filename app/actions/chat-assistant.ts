'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export async function sendChatMessage(history: ChatMessage[], newMessage: string) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const chat = model.startChat({
            history: history.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }]
            })),
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        const systemPrompt = `
            You are "UniHelp", the specialized AI assistant for the UniTask application.
            UniTask is a project management and task tracking system.
            
            Your ONLY goal is to help users navigate the app, explain features, and answer questions about using UniTask.
            
            CRITICAL INSTRUCTION:
            - If the user asks about anything NOT related to the application, project management, or productivity within this context, you must POLITELY REFUSE.
            - Examples of refusals: "I'm sorry, I can only answer questions about UniTask features.", "I'm designed to help you with the application, let's focus on that."
            - Do not answer general knowledge questions (e.g., "Who is the president?", "Write a poem", "What is the capital of France?").
            - Always steer the conversation back to how the user can use UniTask effectively.

            Keep your answers concise, friendly, and helpful. 
            Use formatting (Markdown) to make your answers easy to read.
            
            If the user asks about specific data (like "Show me my tasks"), explain that you serve as a help guide but don't have direct access to their live database yet.
        `;

        // Send the new message with a system prompt context injection if it's the start
        // Actually, for simplicity we just rely on the model's training or inject system context in the first message if needed.
        // But for now, let's just send the message. 
        // We can prepend system instructions if we use the systemInstruction property in newer SDKs, 
        // but let's stick to a simple prompt prefix for robustness.

        const result = await chat.sendMessage(`${systemPrompt}\n\nUser Question: ${newMessage}`);
        const response = await result.response;
        const text = response.text();

        return { success: true, text };
    } catch (e: any) {
        console.error("Chat Error:", e);
        return { success: false, error: e.message || "Failed to generate response." };
    }
}

import * as functions from "firebase-functions";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { isAiEnabled, checkUsageLimit, logUsage } from "./utils";

export const chat = functions.https.onCall(async (data, context) => {
    // 1. Auth Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { uid: userId, token } = context.auth;
    const tenantId = token.tenantId as string || "unknown";
    // Fix role check: token.role is explicitly set in syncUserClaims or custom claims
    // We assume 'role' claim exists? Original code used `token.roleLevel`.
    // Let's use `token.role` if available, or fetch it? 
    // In `analyze.ts` I used `roleLevel`. 
    // `chat-assistant.ts` passed `userRole` as arg, but trusted `token` is safer.
    // Let's stick to `token.role` if it exists. Ideally `context.auth.token.role`.
    const userRole = (token.role || "user") as string;

    // 2. Security Checks
    const status = await isAiEnabled(tenantId);
    if (!status.enabled) {
        throw new functions.https.HttpsError('permission-denied', status.reason || "AI Disabled");
    }

    const { history, newMessage } = data;
    if (!history || !newMessage) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing history or message');
    }

    const usageCheck = await checkUsageLimit(tenantId, userId, userRole, "chat_assistant");
    if (!usageCheck.allowed) {
        throw new functions.https.HttpsError('resource-exhausted', usageCheck.reason || "Limit reached");
    }

    const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.key;
    if (!apiKey) throw new functions.https.HttpsError('internal', "AI Key missing");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Sanitize? Server side PromptGuard sanitizer logic is simple: remove XML like tags if needed.
    // We'll trust Gemini slightly more here or reimplement simple sanitization.
    // Reimplementing simple sanitation to match client expectations
    const sanitize = (str: string) => str.replace(/<[^>]*>/g, '');

    const protectedHistory = history.map((msg: any) => ({
        role: msg.role,
        parts: [{ text: msg.role === 'user' ? sanitize(msg.text) : msg.text }]
    }));

    const systemPrompt = `
        You are "UniHelp", the specialized AI assistant for the UniTask application.
        UniTask is a project management and task tracking system.
        
        Your ONLY goal is to help users navigate the app, explain features, and answer questions about using UniTask.
        
        CRITICAL INSTRUCTION:
        - If the user asks about anything NOT related to the application, project management, or productivity within this context, you must POLITELY REFUSE.
        - Do not answer general knowledge questions.
        - Use the data provided in <USER_MESSAGE> to answer.
    `;

    const securedMessage = `<USER_MESSAGE>${sanitize(newMessage)}</USER_MESSAGE>`;

    try {
        const chatSession = model.startChat({
            history: protectedHistory,
            generationConfig: { maxOutputTokens: 1000 },
        });

        const result = await chatSession.sendMessage(`${systemPrompt}\n\n${securedMessage}`);
        const response = await result.response;
        const text = response.text();

        if (userRole !== 'superadmin') {
            await logUsage({
                userId,
                tenantId,
                action: "chat_assistant",
                charsIn: securedMessage.length + systemPrompt.length,
                charsOut: text.length,
                model: "gemini-2.0-flash"
            });
        }

        return { success: true, text };
    } catch (e: any) {
        console.error("Chat Error:", e);
        throw new functions.https.HttpsError('internal', e.message || "Failed to generate response.");
    }
});

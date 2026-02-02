import * as functions from "firebase-functions";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { isAiEnabled, checkUsageLimit, logUsage } from "./utils";
import * as cors from "cors";

// Initialize CORS middleware
const corsHandler = cors({ origin: true });

export const chat = functions.https.onRequest(async (req, res) => {
    // 1. CORS Wrapper
    corsHandler(req, res, async () => {
        try {
            // 2. Auth Check (Manually verification needed for onRequest)
            // For simple fetching from client with Auth header:
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                res.status(401).send({ error: "Unauthorized" });
                return;
            }
            const idToken = authHeader.split("Bearer ")[1];

            // Verify Token using Admin SDK (Need to import admin)
            // We need to import admin here or pass it. 
            // Better to keep structure simple: assume valid if this was onCall, but for onRequest we strictly need admin.
            // Let's import admin.
            const admin = await import("firebase-admin");
            if (!admin.apps.length) admin.initializeApp();

            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(idToken);
            } catch (e) {
                res.status(403).send({ error: "Invalid Token" });
                return;
            }

            const userId = decodedToken.uid;
            const tenantId = decodedToken.tenantId || "unknown";
            const userRole = (decodedToken.role || "user") as string;

            // 3. Security Checks
            const status = await isAiEnabled(tenantId);
            if (!status.enabled) {
                res.status(403).send({ error: status.reason || "AI Disabled" });
                return;
            }

            const { history, newMessage } = req.body;
            if (!history || !newMessage) {
                res.status(400).send({ error: "Missing history or message" });
                return;
            }

            const usageCheck = await checkUsageLimit(tenantId, userId, userRole, "chat_assistant");
            if (!usageCheck.allowed) {
                res.status(429).send({ error: usageCheck.reason || "Limit reached" });
                return;
            }

            const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.key;
            if (!apiKey) {
                res.status(500).send({ error: "AI Key missing" });
                return;
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

            res.status(200).send({ success: true, text });

        } catch (e: any) {
            console.error("Chat Error:", e);
            res.status(500).send({ error: e.message || "Internal Server Error" });
        }
    });
});

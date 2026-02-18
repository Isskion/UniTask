"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUnifluxFlow = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const generative_ai_1 = require("@google/generative-ai");
const utils_1 = require("./utils");
const uniflux_validator_1 = require("./uniflux_validator");
const cors = require("cors");
const corsHandler = cors({ origin: true });
/**
 * UNIFLUX AI COMPILER (Cloud Function)
 * Translates natural language into validated Uniflux DSL.
 */
exports.generateUnifluxFlow = functions.region("europe-west1").runWith({
    secrets: ["GEMINI_API_KEY"],
    timeoutSeconds: 120,
    memory: '1GB'
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        var _a, _b, _c;
        try {
            // 1. Auth Check (Manual for onRequest)
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                res.status(401).send({ error: "Unauthorized" });
                return;
            }
            const idToken = authHeader.split("Bearer ")[1];
            if (!admin.apps.length)
                admin.initializeApp();
            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(idToken);
            }
            catch (e) {
                res.status(403).send({ error: "Invalid Token" });
                return;
            }
            const userId = decodedToken.uid;
            const tenantId = decodedToken.tenantId || "unknown";
            const userRole = (decodedToken.roleLevel >= 80) || decodedToken.role === 'superadmin' ? 'superadmin' : 'user';
            const status = await (0, utils_1.isAiEnabled)(tenantId);
            if (!status.enabled) {
                res.status(403).send({ error: status.reason || "AI Disabled" });
                return;
            }
            const { prompt: userPrompt, currentGraph } = req.body;
            if (!userPrompt) {
                res.status(400).send({ error: 'No prompt provided' });
                return;
            }
            const apiKey = process.env.GEMINI_API_KEY || ((_a = functions.config().gemini) === null || _a === void 0 ? void 0 : _a.key);
            if (!apiKey) {
                res.status(500).send({ error: "AI Key missing" });
                return;
            }
            const db = (0, utils_1.getDb)();
            // 1. Fetch Tenant Knowledge (or Global)
            let tenantKnowledge = "";
            try {
                // Try tenant-specific knowledge first
                const tenantConfigSnap = await db.collection('tenants').doc(tenantId).collection('config').doc('ai_knowledge').get();
                if (tenantConfigSnap.exists) {
                    tenantKnowledge = ((_b = tenantConfigSnap.data()) === null || _b === void 0 ? void 0 : _b.content) || "";
                }
                else {
                    // Fallback to global knowledge
                    const globalKnowledgeSnap = await db.collection('app_config').doc('ai_knowledge').get();
                    tenantKnowledge = globalKnowledgeSnap.exists ? ((_c = globalKnowledgeSnap.data()) === null || _c === void 0 ? void 0 : _c.content) || "" : "";
                }
            }
            catch (e) {
                console.warn("Knowledge fetch failed", e);
            }
            // 2. Fetch Recent Corrections
            let corrections = "";
            try {
                const correctionsSnap = await db.collection('ai_corrections')
                    .where('tenantId', 'in', ['global', tenantId])
                    .orderBy('timestamp', 'desc')
                    .limit(20)
                    .get();
                corrections = correctionsSnap.docs.map(doc => {
                    const data = doc.data();
                    return `Instruction: When asked "${data.question}", remember: "${data.correction}"`;
                }).join('\n');
            }
            catch (e) {
                console.warn("Corrections fetch failed", e);
            }
            const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
                generationConfig: { responseMimeType: "application/json" }
            });
            const systemInstruction = `
        You are the UNIFLUX SEMANTIC COMPILER. 
        Your job is to translate logistics process descriptions into a valid JSON FlowGraph.

        ONTOLOGY:
        - NodeType: "START", "STATE", "OPERATION", "TASK", "DECISION", "TERMINAL"
        - FlowNode: { id: string, type: NodeType, label: string, position: {x, y} }
        - FlowEdge: { id: string, source: string, target: string, label?: string, condition?: string }
        - FlowGraph: { nodes: FlowNode[], edges: FlowEdge[] }

        RULES:
        1. E001: Exactly ONE START node.
        2. E002: At least ONE TERMINAL node.
        3. E004: START cannot have inputs. TERMINAL cannot have outputs.
        4. E006: All nodes must reach a TERMINAL.
        5. Position nodes logically: START at left (x:0, y:250), TERMINAL at right (x: 1000, y: 250).

        OUTPUT ONLY VALID JSON. No conversational text.

        BUSINESS KNOWLEDGE FOR THIS TENANT:
        ${tenantKnowledge}

        RECENT CORRECTIONS/LEARNINGS:
        ${corrections}
    `;
            let currentAiInput = userPrompt;
            if (currentGraph) {
                currentAiInput += `\n\nCURRENT GRAPH CONTEXT:\n${JSON.stringify(currentGraph)}`;
            }
            let attempts = 0;
            const maxAttempts = 3;
            let lastResult = { nodes: [], edges: [] };
            let validation = { isValid: false, errors: [] };
            while (attempts < maxAttempts) {
                attempts++;
                console.log(`AI Attempt ${attempts}/${maxAttempts}`);
                const result = await model.generateContent([
                    { text: systemInstruction },
                    { text: currentAiInput }
                ]);
                const responseText = result.response.text();
                try {
                    // Robust Extraction
                    const jsonStart = responseText.indexOf('{');
                    const jsonEnd = responseText.lastIndexOf('}');
                    if (jsonStart === -1)
                        throw new Error("No JSON object found");
                    const jsonStr = responseText.substring(jsonStart, jsonEnd + 1);
                    lastResult = JSON.parse(jsonStr);
                    // Validation Loop
                    validation = uniflux_validator_1.UnifluxValidator.validate(lastResult);
                    if (validation.isValid) {
                        console.log("AI Generation Validated Successfuly");
                        break;
                    }
                    else {
                        console.warn("AI output invalid, providing feedback...", validation.errors);
                        const errorMessages = validation.errors.map((e) => `[${e.code}] ${e.message}`).join(', ');
                        currentAiInput = `Your previous output failed validation. Please fix these errors: ${errorMessages}. Ensure the JSON structure is exactly correct.`;
                    }
                }
                catch (e) {
                    console.warn("AI returned invalid JSON, retrying...", e.message);
                    currentAiInput = `Your previous output was not valid JSON. Please try again. Error: ${e.message}`;
                }
            }
            if (userRole !== 'superadmin') {
                await (0, utils_1.logUsage)({
                    userId, tenantId, action: "uniflux_generate",
                    charsIn: userPrompt.length, charsOut: JSON.stringify(lastResult).length, model: "gemini-2.0-flash"
                });
            }
            res.status(200).send({
                success: validation.isValid,
                graph: lastResult,
                attempts,
                errors: validation.errors
            });
        }
        catch (e) {
            console.error("Uniflux AI Error:", e);
            res.status(500).send({ error: e.message || "Internal Server Error" });
        }
    });
});
//# sourceMappingURL=uniflux.js.map
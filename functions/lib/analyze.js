"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeNotes = exports.analyzePdf = exports.analyzeDocumentStructure = void 0;
const functions = require("firebase-functions");
const generative_ai_1 = require("@google/generative-ai");
const utils_1 = require("./utils");
// --- FUNCTION 1: Analyze Document Structure ---
exports.analyzeDocumentStructure = functions.https.onCall(async (data, context) => {
    var _a;
    // 1. Auth Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { uid: userId, token } = context.auth;
    const tenantId = token.tenantId || "unknown";
    const userRole = (token.roleLevel >= 80) || token.role === 'superadmin' ? 'superadmin' : 'user';
    // 2. Security Checks
    const status = await (0, utils_1.isAiEnabled)(tenantId);
    if (!status.enabled) {
        throw new functions.https.HttpsError('permission-denied', status.reason || "AI Disabled");
    }
    const fileData = data.fileBase64; // Expecting base64 string
    const fileType = data.fileType; // 'application/pdf' or 'application/vnd.openxmlformats...'
    if (!fileData) {
        throw new functions.https.HttpsError('invalid-argument', 'No file data provided');
    }
    let text = "";
    const buffer = Buffer.from(fileData, 'base64');
    const pdf = require('pdf-parse');
    const mammoth = require('mammoth');
    try {
        if (fileType === 'application/pdf') {
            const parsed = await pdf(buffer);
            text = parsed.text;
        }
        else {
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
        }
    }
    catch (e) {
        throw new functions.https.HttpsError('internal', "Failed to parse document: " + e.message);
    }
    const truncatedText = text.slice(0, 15000);
    const apiKey = process.env.GEMINI_API_KEY || ((_a = functions.config().gemini) === null || _a === void 0 ? void 0 : _a.key);
    if (!apiKey)
        throw new functions.https.HttpsError('internal', "AI Key missing");
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `
        Act as a Visual Document Expert.
        Analyze the following document content to extract BOTH its logical structure AND its estimated visual layout zones.
        
        ${truncatedText}

        1. Identify logical sections (Header, Body, Footer).
        2. ESTIMATE visual bounding boxes if possible.
        
        Return a valid JSON object with this EXACT structure:
        {
            "templateName": "Suggested Name",
            "description": "Brief description",
            "structure": {
                "header": [{ "type": "header", "label": "Title", "description": "..." }],
                "body": [],
                "footer": []
            },
            "visualZones": []
        }
        RETURN ONLY JSON.
    `;
    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonText);
        if (userRole !== 'superadmin') {
            await (0, utils_1.logUsage)({
                userId,
                tenantId,
                action: "analyze_document_structure",
                charsIn: prompt.length,
                charsOut: responseText.length,
                model: "gemini-2.0-flash"
            });
        }
        return Object.assign({ success: true }, parsed);
    }
    catch (e) {
        console.error("Gemini Error:", e);
        throw new functions.https.HttpsError('internal', "AI Analysis failed: " + e.message);
    }
});
// --- FUNCTION 2: Analyze PDF (Task Extraction) ---
exports.analyzePdf = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { uid: userId, token } = context.auth;
    const tenantId = token.tenantId || "unknown";
    const userRole = (token.roleLevel >= 80) || token.role === 'superadmin' ? 'superadmin' : 'user';
    const status = await (0, utils_1.isAiEnabled)(tenantId);
    if (!status.enabled)
        throw new functions.https.HttpsError('permission-denied', status.reason);
    const base64Data = data.base64Data;
    if (!base64Data)
        throw new functions.https.HttpsError('invalid-argument', 'No PDF data');
    const apiKey = process.env.GEMINI_API_KEY || ((_a = functions.config().gemini) === null || _a === void 0 ? void 0 : _a.key);
    if (!apiKey)
        throw new functions.https.HttpsError('internal', "AI Key missing");
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `
        Extract structured data from this PDF project document.
        Return JSON fields: title, full_content (markdown), description, endDate, priority, action_items.
        Detect language and output in that language.
    `;
    try {
        const result = await model.generateContent([
            prompt,
            { inlineData: { data: base64Data, mimeType: "application/pdf" } }
        ]);
        const responseText = result.response.text();
        const jsonStr = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsedData = JSON.parse(jsonStr);
        if (userRole !== 'superadmin') {
            await (0, utils_1.logUsage)({
                userId, tenantId, action: "analyze_pdf_api",
                charsIn: prompt.length, charsOut: responseText.length, model: "gemini-2.0-flash"
            });
        }
        return { success: true, data: parsedData };
    }
    catch (e) {
        throw new functions.https.HttpsError('internal', "AI Analysis failed: " + e.message);
    }
});
// --- FUNCTION 3: Summarize Notes (Weekly/Daily) ---
exports.summarizeNotes = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    const { uid: userId, token } = context.auth;
    const tenantId = token.tenantId || "unknown";
    const userRole = (token.roleLevel >= 80) || token.role === 'superadmin' ? 'superadmin' : 'user';
    const status = await (0, utils_1.isAiEnabled)(tenantId);
    if (!status.enabled)
        throw new functions.https.HttpsError('permission-denied', status.reason);
    const notes = data.notes;
    if (!notes)
        throw new functions.https.HttpsError('invalid-argument', 'No notes provided');
    const apiKey = process.env.GEMINI_API_KEY || ((_a = functions.config().gemini) === null || _a === void 0 ? void 0 : _a.key);
    if (!apiKey)
        throw new functions.https.HttpsError('internal', "AI Key missing");
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `
        Analyze the following Project Management notes and extract key insights.
        Input Notes:
        "${notes}"

        Return a JSON object with:
        - "resumenEjecutivo": A concise executive summary (max 3 sentences).
        - "tareasExtraidas": An array of actionable tasks detected.
        - "proximosPasos": An array of next steps or recommendations.
        
        Language: Detect language of input (Spanish/English) and match output language.
        RETURN ONLY JSON.
    `;
    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const jsonStr = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsedData = JSON.parse(jsonStr);
        if (userRole !== 'superadmin') {
            await (0, utils_1.logUsage)({
                userId, tenantId, action: "summarize_notes",
                charsIn: prompt.length, charsOut: responseText.length, model: "gemini-2.0-flash"
            });
        }
        return parsedData;
    }
    catch (e) {
        throw new functions.https.HttpsError('internal', "AI Summarization failed: " + e.message);
    }
});
//# sourceMappingURL=analyze.js.map
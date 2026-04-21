import * as functions from "firebase-functions";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { isAiEnabled, logUsage, withAiRetry } from "./utils";



// --- FUNCTION 1: Analyze Document Structure ---
export const analyzeDocumentStructure = functions.region("europe-west1").runWith({
    secrets: ["GEMINI_API_KEY"],
    timeoutSeconds: 300,
    memory: '2GB'
}).https.onCall(async (data, context) => {
    // 1. Auth Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { uid: userId, token } = context.auth;
    const tenantId = token.tenantId as string || "unknown";
    const userRole = (token.roleLevel as number >= 80) || token.role === 'superadmin' ? 'superadmin' : 'user';

    // 2. Security Checks
    const status = await isAiEnabled(tenantId);
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
        } else {
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
        }
    } catch (e: any) {
        throw new functions.https.HttpsError('internal', "Failed to parse document: " + e.message);
    }

    const truncatedText = text.slice(0, 15000);
    // Priority: 1. Runtime Env (Secrets) 2. Config (Legacy) 3. Local Env
    const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.key || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
        console.error("AI Key missing in all sources (Env, Config)");
        throw new functions.https.HttpsError('internal', "AI Key missing configuration");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

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
    `;

    try {
        // Wrap with retry logic for 429 errors
        const result = await withAiRetry(() => model.generateContent(prompt));
        const responseText = result.response.text();

        // Robust JSON Extraction
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) throw new Error("No valid JSON found in response");
        const jsonText = responseText.substring(jsonStart, jsonEnd + 1);

        const parsed = JSON.parse(jsonText);

        if (userRole !== 'superadmin') {
            await logUsage({
                userId,
                tenantId,
                action: "analyze_document_structure",
                charsIn: prompt.length,
                charsOut: responseText.length,
                model: "gemini-2.0-flash"
            });
        }

        return { success: true, ...parsed };

    } catch (e: any) {
        console.error("Gemini Error:", e);
        throw new functions.https.HttpsError('internal', "AI Analysis failed: " + e.message);
    }
});

// --- FUNCTION 2: Analyze PDF (Task Extraction) ---
export const analyzePdf = functions.region("europe-west1").runWith({
    secrets: ["GEMINI_API_KEY"],
    timeoutSeconds: 300,
    memory: '1GB'
}).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { uid: userId, token } = context.auth;
    const tenantId = token.tenantId as string || "unknown";
    const userRole = (token.roleLevel as number >= 80) || token.role === 'superadmin' ? 'superadmin' : 'user';

    const status = await isAiEnabled(tenantId);
    if (!status.enabled) throw new functions.https.HttpsError('permission-denied', status.reason!);

    const base64Data = data.base64Data;
    if (!base64Data) throw new functions.https.HttpsError('invalid-argument', 'No PDF data');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new functions.https.HttpsError('internal', "AI Key missing");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
        Extract structured data from this PDF project document.
        Return JSON fields: title, full_content (markdown), description, endDate, priority, action_items.
        Detect language and output in that language.
    `;

    try {
        // Wrap with retry logic for 429 errors
        const result = await withAiRetry(() => model.generateContent([
            prompt,
            { inlineData: { data: base64Data, mimeType: "application/pdf" } }
        ]));
        const responseText = result.response.text();

        // Robust JSON Extraction
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) throw new Error("No valid JSON found in response");
        const jsonStr = responseText.substring(jsonStart, jsonEnd + 1);

        const parsedData = JSON.parse(jsonStr);

        if (userRole !== 'superadmin') {
            await logUsage({
                userId, tenantId, action: "analyze_pdf_api",
                charsIn: prompt.length, charsOut: responseText.length, model: "gemini-2.0-flash"
            });
        }

        return { success: true, data: parsedData };

    } catch (e: any) {
        console.error("AI Analysis Error:", e);
        throw new functions.https.HttpsError('internal', "AI Analysis failed: " + e.message);
    }
});

// --- FUNCTION 3: Summarize Notes (Weekly/Daily) ---
export const summarizeNotes = functions.region("europe-west1").runWith({
    secrets: ["GEMINI_API_KEY"],
    timeoutSeconds: 120,
    memory: '1GB'
}).https.onCall(async (data, context) => {
    functions.logger.info("SummarizeNotes called", { auth: !!context.auth, data: !!data.notes });

    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');

    const { uid: userId, token } = context.auth;
    const tenantId = token.tenantId as string || "unknown";
    const userRole = (token.roleLevel as number >= 80) || token.role === 'superadmin' ? 'superadmin' : 'user';

    const status = await isAiEnabled(tenantId);
    if (!status.enabled) throw new functions.https.HttpsError('permission-denied', status.reason!);

    // [Fix] Truncate notes to prevent token/memory issues
    const rawNotes = data.notes || "";
    const notes = rawNotes.length > 12000 ? rawNotes.slice(0, 12000) + "... (truncated)" : rawNotes;
    
    const mode = data.mode || 'summarize'; // 'summarize' or 'layout_optimization'
    const zones = data.zones || [];

    if (!notes) throw new functions.https.HttpsError('invalid-argument', 'No notes provided');

    const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.key || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    functions.logger.info("AI Config Check", { hasKey: !!apiKey, method: process.env.GEMINI_API_KEY ? "secret" : (functions.config().gemini?.key ? "config" : "none") });

    if (!apiKey) {
        functions.logger.error("AI Key Verification Failed");
        throw new functions.https.HttpsError('internal', "AI Key missing");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    let prompt = "";
    if (mode === 'layout_optimization') {
        prompt = `
            Act as a Document Layout Specialist.
            Take the following notes and DISTRIBUTE them across the available document zones in a COHESIVE and PROFESSIONAL way.
            
            <RAW_NOTES_START>
            ${notes}
            <RAW_NOTES_END>
            
            Target Zones:
            ${JSON.stringify(zones)}
            
            Instructions:
            1. Keep related information TOGETHER. Do not fragment paragraphs unless necessary.
            2. Prioritize zones labeled "Párrafo", "Main Content", or "Body" for the bulk of the text.
            3. For a "Title" zone, provide a single concise headline.
            4. For a "Summary" or "Executive Summary" zone, provide a 1-2 sentence high-level overview.
            5. If there are multiple "Párrafo" zones, distribute the content chronologically or by topic.
            6. Ensure the tone is professional and the result looks like a well-formatted business document, NOT a fragmented list.
            7. Return a JSON object where keys are the zone labels and values are the content for that zone.
            
            Format: { "mapping": { "Zone Label": "Content", ... } }
        `;
    } else if (mode === 'reformat') {
        prompt = `
            Act as a Senior Professional Editor.
            Task: Transform the provided raw notes into a HIGHLY structured, polished, and professional markdown report.
            
            <RAW_NOTES_START>
            ${notes}
            <RAW_NOTES_END>
            
            Strict Instructions:
            1. DEEP RESTRUCTURING: Do not just beautify. Reorganize the content logically. Use clear H2 and H3 headers (##, ###).
            2. MARKDOWN EXCELLENCE: Use bold text for key terms, bullet points for lists, and horizontal rules (---) between major sections.
            3. DO NOT TRANSLATE: The output MUST be in the same language as the input notes (usually Spanish or English).
            4. PRESERVE ALL DATA: Keep all dates, IDs, technical names, and numbers exactly as they are. Highlight them if appropriate.
            5. TONE: Objective, formal, and concise.
            6. FORMAT: Return a JSON object with a single field "reformattedText" containing the markdown.
            
            Example Output Format:
            { "reformattedText": "## Report Title\\n### Section\\n- **Key Point**: Detail..." }
        `;
    }
    else {
        prompt = `
            Analyze the following Project Management notes and extract key insights.
            
            <RAW_NOTES_START>
            ${notes}
            <RAW_NOTES_END>

            Return a JSON object with:
            - "resumenEjecutivo": A concise executive summary (max 3 sentences).
            - "tareasExtraidas": An array of actionable tasks detected.
            - "proximosPasos": An array of next steps or recommendations.
            
            Language: Detect language of input (Spanish/English) and match output language.
        `;
    }

    try {
        // Wrap with retry logic for 429 errors
        const result = await withAiRetry(() => model.generateContent(prompt));
        const responseText = result.response.text();

        // [Robust Refinement] Handle markdown backticks and extra text
        const cleanJson = (text: string) => {
            if (!text) return null;
            // Remove markdown code blocks if present
            let cleaned = text.replace(/```json\s?|```/g, "").trim();
            const start = cleaned.indexOf('{');
            const end = cleaned.lastIndexOf('}');
            if (start === -1 || end === -1) return null;
            return cleaned.substring(start, end + 1);
        };

        const jsonStr = cleanJson(responseText);
        if (!jsonStr) {
            functions.logger.error("AI Response non-JSON", { 
                snippet: responseText.slice(0, 500),
                fullLength: responseText.length,
                mode 
            });
            throw new Error("No valid JSON found in response. Response might be empty or safety-filtered.");
        }

        const parsedData = JSON.parse(jsonStr);

        if (userRole !== 'superadmin') {
            await logUsage({
                userId, tenantId, action: "summarize_notes",
                charsIn: prompt.length, charsOut: responseText.length, model: "gemini-2.0-flash"
            });
        }

        return parsedData;
    } catch (e: any) {
        functions.logger.error("SummarizeNotes Error", { error: e.message, stack: e.stack, mode });
        throw new functions.https.HttpsError('internal', "AI Summarization failed: " + e.message);
    }
});

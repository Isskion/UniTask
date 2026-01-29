'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";
import { PromptGuard } from "@/lib/security/PromptGuard";

// Polyfill for PDF.js in Node environment
if (typeof Promise.withResolvers === 'undefined') {
    if (typeof Promise.withResolvers === 'undefined') {
        // @ts-ignore
        Promise.withResolvers = function () {
            let resolve, reject;
            const promise = new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            });
            return { promise, resolve, reject };
        };
    }
}
// Hack to fix 'DOMMatrix is not defined' in strict mode inside pdf.js
// @ts-ignore
global.DOMMatrix = global.DOMMatrix || class {
    constructor() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; }
};
// @ts-ignore
global.Canvas = global.Canvas || class { };

const pdf = require('pdf-parse/lib/pdf-parse.js');
const mammoth = require('mammoth');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export interface WidgetSuggestion {
    type: 'header' | 'paragraph' | 'task_list' | 'chart' | 'kpis';
    label: string; // "Project Status", "Budget Analysis"
    description: string; // Explanation of what this widget covers
}

export interface BoundingBox {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
    label: string;
}

export interface AnalysisResult {
    success: boolean;
    templateName?: string;
    description?: string;
    structure?: {
        header: WidgetSuggestion[];
        body: WidgetSuggestion[];
        footer: WidgetSuggestion[];
    };
    visualZones?: BoundingBox[]; // Start with a flat list of detected zones
    error?: string;
}

export async function analyzeDocumentStructure(formData: FormData): Promise<AnalysisResult> {
    try {
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string || "system";
        const tenantId = formData.get('tenantId') as string || "1";

        if (!file) return { success: false, error: 'No file provided' };

        const userRole = formData.get('userRole') as string || "user";

        // 1. Security Check: Is AI Enabled?
        const status = await PromptGuard.isAiEnabled(tenantId);
        if (!status.enabled) {
            return { success: false, error: status.reason || "AI is disabled." };
        }

        // 1.1 Usage Limit Check (SaaS Quality Guard)
        const limitStatus = await PromptGuard.checkUsageLimit(tenantId, userId, userRole, "analyze_document_structure");
        if (!limitStatus.allowed) {
            return { success: false, error: limitStatus.reason };
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        let text = '';

        // Extract Text
        if (file.type === 'application/pdf') {
            try {
                const data = await pdf(buffer);
                text = data.text;
            } catch (err: any) {
                console.error("PDF Parsing failed:", err);
                throw new Error("Failed to parse PDF content: " + err.message);
            }
        } else if (file.type.includes('wordprocessingml') || file.name.endsWith('.docx')) {
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
        } else {
            return { success: false, error: 'Unlimited file type. Only PDF and DOCX supported.' };
        }

        // Limit text to avoid token limits (approx 15k chars is usually safe for summary)
        const truncatedText = text.slice(0, 15000);
        const securedContent = PromptGuard.wrap(truncatedText, "DOCUMENT_CONTENT");

        // Analyze with Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `
            Act as a Visual Document Expert.
            Analyze the following document content to extract BOTH its logical structure AND its estimated visual layout zones.
            
            ${securedContent}

            1. Identify logical sections (Header, Body, Footer) found within <DOCUMENT_CONTENT>.
            2. ESTIMATE the visual bounding boxes for key elements if possible based on text chunks, OR just return logical structure if coordinates are impossible from text-only.
            
            Return a valid JSON object with this EXACT structure:
            {
                "templateName": "Suggested Name based on content",
                "description": "Brief description of this report type",
                "structure": {
                    "header": [
                         { "type": "header", "label": "Document Title", "description": "Global Project Report" },
                         ...
                    ],
                    "body": [
                         ...
                    ],
                    "footer": [
                         ...
                    ]
                },
                "visualZones": [
                    { "label": "Title", "ymin": 0, "xmin": 0, "ymax": 100, "xmax": 1000 }
                ]
            }
            RETURN ONLY JSON.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();
        const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // 2. Log Usage (Secure Logging)
        // [RULE] Exclude superadmins from logs to keep billing and metrics pure
        if (userRole !== 'superadmin') {
            await PromptGuard.logUsage({
                userId,
                tenantId,
                action: "analyze_document_structure",
                charsIn: prompt.length,
                charsOut: responseText.length,
                model: "gemini-2.0-flash"
            });
        }

        const parsed = JSON.parse(jsonText);

        return {
            success: true,
            templateName: parsed.templateName,
            description: parsed.description,
            structure: parsed.structure,
            visualZones: parsed.visualZones || []
        };

    } catch (e: any) {
        console.error("Analysis Error:", e);
        return { success: false, error: e.message };
    }
}

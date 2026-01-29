import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PromptGuard } from "@/lib/security/PromptGuard";
import { adminAuth } from "@/lib/firebase-admin";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
    console.log("[AnalyzePDF] Request received");

    // 1. SECURITY: Verify Main Auth Token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized: Missing Token" }, { status: 401 });
    }

    // Verify token using Admin SDK
    let userId = "system";
    let userRole = "user";
    try {
        const idToken = authHeader.split("Bearer ")[1];
        const decoded = await adminAuth.verifyIdToken(idToken);
        userId = decoded.uid;
        userRole = decoded.role || "user"; // Assuming role is in custom claims
    } catch (e) {
        console.error("[AnalyzePDF] Auth Failed:", e);
        return NextResponse.json({ error: "Unauthorized: Invalid Token" }, { status: 401 });
    }

    console.log(`[AnalyzePDF] User: ${userId} (${userRole})`);

    try {
        const body = await req.json();
        const tenantId = body.tenantId || "1";

        // 2. Security Check: Is AI Enabled?
        const status = await PromptGuard.isAiEnabled(tenantId);
        if (!status.enabled) {
            return NextResponse.json({
                error: "AI Access Denied",
                details: status.reason || "AI functions are disabled for this organization or globally."
            }, { status: 403 });
        }

        // 2.1 Usage Limit Check (SaaS Quality Guard)
        const limitStatus = await PromptGuard.checkUsageLimit(tenantId, userId, userRole, "analyze_pdf_api");
        if (!limitStatus.allowed) {
            return NextResponse.json({
                error: "Limit Exceeded",
                details: limitStatus.reason
            }, { status: 403 });
        }

        let base64Data = body.base64Data;

        // Legacy fetch
        if (!base64Data && body.pdfUrl) {
            console.log(`[AnalyzePDF] Fetching from URL: ${body.pdfUrl}`);
            const response = await fetch(body.pdfUrl);
            if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
            const arrayBuffer = await response.arrayBuffer();
            base64Data = Buffer.from(arrayBuffer).toString("base64");
        }

        if (!base64Data) {
            return NextResponse.json({ error: "No PDF data provided (url or base64)" }, { status: 400 });
        }

        // ... (Gemini Init and Prompt)
        const genAI = new GoogleGenerativeAI(apiKey!);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const basePrompt = `
            You are an AI assistant that extracts structured data from project documents and meeting minutes.
            Please analyze the attached PDF and extract the following information in JSON format.
            
            IMPORTANT: Detect the language of the document. The output fields (title, description, action_items) MUST be in the SAME LANGUAGE as the document content.
            
            - title: A concise title for the task (In document's language).
            - full_content: The COMPLETE, VERBATIM text content, formatted in clean markdown.
            - description: A summary of the key points (In document's language).
            - endDate: ISO YYYY-MM-DD format or null.
            - priority: low, medium, or high.
            - action_items: Array of strings (In document's language).
            
            Return ONLY JSON.
        `;

        const securedPrompt = PromptGuard.wrap(basePrompt, "EXTRACTION_RULES") +
            "\n\nAnalyza el archivo adjunto siguiendo estrictamente las <EXTRACTION_RULES>.";

        const result = await model.generateContent([
            securedPrompt,
            { inlineData: { data: base64Data, mimeType: "application/pdf" } },
        ]);

        const text = result.response.text();

        // 3. Log Usage (Secure Logging)
        // [RULE] Exclude superadmins from logs to keep billing and metrics pure
        if (userRole !== 'superadmin') {
            await PromptGuard.logUsage({
                userId,
                tenantId,
                action: "analyze_pdf_api",
                charsIn: securedPrompt.length + base64Data.length,
                charsOut: text.length,
                model: "gemini-2.0-flash"
            });
        }

        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const data = JSON.parse(jsonStr);

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error("[AnalyzePDF] API Error:", error);
        return NextResponse.json({ error: error.message || "Failed to analyze PDF" }, { status: 500 });
    }
}

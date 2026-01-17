import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
    console.log("[AnalyzePDF] Request received");
    console.log(`[AnalyzePDF] Using API Key: ${apiKey ? apiKey.substring(0, 8) + '...' : 'UNDEFINED'}`);
    console.log(`[AnalyzePDF] Model: gemini-1.5-flash`);

    if (!apiKey) {
        console.error("[AnalyzePDF] CRITICAL: No API Key found in environment variables.");
        return NextResponse.json({ error: "Server Configuration Error: Missing API Key. Check log." }, { status: 500 });
    }

    try {
        const contentLength = req.headers.get("content-length");
        console.log(`[AnalyzePDF] Payload Info - Content-Length: ${contentLength}`);

        let body;
        try {
            body = await req.json();
        } catch (e: any) {
            console.error("[AnalyzePDF] JSON Parsing Failed:", e);
            return NextResponse.json({ error: "Invalid Request Body (Size limit?)", details: e.message }, { status: 400 });
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

        console.log(`[AnalyzePDF] Base64 Data Length: ${base64Data.length}`);

        // 3. Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        // Updated to 2.0 Flash as 1.5 is no longer available in this environment (2026)
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // 4. Prompt
        const prompt = `
            You are an AI assistant that extracts structured data from project documents and meeting minutes.
            Please analyze the attached PDF and extract the following information in JSON format.
            
            IMPORTANT: Detect the language of the document. The output fields (title, description, action_items) MUST be in the SAME LANGUAGE as the document content. If the document is in Spanish, the output must be in Spanish.

            - title: A concise title for the task or meeting note (In document's language).
            - full_content: The COMPLETE, VERBATIM text content of the document, formatted in clean markdown (headers, lists, bold). Do not summarize this part.
            - description: A summary of the key points, decisions, or context (In document's language).
            - endDate: If there is a deadline or next meeting date mentioned, extract it in ISO YYYY-MM-DD format. If not, return null.
            - priority: Estimate priority (low, medium, high) based on the tone or explicit mentions.
            - action_items: An array of strings, each representing a specific action item mentioned (In document's language).

            Return ONLY the JSON object, no markdown formatting.
        `;

        // 5. Generate
        console.log("[AnalyzePDF] Sending to Gemini...");
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: "application/pdf",
                },
            },
        ]);

        const text = result.response.text();
        console.log("[AnalyzePDF] Gemini Response received.");

        // Clean markdown code blocks if present
        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const data = JSON.parse(jsonStr);

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error("[AnalyzePDF] API Error:", error);
        return NextResponse.json({ error: error.message || "Failed to analyze PDF" }, { status: 500 });
    }
}

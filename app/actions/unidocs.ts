import { auth } from "@/lib/firebase";

// CONSTANTS
const PROJECT_ID = "minuta-f75a4";
const REGION = "europe-west1";

export interface WidgetSuggestion {
    type: 'header' | 'paragraph' | 'task_list' | 'chart' | 'kpis';
    label: string;
    description: string;
}

export interface BoundingBox {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
    label: string;
    sourceType?: 'dynamic' | 'static'; // ← NEW: Choose between dynamic data or static capture
    staticValue?: string;              // ← NEW: Content if sourceType is 'static'
}

export interface UniDocsAnalysisResult {
    success: boolean;
    templateName?: string;
    description?: string;
    structure?: {
        header: WidgetSuggestion[];
        body: WidgetSuggestion[];
        footer: WidgetSuggestion[];
    };
    visualZones?: BoundingBox[];
    error?: string;
}

// Helper for REST calls to Firebase Functions
async function callFunction(name: string, data: any) {
    const url = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${name}`;
    console.log(`📡 Calling Cloud Function (REST): ${url}`);

    let token = "";
    if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data }) // Firebase onCall expects "data" wrapper
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Function ${name} Failed: ${response.status}`, errorText);
        throw new Error(`Cloud Function Error (${response.status}): ${errorText}`);
    }

    const json = await response.json();

    // onCall returns { result: ... } or { error: ... }
    if (json.error) {
        throw new Error(json.error.message || "Unknown Function Error");
    }

    return { data: json.result };
}

export async function analyzeDocumentStructure(formData: FormData): Promise<UniDocsAnalysisResult> {
    try {
        const file = formData.get('file') as File;
        if (!file) return { success: false, error: 'No file provided' };

        // Convert File to Base64 (using FileReader for client-side compatibility if needed, 
        // but this seems to be intended for a context where Buffer is available or polyfilled)
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString('base64');

        const result = await callFunction('analyzeDocumentStructure', {
            fileBase64: base64Data,
            fileType: file.type
        });

        const data = result.data as any;

        if (!data.success && !data.templateName) {
            return { success: false, error: "Cloud Function Error (No Data)" };
        }

        return {
            success: true,
            templateName: data.templateName,
            description: data.description,
            structure: data.structure,
            visualZones: data.visualZones || []
        };

    } catch (e: any) {
        console.error("Analysis Error:", e);
        return {
            success: false,
            templateName: undefined,
            description: undefined,
            structure: undefined,
            visualZones: undefined,
            error: e.message || "Failed to analyze document"
        };
    }
}


export interface AISummaryResult {
    resumenEjecutivo: string;
    tareasExtraidas: string[];
    proximosPasos: string[];
    error?: string;
}

export async function summarizeNotesWithAI(notes: string): Promise<AISummaryResult> {
    try {
        const result = await callFunction('summarizeNotes', { notes });
        return result.data as AISummaryResult;
    } catch (e: any) {
        console.error("Summarize Error:", e);
        return {
            resumenEjecutivo: "",
            tareasExtraidas: [],
            proximosPasos: [],
            error: e.message || "Failed to summarize"
        };
    }
}

export async function optimizeDocumentContent(notes: string, zones: BoundingBox[]): Promise<{ mapping: Record<string, string>, error?: string }> {
    try {
        const result = await callFunction('summarizeNotes', {
            notes,
            mode: 'layout_optimization',
            zones: zones.map(z => ({ label: z.label }))
        });
        return { mapping: result.data.mapping || {} };
    } catch (e: any) {
        console.error("Optimization Error:", e);
        return { mapping: {}, error: e.message || "Failed to optimize layout" };
    }
}

export async function reformatNotesWithAI(notes: string): Promise<{ reformattedText: string, error?: string }> {
    try {
        const result = await callFunction('summarizeNotes', {
            notes,
            mode: 'reformat'
        });
        return { reformattedText: result.data.reformattedText || notes };
    } catch (e: any) {
        console.error("Reformat Error:", e);
        return { reformattedText: notes, error: e.message || "Failed to reformat notes" };
    }
}

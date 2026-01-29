import { functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";

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
    visualZones?: BoundingBox[];
    error?: string;
}

export async function analyzeDocumentStructure(formData: FormData): Promise<AnalysisResult> {
    try {
        const file = formData.get('file') as File;
        if (!file) return { success: false, error: 'No file provided' };

        // Convert File to Base64
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString('base64');

        const analyzeFn = httpsCallable(functions, 'analyzeDocumentStructure');

        const result = await analyzeFn({
            fileBase64: base64Data,
            fileType: file.type
        });

        const data = result.data as any; // Cloud Function returns data in .data

        if (!data.success && !data.templateName) {
            // Handle raw error if not structured
            return { success: false, error: "Cloud Function Error" };
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
        const summarizeFn = httpsCallable(functions, 'summarizeNotes');
        const result = await summarizeFn({ notes });
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



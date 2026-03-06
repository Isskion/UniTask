import { auth } from "@/lib/firebase";

// CONSTANTS
const PROJECT_ID = "minuta-f75a4";
const REGION = "europe-west1";

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

    if (json.error) {
        throw new Error(json.error.message || "Unknown Function Error");
    }

    return { data: json.result };
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

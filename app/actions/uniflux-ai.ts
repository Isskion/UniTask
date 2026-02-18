import { auth } from "@/lib/firebase";
import { FlowGraph } from "@/app/uniflux/core/types";

const PROJECT_ID = "minuta-f75a4";
const REGION = "europe-west1";

async function callFunction(name: string, data: any) {
    const url = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${name}`;

    if (!auth.currentUser) {
        throw new Error("No estás autenticado. Por favor inicia sesión.");
    }

    const token = await auth.currentUser.getIdToken();

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: data.prompt, currentGraph: data.currentGraph })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloud Function Error (${response.status}): ${errorText}`);
    }

    const json = await response.json();
    if (json.error) throw new Error(json.error);
    return json;
}

/**
 * Calls the AI Compiler to generate or modify a flow.
 */
export async function generateFlowWithAI(prompt: string, currentGraph?: FlowGraph) {
    try {
        const result = await callFunction('generateUnifluxFlow', { prompt, currentGraph });
        return { success: true, graph: result.graph as FlowGraph };
    } catch (e: any) {
        console.error("AI Generation Error:", e);
        return { success: false, error: e.message };
    }
}

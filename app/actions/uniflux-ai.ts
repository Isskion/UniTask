import { auth } from "@/lib/firebase";
import { FlowGraph } from "@/app/uniflux/core/types";

const PROJECT_ID = "minuta-f75a4";
const REGION = "europe-west1";
const TIMEOUT_MS = 30_000; // 30 s — Cloud Functions cold-start can be slow
const MAX_RETRIES = 1;     // 1 automatic retry on timeout or 5xx

async function callFunction(name: string, data: any): Promise<any> {
    const url = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${name}`;

    if (!auth.currentUser) {
        throw new Error("No estás autenticado. Por favor inicia sesión.");
    }

    const token = await auth.currentUser.getIdToken();

    async function attempt(retriesLeft: number): Promise<any> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ prompt: data.prompt, currentGraph: data.currentGraph }),
                signal: controller.signal,
            });
            clearTimeout(timer);

            if (!response.ok) {
                const errorText = await response.text().catch(() => `HTTP ${response.status}`);
                // Retry on server errors (5xx) if we still have attempts left
                if (response.status >= 500 && retriesLeft > 0) {
                    console.warn(`[Uniflux AI] ${response.status} — retrying (${retriesLeft} left)`);
                    return attempt(retriesLeft - 1);
                }
                throw new Error(`Error ${response.status}: ${errorText.substring(0, 200)}`);
            }

            const json = await response.json();
            if (json.error) throw new Error(json.error);
            return json;

        } catch (e: any) {
            clearTimeout(timer);

            if (e.name === 'AbortError') {
                if (retriesLeft > 0) {
                    console.warn(`[Uniflux AI] Timeout — retrying (${retriesLeft} left)`);
                    return attempt(retriesLeft - 1);
                }
                throw new Error('La IA tardó demasiado en responder (>30s). Inténtalo de nuevo.');
            }
            throw e;
        }
    }

    return attempt(MAX_RETRIES);
}

/**
 * Calls the AI Compiler to generate or modify a flow.
 */
export async function generateFlowWithAI(prompt: string, currentGraph?: FlowGraph) {
    try {
        const result = await callFunction('generateUnifluxFlow', { prompt, currentGraph });
        return { success: true, graph: result.graph as FlowGraph };
    } catch (e: any) {
        console.error("[Uniflux AI] Generation error:", e);
        return { success: false, error: e.message };
    }
}

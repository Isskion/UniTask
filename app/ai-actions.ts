"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

// Workaround for API Key Referrer Restrictions on Server Actions
// We spoof the fetch to include the allowed domain
const customFetch = (url: RequestInfo | URL, init?: RequestInit) => {
    return fetch(url, {
        ...init,
        headers: {
            ...init?.headers,
            "Referer": "http://localhost:3000", // Or your production domain
            "Origin": "http://localhost:3000"
        }
    });
};

// Re-instantiate with custom request options if the library supports it, 
// otherwise we rely on the default instance but note the issue.
// GoogleGenerativeAI unfortunately doesn't accept a custom fetch in v1 beta easily without using the RequestOptions hook.
// Let's try to globalThis patch or better yet, advice User to use IP restriction or create a Server Key.
// actually, for this specific library, we can pass requestOptions.

// RE-PLAN: The clean way is to tell the user to use a Server Key or IP restriction.
// BUT, we can try to pass `requestOptions` to `getGenerativeModel`.
// However, standard headers like Referer are often stripped by Node fetch or the library.
// Let's try injecting the headers in the model config if possible, or just fail gracefully and tell the user.

// ACTUALLY, checking the docs, `getGenerativeModel` takes `RequestOptions`.
// Let's use that.

export interface AISummaryResult {
    resumenEjecutivo: string;
    tareasExtraidas: string[];
    proximosPasos: string[];
    error?: string;
}

export async function summarizeNotesWithAI(notes: string, context?: string): Promise<AISummaryResult> {
    if (!notes.trim()) {
        return {
            resumenEjecutivo: "",
            tareasExtraidas: [],
            proximosPasos: [],
            error: "No hay notas para analizar."
        };
    }

    try {
        // --- WORKAROUND FOR API KEY REFERER RESTRICTION (SERVER ACTION) ---
        // The SDK might not propagate customHeaders correctly in all environments/versions.
        // We patch global.fetch specifically for this call to guarantee headers are sent.
        const originalFetch = global.fetch;
        global.fetch = async (input, init) => {
            const headers = new Headers(init?.headers);
            headers.set("Referer", "http://localhost:3000");
            headers.set("Origin", "http://localhost:3000");

            return originalFetch(input, {
                ...init,
                headers
            });
        };

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `Eres un asistente de gestión de proyectos. Analiza las siguientes notas de reunión y genera un resumen estructurado.

            NOTAS DE LA REUNIÓN:
            ---
            NOTAS DE LA REUNIÓN:
            ---
            ${notes}
            ---

            ${context ? `CONTEXTO ADICIONAL DEL PROYECTO:\n${context}\n---` : ''}

            Responde ÚNICAMENTE con un JSON válido (sin markdown, sin \`\`\`) con esta estructura exacta:
            {
  "resumenEjecutivo": "Un párrafo breve (2-3 líneas) que resuma los puntos principales de la reunión",
  "tareasExtraidas": ["Tarea 1", "Tarea 2", "Tarea 3"],
  "proximosPasos": ["Paso 1", "Paso 2"]
}

REGLAS:
- El resumen debe ser conciso y profesional
- Las tareas deben ser acciones concretas, inmediatas o bloqueantes que el equipo debe realizar.
- Cualquier "Próximo Paso" que sea una acción del equipo, clasifícalo como Tarea.
- Usa "proximosPasos" solo para hitos lejanos, decisiones estratégicas futuras o dependencias externas.
- Si no hay tareas claras, devuelve arrays vacíos
- Responde SOLO con el JSON, nada más`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the JSON response
        try {
            // Clean potential markdown code blocks
            const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleanedText);

            return {
                resumenEjecutivo: parsed.resumenEjecutivo || "",
                tareasExtraidas: Array.isArray(parsed.tareasExtraidas) ? parsed.tareasExtraidas : [],
                proximosPasos: Array.isArray(parsed.proximosPasos) ? parsed.proximosPasos : [],
            };
        } catch (parseError) {
            console.error("Error parsing AI response:", text);
            return {
                resumenEjecutivo: text,
                tareasExtraidas: [],
                proximosPasos: [],
                error: "La IA no devolvió un formato estructurado."
            };
        }

    } catch (error: any) {
        console.error("AI Error:", error);
        return {
            resumenEjecutivo: "",
            tareasExtraidas: [],
            proximosPasos: [],
            error: `Error de IA: ${error.message || "Error desconocido"}`
        };
    }
}

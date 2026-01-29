import { GoogleGenerativeAI } from "@google/generative-ai";
import { PromptGuard } from "@/lib/security/PromptGuard";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export interface AISummaryResult {
    resumenEjecutivo: string;
    tareasExtraidas: string[];
    proximosPasos: string[];
    error?: string;
}

export async function summarizeNotesWithAI(notes: string, userId: string, tenantId: string, userRole?: string, context?: string): Promise<AISummaryResult> {
    if (!notes.trim()) {
        return {
            resumenEjecutivo: "",
            tareasExtraidas: [],
            proximosPasos: [],
            error: "No hay notas para analizar."
        };
    }

    try {
        // 1. Security Check: Is AI Enabled?
        const status = await PromptGuard.isAiEnabled(tenantId);
        if (!status.enabled) {
            return {
                resumenEjecutivo: "",
                tareasExtraidas: [],
                proximosPasos: [],
                error: status.reason || "AI is disabled."
            };
        }

        // 1.1 Usage Limit Check (SaaS Quality Guard)
        const limitStatus = await PromptGuard.checkUsageLimit(tenantId, userId, userRole, "summarize_notes");
        if (!limitStatus.allowed) {
            return {
                resumenEjecutivo: "",
                tareasExtraidas: [],
                proximosPasos: [],
                error: limitStatus.reason
            };
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Secure the input using PromptGuard
        const securedNotes = PromptGuard.wrap(PromptGuard.truncate(notes, 5000), "MEETING_NOTES");
        const securedContext = context ? PromptGuard.wrap(PromptGuard.truncate(context, 2000), "PROJECT_CONTEXT") : "";

        const prompt = `Eres un asistente de gestión de proyectos experto en análisis de minutas. 
             Tu objetivo es organizar la información del bloque <MEETING_NOTES> de forma estructurada.
             
             ${securedNotes}
             
             ${securedContext}

             INSTRUCCIONES DE SALIDA:
             Responde ÚNICAMENTE con un JSON válido (sin markdown, sin \`\`\`) con esta estructura exacta:
             {
  "resumenEjecutivo": "Un párrafo breve (2-3 líneas) que resuma los puntos principales de la reunión",
  "tareasExtraidas": ["Tarea 1", "Tarea 2", "Tarea 3"],
  "proximosPasos": ["Paso 1", "Paso 2"]
}

REGLAS:
- El resumen debe ser conciso y profesional.
- Las tareas deben ser acciones concretas extraídas del texto.
- Si no hay tareas claras, devuelve arrays vacíos.
- Responde SOLO con el JSON, nada más.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 2. Log Usage (Secure Logging)
        // [RULE] Exclude superadmins from logs to keep billing and metrics pure
        if (userRole !== 'superadmin') {
            await PromptGuard.logUsage({
                userId,
                tenantId,
                action: "summarize_notes",
                charsIn: prompt.length,
                charsOut: text.length,
                model: "gemini-2.0-flash"
            });
        }

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

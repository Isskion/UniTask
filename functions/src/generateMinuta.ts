import * as functions from "firebase-functions";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { isAiEnabled, logUsage, withAiRetry } from "./utils";

const MODEL_ID = "gemini-2.0-flash";
const MAX_TOTAL_CHARS = 15000;

const SYSTEM_PROMPT = `Actúa como un Arquitecto de Integración y Business Analyst senior. 
Tu objetivo es consolidar múltiples notas dispersas de reuniones en un Documento de Requerimientos Técnicos estructurado (BRD/TRD), listo para ser entregado a un cliente.

═══════════════════════════════════════════
REGLAS CRÍTICAS — APLICA SIN EXCEPCIÓN
═══════════════════════════════════════════
1. PRIORIDAD TEMPORAL: Las notas más recientes sobre un mismo tema invalidan las anteriores. Indica explícitamente cuándo esto ocurre.
2. DETECCIÓN DE CONFLICTOS: Si hay contradicciones, regístralas en la sección "Conflictos por Resolver" con severidad.
3. INFERENCIA DE ATRIBUTOS: Infiere tipo de dato, validaciones y riesgos para campos mencionados.
4. PROHIBIDO RELLENAR CON SUPOSICIONES: Si falta información, usa "NO DEFINIDO". Nunca inventes datos.
5. TONO: Formal, técnico, orientado a acción. Sin relleno.

═══════════════════════════════════════════
ESTRUCTURA DE SALIDA OBLIGATORIA (HTML)
═══════════════════════════════════════════
Devuelve ÚNICAMENTE HTML limpio. Estructura interna: 1. Resumen Ejecutivo, 2. Decisiones Confirmadas, 3. Requerimientos Técnicos (Tabla), 4. Modelo de Datos (Tabla), 5. Acciones Pendientes (Tabla), 6. Conflictos, 7. Riesgos.`;

function cleanContent(html: string): string {
    if (!html) return "";
    return html
        .replace(/<h[1-6][^>]*>/gi, '\n## ')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<li[^>]*>/gi, '\n- ')
        .replace(/<\/li>/gi, '')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '') 
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export const generateMinuta = functions.region("europe-west1").runWith({
    secrets: ["GEMINI_API_KEY"],
    timeoutSeconds: 300,
    memory: '1GB'
}).https.onCall(async (data, context) => {
    // 1. Auth Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { uid: userId, token } = context.auth;
    const tenantId = token.tenantId as string || "unknown";
    const userRole = (token.roleLevel as number >= 80) || token.role === 'superadmin' ? 'superadmin' : 'user';

    // 2. Security Check
    const status = await isAiEnabled(tenantId);
    if (!status.enabled) throw new functions.https.HttpsError('permission-denied', status.reason!);

    const { notes, projectName } = data;
    if (!notes || !Array.isArray(notes)) {
        throw new functions.https.HttpsError('invalid-argument', 'No notes provided');
    }

    // 3. Prompt Building
    let totalChars = 0;
    const formattedNotes = notes.map((note: any, i: number) => {
        const meta = [
            `NOTA ${i + 1}`,
            note.title ? `Título: ${note.title}` : null,
            note.date ? `Fecha: ${note.date}` : null,
            note.author ? `Autor: ${note.author}` : null,
        ].filter(Boolean).join(' | ');

        let content = cleanContent(note.content);
        if (content.length > 8000) content = content.substring(0, 8000) + "\n... [Truncado]";

        totalChars += content.length;
        return `--- ${meta} ---\n${content}`;
    }).join('\n\n');

    let finalNotes = formattedNotes;
    if (totalChars > MAX_TOTAL_CHARS) {
        finalNotes = formattedNotes.substring(0, MAX_TOTAL_CHARS) + "\n\n... [AVISO: Contenido truncado]";
    }

    const userPrompt = `PROYECTO: ${projectName}\n\nNOTAS A PROCESAR:\n\n${finalNotes}`;

    // 4. Gemini Call
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new functions.https.HttpsError('internal', "AI Key missing");

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: MODEL_ID,
            systemInstruction: SYSTEM_PROMPT 
        });

        const result = await withAiRetry(() => model.generateContent(userPrompt), 3, 5000);
        const responseText = result.response.text();

        const cleaned = responseText
            .replace(/^```html\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

        if (userRole !== 'superadmin') {
            await logUsage({
                userId, tenantId, action: "generate_minuta_document",
                charsIn: userPrompt.length, charsOut: cleaned.length, model: MODEL_ID
            });
        }

        return { success: true, html: cleaned };

    } catch (e: any) {
        console.error("GenerateMinuta Error:", e);
        throw new functions.https.HttpsError('internal', "AI Generation failed: " + e.message);
    }
});

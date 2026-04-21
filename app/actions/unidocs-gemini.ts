"use server";

// UniDocs V2.4 — Server Action: revisión de minutas con Gemini
// Llamada desde MinutaStep2AIReview.tsx (cliente)
// La API key NUNCA sale al cliente — solo vive aquí en el servidor.

import { GoogleGenerativeAI } from "@google/generative-ai";
import { withAiRetry } from "@/lib/ai-retry";

const MODEL_ID = "gemini-2.0-flash";

const MODEL_ID = "gemini-2.0-flash";
const MAX_TOTAL_CHARS = 15000; // Total character limit to avoid TPM issues

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
Devuelve ÚNICAMENTE HTML limpio. Usa solo: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <table>, <thead>, <tbody>, <tr>, <td>, <th>. 
Estructura: 1. Resumen Ejecutivo, 2. Decisiones Confirmadas, 3. Requerimientos Técnicos (Tabla), 4. Modelo de Datos (Tabla), 5. Acciones Pendientes (Tabla), 6. Conflictos, 7. Riesgos.`;

/**
 * Limpia el HTML de TipTap para su procesamiento por IA, eliminando ruido y limitando tamaño.
 */
function cleanContent(html: string): string {
    if (!html) return "";
    return html
        .replace(/<h[1-6][^>]*>/gi, '\n## ')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<li[^>]*>/gi, '\n- ')
        .replace(/<\/li>/gi, '')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')  // Eliminar etiquetas restantes
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function buildUserPrompt(notes: NoteInput[], projectName: string): string {
    let totalChars = 0;
    const formattedNotes = notes.map((note, i) => {
        const meta = [
            `NOTA ${i + 1}`,
            note.title ? `Título: ${note.title}` : null,
            note.date ? `Fecha: ${note.date}` : null,
            note.author ? `Autor: ${note.author}` : null,
        ].filter(Boolean).join(' | ');

        let content = cleanContent(note.content);
        
        // Truncado individual si una nota es absurdamente larga
        if (content.length > 8000) {
            content = content.substring(0, 8000) + "\n... [Contenido truncado por longitud]";
        }

        totalChars += content.length;
        return `--- ${meta} ---\n${content}`;
    }).join('\n\n');

    // Truncado global si el total excede el límite de seguridad
    let finalNotes = formattedNotes;
    if (totalChars > MAX_TOTAL_CHARS) {
        console.warn(`[UniDocs Gemini] Truncando prompt global de ${totalChars} a ${MAX_TOTAL_CHARS} caracteres.`);
        finalNotes = formattedNotes.substring(0, MAX_TOTAL_CHARS) + "\n\n... [AVISO: Parte de las notas han sido omitidas por superar el límite de capacidad de la IA]";
    }

    return `PROYECTO: ${projectName}\n\nNOTAS A PROCESAR:\n\n${finalNotes}`;
}

export async function reviewMinutaWithGemini(
    notes: NoteInput[],
    projectName: string,
): Promise<GeminiMinutaResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return {
            html: notes.map(n => n.content).join('\n'),
            error: "GEMINI_API_KEY no configurada en el servidor.",
        };
    }

    if (!notes.length) {
        return { html: '', error: "No se han proporcionado notas para procesar." };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: MODEL_ID,
            systemInstruction: SYSTEM_PROMPT 
        });

        const prompt = buildUserPrompt(notes, projectName);
        
        console.log(`[UniDocs Gemini] Solicitando revisión IA. Proyecto: ${projectName}. Caracteres en el prompt: ${prompt.length}`);

        // Wrap with retry logic for 429 errors
        const result = await withAiRetry(() => model.generateContent(prompt));
        const text = result.response.text();

        // Strip markdown code fences if the model wraps output
        const cleaned = text
            .replace(/^```html\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

        return { html: cleaned };
    } catch (e: any) {
        console.error("[UniDocs Gemini] Error Crítico:", e);
        
        let userErrorMessage = "Error al conectar con Gemini.";
        if (e.message?.includes("429") || e.message?.includes("Resource exhausted")) {
            userErrorMessage = "La capacidad de la IA para procesar documentos grandes se ha agotado temporalmente. Inténtalo de nuevo en unos minutos o reduce el número de notas seleccionadas.";
        }

        return {
            html: notes.map(n => n.content).join('\n'),
            error: e.message || userErrorMessage,
        };
    }
}

"use server";

// UniDocs V2.4 — Server Action: revisión de minutas con Gemini
// Llamada desde MinutaStep2AIReview.tsx (cliente)
// La API key NUNCA sale al cliente — solo vive aquí en el servidor.

import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_ID = "gemini-2.0-flash";

export interface NoteInput {
    title: string;
    content: string;     // HTML de TipTap
    date?: string;       // ISO o texto legible — usado para prioridad temporal
    author?: string;     // Autor si está disponible — para detectar conflictos entre personas
}

export interface GeminiMinutaResult {
    html: string;
    error?: string;
}

// ---------------------------------------------------------------------------
// Prompt: Arquitecto de Integración + Business Analyst (BRD/TRD)
// Versión mejorada con estructura fija, IDs de requerimientos y severidad
// ---------------------------------------------------------------------------
function buildPrompt(notes: NoteInput[], projectName: string): string {
    // Format each note with metadata for temporal priority detection
    const formattedNotes = notes.map((note, i) => {
        const meta = [
            `NOTA ${i + 1}`,
            note.title ? `Título: ${note.title}` : null,
            note.date ? `Fecha: ${note.date}` : null,
            note.author ? `Autor: ${note.author}` : null,
        ].filter(Boolean).join(' | ');

        // Strip HTML tags for model readability, keep structure hints
        const plainContent = note.content
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

        return `--- ${meta} ---\n${plainContent}`;
    }).join('\n\n');

    return `Actúa como un Arquitecto de Integración y Business Analyst senior. Tu objetivo es consolidar múltiples notas dispersas de reuniones del proyecto "${projectName}" en un Documento de Requerimientos Técnicos estructurado (BRD/TRD), listo para ser entregado a un cliente.

═══════════════════════════════════════════
REGLAS CRÍTICAS — APLICA SIN EXCEPCIÓN
═══════════════════════════════════════════

1. PRIORIDAD TEMPORAL: Las notas más recientes sobre un mismo tema invalidan las anteriores. Si la misma decisión aparece en dos notas, prevalece la de fecha más reciente. Indica explícitamente cuándo esto ocurre con la nota [Actualizado en NOTA X].

2. DETECCIÓN DE CONFLICTOS: Si dos notas o personas contradicen el mismo punto (ej: "integración síncrona" vs "asíncrona"), NO elijas tú — añade el conflicto en la sección "Conflictos por Resolver" con severidad Alta/Media/Baja y quién lo mencionó.

3. INFERENCIA DE ATRIBUTOS: Si se menciona un campo de datos (ej: "Fecha de Nacimiento"), infiere: tipo de dato, validaciones obvias (no futura, formato ISO-8601) y riesgos. Si no puedes inferirlo con certeza, marca como NO DEFINIDO.

4. PROHIBIDO RELLENAR CON SUPOSICIONES: Si algo no está en las notas, escribe exactamente "NO DEFINIDO" y añade una fila en la sección "Riesgos de Integración". Nunca inventes datos, endpoints, campos ni responsables.

5. TONO: Formal, técnico, orientado a acción. Sin relleno ni frases decorativas.

═══════════════════════════════════════════
ESTRUCTURA DE SALIDA OBLIGATORIA (HTML)
═══════════════════════════════════════════

Devuelve ÚNICAMENTE HTML limpio con esta estructura exacta. Usa solo: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <table>, <thead>, <tbody>, <tr>, <td>, <th>. Sin estilos inline. Sin comentarios. Sin texto fuera del documento.

<h2>1. Resumen Ejecutivo</h2>
[2-4 frases. Contexto del proyecto, objetivo de la integración/cambio y estado actual tras las reuniones.]

<h2>2. Decisiones Confirmadas</h2>
[Lista de decisiones ya tomadas y cerradas. Para cada una:]
<ul>
  <li><strong>DEC-001 — [Título de la decisión]:</strong> [Descripción]. Acordado en: NOTA X [fecha si disponible].</li>
</ul>

<h2>3. Requerimientos Técnicos</h2>
[Tabla de requerimientos con ID único, descripción, fuente (nota), prioridad inferida y estado.]
<table>
  <thead><tr><th>ID</th><th>Requerimiento</th><th>Fuente</th><th>Prioridad</th><th>Estado</th></tr></thead>
  <tbody>
    <tr><td>REQ-001</td><td>[Descripción técnica precisa]</td><td>NOTA X</td><td>Alta/Media/Baja</td><td>Definido / NO DEFINIDO</td></tr>
  </tbody>
</table>

<h2>4. Atributos y Modelo de Datos Inferido</h2>
[Solo si se mencionan campos, entidades o estructuras de datos.]
<table>
  <thead><tr><th>Campo</th><th>Tipo</th><th>Validaciones</th><th>Riesgo</th></tr></thead>
  <tbody>
    <tr><td>[nombre campo]</td><td>[Date / String / Integer...]</td><td>[no futura, max 255 chars...]</td><td>[bajo/medio/alto]</td></tr>
  </tbody>
</table>

<h2>5. Acciones Pendientes</h2>
<table>
  <thead><tr><th>Acción</th><th>Responsable</th><th>Fecha límite</th><th>Fuente</th></tr></thead>
  <tbody>
    <tr><td>[descripción acción]</td><td>[nombre o NO DEFINIDO]</td><td>[fecha o NO DEFINIDO]</td><td>NOTA X</td></tr>
  </tbody>
</table>

<h2>6. Conflictos por Resolver</h2>
[Si no hay conflictos, escribe: <p>Sin conflictos detectados.</p>. Si los hay:]
<table>
  <thead><tr><th>ID</th><th>Conflicto</th><th>Posición A</th><th>Posición B</th><th>Severidad</th></tr></thead>
  <tbody>
    <tr><td>CONF-001</td><td>[descripción]</td><td>[quién + qué dice]</td><td>[quién + qué dice]</td><td>Alta</td></tr>
  </tbody>
</table>

<h2>7. Riesgos de Integración</h2>
[Items NO DEFINIDOS que bloquean avance o pueden causar problemas:]
<ul>
  <li><strong>RIESGO-001 — [título]:</strong> [descripción del gap]. Impacto: [Alto/Medio/Bajo]. Acción sugerida: [solicitar a X / definir en próxima reunión].</li>
</ul>

═══════════════════════════════════════════
NOTAS A PROCESAR (proyecto: ${projectName})
═══════════════════════════════════════════

${formattedNotes}`;
}

// ---------------------------------------------------------------------------
// Server Action — llamado desde MinutaStep2AIReview
// ---------------------------------------------------------------------------

/**
 * Consolida notas dispersas en un BRD/TRD con Gemini.
 * @param notes      Array de notas con título, contenido HTML, fecha y autor
 * @param projectName  Nombre del proyecto para contexto
 * @returns  HTML estructurado listo para el editor TipTap
 */
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
        const model = genAI.getGenerativeModel({ model: MODEL_ID });

        const prompt = buildPrompt(notes, projectName);
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Strip markdown code fences if the model wraps output
        const cleaned = text
            .replace(/^```html\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

        return { html: cleaned };
    } catch (e: any) {
        console.error("[UniDocs Gemini] Error:", e);
        return {
            html: notes.map(n => n.content).join('\n'),
            error: e.message || "Error al conectar con Gemini. Revisa la API key.",
        };
    }
}

'use server';

import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';
import mammoth from 'mammoth';
// pdf-parse no publica tipos propios (mismo patrón que functions/src/analyze.ts)
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Tamaño máximo por fragmento (caracteres) al trocear documentos largos.
// Mantiene cada llamada a Gemini rápida y por debajo del límite de tokens de salida,
// y permite procesar los fragmentos EN PARALELO en vez de en serie.
const CHUNK_CHAR_LIMIT = 6000;

/**
 * Divide un texto largo en fragmentos respetando los párrafos (nunca corta uno por la mitad,
 * salvo que un único párrafo ya supere el límite). Si el texto es corto, devuelve un solo fragmento.
 */
function splitIntoChunks(text: string, maxChars: number = CHUNK_CHAR_LIMIT): string[] {
    if (text.length <= maxChars) return [text];

    const paragraphs = text.split(/\n\s*\n/);
    const chunks: string[] = [];
    let current = '';

    for (const para of paragraphs) {
        const candidate = current ? `${current}\n\n${para}` : para;
        if (candidate.length > maxChars && current) {
            chunks.push(current);
            current = para;
        } else {
            current = candidate;
        }
        // Párrafo suelto ya desbordado: lo dejamos como fragmento propio.
        if (current.length > maxChars * 1.5) {
            chunks.push(current);
            current = '';
        }
    }
    if (current) chunks.push(current);

    return chunks.length > 0 ? chunks : [text];
}

interface AIHighlight {
    sentence: string;
    score: number; // 0 to 100
    reason: string;
}

interface AnalysisResult {
    score: number; // 0 to 100
    summary: string;
    highlights: AIHighlight[];
    cliches: string[];
    tips: string[];
}

const analysisSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        score: { 
            type: SchemaType.INTEGER, 
            description: 'Probabilidad global de que el texto haya sido escrito por IA (de 0 a 100). Sé extremadamente riguroso y crítico.' 
        },
        summary: { 
            type: SchemaType.STRING, 
            description: 'Breve resumen en español analizando el estilo, fluidez, vocabulario y estructura del texto.' 
        },
        highlights: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    sentence: { type: SchemaType.STRING, description: 'La frase exacta del texto analizado.' },
                    score: { type: SchemaType.INTEGER, description: 'Probabilidad de IA específica para esta frase (0 a 100).' },
                    reason: { type: SchemaType.STRING, description: 'Explicación técnica en español de por qué suena a IA (ej. estructura demasiado regular, uso de transiciones cliché, pasiva excesiva).' }
                },
                required: ['sentence', 'score', 'reason']
            },
            description: 'Lista de frases específicas del texto que muestran fuertes indicios de generación por IA.'
        },
        cliches: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: 'Palabras o expresiones cliché de IA encontradas (ej. "crucial", "además", "en conclusión", "un testamento de").'
        },
        tips: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: 'Consejos prácticos, detallados y extremos específicos para reescribir este texto y superar la propia supervisión.'
        }
    },
    required: ['score', 'summary', 'highlights', 'cliches', 'tips']
};

/**
 * Combina los resultados de análisis de varios fragmentos de un mismo documento en uno solo:
 * score ponderado por longitud de cada fragmento, highlights concatenados y clichés/tips deduplicados.
 */
function mergeAnalysisResults(results: AnalysisResult[], weights: number[]): AnalysisResult {
    const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
    const score = Math.round(
        results.reduce((sum, r, i) => sum + r.score * weights[i], 0) / totalWeight
    );

    return {
        score,
        summary: `Documento analizado en ${results.length} fragmentos. ` + results.map(r => r.summary).join(' '),
        highlights: results.flatMap(r => r.highlights),
        cliches: Array.from(new Set(results.flatMap(r => r.cliches))),
        tips: Array.from(new Set(results.flatMap(r => r.tips))).slice(0, 8),
    };
}

/**
 * Analiza un único fragmento de texto (llamada directa a Gemini). Usado internamente
 * tanto para textos cortos como para cada fragmento de un documento troceado.
 */
async function analyzeChunk(text: string): Promise<AnalysisResult> {
        const referer = 'http://localhost:3000';
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: `Eres un detector de texto generado por IA con una supervisión extrema y rigurosa.
Analizas el texto bajo criterios estrictos de:
1. Perplejidad (variabilidad en la elección de palabras).
2. Burstiness (variabilidad en la longitud y estructura de las oraciones).
3. Vocabulario característico de IA (clichés como: crucial, indispensable, además, en conclusión, por ende, a través de, se destaca, testamento, paisaje dinámico, etc.).
4. Gramática y concordancia perfectas que carecen de la imperfección natural del habla humana.

Debes devolver un análisis en formato JSON estructurado según el esquema proporcionado. Sé implacable: si el texto tiene oraciones que suenan a IA, márcalas con alta puntuación.`,
        }, {
            customHeaders: {
                'Referer': referer
            }
        });

        const prompt = `Analiza detalladamente el siguiente texto para detectar si está escrito por IA:\n\n"${text}"`;

        const response = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: analysisSchema,
                temperature: 0.1, // Baja temperatura para análisis preciso y consistente
            }
        });

        const responseText = response.response.text();
        return JSON.parse(responseText) as AnalysisResult;
}

/**
 * Realiza un análisis extremo para detectar patrones de IA en un texto.
 * Los documentos largos se trocean y analizan EN PARALELO (más rápido y evita
 * truncar la respuesta de Gemini), y los resultados se combinan al final.
 */
export async function analyzeTextForAI(text: string): Promise<{ success: boolean; result?: AnalysisResult; error?: string }> {
    try {
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY no está configurada en el servidor.');
        }
        if (!text || text.trim().length < 10) {
            throw new Error('El texto proporcionado es demasiado corto para ser analizado.');
        }

        const chunks = splitIntoChunks(text);

        if (chunks.length === 1) {
            const result = await analyzeChunk(chunks[0]);
            return { success: true, result };
        }

        const partialResults = await Promise.all(chunks.map(c => analyzeChunk(c)));
        const result = mergeAnalysisResults(partialResults, chunks.map(c => c.length));
        return { success: true, result };
    } catch (e: any) {
        console.error('Error al analizar texto con Gemini:', e);
        return { success: false, error: e.message || 'Error desconocido' };
    }
}

/**
 * Humaniza el texto reescribiéndolo para eliminar cualquier traza de IA
 * y hacerlo indistinguible de la escritura humana.
 */
export async function humanizeText(
    text: string,
    tone: 'technical' | 'conversational' | 'corporate'
): Promise<{ success: boolean; humanizedText?: string; error?: string }> {
    try {
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY no está configurada en el servidor.');
        }
        if (!text || text.trim().length < 10) {
            throw new Error('El texto proporcionado es demasiado corto para ser humanizado.');
        }

        const chunks = splitIntoChunks(text);

        if (chunks.length === 1) {
            const humanizedText = await humanizeChunk(chunks[0], tone);
            return { success: true, humanizedText };
        }

        // Documento largo: humanizamos los fragmentos EN PARALELO (mismo tono en todos)
        // y los recomponemos en el orden original.
        const partials = await Promise.all(chunks.map(c => humanizeChunk(c, tone)));
        return { success: true, humanizedText: partials.join('\n\n') };
    } catch (e: any) {
        console.error('Error al humanizar texto con Gemini:', e);
        return { success: false, error: e.message || 'Error desconocido' };
    }
}

/**
 * Humaniza un único fragmento de texto (llamada directa a Gemini). Usado internamente
 * tanto para textos cortos como para cada fragmento de un documento troceado.
 */
async function humanizeChunk(
    text: string,
    tone: 'technical' | 'conversational' | 'corporate'
): Promise<string> {
        let toneInstructions = '';
        if (tone === 'technical') {
            toneInstructions = 'Usa un tono técnico-operativo claro, directo y profesional. Evita rodeos, pero rompe las estructuras uniformes de la IA. Usa la voz activa ("configuramos" en lugar de "es configurado"). Mantén descripciones técnicas exactas.';
        } else if (tone === 'conversational') {
            toneInstructions = 'Usa un tono conversacional, cercano y natural, como el de un compañero de equipo en Slack o un email informal. Introduce contracciones naturales si aplica, oraciones cortas alternadas con explicaciones directas, y vocabulario común.';
        } else {
            toneInstructions = 'Usa un tono corporativo limpio, pulido y profesional, pero desprovisto de los clichés trillados de la IA ("paisaje dinámico", "revolucionar", "crucial"). Debe leerse genuino y escrito por un ejecutivo humano maduro.';
        }

        const referer = 'http://localhost:3000';
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: `Eres un redactor y editor humano experto. Tu misión absoluta es reescribir textos generados por IA para hacerlos 100% indistinguibles de un escrito humano y lograr un 0% de probabilidad de IA en cualquier detector (incluyendo tu propia supervisión extrema).

Reglas críticas de humanización:
1. **Rompe la monotonía**: Varía drásticamente la longitud de las oraciones. Combina oraciones muy cortas de 3-5 palabras con oraciones complejas de longitud variable.
2. **Elimina clichés de IA**: Prohibidas palabras como: crucial, indispensable, además, en conclusión, por ende, a través de, testamento, implementar con éxito, de vital importancia, etc. Reemplázalas por conectores naturales o elimina el conector por completo.
3. **Usa la voz activa**: Cambia la voz pasiva ("las tarifas son configuradas por...") a voz activa ("configuramos las tarifas..."). Esto le da un tono dinámico y natural.
4. **Naturalidad y Fluidez**: Introduce pequeñas imperfecciones en el ritmo y formas naturales de redactar que usan los humanos en español (ej. usar puntos seguidos para separar ideas, en vez de comas eternas).
5. **Conserva el contenido**: Mantén intactas las marcas, nombres propios, códigos, números y la información técnica exacta del texto original. No elimines hechos ni inventes datos nuevos.

${toneInstructions}

Devuelve únicamente el texto reescrito final, sin comentarios, introducciones ni explicaciones de tu parte.`,
        }, {
            customHeaders: {
                'Referer': referer
            }
        });

        const prompt = `Humaniza y reescribe el siguiente texto:\n\n"${text}"`;

        const response = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7, // Mayor temperatura para variabilidad y creatividad humana
            }
        });

        return response.response.text();
}

/**
 * Extrae el texto plano de un documento subido por el usuario (PDF, DOCX o TXT/MD)
 * para poder analizarlo/humanizarlo sin necesidad de copiar y pegar manualmente.
 */
export async function extractTextFromDocument(
    base64: string,
    mimeType: string,
    fileName: string
): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
        if (!base64) {
            throw new Error('No se recibió ningún archivo.');
        }

        const buffer = Buffer.from(base64, 'base64');
        const lowerName = fileName.toLowerCase();
        const isPdf = mimeType === 'application/pdf' || lowerName.endsWith('.pdf');
        const isDocx = mimeType.includes('wordprocessingml') || lowerName.endsWith('.docx');
        const isLegacyDoc = mimeType === 'application/msword' || lowerName.endsWith('.doc');

        let text = '';

        if (isPdf) {
            const parsed = await pdfParse(buffer);
            text = parsed.text;
        } else if (isDocx) {
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
        } else if (isLegacyDoc) {
            throw new Error('El formato .doc (Word 97-2003) no está soportado. Guarda el archivo como .docx, .pdf o .txt y vuelve a intentarlo.');
        } else {
            // .txt, .md o cualquier texto plano
            text = buffer.toString('utf-8');
        }

        text = text.replace(/\r\n/g, '\n').trim();

        if (!text) {
            throw new Error('No se pudo extraer texto del documento. Puede estar vacío, ser una imagen escaneada sin OCR, o tener un formato no soportado.');
        }

        return { success: true, text };
    } catch (e: any) {
        console.error('Error al extraer texto del documento:', e);
        return { success: false, error: e.message || 'No se pudo leer el documento. Prueba con PDF, DOCX o TXT.' };
    }
}

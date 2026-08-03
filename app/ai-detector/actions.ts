'use server';

import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

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
 * Realiza un análisis extremo para detectar patrones de IA en un texto.
 */
export async function analyzeTextForAI(text: string): Promise<{ success: boolean; result?: AnalysisResult; error?: string }> {
    try {
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY no está configurada en el servidor.');
        }
        if (!text || text.trim().length < 10) {
            throw new Error('El texto proporcionado es demasiado corto para ser analizado.');
        }

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
        const result = JSON.parse(responseText) as AnalysisResult;

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

        const humanizedText = response.response.text();
        return { success: true, humanizedText };
    } catch (e: any) {
        console.error('Error al humanizar texto con Gemini:', e);
        return { success: false, error: e.message || 'Error desconocido' };
    }
}

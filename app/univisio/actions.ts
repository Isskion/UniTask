'use server';

import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';
import { headers } from 'next/headers';

// Initialize the Gemini API client
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

interface AnalyzeStep {
    step: number;
    actor: string;
    origin: string;
    destination: string;
    event: string;
    resultState: string;
    actionType: 'H' | 'A' | 'I';
    precondition: string;
    exception: string;
    rule: string;
    linkedNodeId: string;
    confidence: number;
}

/**
 * Analyzes a sub-graph of nodes and edges alongside an optional cropped image
 * to extract semantic details of each step in the workflow.
 */
export async function analyzeSubflowWithGemini(
    subflowGraphJson: string,
    imageBase64?: string
): Promise<{ success: boolean; steps?: AnalyzeStep[]; error?: string }> {
    try {
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is not configured on the server.');
        }

        const systemInstruction = `
You are the UniVisio Semantic Compiler. Your job is to convert a structural diagram workflow (supplied as a JSON graph containing nodes, text, and connections) into a highly rigid, detailed step-by-step documentation table.

For each step, you must determine the following details:
1. Actor/Swimlane: The owner/actor executing the action (e.g. system name, user role, integration hub).
2. Origen del Dato (Data Source): The system/table/entity providing the data.
3. Destino/Consumidor (Destination): The system/table/entity consuming or receiving the data.
4. Evento/Transición (Event): The trigger, API endpoint call, or message name.
5. Estado Resultante (Resulting State): The business state in the system (e.g. Viaje.Estado = 2, Pedido.Estado = Programable).
6. Tipo de Acción (Action Type): Must be one of:
   - 'H' for Humana (Manual user action/decision)
   - 'A' for Automática (Automatic cron job, DB procedure, or internal logic)
   - 'I' for Integración (REST/SOAP API call, message bus event crossing system boundaries)
7. Precondición (Precondition): The required state before this step executes.
8. Excepción/Alternativa (Exception): What happens on failure, timeout, rejection, or alternative flows.
9. Regla de Negocio (Business Rule): Validations, conditional logic, thresholds, or norms.
10. linkedNodeId: The ID of the shape/node from the provided JSON graph that matches this step.
11. confidence: Your confidence score from 0.0 to 1.0.

CRITICAL RULES:
- Do NOT invent or make up connections. The connections (edges) in the JSON graph are authoritative and mathematically correct. Use the visual image ONLY to read background context, swimlanes, and details that are not in the raw text.
- Match each step to its corresponding Node ID in the graph using the 'linkedNodeId' field.
`;

        // Override referrer to 'http://localhost:3000' because the API Key is restricted to localhost
        const referer = 'http://localhost:3000';

        const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.5-pro',
            systemInstruction: systemInstruction
        }, {
            customHeaders: {
                'Referer': referer
            }
        });

        const prompt = `
GraphJSON:
${subflowGraphJson}

Please analyze the above graph and return the step-by-step table matching the requested schema.
`;

        const parts: any[] = [{ text: prompt }];

        // If an image is provided, include it in the multimodal request
        if (imageBase64) {
            const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
            parts.unshift({
                inlineData: {
                    data: cleanBase64,
                    mimeType: 'image/png'
                }
            });
        }

        const contents = [
            {
                role: 'user',
                parts: parts
            }
        ];

        const stepSchema: Schema = {
            type: SchemaType.OBJECT,
            properties: {
                step: { type: SchemaType.INTEGER, description: 'Incremental index' },
                actor: { type: SchemaType.STRING, description: 'Swimlane or actor executing the step' },
                origin: { type: SchemaType.STRING, description: 'System or entity providing the data' },
                destination: { type: SchemaType.STRING, description: 'System or entity consuming the data' },
                event: { type: SchemaType.STRING, description: 'API call, trigger or transition event description' },
                resultState: { type: SchemaType.STRING, description: 'Resulting state of the object in the database/system' },
                actionType: { 
                    type: SchemaType.STRING, 
                    format: 'enum',
                    enum: ['H', 'A', 'I'], 
                    description: 'H (Humana), A (Automática), I (Integración)' 
                },
                precondition: { type: SchemaType.STRING, description: 'Required previous state' },
                exception: { type: SchemaType.STRING, description: 'Error path, timeout or alternative state' },
                rule: { type: SchemaType.STRING, description: 'Business rules or validations' },
                linkedNodeId: { type: SchemaType.STRING, description: 'The matching Node ID from the GraphJSON' },
                confidence: { type: SchemaType.NUMBER, description: 'Confidence score from 0.0 to 1.0' }
            },
            required: [
                'step', 'actor', 'origin', 'destination', 'event', 'resultState',
                'actionType', 'precondition', 'exception', 'rule', 'linkedNodeId', 'confidence'
            ]
        };

        const responseSchema: Schema = {
            type: SchemaType.OBJECT,
            properties: {
                steps: {
                    type: SchemaType.ARRAY,
                    items: stepSchema,
                    description: 'Ordered list of steps'
                }
            },
            required: ['steps']
        };

        const result = await model.generateContent({
            contents,
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema
            } as any
        });

        const text = result.response.text();
        const parsed = JSON.parse(text);
        return { success: true, steps: parsed.steps };
    } catch (e: any) {
        console.error('Error in analyzeSubflowWithGemini server action:', e);
        return { success: false, error: e.message || 'Failed to analyze subflow.' };
    }
}

interface ChatResponse {
    reply: string;
    command?: {
        type: 'update_row' | 'insert_row' | 'delete_row' | 'highlight_row' | 'merge_rows' | 'split_row';
        params: any;
    };
}

/**
 * Handles conversational updates and queries, letting the user edit the table using natural language
 * and receiving structured commands back to modify the frontend UI.
 */
export async function chatWithUniVisio(
    chatHistory: { role: 'user' | 'model'; content: string }[],
    message: string,
    currentTableRowsJson: string
): Promise<{ success: boolean; reply?: string; command?: any; error?: string }> {
    try {
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is not configured on the server.');
        }

        const systemInstruction = `
You are the UniVisio Copilot, an AI process architect assisting the user in documenting massive workflow diagrams.
The user is viewing a structured 10-column table representing the workflow steps.

Your goals:
1. Explain flow logic, clarify connections, and answer questions like "¿Qué pasa si...?" by inspecting the current steps.
2. Allow the user to update the table using natural language (e.g. "El paso 12 es de tipo Integración", "Divide el paso 5 en dos", "Cambia el actor del paso 10 a Cliente").
3. When the user wants to make a change, you MUST reply with a conversational explanation and attach a structured command in the JSON output to instruct the frontend how to update the table state.

SUPPORTED COMMANDS:
- update_row: Update columns of an existing row. Params: { stepIndex: number, fields: Partial<TableRow> }
- insert_row: Insert a new row. Params: { index: number, row: Partial<TableRow> }
- delete_row: Delete a row. Params: { stepIndex: number }
- merge_rows: Merge two steps. Params: { stepIndexA: number, stepIndexB: number }
- split_row: Split a step into sub-steps. Params: { stepIndex: number, count: number }

Response format MUST match the JSON schema below.
`;

        // Override referrer to 'http://localhost:3000' because the API Key is restricted to localhost
        const referer = 'http://localhost:3000';

        const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.5-flash',
            systemInstruction: systemInstruction
        }, {
            customHeaders: {
                'Referer': referer
            }
        });

        const responseSchema: Schema = {
            type: SchemaType.OBJECT,
            properties: {
                reply: { type: SchemaType.STRING, description: 'Conversational message to show in the chat log' },
                command: {
                    type: SchemaType.OBJECT,
                    properties: {
                        type: { 
                            type: SchemaType.STRING, 
                            format: 'enum',
                            enum: ['update_row', 'insert_row', 'delete_row', 'merge_rows', 'split_row'] 
                        },
                        params: {
                            type: SchemaType.OBJECT,
                            description: 'Parameters corresponding to the command',
                            properties: {
                                stepIndex: { type: SchemaType.INTEGER, description: 'Step index for update, delete or split' },
                                index: { type: SchemaType.INTEGER, description: 'Index where to insert a row' },
                                stepIndexA: { type: SchemaType.INTEGER, description: 'First step index to merge' },
                                stepIndexB: { type: SchemaType.INTEGER, description: 'Second step index to merge' },
                                count: { type: SchemaType.INTEGER, description: 'Number of parts to split a row into' },
                                fields: {
                                    type: SchemaType.OBJECT,
                                    description: 'Fields to update',
                                    properties: {
                                        actor: { type: SchemaType.STRING },
                                        origin: { type: SchemaType.STRING },
                                        destination: { type: SchemaType.STRING },
                                        event: { type: SchemaType.STRING },
                                        resultState: { type: SchemaType.STRING },
                                        actionType: { type: SchemaType.STRING, format: 'enum', enum: ['H', 'A', 'I'] },
                                        precondition: { type: SchemaType.STRING },
                                        exception: { type: SchemaType.STRING },
                                        rule: { type: SchemaType.STRING }
                                    }
                                },
                                row: {
                                    type: SchemaType.OBJECT,
                                    description: 'Row to insert',
                                    properties: {
                                        actor: { type: SchemaType.STRING },
                                        origin: { type: SchemaType.STRING },
                                        destination: { type: SchemaType.STRING },
                                        event: { type: SchemaType.STRING },
                                        resultState: { type: SchemaType.STRING },
                                        actionType: { type: SchemaType.STRING, format: 'enum', enum: ['H', 'A', 'I'] },
                                        precondition: { type: SchemaType.STRING },
                                        exception: { type: SchemaType.STRING },
                                        rule: { type: SchemaType.STRING }
                                    }
                                }
                            }
                        }
                    },
                    required: ['type', 'params']
                }
            },
            required: ['reply']
        };

        const formattedHistory = chatHistory.map(h => ({
            role: h.role,
            parts: [{ text: h.content }]
        }));

        // Add the current table rows as system context in the final user message
        const userPrompt = `
CURRENT TABLE STATE (JSON):
${currentTableRowsJson}

USER MESSAGE:
${message}
`;

        const chat = model.startChat({
            history: formattedHistory,
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema
            } as any
        });

        const result = await chat.sendMessage(userPrompt);
        const text = result.response.text();
        const parsed = JSON.parse(text);
        return { success: true, reply: parsed.reply, command: parsed.command };
    } catch (e: any) {
        console.error('Error in chatWithUniVisio server action:', e);
        return { success: false, error: e.message || 'Failed to chat with UniVisio.' };
    }
}

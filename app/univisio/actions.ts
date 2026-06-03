'use server';

import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';
import { headers } from 'next/headers';

// Initialize the Gemini API client
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

interface StateChange {
    entity: string;
    from: string;
    to: string;
}

interface ConditionalPath {
    condition: string;
    action: string;
}

interface InterfaceRef {
    num: number;
    name: string;
    direction: string;
    data: string;
    criticality: 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'INFORMATIVA';
}

interface AnalyzeStep {
    step: number;
    title: string;
    subtitle: string;
    systems: string;
    phase: string;
    stateChanges: StateChange[];
    conditionalPaths: ConditionalPath[];
    actor: string;
    origin: string;
    destination: string;
    event: string;
    resultState: string;
    actionType: string;
    precondition: string;
    exception: string;
    rule: string;
    linkedNodeId: string;
    coveredNodeIds: string[];
    confidence: number;
    interfaceRefs: InterfaceRef[];
    isLoop: boolean;
    loopNote: string | null;
    operativeDesc: string;
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
You are the UniVisio Semantic Compiler. Your job is to convert a structural diagram workflow (supplied as a JSON graph containing nodes, text, and connections) into a highly rigid, detailed step-by-step documentation table with a dual-layer representation.

For each step/node in the sub-flow, you must determine the following details:
1. step: Incremental index of the step.
2. title: Main name of the step (e.g., "RUTEO CON VALIDACIÓN").
3. subtitle: Subtitle / brief goal description of the step (e.g., "Armado de Rutas y Control de Cambios").
4. systems: Systems participating and flow direction (e.g., "TMS (Algoritmo + Validación Manual)" or "ERP → TMS").
5. phase: Global phase group this step belongs to (e.g., "FASE 1 — RECEPCIÓN Y VALIDACIÓN"). Steps in the same sequence of actions should share the exact same phase name.
6. stateChanges: List of objects representing state changes for each entity modified in this step. Each object must have:
   - entity: The business entity name (e.g., "PEDIDO", "ORDEN", "RUTA", "VIAJE").
   - from: Previous state (e.g., "CREADO", "POR RUTEAR", "PREPARADO").
   - to: Resulting state (e.g., "A PREPARACIÓN", "RUTEADA", "RUTEADO", "VALIDADA").
7. conditionalPaths: If there are branches/conditions (e.g., "Si cambios manuales"), describe the condition and the action.
8. actor: The swimlane or actor executing the action (e.g. system name, user role).
9. origin: System or entity providing the data.
10. destination: System or entity consuming/receiving the data.
11. event: Trigger, API call or event name.
12. resultState: Resulting state description.
13. actionType: Description of action type (e.g., 'Humana', 'Automática', 'Integración', or combined like 'Automática + Humana').
14. precondition: Required state before executing this step.
15. exception: Rejection paths, alternative paths, or KO scenarios.
16. rule: Business rules, thresholds, validations.
17. linkedNodeId: The ID of the shape/node from the provided JSON graph that best represents this step (single node, the most semantically central one).
17b. coveredNodeIds: Array with the IDs of ALL nodes from the graph that this step absorbs or represents. Must include linkedNodeId. Include auxiliary nodes, decision points, and annotations that are semantically part of this step. If only one node maps to this step, return an array with just that one ID.
18. confidence: Your confidence score from 0.0 to 1.0.
19. interfaceRefs: If this transition uses an interface or integration, reference it with:
    - num: Interface ID number (e.g. 4).
    - name: descriptive interface name (e.g. Confirmación Carga).
    - direction: direction flow (e.g. TMS → ERP).
    - data: data transported (e.g. VIAJE: CARGADO).
    - criticality: CRÍTICA | ALTA | MEDIA | INFORMATIVA.
20. isLoop: True if this step is part of a loop (e.g. repeated N times or has return arrows in the graph).
21. loopNote: Optional explanation of loop conditions (or null).
22. operativeDesc: Párrafo de 3 a 5 frases en español explicando qué ocurre, por qué, y qué pasa en escenarios OK y KO (escenario de fallo). Tono técnico-operativo.

CRITICAL RULES:
- Do NOT invent or make up connections. The connections (edges) in the JSON graph are authoritative and mathematically correct. Use the visual image ONLY to read background context, swimlanes, and details that are not in the raw text.
- Match each step to its corresponding Node ID in the graph using the 'linkedNodeId' field.
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
                title: { type: SchemaType.STRING, description: 'Step title / action name (e.g. RUTEO CON VALIDACIÓN)' },
                subtitle: { type: SchemaType.STRING, description: 'Step subtitle / short goal description (e.g. Armado de Rutas y Control de Cambios)' },
                systems: { type: SchemaType.STRING, description: 'Participating systems and flow (e.g. TMS (Algoritmo + Validación Manual))' },
                phase: { type: SchemaType.STRING, description: 'Global phase of the workflow to group related steps (e.g. FASE 1 — RECEPCIÓN Y VALIDACIÓN)' },
                stateChanges: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            entity: { type: SchemaType.STRING, description: 'The entity being modified (e.g. RUTA, ORDEN, PEDIDO)' },
                            from: { type: SchemaType.STRING, description: 'Previous state before this step (e.g. POR RUTEAR)' },
                            to: { type: SchemaType.STRING, description: 'New state after this step (e.g. VALIDADA)' }
                        },
                        required: ['entity', 'from', 'to']
                    },
                    description: 'Structured list of state changes per entity'
                },
                conditionalPaths: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            condition: { type: SchemaType.STRING, description: 'Condition trigger (e.g. Si cambios manuales)' },
                            action: { type: SchemaType.STRING, description: 'Triggered action or interface (e.g. Interfaz #4 al ERP)' }
                        },
                        required: ['condition', 'action']
                    },
                    description: 'Conditional bifurcations or actions'
                },
                actor: { type: SchemaType.STRING, description: 'Swimlane or actor executing the step' },
                origin: { type: SchemaType.STRING, description: 'System or entity providing the data' },
                destination: { type: SchemaType.STRING, description: 'System or entity consuming the data' },
                event: { type: SchemaType.STRING, description: 'API call, trigger or transition event description' },
                resultState: { type: SchemaType.STRING, description: 'Resulting state of the object in the database/system' },
                actionType: { type: SchemaType.STRING, description: 'Action type description (e.g. Humana, Automática, Integración or combined like "Automática + Humana")' },
                precondition: { type: SchemaType.STRING, description: 'Required previous state' },
                exception: { type: SchemaType.STRING, description: 'Error path, timeout or alternative state' },
                rule: { type: SchemaType.STRING, description: 'Business rules or validations' },
                linkedNodeId: { type: SchemaType.STRING, description: 'The matching Node ID from the GraphJSON' },
                coveredNodeIds: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                    description: 'All node IDs from the graph covered by this step, including linkedNodeId'
                },
                confidence: { type: SchemaType.NUMBER, description: 'Confidence score from 0.0 to 1.0' },
                interfaceRefs: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            num: { type: SchemaType.INTEGER, description: 'Interface identification number (e.g. 4)' },
                            name: { type: SchemaType.STRING, description: 'Descriptive interface name (e.g. Confirmación Carga)' },
                            direction: { type: SchemaType.STRING, description: 'Data direction flow (e.g. TMS → ERP)' },
                            data: { type: SchemaType.STRING, description: 'Main data carried (e.g. VIAJE: CARGADO)' },
                            criticality: { 
                                type: SchemaType.STRING, 
                                format: 'enum', 
                                enum: ['CRÍTICA', 'ALTA', 'MEDIA', 'INFORMATIVA'],
                                description: 'Criticality level of this integration'
                            }
                        },
                        required: ['num', 'name', 'direction', 'data', 'criticality']
                    },
                    description: 'Integrations or interfaces referenced in this step'
                },
                isLoop: { type: SchemaType.BOOLEAN, description: 'True if this step is part of a loop or repeated workflow' },
                loopNote: { type: SchemaType.STRING, nullable: true, description: 'Note about the loop repeat condition or count' },
                operativeDesc: { type: SchemaType.STRING, description: 'Operative description paragraph in natural language (3-5 sentences in Spanish, explaining what, why, and conditions, including OK/KO outcomes)' }
            },
            required: [
                'step', 'title', 'subtitle', 'systems', 'phase', 'stateChanges', 'conditionalPaths',
                'actor', 'origin', 'destination', 'event', 'resultState',
                'actionType', 'precondition', 'exception', 'rule', 'linkedNodeId', 'coveredNodeIds', 'confidence',
                'interfaceRefs', 'isLoop', 'loopNote', 'operativeDesc'
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
The user is viewing structured workflow steps with a dual-layer representation.

For each step, the schema includes:
- step: incremental step index (number)
- title: step title / action name (string)
- subtitle: short goal description (string)
- systems: participating systems and flow direction (string)
- phase: global phase group name (string)
- stateChanges: array of { entity: string, from: string, to: string }
- conditionalPaths: array of { condition: string, action: string }
- actor: swimlane/actor executing the step (string)
- origin: data source (string)
- destination: data consumer (string)
- event: trigger / API call / message (string)
- resultState: resulting state of the object in system (string)
- actionType: type description (string, e.g. "Humana", "Automática", "Integración", "Automática + Humana")
- precondition: previous state required (string)
- exception: failure paths or alternative outcomes (string)
- rule: business rules or validations (string)
- interfaceRefs: array of { num: number, name: string, direction: string, data: string, criticality: 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'INFORMATIVA' }
- isLoop: true if step is part of a loop (boolean)
- loopNote: optional repeat explanation or count (string | null)
- operativeDesc: natural language operative description in Spanish (string, 3-5 sentences)

Your goals:
1. Explain flow logic, clarify connections, and answer questions like "¿Qué pasa si...?" by inspecting the current steps.
2. Allow the user to update the steps using natural language (e.g., "El paso 12 es de tipo Integración", "Agrega RUTA: VALIDADA a RUTA: CONFIRMADA como cambio de estado en el paso 4", "Cambia la descripción operativa del paso 4 a...").
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

        const rowSchemaFields: Record<string, Schema> = {
            title: { type: SchemaType.STRING },
            subtitle: { type: SchemaType.STRING },
            systems: { type: SchemaType.STRING },
            phase: { type: SchemaType.STRING },
            stateChanges: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        entity: { type: SchemaType.STRING },
                        from: { type: SchemaType.STRING },
                        to: { type: SchemaType.STRING }
                    },
                    required: ['entity', 'from', 'to']
                }
            },
            conditionalPaths: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        condition: { type: SchemaType.STRING },
                        action: { type: SchemaType.STRING }
                    },
                    required: ['condition', 'action']
                }
            },
            actor: { type: SchemaType.STRING },
            origin: { type: SchemaType.STRING },
            destination: { type: SchemaType.STRING },
            event: { type: SchemaType.STRING },
            resultState: { type: SchemaType.STRING },
            actionType: { type: SchemaType.STRING },
            precondition: { type: SchemaType.STRING },
            exception: { type: SchemaType.STRING },
            rule: { type: SchemaType.STRING },
            interfaceRefs: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        num: { type: SchemaType.INTEGER },
                        name: { type: SchemaType.STRING },
                        direction: { type: SchemaType.STRING },
                        data: { type: SchemaType.STRING },
                        criticality: { type: SchemaType.STRING, format: 'enum', enum: ['CRÍTICA', 'ALTA', 'MEDIA', 'INFORMATIVA'] }
                    },
                    required: ['num', 'name', 'direction', 'data', 'criticality']
                }
            },
            isLoop: { type: SchemaType.BOOLEAN },
            loopNote: { type: SchemaType.STRING, nullable: true },
            operativeDesc: { type: SchemaType.STRING }
        };

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
                                    properties: rowSchemaFields
                                },
                                row: {
                                    type: SchemaType.OBJECT,
                                    description: 'Row to insert',
                                    properties: rowSchemaFields
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

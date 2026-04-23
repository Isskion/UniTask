/**
 * UNIFLUX MODE REGISTRY
 *
 * Each DiagramMode encapsulates the logic that varies by document type:
 * validator, AI prompt builder, node type set, and metadata.
 *
 * UI components (palette, node editor) are NOT stored here to avoid
 * circular imports with React. Instead UnifluxWorkspace holds a local
 * UI registry keyed by mode.id.
 *
 * Adding a new mode (e.g. BPMN, UML, ER) = create one DiagramMode object
 * and register it here. Zero changes to core workspace logic.
 */

import { FlowGraph, ValidationResult, ModeId } from './types';
import { UnifluxValidator } from './validator';

// Compile-time guard: if ModeId gains a new value, MODE_REGISTRY must cover it
type _ExhaustiveModeCheck = Record<ModeId, DiagramMode>;

// ── Context passed to buildAIPrompt ────────────────────────────────────────
export interface AIPromptContext {
    c4Level?: number;
    tenantKnowledge?: string;
    corrections?: string;
}

// ── Mode interface ──────────────────────────────────────────────────────────
export interface DiagramMode {
    /** Matches FlowGraph.docType */
    id: string;
    label: string;
    icon: string;
    description: string;
    /** Set of AnyNodeType strings valid for this mode */
    nodeTypes: ReadonlySet<string>;
    /** Pure function — no React deps */
    validate: (graph: FlowGraph) => ValidationResult;
    /** Returns the system instruction string for the Gemini call */
    buildAIPrompt: (ctx: AIPromptContext) => string;
    /** Whether this mode uses the React Flow canvas (vs custom editor like Mermaid) */
    usesCanvas: boolean;
    /** Whether this mode supports AI generation */
    supportsAI: boolean;
}

// ── Visual Flow Mode ────────────────────────────────────────────────────────
const VISUAL_NODE_TYPES = new Set([
    'START', 'STATE', 'OPERATION', 'TASK', 'DECISION', 'TERMINAL', 'ERROR', 'ENVIRONMENT',
    'DATA', 'SUBPROCESS', 'DOCUMENT'
]);

export const VisualMode: DiagramMode = {
    id: 'visual',
    label: 'Flujo Visual',
    icon: '🔀',
    description: 'Diagrama de flujo de proceso con nodos tipados',
    nodeTypes: VISUAL_NODE_TYPES,
    validate: (graph) => UnifluxValidator.validate(graph),
    usesCanvas: true,
    supportsAI: true,
    buildAIPrompt: ({ tenantKnowledge = '', corrections = '' }) => `
You are the UNIFLUX SEMANTIC COMPILER.
Your job is to translate logistics process descriptions into a valid JSON FlowGraph.

ONTOLOGY:
- NodeType: "START" | "STATE" | "OPERATION" | "TASK" | "DECISION" | "TERMINAL" | "ERROR" | "DATA" | "SUBPROCESS" | "DOCUMENT"
- FlowNode: { id: string, type: NodeType, label: string, position: {x, y} }
- FlowEdge: { id: string, source: string, target: string, label?: string, condition?: string }
- FlowGraph: { nodes: FlowNode[], edges: FlowEdge[] }

RULES:
1. Exactly ONE START node.
2. At least ONE TERMINAL node.
3. START has no inputs. TERMINAL has no outputs.
4. All nodes must reach a TERMINAL.
5. START at left (x:0, y:250), TERMINAL at right (x:1000, y:250).
6. Node IDs: sequential numeric strings "1", "2", "3"...
7. Output language MUST match the user's prompt language exactly.

OUTPUT ONLY VALID JSON. No conversational text.
BUSINESS KNOWLEDGE: ${tenantKnowledge}
CORRECTIONS: ${corrections}
`.trim(),
};

// ── C4 Architecture Mode ────────────────────────────────────────────────────
const C4_NODE_TYPES = new Set([
    'C4_PERSON', 'C4_SYSTEM', 'C4_SYSTEM_EXT',
    'C4_CONTAINER_WEB', 'C4_CONTAINER_API', 'C4_CONTAINER_DB', 'C4_CONTAINER_QUEUE',
    'C4_COMPONENT', 'C4_BOUNDARY',
]);

const C4_LEVEL_CONTEXT: Record<number, string> = {
    1: 'L1 Context — valid types: C4_PERSON, C4_SYSTEM, C4_SYSTEM_EXT, C4_BOUNDARY',
    2: 'L2 Container — valid types: C4_CONTAINER_WEB, C4_CONTAINER_API, C4_CONTAINER_DB, C4_CONTAINER_QUEUE, C4_PERSON, C4_SYSTEM_EXT, C4_BOUNDARY',
    3: 'L3 Component — valid types: C4_COMPONENT, C4_CONTAINER_*, C4_BOUNDARY',
};

export const C4Mode: DiagramMode = {
    id: 'c4',
    label: 'C4 Architecture',
    icon: '🏗️',
    description: 'Modelo C4: Context, Container, Component, Code',
    nodeTypes: C4_NODE_TYPES,
    validate: (graph) => UnifluxValidator.validate(graph),
    usesCanvas: true,
    supportsAI: true,
    buildAIPrompt: ({ c4Level = 1, tenantKnowledge = '', corrections = '' }) => `
You are a C4 ARCHITECTURE COMPILER.
Your job is to translate software architecture descriptions into a valid JSON FlowGraph using the C4 model.

CURRENT DIAGRAM LEVEL: ${C4_LEVEL_CONTEXT[c4Level] ?? C4_LEVEL_CONTEXT[1]}

C4 ONTOLOGY:
- C4NodeType: "C4_PERSON" | "C4_SYSTEM" | "C4_SYSTEM_EXT" | "C4_CONTAINER_WEB" | "C4_CONTAINER_API" | "C4_CONTAINER_DB" | "C4_CONTAINER_QUEUE" | "C4_COMPONENT" | "C4_BOUNDARY"
- FlowNode: { id: string, type: C4NodeType, label: string, technology?: string, description?: string, external?: boolean, c4Level?: number, position: {x, y} }
- FlowEdge: { id: string, source: string, target: string, label?: string, c4RelType?: "sync"|"async"|"event"|"database"|"external", protocol?: string }
- FlowGraph: { nodes: FlowNode[], edges: FlowEdge[], docType: "c4", c4Level: ${c4Level}, schemaVersion: 3 }

RULES:
1. Every C4_CONTAINER_* node MUST have a non-empty technology field.
2. C4_SYSTEM and C4_CONTAINER_* nodes MUST have a non-empty description.
3. Edges should have protocol label (e.g. "HTTPS/JSON", "SQL queries", "Kafka topic").
4. Set c4RelType on every edge: sync / async / event / database / external.
5. Assign c4Level to each node (its natural level: 1=person/system, 2=container, 3=component).
6. Layout: persons/actors at left (x:0–150), core system center (x:300–700), external right (x:900+).
7. Node IDs: sequential numeric strings "1", "2", "3"...
8. Output language MUST match the user's prompt language exactly.
9. MUST include docType: "c4", c4Level: ${c4Level}, schemaVersion: 3 in the FlowGraph root.

OUTPUT ONLY VALID JSON. No conversational text.
BUSINESS KNOWLEDGE: ${tenantKnowledge}
CORRECTIONS: ${corrections}
`.trim(),
};

// ── Mermaid Mode ────────────────────────────────────────────────────────────
export const MermaidMode: DiagramMode = {
    id: 'mermaid',
    label: 'Mermaid DSL',
    icon: '🧜',
    description: 'Editor de código Mermaid con preview en tiempo real',
    nodeTypes: new Set<string>(),
    validate: (_graph) => ({ isValid: true, errors: [] }), // Mermaid validates its own syntax
    usesCanvas: false,
    supportsAI: false,
    buildAIPrompt: () => '', // not used — Mermaid has no AI generation
};

// ── Mode Registry ───────────────────────────────────────────────────────────
// _ExhaustiveModeCheck ensures every ModeId has an entry here — compile error otherwise
export const MODE_REGISTRY: _ExhaustiveModeCheck = {
    visual: VisualMode,
    c4: C4Mode,
    mermaid: MermaidMode,
};

/** Returns the active mode, defaulting to visual if unknown */
export function getMode(docType?: string): DiagramMode {
    return (MODE_REGISTRY as Record<string, DiagramMode>)[docType ?? 'visual'] ?? VisualMode;
}

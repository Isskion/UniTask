/**
 * UNIFLUX ENGINE - CORE TYPES
 * Essential ontology for visual and semantic logistics flows.
 * schemaVersion: 4 — ModeId, SystemModel, edge contracts, analysis support
 */

// ── V1: Visual flow node types (original — do not modify) ──────────────────
export type NodeType = "START" | "STATE" | "OPERATION" | "TASK" | "DECISION" | "TERMINAL" | "ERROR" | "ENVIRONMENT" | "DATA" | "SUBPROCESS" | "DOCUMENT" | "ICON" | "IMAGE" | "PRO_NODE" | "TEXT";

// ── V3: C4 Architecture node types (additive — does not affect visual/mermaid) ──
export type C4NodeType =
    | "C4_PERSON"           // Human user, internal or external
    | "C4_SYSTEM"           // Software system in focus (blue)
    | "C4_SYSTEM_EXT"       // External software system (gray)
    | "C4_CONTAINER_WEB"    // Web application / SPA
    | "C4_CONTAINER_API"    // API / Backend / REST service
    | "C4_CONTAINER_DB"     // Database
    | "C4_CONTAINER_QUEUE"  // Message queue / Event bus
    | "C4_COMPONENT"        // Module/service inside a container
    | "C4_BOUNDARY";        // System or container boundary (grouping)

export type AnyNodeType = NodeType | C4NodeType;

// ── V4: Mode ID — single source of truth for diagram mode ─────────────────
// Kept as a literal union (not keyof MODE_REGISTRY) to avoid circular import.
// modes.ts enforces the exhaustive check at compile time.
export type ModeId = 'visual' | 'c4' | 'mermaid';

// ── V4: C4 Relationship types for typed edges ─────────────────────────────
export type C4RelationshipType =
    | "sync"       // Synchronous call (solid arrow) — HTTPS, gRPC
    | "async"      // Asynchronous call (dashed arrow) — queues, callbacks
    | "event"      // Event/message (lightning arrow) — Pub/Sub, Kafka
    | "database"   // Database read/write (cylinder arrow)
    | "external";  // External dependency (gray dashed)

// Natural C4 level of a node — used for semantic zoom
export type C4LevelValue = 1 | 2 | 3 | 4;

export interface FlowNode {
    id: string;
    type: AnyNodeType;
    label: string;
    actorId?: string;
    meta?: Record<string, any>;
    position: { x: number; y: number };
    // V1: hierarchy (used by ENVIRONMENT grouping and C4_BOUNDARY)
    parentId?: string;
    width?: number;
    height?: number;
    isLocked?: boolean;
    // V3: C4 extended fields (optional — only populated in C4 diagrams)
    technology?: string;
    description?: string;
    external?: boolean;
    // V4: natural C4 level of this node (enables semantic zoom across levels)
    c4Level?: C4LevelValue;
    // V9: Inter-flow hyperlinking (deep linking)
    targetFlowId?: string;
    targetNodeId?: string;
    // Extra data for custom node behaviors
    additionalData?: Record<string, any>;
}

export interface FlowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    label?: string;
    eventId?: string;
    condition?: string;
    // V4: C4 typed relationships
    c4RelType?: C4RelationshipType;
    protocol?: string;       // e.g. "HTTPS/JSON", "SQL", "gRPC"
    c4Description?: string;  // what this interaction does
    // V5: Richer edge semantics for architecture analysis
    direction?: 'uni' | 'bi';                          // uni = A→B, bi = A↔B
    frequency?: 'sync' | 'eventual' | 'batch';         // when does this happen?
    criticality?: 'low' | 'medium' | 'high';           // failure impact
    // V6: Edge as contract — describes the interaction's data shape
    dataShape?: 'request-response' | 'event' | 'stream'; // interaction pattern
    payload?: string;        // e.g. "OrderEvent{orderId, items, total}"
    sla?: string;            // e.g. "<200ms P99", "eventually consistent"
    // V7: Visual persistence for non-C4 diagrams
    animated?: boolean;
    style?: any;
    markerEnd?: any;
    // V8: Manual path points for draggable edges
    pathPoints?: { x: number; y: number }[];
    // V9: Customizable label styles
    textColor?: string;
    fontFamily?: string;
}

export type MermaidEngine = 'sequence' | 'flowchart';

export interface FlowGraph {
    id: string;
    tenantId: string;
    projectId?: string;
    name: string;
    description?: string;
    nodes: FlowNode[];
    edges: FlowEdge[];
    // V2: Mermaid DSL
    // V4: docType is now typed as ModeId — kept as 'docType' for Firestore compatibility
    docType?: ModeId;
    mermaidCode?: string;
    mermaidEngine?: MermaidEngine;
    // V3: C4 Architecture
    c4Level?: C4LevelValue;
    // V6: UI Preferences
    showGrid?: boolean;
    // V4: schema version for safe future migrations
    schemaVersion?: number;
    metadata: {
        version: string;
        authorId: string;
        createdAt: any;
        updatedAt: any;
    };
}

// ── Validation ─────────────────────────────────────────────────────────────

// V4: progressive severity — info is purely informational, never blocks save
export type ValidationSeverity = "error" | "warning" | "info";

export interface UnifluxError {
    code: string;
    message: string;
    nodeId?: string;
    severity: ValidationSeverity;
}

export interface ValidationResult {
    isValid: boolean;  // true when no 'error' severity issues
    errors: UnifluxError[];
}

// ── V4: SystemModel — semantic intermediate representation ─────────────────
// Decouples the logical architecture model from its visual FlowGraph encoding.
// IA generates SystemModel → validated → transformed to FlowGraph.
// Also enables export to other formats (PlantUML, Structurizr, OpenAPI).

export interface C4Actor {
    id: string;
    name: string;
    description?: string;
    external?: boolean;
}

export interface C4System {
    id: string;
    name: string;
    technology?: string;
    description?: string;
    external?: boolean;
    boundaryId?: string;  // parent boundary grouping
}

export interface C4Container {
    id: string;
    name: string;
    technology: string;
    description?: string;
    systemId?: string;    // parent system
    containerType: 'web' | 'api' | 'db' | 'queue';
}

export interface C4Component {
    id: string;
    name: string;
    technology?: string;
    description?: string;
    containerId?: string; // parent container
}

export interface C4Relation {
    id: string;
    fromId: string;
    toId: string;
    label?: string;
    relType?: C4RelationshipType;
    protocol?: string;
    dataShape?: 'request-response' | 'event' | 'stream';
    payload?: string;
    sla?: string;
}

export interface SystemModel {
    actors: C4Actor[];
    systems: C4System[];
    containers: C4Container[];
    components: C4Component[];
    relations: C4Relation[];
}

// ── V4: Graph Analysis ──────────────────────────────────────────────────────

export interface GraphAnalysis {
    orphanNodeIds: string[];           // nodes with zero connections
    cycles: string[][];                // arrays of node IDs forming cycles
    criticalPaths: string[][];         // longest acyclic paths (source→sink)
    singlePointsOfFailure: string[];   // nodes whose removal disconnects the graph
    disconnectedComponents: string[][];// groups of mutually-unreachable nodes
    maxDepth: number;                  // length of the longest critical path
    density: number;                   // edges / (n*(n-1)), 0→1
}

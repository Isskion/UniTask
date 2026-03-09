/**
 * UNIFLUX ENGINE - CORE TYPES
 * Essential ontology for visual and semantic logistics flows.
 */

export type NodeType = "START" | "STATE" | "OPERATION" | "TASK" | "DECISION" | "TERMINAL" | "ERROR" | "ENVIRONMENT";

export interface FlowNode {
    id: string;
    type: NodeType;
    label: string;
    actorId?: string; // Link to UniTask roles
    meta?: Record<string, any>;
    position: { x: number; y: number }; // React Flow position
    parentId?: string; // For grouping/nesting
    width?: number; // For resizable environments
    height?: number; // For resizable environments
    isLocked?: boolean; // For preventing drag/delete
}

export interface FlowEdge {
    id: string;
    source: string; // From node ID
    target: string; // To node ID
    label?: string; // Visual transition label
    eventId?: string; // Trigger event
    condition?: string; // Step logic (e.g., "status === 'damaged'")
}

export type MermaidEngine = 'sequence' | 'flowchart';

export interface FlowGraph {
    id: string;
    tenantId: string;
    projectId?: string;
    name: string;
    description?: string;
    // Visual flow fields
    nodes: FlowNode[];
    edges: FlowEdge[];
    // V2: Mermaid DSL mode (additive — does not break existing visual flows)
    docType?: 'visual' | 'mermaid';
    mermaidCode?: string;
    mermaidEngine?: MermaidEngine;
    metadata: {
        version: string;
        authorId: string;
        createdAt: any;
        updatedAt: any;
    };
}

export interface UnifluxError {
    code: string; // e.g., "E001"
    message: string;
    nodeId?: string;
    severity: "error" | "warning";
}

export interface ValidationResult {
    isValid: boolean;
    errors: UnifluxError[];
}

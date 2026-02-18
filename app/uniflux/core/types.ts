/**
 * UNIFLUX ENGINE - CORE TYPES
 * Essential ontology for visual and semantic logistics flows.
 */

export type NodeType = "START" | "STATE" | "OPERATION" | "TASK" | "DECISION" | "TERMINAL" | "ERROR";

export interface FlowNode {
    id: string;
    type: NodeType;
    label: string;
    actorId?: string; // Link to UniTask roles
    meta?: Record<string, any>;
    position: { x: number; y: number }; // React Flow position
}

export interface FlowEdge {
    id: string;
    source: string; // From node ID
    target: string; // To node ID
    label?: string; // Visual transition label
    eventId?: string; // Trigger event
    condition?: string; // Step logic (e.g., "status === 'damaged'")
}

export interface FlowGraph {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    nodes: FlowNode[];
    edges: FlowEdge[];
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

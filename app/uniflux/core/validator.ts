import { FlowGraph, ValidationResult, UnifluxError } from "./types";

const C4_CONTAINER_TYPES = new Set(["C4_CONTAINER_WEB", "C4_CONTAINER_API", "C4_CONTAINER_DB", "C4_CONTAINER_QUEUE"]);
const C4_SYSTEM_TYPES = new Set(["C4_SYSTEM", "C4_SYSTEM_EXT"]);

// Which node types are valid at each C4 level
const C4_VALID_AT_LEVEL: Record<number, Set<string>> = {
    1: new Set(["C4_PERSON", "C4_SYSTEM", "C4_SYSTEM_EXT", "C4_BOUNDARY"]),
    2: new Set(["C4_PERSON", "C4_SYSTEM_EXT", "C4_CONTAINER_WEB", "C4_CONTAINER_API", "C4_CONTAINER_DB", "C4_CONTAINER_QUEUE", "C4_BOUNDARY"]),
    3: new Set(["C4_COMPONENT", "C4_CONTAINER_WEB", "C4_CONTAINER_API", "C4_CONTAINER_DB", "C4_CONTAINER_QUEUE", "C4_BOUNDARY"]),
};

/**
 * UNIFLUX VALIDATION ENGINE
 * V4: Progressive validation — error (blocks save) | warning | info
 */
export class UnifluxValidator {

    static validate(graph: FlowGraph): ValidationResult {
        const errors: UnifluxError[] = [];

        if (graph.docType === 'c4') {
            this.c4_001_EmptyDiagram(graph, errors);
            this.c4_002_MissingSystemNode(graph, errors);
            this.c4_003_ContainerTechnology(graph, errors);
            this.c4_004_OrphanNodes(graph, errors);
            this.c4_005_LevelCoherence(graph, errors);
            this.c4_006_MissingDescriptions(graph, errors);
            this.c4_007_DisconnectedContainer(graph, errors);
        } else {
            this.e001_UniqueStart(graph, errors);
            this.e002_MandatoryTerminal(graph, errors);
            this.e003_OrphanNodes(graph, errors);
            this.e004_InvalidTransitions(graph, errors);
            this.e005_InfiniteCycles(graph, errors);
            this.e006_NotClosable(graph, errors);
            this.e007_DeadEnds(graph, errors);
        }

        return {
            isValid: errors.filter(e => e.severity === "error").length === 0,
            errors,
        };
    }

    // ── C4 Rules (progressive severity) ──────────────────────────────────────

    /** C4-001: An empty C4 diagram is just a warning — can be in progress */
    private static c4_001_EmptyDiagram(graph: FlowGraph, errors: UnifluxError[]) {
        if (graph.nodes.filter(n => n.type !== "C4_BOUNDARY").length === 0) {
            errors.push({ code: "C4-001", message: "El diagrama C4 no contiene elementos.", severity: "warning" });
        }
    }

    /** C4-002: L1 without any SOFTWARE_SYSTEM is an error — the whole point of L1 is to show the system */
    private static c4_002_MissingSystemNode(graph: FlowGraph, errors: UnifluxError[]) {
        const viewLevel = graph.c4Level ?? 1;
        if (viewLevel !== 1) return;
        const hasSystems = graph.nodes.some(n => C4_SYSTEM_TYPES.has(n.type));
        const hasContent = graph.nodes.filter(n => n.type !== "C4_BOUNDARY").length > 0;
        if (hasContent && !hasSystems) {
            errors.push({
                code: "C4-002",
                message: "Un diagrama L1 Context debe contener al menos un nodo de Sistema (SOFTWARE_SYSTEM).",
                severity: "error",
            });
        }
    }

    /** C4-003: Container without technology is a warning — better to have it */
    private static c4_003_ContainerTechnology(graph: FlowGraph, errors: UnifluxError[]) {
        graph.nodes.forEach(n => {
            if (C4_CONTAINER_TYPES.has(n.type) && !n.technology) {
                errors.push({
                    code: "C4-003",
                    nodeId: n.id,
                    message: `Container "${n.label}" sin tecnología definida.`,
                    severity: "warning",
                });
            }
        });
    }

    /** C4-004: Orphan nodes (if edges exist) are a warning in C4 — diagrams can be partial */
    private static c4_004_OrphanNodes(graph: FlowGraph, errors: UnifluxError[]) {
        if (graph.edges.length === 0) return;
        graph.nodes.filter(n => n.type !== "C4_BOUNDARY").forEach(node => {
            const connected = graph.edges.some(e => e.source === node.id || e.target === node.id);
            if (!connected) {
                errors.push({ code: "C4-004", nodeId: node.id, message: `"${node.label}" sin conexiones.`, severity: "warning" });
            }
        });
    }

    /** C4-005: Level coherence — wrong node type for the current view level is a warning */
    private static c4_005_LevelCoherence(graph: FlowGraph, errors: UnifluxError[]) {
        const level = graph.c4Level;
        if (!level || !C4_VALID_AT_LEVEL[level]) return;
        const validTypes = C4_VALID_AT_LEVEL[level];
        graph.nodes.forEach(n => {
            if (!validTypes.has(n.type)) {
                errors.push({
                    code: "C4-005",
                    nodeId: n.id,
                    message: `"${n.label}" (${n.type}) no es apropiado para nivel L${level}.`,
                    severity: "warning",
                });
            }
        });
    }

    /** C4-006: Missing descriptions on key elements — informational only */
    private static c4_006_MissingDescriptions(graph: FlowGraph, errors: UnifluxError[]) {
        const needsDescription = [...Array.from(C4_SYSTEM_TYPES), ...Array.from(C4_CONTAINER_TYPES), "C4_COMPONENT"];
        graph.nodes.forEach(n => {
            if (needsDescription.includes(n.type) && !n.description) {
                errors.push({
                    code: "C4-006",
                    nodeId: n.id,
                    message: `"${n.label}" sin descripción de responsabilidad.`,
                    severity: "info",
                });
            }
        });
    }

    /** C4-007: L2 container with no connections at all is an error — containers must communicate */
    private static c4_007_DisconnectedContainer(graph: FlowGraph, errors: UnifluxError[]) {
        const viewLevel = graph.c4Level ?? 1;
        if (viewLevel !== 2) return;
        if (graph.edges.length === 0) return;
        graph.nodes.filter(n => C4_CONTAINER_TYPES.has(n.type)).forEach(n => {
            const connected = graph.edges.some(e => e.source === n.id || e.target === n.id);
            if (!connected) {
                errors.push({
                    code: "C4-007",
                    nodeId: n.id,
                    message: `Container "${n.label}" sin conexiones en diagrama L2.`,
                    severity: "error",
                });
            }
        });
    }

    // ── Visual Flow Rules (V1, original — do not modify) ────────────────────

    private static e001_UniqueStart(graph: FlowGraph, errors: UnifluxError[]) {
        const startNodes = graph.nodes.filter(n => n.type === "START");
        if (startNodes.length === 0) {
            errors.push({ code: "E001", message: "No se encontró un nodo de INICIO (START).", severity: "error" });
        } else if (startNodes.length > 1) {
            errors.push({ code: "E001", message: "Solo puede existir un nodo de INICIO (START) por flujo.", severity: "error" });
        }
    }

    private static e002_MandatoryTerminal(graph: FlowGraph, errors: UnifluxError[]) {
        if (graph.nodes.filter(n => n.type === "TERMINAL").length === 0) {
            errors.push({ code: "E002", message: "El flujo debe contener al menos un nodo de CIERRE (TERMINAL).", severity: "error" });
        }
    }

    private static e003_OrphanNodes(graph: FlowGraph, errors: UnifluxError[]) {
        graph.nodes.forEach(node => {
            const connected = graph.edges.some(e => e.source === node.id || e.target === node.id);
            if (!connected) {
                errors.push({ code: "E003", nodeId: node.id, message: `El nodo "${node.label}" está huérfano (sin conexiones).`, severity: "error" });
            }
        });
    }

    private static e004_InvalidTransitions(graph: FlowGraph, errors: UnifluxError[]) {
        graph.edges.forEach(edge => {
            const source = graph.nodes.find(n => n.id === edge.source);
            const target = graph.nodes.find(n => n.id === edge.target);
            if (!source || !target) return;
            if (source.type === "TERMINAL") {
                errors.push({ code: "E004", nodeId: source.id, message: `TERMINAL "${source.label}" no puede tener transiciones de salida.`, severity: "error" });
            }
            if (target.type === "START") {
                errors.push({ code: "E004", nodeId: target.id, message: `START "${target.label}" no puede tener transiciones de entrada.`, severity: "error" });
            }
        });
    }

    private static e005_InfiniteCycles(graph: FlowGraph, errors: UnifluxError[]) {
        const visited = new Set<string>();
        const recStack = new Set<string>();
        const hasCycle = (nodeId: string): boolean => {
            visited.add(nodeId);
            recStack.add(nodeId);
            for (const neighborId of graph.edges.filter(e => e.source === nodeId).map(e => e.target)) {
                if (!visited.has(neighborId)) { if (hasCycle(neighborId)) return true; }
                else if (recStack.has(neighborId)) return true;
            }
            recStack.delete(nodeId);
            return false;
        };
        graph.nodes.forEach(node => {
            if (!visited.has(node.id) && hasCycle(node.id)) {
                errors.push({ code: "E005", message: "Se detectó un posible ciclo infinito en el flujo.", severity: "warning" });
            }
        });
    }

    private static e006_NotClosable(graph: FlowGraph, errors: UnifluxError[]) {
        const terminalIds = new Set(graph.nodes.filter(n => n.type === "TERMINAL").map(n => n.id));
        graph.nodes.forEach(node => {
            if (node.type === "TERMINAL") return;
            if (!this.bfsToTerminal(node.id, graph, terminalIds)) {
                errors.push({ code: "E006", nodeId: node.id, message: `El nodo "${node.label}" no puede alcanzar un cierre (TERMINAL).`, severity: "error" });
            }
        });
    }

    private static e007_DeadEnds(graph: FlowGraph, errors: UnifluxError[]) {
        graph.nodes.forEach(node => {
            if (node.type === "TERMINAL") return;
            if (!graph.edges.some(e => e.source === node.id)) {
                errors.push({ code: "E007", nodeId: node.id, message: `El nodo "${node.label}" es un callejón sin salida.`, severity: "error" });
            }
        });
    }

    private static bfsToTerminal(startId: string, graph: FlowGraph, terminalIds: Set<string>): boolean {
        const queue = [startId];
        const visited = new Set<string>();
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (terminalIds.has(current)) return true;
            visited.add(current);
            for (const neighbor of graph.edges.filter(e => e.source === current).map(e => e.target)) {
                if (!visited.has(neighbor)) queue.push(neighbor);
            }
        }
        return false;
    }
}

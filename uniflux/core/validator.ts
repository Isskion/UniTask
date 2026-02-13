import { FlowGraph, ValidationResult, UnifluxError } from "./types";

/**
 * UNIFLUX VALIDATION ENGINE
 * Pure functions to enforce mathematical and operational integrity of flows.
 */

export class UnifluxValidator {
    /**
     * Main entry point for validating a flow graph.
     */
    static validate(graph: FlowGraph): ValidationResult {
        const errors: UnifluxError[] = [];

        // Rule Runners
        this.checkE001_UniqueStart(graph, errors);
        this.checkE002_MandatoryTerminal(graph, errors);
        this.checkE003_OrphanNodes(graph, errors);
        this.checkE004_InvalidTransitions(graph, errors);
        this.checkE005_InfiniteCycles(graph, errors);
        this.checkE006_NotClosable(graph, errors);
        this.checkE007_DeadEnds(graph, errors);

        return {
            isValid: errors.filter((e) => e.severity === "error").length === 0,
            errors,
        };
    }

    /**
     * E001: Exactly one START node required.
     */
    private static checkE001_UniqueStart(graph: FlowGraph, errors: UnifluxError[]) {
        const startNodes = graph.nodes.filter((n) => n.type === "START");
        if (startNodes.length === 0) {
            errors.push({
                code: "E001",
                message: "No se encontró un nodo de INICIO (START).",
                severity: "error",
            });
        } else if (startNodes.length > 1) {
            errors.push({
                code: "E001",
                message: "Solo puede existir un nodo de INICIO (START) por flujo.",
                severity: "error",
            });
        }
    }

    /**
     * E002: Flow must reach at least one TERMINAL node.
     */
    private static checkE002_MandatoryTerminal(graph: FlowGraph, errors: UnifluxError[]) {
        const terminalNodes = graph.nodes.filter((n) => n.type === "TERMINAL");
        if (terminalNodes.length === 0) {
            errors.push({
                code: "E002",
                message: "El flujo debe contener al menos un nodo de CIERRE (TERMINAL).",
                severity: "error",
            });
        }
    }

    /**
     * E003: Detect nodes with no connections.
     */
    private static checkE003_OrphanNodes(graph: FlowGraph, errors: UnifluxError[]) {
        graph.nodes.forEach((node) => {
            const isSource = graph.edges.some((e) => e.source === node.id);
            const isTarget = graph.edges.some((e) => e.target === node.id);

            if (!isSource && !isTarget) {
                errors.push({
                    code: "E003",
                    nodeId: node.id,
                    message: `El nodo "${node.label}" está huérfano (sin conexiones).`,
                    severity: "error",
                });
            }
        });
    }

    /**
     * E004: Invalid Transitions based on Node Types.
     */
    private static checkE004_InvalidTransitions(graph: FlowGraph, errors: UnifluxError[]) {
        graph.edges.forEach((edge) => {
            const source = graph.nodes.find((n) => n.id === edge.source);
            const target = graph.nodes.find((n) => n.id === edge.target);

            if (!source || !target) return;

            // 1. TERMINAL cannot have outgoing edges
            if (source.type === "TERMINAL") {
                errors.push({
                    code: "E004",
                    nodeId: source.id,
                    message: `El nodo TERMINAL "${source.label}" no puede tener transiciones de salida.`,
                    severity: "error",
                });
            }

            // 2. START cannot have incoming edges
            if (target.type === "START") {
                errors.push({
                    code: "E004",
                    nodeId: target.id,
                    message: `El nodo START "${target.label}" no puede tener transiciones de entrada.`,
                    severity: "error",
                });
            }
        });
    }

    /**
     * E005: Detect Cycles (Potential Blind Infinite Loops).
     */
    private static checkE005_InfiniteCycles(graph: FlowGraph, errors: UnifluxError[]) {
        const visited = new Set<string>();
        const recStack = new Set<string>();

        const hasCycle = (nodeId: string): boolean => {
            visited.add(nodeId);
            recStack.add(nodeId);

            const neighbors = graph.edges.filter((e) => e.source === nodeId).map((e) => e.target);
            for (const neighborId of neighbors) {
                if (!visited.has(neighborId)) {
                    if (hasCycle(neighborId)) return true;
                } else if (recStack.has(neighborId)) {
                    return true;
                }
            }

            recStack.delete(nodeId);
            return false;
        };

        graph.nodes.forEach((node) => {
            if (!visited.has(node.id)) {
                if (hasCycle(node.id)) {
                    errors.push({
                        code: "E005",
                        message: "Se detectó un posible ciclo infinito en el flujo.",
                        severity: "warning",
                    });
                }
            }
        });
    }

    /**
     * E006: Analysis of closability. Every node must be able to reach a TERMINAL.
     */
    private static checkE006_NotClosable(graph: FlowGraph, errors: UnifluxError[]) {
        const terminalIds = new Set(graph.nodes.filter((n) => n.type === "TERMINAL").map((n) => n.id));

        graph.nodes.forEach((node) => {
            if (node.type === "TERMINAL") return;

            const canReachTerminal = this.bfsToTerminal(node.id, graph, terminalIds);
            if (!canReachTerminal) {
                errors.push({
                    code: "E006",
                    nodeId: node.id,
                    message: `El nodo "${node.label}" no puede alcanzar un cierre (TERMINAL).`,
                    severity: "error",
                });
            }
        });
    }

    /**
     * E007: Detect nodes with no output (unless they are TERMINAL).
     */
    private static checkE007_DeadEnds(graph: FlowGraph, errors: UnifluxError[]) {
        graph.nodes.forEach((node) => {
            if (node.type === "TERMINAL") return;

            const hasOutput = graph.edges.some((e) => e.source === node.id);
            if (!hasOutput) {
                errors.push({
                    code: "E007",
                    nodeId: node.id,
                    message: `El nodo "${node.label}" es un callejón sin salida (no termina en un cierre).`,
                    severity: "error",
                });
            }
        });
    }

    // --- Helper Methods ---

    private static bfsToTerminal(startId: string, graph: FlowGraph, terminalIds: Set<string>): boolean {
        const queue = [startId];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (terminalIds.has(current)) return true;

            visited.add(current);
            const neighbors = graph.edges.filter((e) => e.source === current).map((e) => e.target);
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    queue.push(neighbor);
                }
            }
        }
        return false;
    }
}

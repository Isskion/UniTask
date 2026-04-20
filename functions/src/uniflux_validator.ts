const C4_CONTAINER_TYPES = new Set(["C4_CONTAINER_WEB", "C4_CONTAINER_API", "C4_CONTAINER_DB", "C4_CONTAINER_QUEUE"]);
const C4_L1_VALID = new Set(["C4_PERSON", "C4_SYSTEM", "C4_SYSTEM_EXT", "C4_BOUNDARY"]);
const C4_L2_VALID = new Set(["C4_PERSON", "C4_SYSTEM_EXT", "C4_CONTAINER_WEB", "C4_CONTAINER_API", "C4_CONTAINER_DB", "C4_CONTAINER_QUEUE", "C4_BOUNDARY"]);
const C4_L3_VALID = new Set(["C4_COMPONENT", "C4_CONTAINER_WEB", "C4_CONTAINER_API", "C4_CONTAINER_DB", "C4_CONTAINER_QUEUE", "C4_BOUNDARY"]);

export class UnifluxValidator {
    static validate(graph: any) {
        const errors: any[] = [];

        if (graph.docType === 'c4') {
            this.c4_001_EmptyDiagram(graph, errors);
            this.c4_002_MissingSystemNode(graph, errors);
            this.c4_003_ContainerTechnology(graph, errors);
            this.c4_004_OrphanNodes(graph, errors);
            this.c4_005_LevelCoherence(graph, errors);
            this.c4_007_DisconnectedContainer(graph, errors);
        } else {
            this.checkE001_UniqueStart(graph, errors);
            this.checkE002_MandatoryTerminal(graph, errors);
            this.checkE003_OrphanNodes(graph, errors);
            this.checkE004_InvalidTransitions(graph, errors);
            this.checkE005_InfiniteCycles(graph, errors);
            this.checkE006_NotClosable(graph, errors);
            this.checkE007_DeadEnds(graph, errors);
        }

        return {
            isValid: errors.filter((e: any) => e.severity === "error").length === 0,
            errors,
        };
    }

    // ── C4 Rules (progressive severity) ──────────────────────────────────

    private static c4_001_EmptyDiagram(graph: any, errors: any[]) {
        if ((graph.nodes || []).filter((n: any) => n.type !== "C4_BOUNDARY").length === 0) {
            errors.push({ code: "C4-001", message: "C4 diagram has no elements.", severity: "warning" });
        }
    }

    private static c4_002_MissingSystemNode(graph: any, errors: any[]) {
        const level = graph.c4Level ?? 1;
        if (level !== 1) return;
        const hasContent = (graph.nodes || []).filter((n: any) => n.type !== "C4_BOUNDARY").length > 0;
        const hasSystems = (graph.nodes || []).some((n: any) => n.type === "C4_SYSTEM" || n.type === "C4_SYSTEM_EXT");
        if (hasContent && !hasSystems) {
            errors.push({ code: "C4-002", message: "L1 Context diagram must have at least one SOFTWARE_SYSTEM node.", severity: "error" });
        }
    }

    private static c4_003_ContainerTechnology(graph: any, errors: any[]) {
        (graph.nodes || []).forEach((n: any) => {
            if (C4_CONTAINER_TYPES.has(n.type) && !n.technology) {
                errors.push({ code: "C4-003", nodeId: n.id, message: `Container "${n.label}" has no technology defined.`, severity: "warning" });
            }
        });
    }

    private static c4_004_OrphanNodes(graph: any, errors: any[]) {
        if (!graph.edges || graph.edges.length === 0) return;
        (graph.nodes || []).filter((n: any) => n.type !== "C4_BOUNDARY").forEach((node: any) => {
            const connected = (graph.edges || []).some((e: any) => e.source === node.id || e.target === node.id);
            if (!connected) {
                errors.push({ code: "C4-004", nodeId: node.id, message: `Element "${node.label}" has no connections.`, severity: "warning" });
            }
        });
    }

    private static c4_005_LevelCoherence(graph: any, errors: any[]) {
        const level = graph.c4Level;
        if (!level) return;
        const validTypes = level === 1 ? C4_L1_VALID : level === 2 ? C4_L2_VALID : C4_L3_VALID;
        (graph.nodes || []).forEach((n: any) => {
            if (!validTypes.has(n.type)) {
                errors.push({ code: "C4-005", nodeId: n.id, message: `"${n.label}" (${n.type}) not appropriate for L${level}.`, severity: "warning" });
            }
        });
    }

    private static c4_007_DisconnectedContainer(graph: any, errors: any[]) {
        const level = graph.c4Level ?? 1;
        if (level !== 2 || !graph.edges || graph.edges.length === 0) return;
        (graph.nodes || []).filter((n: any) => C4_CONTAINER_TYPES.has(n.type)).forEach((n: any) => {
            const connected = (graph.edges || []).some((e: any) => e.source === n.id || e.target === n.id);
            if (!connected) {
                errors.push({ code: "C4-007", nodeId: n.id, message: `Container "${n.label}" has no connections in L2 diagram.`, severity: "error" });
            }
        });
    }

    private static checkE001_UniqueStart(graph: any, errors: any[]) {
        const startNodes = (graph.nodes || []).filter((n: any) => n.type === "START");
        if (startNodes.length === 0) {
            errors.push({ code: "E001", message: "No START node found.", severity: "error" });
        } else if (startNodes.length > 1) {
            errors.push({ code: "E001", message: "Multiple START nodes found.", severity: "error" });
        }
    }

    private static checkE002_MandatoryTerminal(graph: any, errors: any[]) {
        const terminalNodes = (graph.nodes || []).filter((n: any) => n.type === "TERMINAL");
        if (terminalNodes.length === 0) {
            errors.push({ code: "E002", message: "At least one TERMINAL node is required.", severity: "error" });
        }
    }

    private static checkE003_OrphanNodes(graph: any, errors: any[]) {
        (graph.nodes || []).forEach((node: any) => {
            const isSource = (graph.edges || []).some((e: any) => e.source === node.id);
            const isTarget = (graph.edges || []).some((e: any) => e.target === node.id);
            if (!isSource && !isTarget) {
                errors.push({ code: "E003", nodeId: node.id, message: `Node "${node.label}" is orphaned.`, severity: "error" });
            }
        });
    }

    private static checkE004_InvalidTransitions(graph: any, errors: any[]) {
        (graph.edges || []).forEach((edge: any) => {
            const source = graph.nodes.find((n: any) => n.id === edge.source);
            const target = graph.nodes.find((n: any) => n.id === edge.target);
            if (!source || !target) return;
            if (source.type === "TERMINAL") {
                errors.push({ code: "E004", nodeId: source.id, message: "TERMINAL cannot have outputs.", severity: "error" });
            }
            if (target.type === "START") {
                errors.push({ code: "E004", nodeId: target.id, message: "START cannot have inputs.", severity: "error" });
            }
        });
    }

    private static checkE005_InfiniteCycles(graph: any, errors: any[]) {
        const visited = new Set<string>();
        const recStack = new Set<string>();
        const hasCycle = (nodeId: string): boolean => {
            visited.add(nodeId);
            recStack.add(nodeId);
            const neighbors = (graph.edges || []).filter((e: any) => e.source === nodeId).map((e: any) => e.target);
            for (const neighborId of neighbors) {
                if (!visited.has(neighborId)) {
                    if (hasCycle(neighborId)) return true;
                } else if (recStack.has(neighborId)) return true;
            }
            recStack.delete(nodeId);
            return false;
        };
        (graph.nodes || []).forEach((node: any) => {
            if (!visited.has(node.id)) {
                if (hasCycle(node.id)) {
                    errors.push({ code: "E005", message: "Infinite cycle detected.", severity: "warning" });
                }
            }
        });
    }

    private static checkE006_NotClosable(graph: any, errors: any[]) {
        const terminalIds = new Set<string>((graph.nodes || []).filter((n: any) => n.type === "TERMINAL").map((n: any) => n.id as string));
        (graph.nodes || []).forEach((node: any) => {
            if (node.type === "TERMINAL") return;
            const canReachTerminal = this.bfsToTerminal(node.id, graph, terminalIds);
            if (!canReachTerminal) {
                errors.push({ code: "E006", nodeId: node.id, message: `Node "${node.label}" cannot reach TERMINAL.`, severity: "error" });
            }
        });
    }

    private static checkE007_DeadEnds(graph: any, errors: any[]) {
        (graph.nodes || []).forEach((node: any) => {
            if (node.type === "TERMINAL") return;
            const hasOutput = (graph.edges || []).some((e: any) => e.source === node.id);
            if (!hasOutput) {
                errors.push({ code: "E007", nodeId: node.id, message: `Node "${node.label}" is a dead end.`, severity: "error" });
            }
        });
    }

    private static bfsToTerminal(startId: string, graph: any, terminalIds: Set<string>) {
        const queue = [startId];
        const visited = new Set<string>();
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (terminalIds.has(current)) return true;
            visited.add(current);
            const neighbors = (graph.edges || []).filter((e: any) => e.source === current).map((e: any) => e.target);
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) queue.push(neighbor);
            }
        }
        return false;
    }
}

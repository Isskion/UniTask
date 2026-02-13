export class UnifluxValidator {
    static validate(graph: any) {
        const errors: any[] = [];
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

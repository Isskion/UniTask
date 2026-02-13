"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifluxValidator = void 0;
class UnifluxValidator {
    static validate(graph) {
        const errors = [];
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
    static checkE001_UniqueStart(graph, errors) {
        const startNodes = (graph.nodes || []).filter((n) => n.type === "START");
        if (startNodes.length === 0) {
            errors.push({ code: "E001", message: "No START node found.", severity: "error" });
        }
        else if (startNodes.length > 1) {
            errors.push({ code: "E001", message: "Multiple START nodes found.", severity: "error" });
        }
    }
    static checkE002_MandatoryTerminal(graph, errors) {
        const terminalNodes = (graph.nodes || []).filter((n) => n.type === "TERMINAL");
        if (terminalNodes.length === 0) {
            errors.push({ code: "E002", message: "At least one TERMINAL node is required.", severity: "error" });
        }
    }
    static checkE003_OrphanNodes(graph, errors) {
        (graph.nodes || []).forEach((node) => {
            const isSource = (graph.edges || []).some((e) => e.source === node.id);
            const isTarget = (graph.edges || []).some((e) => e.target === node.id);
            if (!isSource && !isTarget) {
                errors.push({ code: "E003", nodeId: node.id, message: `Node "${node.label}" is orphaned.`, severity: "error" });
            }
        });
    }
    static checkE004_InvalidTransitions(graph, errors) {
        (graph.edges || []).forEach((edge) => {
            const source = graph.nodes.find((n) => n.id === edge.source);
            const target = graph.nodes.find((n) => n.id === edge.target);
            if (!source || !target)
                return;
            if (source.type === "TERMINAL") {
                errors.push({ code: "E004", nodeId: source.id, message: "TERMINAL cannot have outputs.", severity: "error" });
            }
            if (target.type === "START") {
                errors.push({ code: "E004", nodeId: target.id, message: "START cannot have inputs.", severity: "error" });
            }
        });
    }
    static checkE005_InfiniteCycles(graph, errors) {
        const visited = new Set();
        const recStack = new Set();
        const hasCycle = (nodeId) => {
            visited.add(nodeId);
            recStack.add(nodeId);
            const neighbors = (graph.edges || []).filter((e) => e.source === nodeId).map((e) => e.target);
            for (const neighborId of neighbors) {
                if (!visited.has(neighborId)) {
                    if (hasCycle(neighborId))
                        return true;
                }
                else if (recStack.has(neighborId))
                    return true;
            }
            recStack.delete(nodeId);
            return false;
        };
        (graph.nodes || []).forEach((node) => {
            if (!visited.has(node.id)) {
                if (hasCycle(node.id)) {
                    errors.push({ code: "E005", message: "Infinite cycle detected.", severity: "warning" });
                }
            }
        });
    }
    static checkE006_NotClosable(graph, errors) {
        const terminalIds = new Set((graph.nodes || []).filter((n) => n.type === "TERMINAL").map((n) => n.id));
        (graph.nodes || []).forEach((node) => {
            if (node.type === "TERMINAL")
                return;
            const canReachTerminal = this.bfsToTerminal(node.id, graph, terminalIds);
            if (!canReachTerminal) {
                errors.push({ code: "E006", nodeId: node.id, message: `Node "${node.label}" cannot reach TERMINAL.`, severity: "error" });
            }
        });
    }
    static checkE007_DeadEnds(graph, errors) {
        (graph.nodes || []).forEach((node) => {
            if (node.type === "TERMINAL")
                return;
            const hasOutput = (graph.edges || []).some((e) => e.source === node.id);
            if (!hasOutput) {
                errors.push({ code: "E007", nodeId: node.id, message: `Node "${node.label}" is a dead end.`, severity: "error" });
            }
        });
    }
    static bfsToTerminal(startId, graph, terminalIds) {
        const queue = [startId];
        const visited = new Set();
        while (queue.length > 0) {
            const current = queue.shift();
            if (terminalIds.has(current))
                return true;
            visited.add(current);
            const neighbors = (graph.edges || []).filter((e) => e.source === current).map((e) => e.target);
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor))
                    queue.push(neighbor);
            }
        }
        return false;
    }
}
exports.UnifluxValidator = UnifluxValidator;
//# sourceMappingURL=uniflux_validator.js.map
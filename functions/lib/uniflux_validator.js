"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifluxValidator = void 0;
const C4_CONTAINER_TYPES = new Set(["C4_CONTAINER_WEB", "C4_CONTAINER_API", "C4_CONTAINER_DB", "C4_CONTAINER_QUEUE"]);
const C4_L1_VALID = new Set(["C4_PERSON", "C4_SYSTEM", "C4_SYSTEM_EXT", "C4_BOUNDARY"]);
const C4_L2_VALID = new Set(["C4_PERSON", "C4_SYSTEM_EXT", "C4_CONTAINER_WEB", "C4_CONTAINER_API", "C4_CONTAINER_DB", "C4_CONTAINER_QUEUE", "C4_BOUNDARY"]);
const C4_L3_VALID = new Set(["C4_COMPONENT", "C4_CONTAINER_WEB", "C4_CONTAINER_API", "C4_CONTAINER_DB", "C4_CONTAINER_QUEUE", "C4_BOUNDARY"]);
class UnifluxValidator {
    static validate(graph) {
        const errors = [];
        if (graph.docType === 'c4') {
            this.c4_001_EmptyDiagram(graph, errors);
            this.c4_002_MissingSystemNode(graph, errors);
            this.c4_003_ContainerTechnology(graph, errors);
            this.c4_004_OrphanNodes(graph, errors);
            this.c4_005_LevelCoherence(graph, errors);
            this.c4_007_DisconnectedContainer(graph, errors);
        }
        else {
            this.checkE001_UniqueStart(graph, errors);
            this.checkE002_MandatoryTerminal(graph, errors);
            this.checkE003_OrphanNodes(graph, errors);
            this.checkE004_InvalidTransitions(graph, errors);
            this.checkE005_InfiniteCycles(graph, errors);
            this.checkE006_NotClosable(graph, errors);
            this.checkE007_DeadEnds(graph, errors);
        }
        return {
            isValid: errors.filter((e) => e.severity === "error").length === 0,
            errors,
        };
    }
    // ── C4 Rules (progressive severity) ──────────────────────────────────
    static c4_001_EmptyDiagram(graph, errors) {
        if ((graph.nodes || []).filter((n) => n.type !== "C4_BOUNDARY").length === 0) {
            errors.push({ code: "C4-001", message: "C4 diagram has no elements.", severity: "warning" });
        }
    }
    static c4_002_MissingSystemNode(graph, errors) {
        var _a;
        const level = (_a = graph.c4Level) !== null && _a !== void 0 ? _a : 1;
        if (level !== 1)
            return;
        const hasContent = (graph.nodes || []).filter((n) => n.type !== "C4_BOUNDARY").length > 0;
        const hasSystems = (graph.nodes || []).some((n) => n.type === "C4_SYSTEM" || n.type === "C4_SYSTEM_EXT");
        if (hasContent && !hasSystems) {
            errors.push({ code: "C4-002", message: "L1 Context diagram must have at least one SOFTWARE_SYSTEM node.", severity: "error" });
        }
    }
    static c4_003_ContainerTechnology(graph, errors) {
        (graph.nodes || []).forEach((n) => {
            if (C4_CONTAINER_TYPES.has(n.type) && !n.technology) {
                errors.push({ code: "C4-003", nodeId: n.id, message: `Container "${n.label}" has no technology defined.`, severity: "warning" });
            }
        });
    }
    static c4_004_OrphanNodes(graph, errors) {
        if (!graph.edges || graph.edges.length === 0)
            return;
        (graph.nodes || []).filter((n) => n.type !== "C4_BOUNDARY").forEach((node) => {
            const connected = (graph.edges || []).some((e) => e.source === node.id || e.target === node.id);
            if (!connected) {
                errors.push({ code: "C4-004", nodeId: node.id, message: `Element "${node.label}" has no connections.`, severity: "warning" });
            }
        });
    }
    static c4_005_LevelCoherence(graph, errors) {
        const level = graph.c4Level;
        if (!level)
            return;
        const validTypes = level === 1 ? C4_L1_VALID : level === 2 ? C4_L2_VALID : C4_L3_VALID;
        (graph.nodes || []).forEach((n) => {
            if (!validTypes.has(n.type)) {
                errors.push({ code: "C4-005", nodeId: n.id, message: `"${n.label}" (${n.type}) not appropriate for L${level}.`, severity: "warning" });
            }
        });
    }
    static c4_007_DisconnectedContainer(graph, errors) {
        var _a;
        const level = (_a = graph.c4Level) !== null && _a !== void 0 ? _a : 1;
        if (level !== 2 || !graph.edges || graph.edges.length === 0)
            return;
        (graph.nodes || []).filter((n) => C4_CONTAINER_TYPES.has(n.type)).forEach((n) => {
            const connected = (graph.edges || []).some((e) => e.source === n.id || e.target === n.id);
            if (!connected) {
                errors.push({ code: "C4-007", nodeId: n.id, message: `Container "${n.label}" has no connections in L2 diagram.`, severity: "error" });
            }
        });
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
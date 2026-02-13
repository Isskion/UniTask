
/**
 * STANDALONE TEST SCRIPT FOR UNIFLUX VALIDATOR
 * (Copy of validator logic inside to avoid module load issues in this environment)
 */

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
        const startNodes = graph.nodes.filter((n) => n.type === "START");
        if (startNodes.length === 0) {
            errors.push({ code: "E001", message: "No se encontró un nodo de INICIO (START).", severity: "error" });
        } else if (startNodes.length > 1) {
            errors.push({ code: "E001", message: "Solo puede existir un nodo de INICIO (START) por flujo.", severity: "error" });
        }
    }

    static checkE002_MandatoryTerminal(graph, errors) {
        const terminalNodes = graph.nodes.filter((n) => n.type === "TERMINAL");
        if (terminalNodes.length === 0) {
            errors.push({ code: "E002", message: "El flujo debe contener al menos un nodo de CIERRE (TERMINAL).", severity: "error" });
        }
    }

    static checkE003_OrphanNodes(graph, errors) {
        graph.nodes.forEach((node) => {
            const isSource = graph.edges.some((e) => e.source === node.id);
            const isTarget = graph.edges.some((e) => e.target === node.id);
            if (!isSource && !isTarget) {
                errors.push({ code: "E003", nodeId: node.id, message: `El nodo "${node.label}" está huérfano.`, severity: "error" });
            }
        });
    }

    static checkE004_InvalidTransitions(graph, errors) {
        graph.edges.forEach((edge) => {
            const source = graph.nodes.find((n) => n.id === edge.source);
            const target = graph.nodes.find((n) => n.id === edge.target);
            if (!source || !target) return;
            if (source.type === "TERMINAL") {
                errors.push({ code: "E004", nodeId: source.id, message: `TERMINAL "${source.label}" no puede tener salida.`, severity: "error" });
            }
            if (target.type === "START") {
                errors.push({ code: "E004", nodeId: target.id, message: `START "${target.label}" no puede tener entrada.`, severity: "error" });
            }
        });
    }

    static checkE005_InfiniteCycles(graph, errors) {
        const visited = new Set();
        const recStack = new Set();
        const hasCycle = (nodeId) => {
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
                    errors.push({ code: "E005", message: "Se detectó un ciclo infinito.", severity: "warning" });
                }
            }
        });
    }

    static checkE006_NotClosable(graph, errors) {
        const terminalIds = new Set(graph.nodes.filter((n) => n.type === "TERMINAL").map((n) => n.id));
        graph.nodes.forEach((node) => {
            if (node.type === "TERMINAL") return;
            const canReachTerminal = this.bfsToTerminal(node.id, graph, terminalIds);
            if (!canReachTerminal) {
                errors.push({ code: "E006", nodeId: node.id, message: `El nodo "${node.label}" no puede alcanzar TERMINAL.`, severity: "error" });
            }
        });
    }

    static checkE007_DeadEnds(graph, errors) {
        graph.nodes.forEach((node) => {
            if (node.type === "TERMINAL") return;
            const hasOutput = graph.edges.some((e) => e.source === node.id);
            if (!hasOutput) {
                errors.push({ code: "E007", nodeId: node.id, message: `El nodo "${node.label}" es un callejón sin salida.`, severity: "error" });
            }
        });
    }

    static bfsToTerminal(startId, graph, terminalIds) {
        const queue = [startId];
        const visited = new Set();
        while (queue.length > 0) {
            const current = queue.shift();
            if (terminalIds.has(current)) return true;
            visited.add(current);
            const neighbors = graph.edges.filter((e) => e.source === current).map((e) => e.target);
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) queue.push(neighbor);
            }
        }
        return false;
    }
}

// --- TEST RUNNER ---

const testGraphs = [
    {
        name: 'Valid Graph',
        graph: {
            nodes: [
                { id: '1', type: 'START', label: 'Inicio' },
                { id: '2', type: 'TASK', label: 'Paso 1' },
                { id: '3', type: 'TERMINAL', label: 'Fin' }
            ],
            edges: [
                { id: 'e1', source: '1', target: '2' },
                { id: 'e2', source: '2', target: '3' }
            ]
        }
    },
    {
        name: 'Invalid: No Start',
        graph: {
            nodes: [
                { id: '2', type: 'TASK', label: 'Huerfano' },
                { id: '3', type: 'TERMINAL', label: 'Fin' }
            ],
            edges: [{ id: 'e2', source: '2', target: '3' }]
        }
    },
    {
        name: 'Invalid: Cycle & No Terminal reach',
        graph: {
            nodes: [
                { id: '1', type: 'START', label: 'Inicio' },
                { id: '2', type: 'TASK', label: 'Loop A' },
                { id: '3', type: 'TASK', label: 'Loop B' },
                { id: '4', type: 'TERMINAL', label: 'Fin Real' }
            ],
            edges: [
                { id: 'e1', source: '1', target: '2' },
                { id: 'e2', source: '2', target: '3' },
                { id: 'e3', source: '3', target: '2' } // Cycle between 2 and 3, none reach 4
            ]
        }
    }
];

console.log('--- RUNNING UNIFLUX VALIDATOR TESTS ---\n');

testGraphs.forEach(test => {
    console.log(`Testing: ${test.name}`);
    const result = UnifluxValidator.validate(test.graph);
    if (result.isValid) {
        console.log('✅ Flow is VALID');
    } else {
        console.log('❌ Flow is INVALID');
        result.errors.forEach(err => {
            console.log(`   [${err.code}] ${err.severity.toUpperCase()}: ${err.message}`);
        });
    }
    console.log('');
});

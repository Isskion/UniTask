
const { UnifluxValidator } = require('./uniflux/core/validator');

// MOCK DATA: UNIFLUX FLOW GRAPH
const validGraph = {
    id: 'test-1',
    nodes: [
        { id: '1', type: 'START', label: 'Inicio' },
        { id: '2', type: 'TASK', label: 'Cargar Camión' },
        { id: '3', type: 'TERMINAL', label: 'Fin' }
    ],
    edges: [
        { id: 'e1', source: '1', target: '2' },
        { id: 'e2', source: '2', target: '3' }
    ]
};

const invalidGraphOrphan = {
    id: 'test-2',
    nodes: [
        { id: '1', type: 'START', label: 'Inicio' },
        { id: '2', type: 'TASK', label: 'Cargar Camión' },
        { id: '3', type: 'TERMINAL', label: 'Fin' },
        { id: '4', type: 'STATE', label: 'Nodo Huérfano' }
    ],
    edges: [
        { id: 'e1', source: '1', target: '2' },
        { id: 'e2', source: '2', target: '3' }
    ]
};

const invalidGraphCycle = {
    id: 'test-3',
    nodes: [
        { id: '1', type: 'START', label: 'Inicio' },
        { id: '2', type: 'TASK', label: 'Paso 1' },
        { id: '3', type: 'TASK', label: 'Paso 2' },
        { id: '4', type: 'TERMINAL', label: 'Fin' }
    ],
    edges: [
        { id: 'e1', source: '1', target: '2' },
        { id: 'e2', source: '2', target: '3' },
        { id: 'e3', source: '3', target: '2' }, // Cycle
        { id: 'e4', source: '3', target: '4' }
    ]
};

console.log('--- TESTING UNIFLUX VALIDATOR ---');

function runTest(name, graph) {
    console.log(`\nTesting: ${name}`);
    const result = UnifluxValidator.validate(graph);
    if (result.isValid) {
        console.log('✅ Flow is VALID');
    } else {
        console.log('❌ Flow is INVALID');
        result.errors.forEach(err => {
            console.log(`   [${err.code}] ${err.severity.toUpperCase()}: ${err.message} (Node: ${err.nodeId || 'N/A'})`);
        });
    }
}

runTest('Valid Graph', validGraph);
runTest('Graph with Orphan Node', invalidGraphOrphan);
runTest('Graph with Cycle (E005 Warning)', invalidGraphCycle);

const noTerminalGraph = {
    id: 'test-4',
    nodes: [
        { id: '1', type: 'START', label: 'Inicio' },
        { id: '2', type: 'TASK', label: 'Paso Sin Fin' }
    ],
    edges: [
        { id: 'e1', source: '1', target: '2' }
    ]
};
runTest('Graph without Terminal (E002/E006/E007 Errors)', noTerminalGraph);

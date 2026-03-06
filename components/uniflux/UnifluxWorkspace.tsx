'use client'

import { useState, useCallback, useEffect } from 'react';
import { ReactFlow, Background, Controls, Node, Edge, useNodesState, useEdgesState, Connection, addEdge, Position } from '@xyflow/react';
import { FlowGraph, FlowNode } from '@/app/uniflux/core/types';
import UnifluxToolbar from './UnifluxToolbar';

// Initial placeholder graph
const INITIAL_GRAPH: FlowGraph = {
    id: 'draft-1',
    tenantId: 'demo',
    name: 'New Flow',
    nodes: [
        { id: '1', type: 'START', label: 'Inicio', position: { x: 50, y: 250 } },
        { id: '2', type: 'TERMINAL', label: 'Fin', position: { x: 600, y: 250 } }
    ],
    edges: [],
    metadata: {
        version: '0.1',
        authorId: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
    }
};

export default function UnifluxWorkspace() {
    const [graph, setGraph] = useState<FlowGraph>(INITIAL_GRAPH);

    // React Flow State
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // Sync Graph -> React Flow
    useEffect(() => {
        const rfNodes: Node[] = graph.nodes.map(n => ({
            id: n.id,
            type: 'default',
            position: n.position,
            data: { label: n.label, type: n.type },
            style: getNodeStyle(n.type),
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
        }));

        const rfEdges: Edge[] = graph.edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label,
            type: 'straight',
            animated: true
        }));

        setNodes(rfNodes);
        setEdges(rfEdges);
    }, [graph, setNodes, setEdges]);

    // Handle Manual Connections
    const onConnect = useCallback((params: Connection) => {
        setEdges((eds) => addEdge(params, eds));
        // TODO: Update 'graph' state to reflect manual connection
    }, [setEdges]);

    // Handle AI Updates
    const handleGraphUpdate = (newGraph: FlowGraph) => {
        console.log("Graph updated by AI:", newGraph);
        setGraph(newGraph);
    };

    return (
        <div className="w-full h-screen bg-gray-50 flex flex-col">
            <header className="h-14 bg-white border-b px-6 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
                        Uniflux Engine
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">v0.1 Alpha</span>
                </div>
                <div className="text-sm text-gray-500">
                    Draft: {graph.name}
                </div>
            </header>

            <div className="flex-1 relative">
                {/* AI Interaction Layer */}
                <UnifluxToolbar currentGraph={graph} onGraphUpdate={handleGraphUpdate} />

                {/* Visual Canvas */}
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    fitView
                >
                    <Background color="#ccc" gap={20} />
                    <Controls />
                </ReactFlow>
            </div>
        </div>
    );
}

// Visual Styles helper
function getNodeStyle(type: string) {
    const base = {
        padding: '12px 24px',
        borderRadius: '8px',
        border: '1.5px solid #ddd',
        fontSize: '14px',
        fontFamily: "'Calibri Light', 'Segoe UI Light', 'Helvetica Neue', Arial, sans-serif",
        color: '#000000',
        fontWeight: 400,
        textAlign: 'center' as const,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '120px'
    };

    switch (type) {
        case 'START':
            return {
                ...base,
                background: '#E8F5E9',
                borderColor: '#4CAF50',
                borderRadius: '50px'
            };
        case 'TERMINAL':
            return {
                ...base,
                background: '#FFEBEE',
                borderColor: '#F44336',
                borderRadius: '50px'
            };
        case 'DECISION':
            return {
                ...base,
                background: '#FFFDE7',
                borderColor: '#FBC02D',
                transform: 'rotate(0deg)', // Simplified from diamond for better text alignment
                borderWidth: '2px'
            };
        case 'OPERATION':
            return {
                ...base,
                background: '#E3F2FD',
                borderColor: '#2196F3'
            };
        default:
            return {
                ...base,
                background: '#FFFFFF',
                borderColor: '#9E9E9E'
            };
    }
}

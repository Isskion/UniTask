'use client'

import { useState, useCallback, useEffect } from 'react';
import { ReactFlow, Background, Controls, Node, Edge, useNodesState, useEdgesState, Connection, addEdge, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FlowGraph, FlowNode } from '@/uniflux/core/types';
import UnifluxToolbar from './UnifluxToolbar';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

// Initial placeholder graph template
const INITIAL_GRAPH_TEMPLATE: FlowGraph = {
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
    const { user, tenantId } = useAuth();
    const { showToast } = useToast();
    const [graph, setGraph] = useState<FlowGraph>(INITIAL_GRAPH_TEMPLATE);
    const [isBlocked, setIsBlocked] = useState(false);

    // [SAM Architecture] Enforce Single Scope & Tenant
    useEffect(() => {
        if (!user) return;

        const userProfile = user as unknown as any;
        const userRegions: string[] = userProfile?.accessScopes?.regionIds || [];
        const userDivisions: string[] = userProfile?.accessScopes?.divisionIds || [];

        const effectiveRegions = userRegions.filter(r => r !== '*');
        const effectiveDivisions = userDivisions.filter(d => d !== '*');

        if (effectiveRegions.length > 1 || effectiveDivisions.length > 1) {
            showToast(
                "Error de Contexto",
                "Tu usuario tiene múltiples Regiones o Divisiones. Uniflux requiere un contexto único. Ajusta tu perfil.",
                "error"
            );
            setIsBlocked(true);
            return;
        }

        const regionId = effectiveRegions.length === 1 ? effectiveRegions[0] : undefined;
        const divisionId = effectiveDivisions.length === 1 ? effectiveDivisions[0] : undefined;

        // Update Graph Context
        setGraph(prev => ({
            ...prev,
            tenantId: tenantId || 'demo',
            regionId,
            divisionId,
            metadata: {
                ...prev.metadata,
                authorId: user.uid
            }
        }));

    }, [user, tenantId]);

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

    if (isBlocked) {
        return (
            <div className="w-full h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-white p-8 rounded-xl shadow-xl border border-red-100 max-w-md">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Acceso Restringido</h2>
                    <p className="text-gray-600">
                        Uniflux requiere un contexto de operación único (una sola Región/División).
                    </p>
                    <p className="text-sm text-gray-500 mt-4">
                        Por favor, ve a tu Perfil y desactiva los scopes adicionales.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-screen bg-gray-50 flex flex-col">
            <header className="h-14 bg-white border-b px-6 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
                        Uniflux Engine
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">v0.1 Alpha</span>
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-4">
                    <span>Draft: {graph.name}</span>
                    {/* [ADMIN DEBUG] Scope Visibility */}
                    {user && (user as any).roleLevel >= 80 && (
                        <div className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 font-mono">
                            {graph.regionId || '*'}:{graph.divisionId || '*'}
                        </div>
                    )}
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

'use client'

import { useState, useCallback, useEffect } from 'react';
import { ReactFlow, Background, Controls, Node, Edge, useNodesState, useEdgesState, Connection, addEdge, Position } from '@xyflow/react';
import { FlowGraph, FlowNode } from '@/app/uniflux/core/types';
import UnifluxToolbar from './UnifluxToolbar';
import { useAuth } from '@/context/AuthContext';
import { saveFlowDraft } from '@/app/actions/uniflux';
import { Save, Loader2, CheckCircle2 } from 'lucide-react';

// Initial placeholder graph
const INITIAL_GRAPH: FlowGraph = {
    id: `draft-${Date.now()}`,
    tenantId: '', // Will be set by context
    name: 'New Flow',
    nodes: [],
    edges: [],
    metadata: {
        version: '0.1',
        authorId: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
    }
};

export default function UnifluxWorkspace() {
    const { user, userDoc } = useAuth();
    const [graph, setGraph] = useState<FlowGraph>(INITIAL_GRAPH);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Wizard State
    const [showWizard, setShowWizard] = useState(true);
    const [wizardInput, setWizardInput] = useState('');
    const [isGeneratingWizard, setIsGeneratingWizard] = useState(false);
    const [wizardError, setWizardError] = useState<string | null>(null);

    // React Flow State
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // Sync Graph -> React Flow
    useEffect(() => {
        const rfNodes: Node[] = graph.nodes.map(n => ({
            id: n.id,
            type: 'default',
            position: n.position,
            data: { label: `${n.id}. ${n.label}`, type: n.type },
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

        // If we have nodes, hide the wizard
        if (graph.nodes.length > 0) {
            setShowWizard(false);
        }
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
        setShowWizard(false);
    };

    // Handle Wizard Submit
    const handleWizardSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wizardInput.trim()) return;

        setIsGeneratingWizard(true);
        setWizardError(null);

        try {
            // Import generateFlowWithAI Dynamically to avoid cycle issues if any, or statically if provided
            const { generateFlowWithAI } = await import('@/app/actions/uniflux-ai');
            const prompt = `Create an initial data flow between these systems: ${wizardInput}. Create nodes representing these systems and the initial flow of information between them.`;

            const result = await generateFlowWithAI(prompt, graph);

            if (result.success && result.graph) {
                handleGraphUpdate(result.graph);
            } else {
                setWizardError(result.error || "Failed to generate initial flow.");
            }
        } catch (err: any) {
            setWizardError(err.message || "An unexpected error occurred.");
        } finally {
            setIsGeneratingWizard(false);
        }
    };

    // Handle manual save
    const handleSave = async () => {
        if (!user || (!userDoc?.company && !user.tenantId)) return;
        const tenantId = userDoc?.company || user.tenantId || 'demo';

        setIsSaving(true);
        setSaveStatus('saving');

        try {
            await saveFlowDraft(tenantId, graph);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (e) {
            console.error("Failed to save draft", e);
            setSaveStatus('idle');
            // Basic error handling - could connect to a global toast system later
            alert("Error al guardar el flujo");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full h-screen bg-gray-50 flex flex-col">
            <header className="h-14 bg-white border-b px-6 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
                            Uniflux Engine
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">v0.1 Alpha</span>
                    </div>
                    <div className="text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1 rounded-md border border-gray-100">
                        {graph.name}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSave}
                        disabled={isSaving || showWizard}
                        className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg shadow-sm transition-all disabled:opacity-50"
                    >
                        {saveStatus === 'saving' ? (
                            <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                        ) : saveStatus === 'saved' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'saved' ? 'Guardado' : 'Guardar Borrador'}
                    </button>
                    {/* Placeholder for project selection if needed in the future */}
                </div>
            </header>

            <div className="flex-1 relative">
                {/* AI Interaction Layer */}
                {!showWizard && <UnifluxToolbar currentGraph={graph} onGraphUpdate={handleGraphUpdate} />}

                {/* Initial Wizard Overlay */}
                {showWizard && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm">
                        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border border-gray-100">
                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 mb-2">
                                Iniciar Nuevo Flujo
                            </h2>
                            <p className="text-gray-600 mb-6">
                                ¿Qué sistemas van a interactuar? Describe el escenario inicial para generar la estructura base (Ej: Aplicación Móvil, CRM y Facturación).
                            </p>

                            <form onSubmit={handleWizardSubmit}>
                                <textarea
                                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none mb-4"
                                    rows={4}
                                    placeholder="Ej: El cliente hace un pedido en la App Móvil, se registra en el CRM y pasa al ERP para facturación."
                                    value={wizardInput}
                                    onChange={(e) => setWizardInput(e.target.value)}
                                    disabled={isGeneratingWizard}
                                    autoFocus
                                ></textarea>

                                {wizardError && (
                                    <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                                        {wizardError}
                                    </div>
                                )}

                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowWizard(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                                        disabled={isGeneratingWizard}
                                    >
                                        Omitir Asistente
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!wizardInput.trim() || isGeneratingWizard}
                                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg hover:opacity-90 transition-all font-medium disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isGeneratingWizard ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Generando Flujo...
                                            </>
                                        ) : 'Generar Flujo Inicial'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

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

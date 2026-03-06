'use client'

import { useState, useCallback, useEffect } from 'react';
import { ReactFlow, Background, Controls, Node, Edge, useNodesState, useEdgesState, Connection, addEdge, Position } from '@xyflow/react';
import { FlowGraph, FlowNode } from '@/app/uniflux/core/types';
import UnifluxToolbar from './UnifluxToolbar';
import { useAuth } from '@/context/AuthContext';
import { saveFlowDraft, listProjectFlows, getFlow } from '@/app/actions/uniflux';
import { getActiveProjects } from '@/lib/projects';
import { Project } from '@/types';
import { Save, Loader2, CheckCircle2, Folder, Plus, File, X, ListTree, Settings2, Pencil } from 'lucide-react';

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
    const { user, tenantId, userRole } = useAuth();
    const [graph, setGraph] = useState<FlowGraph>(INITIAL_GRAPH);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Flow Management State
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [savedFlows, setSavedFlows] = useState<FlowGraph[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLoadingFlows, setIsLoadingFlows] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');

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

    // Fetch Projects
    useEffect(() => {
        if (!user) return;
        const tenantToUse = tenantId || '1';
        getActiveProjects(tenantToUse, user.uid).then(data => {
            setProjects(data);
            if (data.length > 0 && !selectedProjectId) {
                // Default to the first project naturally or keep empty
                // For a seamless experience, let's select the first by default if we have none active
                setSelectedProjectId(graph.projectId || data[0].id);
            }
        });
    }, [user, tenantId, graph.projectId]);

    // Fetch Flows when project changes
    useEffect(() => {
        if (!selectedProjectId || !user) return;
        const tenantToUse = tenantId || '1';
        setIsLoadingFlows(true);
        listProjectFlows(tenantToUse, selectedProjectId)
            .then(flows => setSavedFlows(flows as FlowGraph[]))
            .catch(err => console.error("Failed to load flows", err))
            .finally(() => setIsLoadingFlows(false));
    }, [selectedProjectId, user, tenantId]);

    // Flow Loading & Reset Handlers
    const handleLoadFlow = async (flowId: string) => {
        const flowInfo = await getFlow(flowId);
        if (flowInfo) {
            setGraph(flowInfo);
            setSelectedProjectId(flowInfo.projectId || selectedProjectId);
            setIsSidebarOpen(false);
            setShowWizard(false);
        }
    };

    const handleNewFlow = () => {
        const newTemplate = {
            ...INITIAL_GRAPH,
            id: `draft-${Date.now()}`,
            projectId: selectedProjectId,
            name: 'Nuevo Flujo'
        };
        setGraph(newTemplate);
        setIsSidebarOpen(false);
        setNodes([]);
        setEdges([]);
        setShowWizard(true);
    };

    const handleNameRename = () => {
        if (!editNameValue.trim()) {
            setIsEditingName(false);
            return;
        }
        setGraph(prev => ({ ...prev, name: editNameValue }));
        setIsEditingName(false);
    };

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
        if (!user || !tenantId) return;
        const tenantToUse = tenantId || '1';

        if (!selectedProjectId) {
            alert("Por favor selecciona un proyecto primero.");
            return;
        }

        setIsSaving(true);
        setSaveStatus('saving');

        try {
            const finalGraph = { ...graph, projectId: selectedProjectId };
            await saveFlowDraft(tenantToUse, finalGraph);
            setGraph(finalGraph);

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 3000);

            // Refresh sidebar flows
            listProjectFlows(tenantToUse, selectedProjectId).then(f => setSavedFlows(f as FlowGraph[]));
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
        <div className="w-full h-screen bg-gray-50 flex flex-col relative overflow-hidden">
            <header className="h-14 bg-white border-b px-4 md:px-6 flex items-center justify-between z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <ListTree className="w-5 h-5" />
                        <span className="text-sm font-bold hidden sm:inline">Mis Flujos</span>
                    </button>

                    <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

                    <div className="flex items-center gap-2">
                        {isEditingName ? (
                            <input
                                autoFocus
                                value={editNameValue}
                                onChange={(e) => setEditNameValue(e.target.value)}
                                onBlur={handleNameRename}
                                onKeyDown={(e) => e.key === 'Enter' && handleNameRename()}
                                className="text-sm font-medium text-gray-900 bg-white border border-purple-300 rounded-md px-2 py-1 outline-none ring-2 ring-purple-100 w-48"
                            />
                        ) : (
                            <div
                                onClick={() => { setEditNameValue(graph.name); setIsEditingName(true); }}
                                className="text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100 hover:border-purple-200 hover:bg-purple-50 cursor-pointer flex items-center gap-2 group transition-colors"
                                title="Click para renombrar el flujo"
                            >
                                {graph.name}
                                <Pencil className="w-3 h-3 text-gray-400 group-hover:text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="text-xs sm:text-sm border border-gray-200 bg-white hover:bg-gray-50 py-1.5 px-3 rounded-lg font-medium text-gray-700 outline-none cursor-pointer hidden md:block"
                    >
                        <option value="" disabled>1. Seleccionar Proyecto...</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleSave}
                        disabled={isSaving || !selectedProjectId}
                        className="flex items-center gap-2 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:from-gray-400 disabled:to-gray-500"
                    >
                        {saveStatus === 'saving' ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                        ) : saveStatus === 'saved' ? (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'saved' ? 'Guardado' : 'Guardar'}
                    </button>
                </div>
            </header>

            <div className="flex-1 relative flex">

                {/* Flow Management Sidebar Overlay */}
                {isSidebarOpen && (
                    <div
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Flow Management Sidebar Panel */}
                <div className={`absolute top-0 bottom-0 left-0 w-80 bg-white border-r shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="h-14 border-b flex items-center justify-between px-4 shrink-0 bg-gray-50">
                        <h2 className="font-bold flex items-center gap-2 text-gray-800">
                            <Folder className="w-4 h-4 text-purple-600" />
                            Gestor de Flujos
                        </h2>
                        <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-gray-200 rounded-md text-gray-500">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-4 border-b bg-white">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Proyecto Activo</label>
                        <select
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="w-full border bg-gray-50 border-gray-200 py-2 px-3 rounded-lg text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                        >
                            <option value="" disabled>Seleccionar Proyecto...</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-xs font-bold text-gray-500 uppercase">Flujos Guardados</label>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{savedFlows.length}</span>
                        </div>

                        {isLoadingFlows ? (
                            <div className="flex flex-col items-center justify-center py-8 opacity-50">
                                <Loader2 className="w-6 h-6 animate-spin text-purple-600 mb-2" />
                            </div>
                        ) : savedFlows.length === 0 ? (
                            <div className="text-center py-8">
                                <File className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500 mb-1">No hay flujos guardados</p>
                                <p className="text-xs text-gray-400">para este proyecto.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {savedFlows.map(flow => (
                                    <button
                                        key={flow.id}
                                        onClick={() => handleLoadFlow(flow.id)}
                                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 group ${graph.id === flow.id
                                            ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-100'
                                            : 'bg-white border-gray-100 hover:border-purple-200 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-lg ${graph.id === flow.id ? 'bg-purple-100 text-purple-700' : 'bg-gray-50 text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-600'}`}>
                                            <ListTree className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm font-bold truncate ${graph.id === flow.id ? 'text-purple-900' : 'text-gray-700'}`}>
                                                {flow.name || 'Sin título'}
                                            </div>
                                            <div className="text-[10px] text-gray-400 truncate mt-0.5">
                                                ID: {flow.id.substring(0, 8)}...
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t bg-gray-50 shrink-0">
                        <button
                            onClick={handleNewFlow}
                            className="w-full flex justify-center items-center gap-2 py-2.5 bg-white border border-gray-200 hover:border-purple-300 hover:text-purple-700 text-gray-700 rounded-xl font-bold text-sm transition-all shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Crear Nuevo Flujo
                        </button>
                    </div>
                </div>

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

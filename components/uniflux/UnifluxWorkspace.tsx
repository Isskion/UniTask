'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ReactFlow, Background, Controls, Node, Edge, useNodesState, useEdgesState, Connection, addEdge, Position } from '@xyflow/react';
import { FlowGraph, FlowNode, FlowEdge, NodeType, MermaidEngine } from '@/app/uniflux/core/types';
import UnifluxToolbar from './UnifluxToolbar';
import { useAuth } from '@/context/AuthContext';
import { saveFlowDraft, listProjectFlows, getFlow } from '@/app/actions/uniflux';
import { getActiveProjects } from '@/lib/projects';
import { Project } from '@/types';
import { Save, Loader2, CheckCircle2, Folder, Plus, File, X, ListTree, Pencil, RotateCcw, GitBranch } from 'lucide-react';
import UnifluxNodePalette from './UnifluxNodePalette';
import UnifluxNodeEditor from './UnifluxNodeEditor';
import UnifluxEnvironmentNode from './nodes/UnifluxEnvironmentNode';
import UnifluxMermaidEditor from './UnifluxMermaidEditor';

const nodeTypes = {
    ENVIRONMENT: UnifluxEnvironmentNode,
};

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
    const { user, tenantId } = useAuth();
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
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    // History State (Undo/Redo)
    const [history, setHistory] = useState<{ nodes: Node[], edges: Edge[] }[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    // Ref avoids stale closure: takeSnapshot always reads the latest historyIndex
    const historyIndexRef = useRef(-1);
    useEffect(() => { historyIndexRef.current = historyIndex; }, [historyIndex]);

    const takeSnapshot = useCallback(() => {
        setNodes(nds => {
            setEdges(eds => {
                const snapshot = { nodes: JSON.parse(JSON.stringify(nds)), edges: JSON.parse(JSON.stringify(eds)) };
                const currentIndex = historyIndexRef.current;
                setHistory(prev => {
                    const newHistory = prev.slice(0, currentIndex + 1);
                    return [...newHistory, snapshot].slice(-50);
                });
                setHistoryIndex(prev => prev + 1);
                return eds;
            });
            return nds;
        });
    }, [setNodes, setEdges]); // historyIndex removed — read via ref

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            if (prevState && prevState.nodes) {
                setNodes(prevState.nodes);
                setEdges(prevState.edges);
                setHistoryIndex(historyIndex - 1);
            }
        }
    }, [history, historyIndex, setNodes, setEdges]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            if (nextState && nextState.nodes) {
                setNodes(nextState.nodes);
                setEdges(nextState.edges);
                setHistoryIndex(historyIndex + 1);
            }
        }
    }, [history, historyIndex, setNodes, setEdges]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (e.shiftKey) redo();
                else undo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                redo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    // Editor State
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    // Inline edge-label editor (replaces window.prompt)
    const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
    const [edgeEditValue, setEdgeEditValue] = useState('');

    // Save toast
    const [showSaveToast, setShowSaveToast] = useState(false);

    // Post-AI banner — reminds user they can undo
    const [showAiBanner, setShowAiBanner] = useState(false);

    // Sync Graph -> React Flow ONLY on load or AI update
    useEffect(() => {
        const rfNodes: Node[] = graph.nodes.map(n => ({
            id: n.id,
            type: n.type === 'ENVIRONMENT' ? 'ENVIRONMENT' : 'default',
            position: n.position,
            data: {
                label: n.type === 'ENVIRONMENT' ? n.label : `${n.id}. ${n.label}`,
                type: n.type,
                isLocked: n.isLocked,
            },
            // ENVIRONMENT nodes go to the back so contained nodes are always clickable
            zIndex: n.type === 'ENVIRONMENT' ? -1 : 1,
            style: { ...getNodeStyle(n.type), width: n.width, height: n.height, opacity: n.isLocked ? 0.8 : 1 },
            parentId: n.parentId,
            extent: n.parentId ? 'parent' : undefined,
            draggable: !n.isLocked,
            selectable: !n.isLocked,
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
        }));

        const rfEdges: Edge[] = graph.edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label,
            type: 'straight',
            animated: true,
            labelStyle: { fill: '#4b5563', fontWeight: 600, fontSize: 12, fontFamily: 'inherit' },
            labelBgStyle: { fill: '#ffffff', stroke: '#cbd5e1', strokeWidth: 1.5, fillOpacity: 0.95 },
            labelBgPadding: [12, 6],
            labelBgBorderRadius: 8,
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
            .then(flows => {
                setSavedFlows(flows as FlowGraph[]);
                // Auto-open sidebar if canvas is empty and user has existing flows
                if (flows.length > 0 && graph.nodes.length === 0) {
                    setIsSidebarOpen(true);
                }
            })
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
            setTimeout(takeSnapshot, 0);
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

    const handleNewMermaidFlow = () => {
        const newTemplate: FlowGraph = {
            ...INITIAL_GRAPH,
            id: `draft-${Date.now()}`,
            projectId: selectedProjectId,
            name: 'Nuevo Diagrama Mermaid',
            docType: 'mermaid',
            mermaidCode: 'sequenceDiagram\n    Alice->>Bob: Hola!\n    Bob-->>Alice: Hola!',
            mermaidEngine: 'sequence',
        };
        setGraph(newTemplate);
        setIsSidebarOpen(false);
        setNodes([]);
        setEdges([]);
        setShowWizard(false);
    };

    const handleMermaidChange = useCallback((code: string) => {
        setGraph(prev => ({ ...prev, mermaidCode: code }));
    }, []);

    const handleMermaidEngineChange = useCallback((engine: MermaidEngine) => {
        setGraph(prev => ({ ...prev, mermaidEngine: engine }));
    }, []);

    const handleConvertMermaidToVisual = useCallback((vNodes: FlowNode[], vEdges: FlowEdge[]) => {
        const newGraph: FlowGraph = {
            ...INITIAL_GRAPH,
            id: `draft-${Date.now()}`,
            projectId: selectedProjectId,
            name: `${graph.name} (Visual)`,
            docType: 'visual',
            nodes: vNodes,
            edges: vEdges,
        };
        setGraph(newGraph);
        setIsSidebarOpen(false);
        setShowWizard(false);
    }, [graph.name, selectedProjectId]);

    const handleNameRename = () => {
        if (!editNameValue.trim()) {
            setIsEditingName(false);
            return;
        }
        setGraph(prev => ({ ...prev, name: editNameValue }));
        setIsEditingName(false);
    };

    // Node Editor Save Handlers
    const handleNodeSave = (nodeId: string, newLabel: string, newType: NodeType) => {
        setNodes(nds => nds.map(node => {
            if (node.id === nodeId) {
                return {
                    ...node,
                    data: { ...node.data, label: `${node.id}. ${newLabel}`, type: newType },
                    style: getNodeStyle(newType)
                };
            }
            return node;
        }));
        setSelectedNode(null);
        setTimeout(takeSnapshot, 0);
    };

    const handleNodeDelete = (nodeId: string) => {
        setNodes(nds => nds.filter(node => node.id !== nodeId));
        setEdges(eds => eds.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
        setSelectedNode(null);
        setTimeout(takeSnapshot, 0);
    };

    const handleToggleLock = useCallback((nodeId: string, locked: boolean) => {
        setNodes(nds => nds.map(node => {
            if (node.id === nodeId) {
                return {
                    ...node,
                    draggable: !locked,
                    selectable: !locked,
                    data: { ...node.data, isLocked: locked },
                    style: { ...node.style, opacity: locked ? 0.8 : 1 }
                };
            }
            return node;
        }));
        // Persist lock state in abstract graph so it survives any re-sync from setGraph
        setGraph(prev => ({
            ...prev,
            nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, isLocked: locked } : n)
        }));
        // Keep NodeEditor open with updated lock state (setGraph triggers useEffect which
        // resets nodes, potentially causing RF to clear selection and close the panel)
        setSelectedNode(prev => prev?.id === nodeId
            ? { ...prev, data: { ...prev.data, isLocked: locked } }
            : prev
        );
        setTimeout(takeSnapshot, 0);
    }, [setNodes, takeSnapshot]);

    // Handle Manual Connections & Edge Updates
    const onConnect = useCallback((params: Connection) => {
        // Automatically add an empty label or default animated edge
        const newEdge: Edge = {
            ...params,
            id: `e-${params.source}-${params.target}-${Date.now()}`,
            type: 'straight',
            animated: true,
            labelStyle: { fill: '#4b5563', fontWeight: 600, fontSize: 12, fontFamily: 'inherit' },
            labelBgStyle: { fill: '#ffffff', stroke: '#cbd5e1', strokeWidth: 1.5, fillOpacity: 0.95 },
            labelBgPadding: [12, 6],
            labelBgBorderRadius: 8,
        };
        setEdges((eds) => addEdge(newEdge, eds));
        setTimeout(takeSnapshot, 0);
    }, [setEdges]);

    // Inline edge label editor handlers
    const onEdgeDoubleClick = (event: React.MouseEvent, edge: Edge) => {
        event.stopPropagation();
        setEditingEdge(edge);
        setEdgeEditValue((edge.label as string) || '');
    };

    const handleEdgeLabelSave = () => {
        if (!editingEdge) return;
        setEdges(eds => eds.map(e => e.id === editingEdge.id ? { ...e, label: edgeEditValue } : e));
        setEditingEdge(null);
        setTimeout(takeSnapshot, 0);
    };

    const handleEdgeDelete = () => {
        if (!editingEdge) return;
        setEdges(eds => eds.filter(e => e.id !== editingEdge.id));
        setEditingEdge(null);
        setTimeout(takeSnapshot, 0);
    };

    // Drag and Drop Logic
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow/type') as NodeType;
            const label = event.dataTransfer.getData('application/reactflow/label');

            if (!type || !label || !reactFlowInstance) {
                return;
            }

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            // Use sequential numeric ID
            let newIdNum = 1;
            while (nodes.some(n => n.id === newIdNum.toString())) {
                newIdNum++;
            }
            const newNodeId = newIdNum.toString();
            const newNode: Node = {
                id: newNodeId,
                type: type === 'ENVIRONMENT' ? 'ENVIRONMENT' : 'default',
                position,
                data: { label: `${newNodeId}. ${label}`, type: type },
                style: type === 'ENVIRONMENT' ? { ...getNodeStyle(type), width: 300, height: 200 } : getNodeStyle(type),
                sourcePosition: Position.Right,
                targetPosition: Position.Left,
            };

            setNodes((nds) => nds.concat(newNode));
            setTimeout(takeSnapshot, 0);
        },
        [reactFlowInstance, setNodes, nodes],
    );

    const onNodeDragStop = useCallback((_event: any, draggedNode: Node) => {
        if (draggedNode.data.type === 'ENVIRONMENT') return;

        // Check if dropped inside an environment
        const targetEnv = nodes.find(n =>
            n.data.type === 'ENVIRONMENT' &&
            n.id !== draggedNode.id &&
            draggedNode.position.x >= n.position.x &&
            draggedNode.position.y >= n.position.y &&
            draggedNode.position.x <= n.position.x + (n.style?.width as number || 0) &&
            draggedNode.position.y <= n.position.y + (n.style?.height as number || 0)
        );

        if (targetEnv && draggedNode.parentId !== targetEnv.id) {
            setNodes(nds => nds.map(node => {
                if (node.id === draggedNode.id) {
                    return {
                        ...node,
                        parentId: targetEnv.id,
                        extent: 'parent',
                        // Re-calculate position relative to parent
                        position: {
                            x: draggedNode.position.x - targetEnv.position.x,
                            y: draggedNode.position.y - targetEnv.position.y
                        }
                    };
                }
                return node;
            }));
            setTimeout(takeSnapshot, 0);
        } else if (!targetEnv && draggedNode.parentId) {
            // Dragged out of parent
            setNodes(nds => nds.map(node => {
                if (node.id === draggedNode.id) {
                    // Find old parent to calculate absolute position
                    const oldParent = nds.find(p => p.id === node.parentId);
                    return {
                        ...node,
                        parentId: undefined,
                        extent: undefined,
                        position: {
                            x: draggedNode.position.x + (oldParent?.position.x || 0),
                            y: draggedNode.position.y + (oldParent?.position.y || 0)
                        }
                    };
                }
                return node;
            }));
            setTimeout(takeSnapshot, 0);
        }
    }, [nodes, setNodes]);

    // Handle AI Updates — preserve work when AI would wipe existing nodes
    const handleGraphUpdate = (newGraph: FlowGraph) => {
        // Guard: if we already have nodes and the AI response would delete most of them,
        // ask for confirmation before replacing (prevents accidental full overwrites).
        if (graph.nodes.length > 0 && newGraph.nodes.length > 0) {
            const existingIds = new Set(graph.nodes.map(n => n.id));
            const keptCount = newGraph.nodes.filter(n => existingIds.has(n.id)).length;
            const deletedCount = graph.nodes.length - keptCount;
            if (deletedCount > 0 && deletedCount >= Math.ceil(graph.nodes.length * 0.5)) {
                const ok = window.confirm(
                    `La IA va a eliminar ${deletedCount} de los ${graph.nodes.length} nodos existentes.\n¿Continuar? (Pulsa Cancelar para deshacer con Ctrl+Z si ya aplicaste el cambio)`
                );
                if (!ok) return;
            }
        }
        const mergedGraph = {
            ...newGraph,
            id: graph.id || newGraph.id || `draft-${Date.now()}`,
            projectId: graph.projectId || newGraph.projectId
        };
        setGraph(mergedGraph);
        setShowWizard(false);
        setTimeout(takeSnapshot, 0);
        // Show undo banner so user knows they can revert the AI change
        setShowAiBanner(true);
        setTimeout(() => setShowAiBanner(false), 6000);
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
            let finalGraph: FlowGraph;

            if (graph.docType === 'mermaid') {
                // Mermaid flows: persist code directly, no RF serialization
                finalGraph = {
                    ...graph,
                    projectId: selectedProjectId,
                };
            } else {
                // Re-sync React Flow visually into the abstract FlowGraph
                const updatedGraphNodes: FlowNode[] = nodes.map(n => ({
                    id: n.id,
                    type: n.data.type as NodeType || 'OPERATION',
                    label: n.data.type === 'ENVIRONMENT'
                        ? (n.data.label as string)
                        : (n.data.label as string).replace(new RegExp(`^${n.id}\\.\\s*`), ''),
                    position: n.position,
                    parentId: n.parentId,
                    isLocked: n.data.isLocked as boolean | undefined,
                    width: n.style?.width as number | undefined,
                    height: n.style?.height as number | undefined
                }));

                const updatedGraphEdges: FlowEdge[] = edges.map(e => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    label: e.label as string | undefined
                }));

                finalGraph = {
                    ...graph,
                    projectId: selectedProjectId,
                    nodes: updatedGraphNodes,
                    edges: updatedGraphEdges
                };
            }

            await saveFlowDraft(tenantToUse, finalGraph);
            setGraph(finalGraph);

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 3000);
            setShowSaveToast(true);
            setTimeout(() => setShowSaveToast(false), 4000);

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

    // Always-fresh graph that reflects the current canvas state (not just last save).
    // Passed to UnifluxToolbar so the AI always sees unsaved node moves/additions.
    const liveGraph = useMemo<FlowGraph>(() => ({
        ...graph,
        nodes: nodes.map(n => ({
            id: n.id,
            type: (n.data.type as NodeType) || 'OPERATION',
            label: n.data.type === 'ENVIRONMENT'
                ? (n.data.label as string)
                : (n.data.label as string).replace(new RegExp(`^${n.id}\\.\\s*`), ''),
            position: n.position,
            parentId: n.parentId,
            isLocked: n.data.isLocked as boolean | undefined,
            width: n.style?.width as number | undefined,
            height: n.style?.height as number | undefined,
        })),
        edges: edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label as string | undefined,
        })),
    }), [graph, nodes, edges]);

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
                                {savedFlows.map(flow => {
                                    const rawDate = flow.metadata?.updatedAt;
                                    const updatedAt = rawDate?.toDate ? rawDate.toDate()
                                        : rawDate instanceof Date ? rawDate : null;
                                    const dateStr = updatedAt
                                        ? updatedAt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                        : null;
                                    const isMermaid = flow.docType === 'mermaid';
                                    const nodeCount = isMermaid ? null : (flow.nodes?.length ?? 0);
                                    const isActive = graph.id === flow.id;
                                    return (
                                        <button
                                            key={flow.id}
                                            onClick={() => handleLoadFlow(flow.id)}
                                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 group ${isActive
                                                ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-100'
                                                : 'bg-white border-gray-100 hover:border-purple-200 hover:shadow-sm'
                                                }`}
                                        >
                                            <div className={`p-2 rounded-lg shrink-0 ${isActive ? 'bg-purple-100 text-purple-700' : 'bg-gray-50 text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-600'}`}>
                                                {isMermaid ? <GitBranch className="w-4 h-4" /> : <ListTree className="w-4 h-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`text-sm font-bold truncate ${isActive ? 'text-purple-900' : 'text-gray-700'}`}>
                                                    {flow.name || 'Sin título'}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                    {isMermaid
                                                        ? <span className="text-[10px] text-teal-500 font-medium">Mermaid DSL</span>
                                                        : <span className="text-[10px] text-gray-400">{nodeCount} nodos</span>
                                                    }
                                                    {dateStr && <><span className="text-[10px] text-gray-300">·</span><span className="text-[10px] text-gray-400">{dateStr}</span></>}
                                                </div>
                                            </div>
                                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t bg-gray-50 shrink-0 flex flex-col gap-2">
                        <button
                            onClick={handleNewFlow}
                            className="w-full flex justify-center items-center gap-2 py-2.5 bg-white border border-gray-200 hover:border-purple-300 hover:text-purple-700 text-gray-700 rounded-xl font-bold text-sm transition-all shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Crear Nuevo Flujo
                        </button>
                        <button
                            onClick={handleNewMermaidFlow}
                            className="w-full flex justify-center items-center gap-2 py-2.5 bg-white border border-teal-200 hover:border-teal-400 hover:text-teal-700 text-teal-600 rounded-xl font-bold text-sm transition-all shadow-sm"
                        >
                            <GitBranch className="w-4 h-4" />
                            Nuevo Diagrama Mermaid
                        </button>
                    </div>
                </div>

                {/* AI Interaction Layer — hidden in Mermaid mode */}
                {!showWizard && graph.docType !== 'mermaid' && <UnifluxToolbar currentGraph={liveGraph} onGraphUpdate={handleGraphUpdate} />}

                {/* Initial Wizard Overlay — hidden in Mermaid mode */}
                {showWizard && graph.docType !== 'mermaid' && (
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

                {/* Node Palette — hidden in Mermaid mode */}
                {!showWizard && graph.docType !== 'mermaid' && <UnifluxNodePalette />}

                {/* Node Editor — hidden in Mermaid mode */}
                {selectedNode && graph.docType !== 'mermaid' && (
                    <UnifluxNodeEditor
                        nodeId={selectedNode.id}
                        initialLabel={
                            selectedNode.data.type === 'ENVIRONMENT'
                                ? (selectedNode.data.label as string)
                                : (selectedNode.data.label as string).replace(new RegExp(`^${selectedNode.id}\\.\\s*`), '')
                        }
                        initialType={selectedNode.data.type as NodeType || 'OPERATION'}
                        isLocked={selectedNode.data.isLocked as boolean | undefined}
                        onSave={handleNodeSave}
                        onClose={() => setSelectedNode(null)}
                        onDelete={handleNodeDelete}
                        onToggleLock={selectedNode.data.type === 'ENVIRONMENT' ? handleToggleLock : undefined}
                    />
                )}

                {/* Inline Edge Label Editor */}
                {editingEdge && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-80">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Editar etiqueta de conexión</p>
                        <input
                            autoFocus
                            value={edgeEditValue}
                            onChange={e => setEdgeEditValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleEdgeLabelSave(); if (e.key === 'Escape') setEditingEdge(null); }}
                            placeholder="Texto de la conexión (vacío = sin etiqueta)"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 mb-3"
                        />
                        <div className="flex gap-2">
                            <button onClick={handleEdgeLabelSave} className="flex-1 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
                                Guardar
                            </button>
                            <button onClick={handleEdgeDelete} className="px-3 py-1.5 text-red-500 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors border border-red-100">
                                Eliminar
                            </button>
                            <button onClick={() => setEditingEdge(null)} className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 text-sm font-medium rounded-lg transition-colors">
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Post-AI undo banner */}
                {showAiBanner && (
                    <div className="absolute bottom-6 left-6 z-50 flex items-center gap-3 bg-purple-900 text-white shadow-xl rounded-xl px-4 py-3">
                        <RotateCcw className="w-4 h-4 text-purple-300 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold">IA aplicó cambios</p>
                            <p className="text-xs text-purple-300">Ctrl+Z para deshacer si no es lo que buscabas</p>
                        </div>
                        <button onClick={() => { undo(); setShowAiBanner(false); }} className="ml-2 px-2 py-1 text-xs bg-purple-700 hover:bg-purple-600 rounded-lg font-medium transition-colors">
                            Deshacer
                        </button>
                        <button onClick={() => setShowAiBanner(false)} className="p-1 text-purple-400 hover:text-white">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* Save Toast */}
                {showSaveToast && (
                    <div className="absolute bottom-6 right-6 z-50 flex items-center gap-3 bg-white border border-green-100 shadow-xl rounded-xl px-4 py-3 animate-fade-in">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-gray-800">Flujo guardado</p>
                            <button onClick={() => { setShowSaveToast(false); setIsSidebarOpen(true); }} className="text-xs text-purple-600 hover:underline font-medium">
                                Ver en Mis Flujos →
                            </button>
                        </div>
                        <button onClick={() => setShowSaveToast(false)} className="p-1 text-gray-300 hover:text-gray-500 ml-1">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* Mermaid DSL Editor */}
                {graph.docType === 'mermaid' && (
                    <div className="flex-1 h-full">
                        <UnifluxMermaidEditor
                            key={graph.id}
                            initialCode={graph.mermaidCode || ''}
                            initialEngine={graph.mermaidEngine || 'sequence'}
                            onChange={handleMermaidChange}
                            onEngineChange={handleMermaidEngineChange}
                            onConvertToVisual={handleConvertMermaidToVisual}
                        />
                    </div>
                )}

                {/* Visual Canvas */}
                {graph.docType !== 'mermaid' && <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onInit={setReactFlowInstance}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onNodeDragStop={onNodeDragStop}
                    onNodeDoubleClick={(_, node) => setSelectedNode(node)}
                    onEdgeDoubleClick={onEdgeDoubleClick}
                    onPaneClick={() => { setSelectedNode(null); setEditingEdge(null); }}
                    fitView
                >
                    <Background color="#ccc" gap={20} />
                    <Controls />
                </ReactFlow>}
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
                // Removed transform as it can interfere with React Flow's drag matrix calculation
                borderWidth: '2px',
                pointerEvents: 'all' as const // Ensure drag events pass through
            };
        case 'OPERATION':
            return {
                ...base,
                background: '#E3F2FD',
                borderColor: '#2196F3'
            };
        case 'ENVIRONMENT':
            return {
                ...base,
                background: 'rgba(241, 245, 249, 0.4)',
                borderColor: '#94a3b8',
                borderStyle: 'dashed',
                borderWidth: '2px',
                borderRadius: '12px'
            };
        default:
            return {
                ...base,
                background: '#FFFFFF',
                borderColor: '#9E9E9E'
            };
    }
}

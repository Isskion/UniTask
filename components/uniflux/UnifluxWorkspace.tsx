'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ReactFlow, Background, BackgroundVariant, Controls, MiniMap, Panel, Node, Edge, useNodesState, useEdgesState, Connection, addEdge, reconnectEdge, Position, ConnectionMode, SelectionMode, MarkerType } from '@xyflow/react';
import { FlowGraph, FlowNode, FlowEdge, NodeType, C4NodeType, AnyNodeType, MermaidEngine } from '@/app/uniflux/core/types';
import { getMode, MODE_REGISTRY } from '@/app/uniflux/core/modes';
import { migrateGraph, needsMigration } from '@/app/uniflux/core/migrations';
import { getNodeVisibility, getEdgeVisibility, buildNodeMap, getAIVisibleGraph, shouldRender, OPACITY } from '@/app/uniflux/core/visibility';
import { CURRENT_SCHEMA_VERSION } from '@/app/uniflux/core/migrations';
import UnifluxToolbar from './UnifluxToolbar';
import { useAuth } from '@/context/AuthContext';
import { saveFlowDraft, listProjectFlows, getFlow, deleteFlow } from '@/app/actions/uniflux';
import { getActiveProjects } from '@/lib/projects';
import { Project } from '@/types';
import { Save, Loader2, CheckCircle2, Folder, Plus, File, X, ListTree, Pencil, RotateCcw, GitBranch, Trash2, Building2, Map, LayoutTemplate, Download, Copy, Type, LayoutGrid, MousePointer2, Hand, Settings, Link as LinkIcon } from 'lucide-react';
import { getLayoutedElements } from '@/app/uniflux/core/graphLayoutUtils';
import { toPng, toJpeg, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import VisioStencilPalette from './VisioStencilPalette';
import VisioShapeNode from './nodes/VisioShapeNode';
import UnifluxNodeEditor from './UnifluxNodeEditor';
import UnifluxEnvironmentNode from './nodes/UnifluxEnvironmentNode';
import UnifluxMermaidEditor from './UnifluxMermaidEditor';
import UnifluxC4Palette from './UnifluxC4Palette';
import UnifluxC4NodeEditor from './UnifluxC4NodeEditor';
import UnifluxC4Templates from './UnifluxC4Templates';
import UnifluxTemplatesModal from './UnifluxTemplatesModal';
import UnifluxC4PersonNode from './nodes/UnifluxC4PersonNode';
import UnifluxC4SystemNode from './nodes/UnifluxC4SystemNode';
import UnifluxC4ContainerNode from './nodes/UnifluxC4ContainerNode';
import UnifluxC4ComponentNode from './nodes/UnifluxC4ComponentNode';
import UnifluxC4BoundaryNode from './nodes/UnifluxC4BoundaryNode';
import IconNode from './nodes/IconNode';
import ImageNode from './nodes/ImageNode';
import UnifluxProNode from './nodes/UnifluxProNode';
import UnifluxTextNode from './nodes/UnifluxTextNode';
import UnifluxMovableEdge from './edges/UnifluxMovableEdge';

// Derived from modes.ts — workspace doesn't need to know C4 node names directly
const C4_NODE_TYPES = MODE_REGISTRY['c4'].nodeTypes;
const C4_CONTAINER_TYPES = new Set<string>(['C4_CONTAINER_WEB','C4_CONTAINER_API','C4_CONTAINER_DB','C4_CONTAINER_QUEUE']);

function getC4ReactFlowType(c4Type: string): string {
    if (c4Type === 'C4_PERSON') return 'C4_PERSON';
    if (c4Type === 'C4_SYSTEM' || c4Type === 'C4_SYSTEM_EXT') return 'C4_SYSTEM';
    if (C4_CONTAINER_TYPES.has(c4Type)) return 'C4_CONTAINER';
    if (c4Type === 'C4_COMPONENT') return 'C4_COMPONENT';
    if (c4Type === 'C4_BOUNDARY') return 'C4_BOUNDARY';
    return 'C4_SYSTEM';
}

const nodeTypes = {
    ENVIRONMENT: UnifluxEnvironmentNode,
    visioShape: VisioShapeNode,
    C4_PERSON: UnifluxC4PersonNode,
    C4_SYSTEM: UnifluxC4SystemNode,
    C4_CONTAINER: UnifluxC4ContainerNode,
    C4_COMPONENT: UnifluxC4ComponentNode,
    C4_BOUNDARY: UnifluxC4BoundaryNode,
    ICON: IconNode,
    IMAGE: ImageNode,
    PRO_NODE: UnifluxProNode,
    TEXT: UnifluxTextNode,
};

const edgeTypes = {
    orthogonal: UnifluxMovableEdge,
    movable: UnifluxMovableEdge,
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
    const { user, tenantId, viewContext } = useAuth();
    const roleLevel = viewContext?.activeRole ?? 0;
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
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [isDeletingFlow, setIsDeletingFlow] = useState(false);

    // Tracks the source Mermaid flow ID when a conversion draft is active.
    // Cleared on explicit save or when loading a different flow.
    const [sourceMermaidFlowId, setSourceMermaidFlowId] = useState<string | null>(null);

    // C4 diagram state
    const [activeC4Level, setActiveC4Level] = useState<1 | 2 | 3>(1);
    const [showTemplatesModal, setShowTemplatesModal] = useState(false);

    // Keep graph.c4Level in sync with activeC4Level so it's persisted on save
    const handleC4LevelChange = (level: 1 | 2 | 3) => {
        setActiveC4Level(level);
        setGraph(prev => ({ ...prev, c4Level: level }));
        
        // Update visibility directly on React Flow state to avoid wiping out unsaved local changes
        setNodes(nds => nds.map(n => {
            if (!C4_NODE_TYPES.has(n.data.type as string)) return n;
            const visTier = getNodeVisibility(n.data as any, level);
            const opacity = n.data.isLocked ? 0.8 : OPACITY[visTier];
            return {
                ...n,
                data: { ...n.data, dimmed: visTier !== 'full' },
                style: { ...n.style, opacity, pointerEvents: n.data.isLocked ? 'none' : 'all' },
                draggable: !n.data.isLocked && visTier === 'full',
                selectable: visTier === 'full'
            };
        }));
        
        setEdges(eds => {
            // Build a fast lookup map for edges to check node visibility
            const nodeMapLocal = buildNodeMap(nodes.map(n => ({ ...n.data, id: n.id }) as any));
            return eds.map(e => {
                const isC4Edge = graph.docType === 'c4';
                if (!isC4Edge) return e;
                const edgeVisTier = getEdgeVisibility({ source: e.source, target: e.target } as any, nodeMapLocal, level);
                const edgeDimmed = edgeVisTier !== 'full';
                const edgeStyle = getC4EdgeStyle(e.data?.c4RelType as any, edgeDimmed);
                return {
                    ...e,
                    style: edgeStyle.line,
                    markerEnd: edgeStyle.markerEnd as any,
                    labelStyle: { fill: edgeDimmed ? '#d1d5db' : '#4b5563', fontWeight: 600, fontSize: 11, fontFamily: 'inherit' },
                    labelBgStyle: { fill: '#ffffff', stroke: edgeDimmed ? '#f3f4f6' : '#cbd5e1', strokeWidth: 1.5, fillOpacity: 0.95 }
                };
            });
        });
    };

    // Wizard State
    const [showWizard, setShowWizard] = useState(false);
    const [wizardInput, setWizardInput] = useState('');
    const [isGeneratingWizard, setIsGeneratingWizard] = useState(false);
    const [wizardError, setWizardError] = useState<string | null>(null);

    // React Flow State
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [showGrid, setShowGrid] = useState<boolean>(graph.showGrid ?? true);
    const [interactionMode, setInteractionMode] = useState<'pan' | 'selection'>('pan');
    
    // V9: Inter-flow navigation (deep linking)
    const pendingNavigationNodeId = useRef<string | null>(null);

    // Sync showGrid when loading a flow
    useEffect(() => {
        if (graph.showGrid !== undefined) {
            setShowGrid(graph.showGrid);
        }
    }, [graph.id, graph.showGrid]);

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
    
    // Auto Layout & Export
    const triggerAutoLayout = useCallback((dir: 'LR' | 'TB') => {
        takeSnapshot();
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            nodes,
            edges,
            dir
        );
        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);
        setTimeout(() => reactFlowInstance?.fitView({ duration: 500, padding: 0.2 }), 50);
    }, [nodes, edges, reactFlowInstance, takeSnapshot, setNodes, setEdges]);

    const handleExport = useCallback((format: 'png' | 'jpeg' | 'svg' | 'pdf') => {
        const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
        if (!viewport) return;
        
        // Use a high pixel ratio for maximum resolution
        const filter = (node: HTMLElement) => {
            if (node?.classList?.contains('react-flow__minimap') || 
                node?.classList?.contains('react-flow__controls') ||
                node?.classList?.contains('react-flow__background') // Hide grid during export
            ) return false;
            return true;
        };

        const config = {
            backgroundColor: '#ffffff',
            pixelRatio: format === 'svg' ? 1 : 4,
            filter,
            cacheBust: true,
            style: {
                transform: 'none',
            }
        };

        const downloadFile = (dataUrl: string, ext: string) => {
            const a = document.createElement('a');
            a.setAttribute('download', `uniflux-${graph.name.toLowerCase().replace(/\s/g, '-')}.${ext}`);
            a.setAttribute('href', dataUrl);
            a.click();
        };

        const container = document.querySelector('.react-flow') as HTMLElement;
        if (!container) return;

        if (format === 'png') {
            toPng(container, config).then(dataUrl => downloadFile(dataUrl, 'png'));
        } else if (format === 'jpeg') {
            toJpeg(container, config).then(dataUrl => downloadFile(dataUrl, 'jpg'));
        } else if (format === 'svg') {
            toSvg(container, config).then(dataUrl => downloadFile(dataUrl, 'svg'));
        } else if (format === 'pdf') {
            toPng(container, config).then(dataUrl => {
                const pdf = new jsPDF({
                    orientation: container.offsetWidth > container.offsetHeight ? 'landscape' : 'portrait',
                    unit: 'px',
                    format: [container.offsetWidth, container.offsetHeight]
                });
                pdf.addImage(dataUrl, 'PNG', 0, 0, container.offsetWidth, container.offsetHeight);
                pdf.save(`uniflux-${graph.name.toLowerCase().replace(/\s/g, '-')}.pdf`);
            });
        }
    }, [graph.name]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (e.shiftKey) redo();
                else undo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                redo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [undo, redo]);

    // V9: Handle cross-flow navigation with auto-centering
    useEffect(() => {
        if (pendingNavigationNodeId.current && reactFlowInstance && nodes.length > 0) {
            const targetNode = nodes.find(n => n.id === pendingNavigationNodeId.current);
            if (targetNode) {
                console.log('UniFlux: Navegando a nodo profundo', targetNode.id);
                setTimeout(() => {
                    reactFlowInstance.fitView({ 
                        nodes: [targetNode], 
                        duration: 800, 
                        padding: 0.5 
                    });
                    pendingNavigationNodeId.current = null;
                }, 100);
            }
        }
    }, [nodes, reactFlowInstance]);

    const handleJumpToFlow = useCallback(async (flowId: string, nodeId?: string) => {
        if (!flowId) return;
        console.log('UniFlux: Saltando a flujo', flowId, nodeId ? `nodo ${nodeId}` : '');
        pendingNavigationNodeId.current = nodeId || null;
        await handleLoadFlow(flowId);
    }, []);

    // Editor State
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    // Inline edge-label editor (replaces window.prompt)
    const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
    const [edgeEditValue, setEdgeEditValue] = useState('');
    const [edgeProtocol, setEdgeProtocol] = useState('');
    const [edgeRelType, setEdgeRelType] = useState<string>('sync');
    const [edgeLineType, setEdgeLineType] = useState<string>('smoothstep');
    const [edgeAnimated, setEdgeAnimated] = useState<boolean>(true);
    const [edgeColor, setEdgeColor] = useState<string>('#94a3b8');

    // Save toast
    const [showSaveToast, setShowSaveToast] = useState(false);

    // Post-AI banner — reminds user they can undo
    const [showAiBanner, setShowAiBanner] = useState(false);

    const isNodeVisibleAtLevel = useCallback((nodeType: string, nodeC4Level: number | undefined, viewLevel: number): boolean => {
        const natural = nodeC4Level ?? ({ C4_PERSON:1, C4_SYSTEM:1, C4_SYSTEM_EXT:1, C4_CONTAINER_WEB:2, C4_CONTAINER_API:2, C4_CONTAINER_DB:2, C4_CONTAINER_QUEUE:2, C4_COMPONENT:3, C4_BOUNDARY:1 } as Record<string,number>)[nodeType] ?? viewLevel;
        return natural <= viewLevel;
    }, []);
    
    // Context Menu State
    const [menu, setMenu] = useState<{ id?: string, top?: number, left?: number, right?: number, bottom?: number, type: 'node' | 'pane' | 'edge' } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent | MouseEvent, node: Node) => {
            event.preventDefault();
            setMenu({
                id: node.id,
                top: event.clientY,
                left: event.clientX,
                type: 'node'
            });
        },
        [setMenu]
    );

    const onPaneContextMenu = useCallback(
        (event: React.MouseEvent | MouseEvent) => {
            event.preventDefault();
            setMenu({
                top: event.clientY,
                left: event.clientX,
                type: 'pane'
            });
        },
        [setMenu]
    );

    const onEdgeContextMenu = useCallback(
        (event: React.MouseEvent | MouseEvent, edge: Edge) => {
            event.preventDefault();
            setMenu({
                id: edge.id,
                top: event.clientY,
                left: event.clientX,
                type: 'edge'
            });
        },
        [setMenu]
    );

    const closeMenu = useCallback(() => setMenu(null), []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as any)) {
                closeMenu();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, [closeMenu]);

    const onNodeResizeStop = useCallback((id: string, width: number, height: number) => {
        // Coordinated update for visual immediate feedback and persistence
        setNodes(nds => nds.map(n => n.id === id ? { 
            ...n, 
            style: { ...n.style, width, height },
            // Also update measured for parenting logic
            measured: { ...n.measured, width, height }
        } : n));
        
        setGraph(prev => ({
            ...prev,
            nodes: prev.nodes.map(n => n.id === id ? { ...n, width, height } : n)
        }));
        
        setTimeout(takeSnapshot, 0);
    }, [setNodes, setGraph, takeSnapshot]);

    const syncNodesFromGraph = useCallback((targetGraph: FlowGraph) => {
        const nodeMap = buildNodeMap(targetGraph.nodes);
        const renderableNodes = targetGraph.nodes.filter(n =>
            !C4_NODE_TYPES.has(n.type) || shouldRender(n, activeC4Level)
        );
        const rfNodes: Node[] = renderableNodes.map(n => {
            const isC4 = C4_NODE_TYPES.has(n.type);
            const isBoundaryLike = n.type === 'ENVIRONMENT' || n.type === 'C4_BOUNDARY';
            const visTier = isC4 ? getNodeVisibility(n, activeC4Level) : 'full';
            const opacity = n.isLocked ? 0.8 : OPACITY[visTier];
            return {
                id: n.id,
                type: isC4 ? getC4ReactFlowType(n.type) : (n.type === 'ENVIRONMENT' ? 'ENVIRONMENT' : n.type === 'ICON' ? 'ICON' : n.type === 'IMAGE' ? 'IMAGE' : n.type === 'TEXT' ? 'TEXT' : 'visioShape'),
                position: n.position || { x: 0, y: 0 },
                data: isC4 ? {
                    label: n.label,
                    type: n.type,
                    c4Type: n.type,
                    technology: n.technology,
                    description: n.description,
                    external: n.external,
                    c4Level: n.c4Level,
                    isLocked: n.isLocked,
                    dimmed: visTier !== 'full',
                    onResizeStop: onNodeResizeStop,
                    // V9
                    targetFlowId: n.targetFlowId,
                    targetNodeId: n.targetNodeId,
                    onNavigate: handleJumpToFlow,
                } : {
                    label: n.label,
                    type: n.type,
                    isLocked: n.isLocked,
                    onResizeStop: onNodeResizeStop,
                    // V9
                    targetFlowId: n.targetFlowId,
                    targetNodeId: n.targetNodeId,
                    onNavigate: handleJumpToFlow,
                    ...n.additionalData
                },
                zIndex: isBoundaryLike ? (n.isLocked ? -10 : -1) : 1,
                style: isC4
                    ? { background: 'transparent', border: 'none', padding: 0, width: n.width, height: n.height, opacity, transition: 'opacity 0.25s ease' }
                    : (n.type === 'ENVIRONMENT'
                         ? { ...getNodeStyle(n.type), width: n.width, height: n.height, opacity: n.isLocked ? 0.8 : 1, pointerEvents: 'all' }
                         : n.type === 'ICON' || n.type === 'IMAGE'
                         ? { background: 'transparent', border: 'none', padding: 0, width: n.width ?? 64, height: n.height ?? 64, opacity: n.isLocked ? 0.8 : 1 }
                         : { background: 'transparent', border: 'none', padding: 0, width: n.width ?? 120, height: n.height ?? 80, opacity: n.isLocked ? 0.8 : 1 }
                      ),
                parentId: n.parentId || undefined,
                draggable: !n.isLocked && visTier === 'full',
                selectable: isBoundaryLike ? true : visTier === 'full',
                sourcePosition: isC4 ? undefined : Position.Right,
                targetPosition: isC4 ? undefined : Position.Left,
            };
        });

        const rfEdges: Edge[] = targetGraph.edges.map(e => {
            const isC4Edge = targetGraph.docType === 'c4';
            const nodeMapLocal = buildNodeMap(targetGraph.nodes);
            const edgeVisTier = isC4Edge ? getEdgeVisibility(e, nodeMapLocal, activeC4Level) : 'full';
            const edgeDimmed = edgeVisTier !== 'full';
            const edgeStyle = getC4EdgeStyle(e.c4RelType, edgeDimmed as boolean);
            return {
                id: e.id,
                source: e.source,
                target: e.target,
                ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
                ...(e.targetHandle ? { targetHandle: e.targetHandle } : {}),
                label: e.label || (isC4Edge && e.protocol ? e.protocol : undefined),
                type: isC4Edge ? 'default' : 'orthogonal',
                animated: isC4Edge ? (e.c4RelType === 'async' || e.c4RelType === 'event') : false,
                style: isC4Edge ? edgeStyle.line : undefined,
                markerEnd: isC4Edge 
                    ? (edgeStyle.markerEnd || { type: MarkerType.ArrowClosed, color: isC4Edge ? getC4EdgeStyle(e.c4RelType, edgeDimmed).line.stroke : '#94a3b8' }) 
                    : (e.markerEnd || { type: MarkerType.ArrowClosed, width: 20, height: 20, color: (e.style?.stroke || '#94a3b8') }),
                labelStyle: { fill: edgeDimmed ? '#d1d5db' : '#4b5563', fontWeight: 600, fontSize: 11, fontFamily: 'inherit' },
                labelBgStyle: { fill: '#ffffff', stroke: edgeDimmed ? '#f3f4f6' : '#cbd5e1', strokeWidth: 1.5, fillOpacity: 0.95 },
                labelBgPadding: [10, 5] as [number, number],
                labelBgBorderRadius: 6,
                data: isC4Edge ? { c4RelType: e.c4RelType, protocol: e.protocol, c4Description: e.c4Description } : {
                    animated: e.animated,
                    style: e.style,
                    markerEnd: e.markerEnd,
                    pathPoints: e.pathPoints || []
                },
            };
        });

        setNodes(rfNodes);
        setEdges(rfEdges);

    }, [activeC4Level, isNodeVisibleAtLevel]);

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
                // Removed auto-open sidebar to avoid covering the stencil palette
                // if (flows.length > 0 && graph.nodes.length === 0) {
                //     setIsSidebarOpen(true);
                // }
            })
            .catch(err => console.error("Failed to load flows", err))
            .finally(() => setIsLoadingFlows(false));
    }, [selectedProjectId, user, tenantId]);

    // Flow Loading & Reset Handlers
    const handleLoadFlow = async (flowId: string) => {
        const tenantToUse = tenantId || '1';
        const rawFlowInfo = await getFlow(tenantToUse, flowId);
        if (rawFlowInfo) {
            // Auto-upgrade legacy Firestore documents to current schema
            const flowInfo = needsMigration(rawFlowInfo) ? migrateGraph(rawFlowInfo) : rawFlowInfo;
            setGraph(flowInfo);
            setSelectedProjectId(flowInfo.projectId || selectedProjectId);
            setIsSidebarOpen(false);
            setShowWizard(false);
            setSourceMermaidFlowId(null);
            if (flowInfo.docType === 'c4' && flowInfo.c4Level) {
                setActiveC4Level(flowInfo.c4Level as 1 | 2 | 3);
            }
            syncNodesFromGraph(flowInfo);
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
        setShowGrid(true);
        setIsSidebarOpen(false);
        setNodes([]);
        setEdges([]);
        setShowWizard(true);
        setSourceMermaidFlowId(null);
    };

    const handleNewC4Flow = () => {
        const newTemplate: FlowGraph = {
            ...INITIAL_GRAPH,
            id: `draft-${Date.now()}`,
            projectId: selectedProjectId,
            name: 'Nuevo Diagrama C4',
            docType: 'c4',
            c4Level: 1,
            schemaVersion: 3,
        };
        setGraph(newTemplate);
        setShowGrid(true);
        setIsSidebarOpen(false);
        setNodes([]);
        setEdges([]);
        setShowWizard(true);
        handleC4LevelChange(1);
        setSourceMermaidFlowId(null);
    };

    const handleApplyC4Template = (tplNodes: FlowNode[], tplEdges: FlowEdge[]) => {
        const newGraph = { ...graph, nodes: tplNodes, edges: tplEdges };
        setGraph(newGraph);
        syncNodesFromGraph(newGraph);
        setShowWizard(false);
        setShowTemplatesModal(false);
        setTimeout(takeSnapshot, 0);
    };

    const handleGenerateAreas = (count: number) => {
        const newNodes: Node[] = [];
        const spacing = 450;
        const startX = 50;
        const startY = 50;

        let nextId = 1;
        const existingIds = nodes.map(n => parseInt(n.id)).filter(id => !isNaN(id));
        if (existingIds.length > 0) {
            nextId = Math.max(...existingIds) + 1;
        }

        for (let i = 0; i < count; i++) {
            const newNodeId = (nextId + i).toString();
            const label = `Sistema ${i + 1}`;
            newNodes.push({
                id: newNodeId,
                type: 'ENVIRONMENT',
                position: { x: startX + (i % 3) * spacing, y: startY + Math.floor(i / 3) * spacing },
                data: { 
                    label: `${newNodeId}. ${label}`, 
                    type: 'ENVIRONMENT',
                    onResizeStop: onNodeResizeStop 
                },
                style: { 
                    background: 'rgba(241, 245, 249, 0.4)',
                    borderColor: '#94a3b8',
                    borderStyle: 'dashed',
                    borderWidth: '2px',
                    borderRadius: '12px',
                    width: 400,
                    height: 300 
                },
                zIndex: -1,
            });
        }

        setNodes(nds => nds.concat(newNodes));
        setTimeout(takeSnapshot, 0);
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
        setSourceMermaidFlowId(null);
    };

    const handleDeleteFlow = async (flowId: string) => {
        if (!tenantId || !user) return;
        setIsDeletingFlow(true);
        try {
            await deleteFlow(tenantId, flowId, user.uid, roleLevel);
            setSavedFlows(prev => prev.filter(f => f.id !== flowId));
            // If the deleted flow is the active one, reset to a new blank flow
            if (graph.id === flowId) {
                setGraph({ ...INITIAL_GRAPH, id: `draft-${Date.now()}`, projectId: selectedProjectId });
                setNodes([]);
                setEdges([]);
                setShowWizard(true);
            }
        } catch (e) {
            console.error("Failed to delete flow", e);
            alert("Error al borrar el flujo");
        } finally {
            setIsDeletingFlow(false);
            setConfirmDeleteId(null);
        }
    };

    const handleMermaidChange = useCallback((code: string) => {
        setGraph(prev => ({ ...prev, mermaidCode: code }));
    }, []);

    const handleMermaidEngineChange = useCallback((engine: MermaidEngine) => {
        setGraph(prev => ({ ...prev, mermaidEngine: engine }));
    }, []);

    const handleConvertMermaidToVisual = useCallback((vNodes: FlowNode[], vEdges: FlowEdge[]) => {
        // Store the source Mermaid flow ID so the user can reconvert later
        setSourceMermaidFlowId(graph.id);
        const newGraph: FlowGraph = {
            id: `draft-${Date.now()}`,
            tenantId: tenantId || '',
            ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
            name: `${graph.name} (Visual)`,
            docType: 'visual',
            nodes: vNodes,
            edges: vEdges,
            metadata: {
                version: '0.1',
                authorId: user?.uid || 'user',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        };
        setGraph(newGraph);
        setIsSidebarOpen(false);
        setShowWizard(false);
    }, [graph.id, graph.name, selectedProjectId, tenantId, user]);

    const handleNameRename = () => {
        if (!editNameValue.trim()) {
            setIsEditingName(false);
            return;
        }
        setGraph(prev => ({ ...prev, name: editNameValue }));
        setIsEditingName(false);
    };

    // Node Editor Save Handlers
    const handleNodeSave = (nodeId: string, newLabel: string, newType: NodeType, additionalData?: any) => {
        setNodes(nds => nds.map(node => {
            if (node.id === nodeId) {
                return {
                    ...node,
                    type: newType, // Make sure the React Flow type is updated
                    data: { 
                        ...node.data, 
                        label: (newType === 'ICON' || newType === 'IMAGE') ? newLabel : `${node.id}. ${newLabel}`, 
                        type: newType,
                        onNavigate: handleJumpToFlow,
                        ...additionalData 
                    },
                    style: (newType === 'ICON' || newType === 'IMAGE' || newType === 'PRO_NODE')
                        ? { background: 'transparent', border: 'none', padding: 0, width: node.style?.width ?? (newType === 'PRO_NODE' ? 200 : 64), height: node.style?.height ?? (newType === 'PRO_NODE' ? 100 : 64), opacity: node.data.isLocked ? 0.8 : 1 }
                        : { ...getNodeStyle(newType), width: node.style?.width, height: node.style?.height, opacity: node.data.isLocked ? 0.8 : 1 }
                };
            }
            return node;
        }));
        setSelectedNode(null);
        setTimeout(takeSnapshot, 0);
    };

    const handleC4NodeSave = (nodeId: string, newLabel: string, newType: C4NodeType, technology: string, description: string, external: boolean, additionalData?: any) => {
        const rfType = getC4ReactFlowType(newType);
        setNodes(nds => nds.map(node => {
            if (node.id === nodeId) {
                return {
                    ...node,
                    type: rfType,
                    data: { 
                        ...node.data, 
                        label: newLabel, 
                        type: newType, 
                        c4Type: newType, 
                        technology, 
                        description, 
                        external,
                        onNavigate: handleJumpToFlow,
                        ...additionalData
                    },
                    style: { background: 'transparent', border: 'none', padding: 0, opacity: node.data.isLocked ? 0.8 : 1 },
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

    const handleNodeDuplicate = (nodeId: string) => {
        const nodeToCopy = nodes.find(n => n.id === nodeId);
        if (!nodeToCopy) return;
        
        const newNode = {
            ...nodeToCopy,
            id: `node-${Date.now()}`,
            position: { x: nodeToCopy.position.x + 50, y: nodeToCopy.position.y + 50 },
            selected: false,
        };
        
        setNodes(nds => nds.map(n => ({ ...n, selected: false })).concat(newNode));
        setTimeout(takeSnapshot, 0);
    };

    const handleToggleLock = useCallback((nodeId: string, locked: boolean) => {
        setNodes(nds => nds.map(node => {
            if (node.id === nodeId) {
                const isBoundary = node.data.type === 'ENVIRONMENT' || node.data.type === 'C4_BOUNDARY';
                return {
                    ...node,
                    draggable: !locked,
                    selectable: isBoundary ? true : !locked,
                    zIndex: isBoundary ? (locked ? -10 : -1) : 1,
                    data: { ...node.data, isLocked: locked },
                    style: { ...node.style, opacity: locked ? 0.8 : 1, pointerEvents: 'all' }
                };
            }
            return node;
        }));

        // Do NOT call setGraph here. setGraph triggers the useEffect that re-syncs everything from the abstract graph.
        // Since the abstract graph is only updated on manual "Save", calling setGraph here would revert all unsaved 
        // node moves or label changes. We only update the local React Flow state; it will be persisted when the user 
        // clicks the main "Guardar" button.
        
        // Update selection state to reflect the new lock status in the editor panel
        setSelectedNode(prev => prev?.id === nodeId
            ? { ...prev, data: { ...prev.data, isLocked: locked }, draggable: !locked }
            : prev
        );
        setTimeout(takeSnapshot, 0);
    }, [setNodes, takeSnapshot]);

    const onConnect = useCallback((params: Connection) => {
        // Automatically add an empty label or default animated edge
        const newEdge: Edge = {
            ...params,
            id: `e-${params.source}-${params.target}-${Date.now()}`,
            type: 'orthogonal',
            animated: false,
            style: { stroke: '#94a3b8', strokeWidth: 2 },
            markerEnd: { 
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: '#94a3b8'
            },
            labelStyle: { fill: '#4b5563', fontWeight: 600, fontSize: 12, fontFamily: 'inherit' },
            labelBgStyle: { fill: '#ffffff', stroke: '#cbd5e1', strokeWidth: 1.5, fillOpacity: 0.95 },
            labelBgPadding: [12, 6],
            labelBgBorderRadius: 8,
        };
        setEdges((eds) => addEdge(newEdge, eds));
        setTimeout(takeSnapshot, 0);
    }, [setEdges, takeSnapshot]);

    const onReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
        setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
        setTimeout(takeSnapshot, 0);
    }, [setEdges, takeSnapshot]);

    // Waypoint management for movable edges
    const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
        if (!reactFlowInstance) return;
        
        // Add point if edge is selected or Shift is held
        if (!edge.selected && !event.shiftKey) return;

        const position = reactFlowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
        });

        setEdges((eds) => eds.map((e) => {
            if (e.id === edge.id) {
                const currentPoints = (e.data?.pathPoints as any[]) || [];
                return { 
                    ...e, 
                    data: { 
                        ...e.data, 
                        pathPoints: [...currentPoints, position] 
                    } 
                };
            }
            return e;
        }));
        setTimeout(takeSnapshot, 0);
    }, [reactFlowInstance, setEdges, takeSnapshot]);

    // Inline edge label editor handlers
    const onEdgeDoubleClick = (event: React.MouseEvent, edge: Edge) => {
        event.stopPropagation();
        setEditingEdge(edge);
        setEdgeEditValue((edge.label as string) || '');
        setEdgeProtocol((edge.data?.protocol as string) || '');
        setEdgeRelType((edge.data?.c4RelType as string) || 'sync');
        setEdgeLineType(edge.type || 'smoothstep');
        setEdgeAnimated(edge.animated || false);
        setEdgeColor(edge.style?.stroke || '#94a3b8');
    };

    const handleEdgeLabelSave = () => {
        if (!editingEdge) return;
        const isC4 = graph.docType === 'c4';
        setEdges(eds => eds.map(e => {
            if (e.id !== editingEdge.id) return e;
            const updated = {
                ...e,
                label: isC4 ? (edgeProtocol || edgeEditValue || undefined) : edgeEditValue,
                data: isC4 ? { ...e.data, c4RelType: edgeRelType, protocol: edgeProtocol, c4Description: edgeEditValue } : e.data,
                ...getC4EdgeStyle(isC4 ? edgeRelType : undefined, false),
                type: isC4 ? e.type : edgeLineType,
                animated: isC4 ? (edgeRelType === 'async' || edgeRelType === 'event') : edgeAnimated,
                style: { ...e.style, stroke: edgeColor, strokeWidth: 2 },
                markerEnd: typeof e.markerEnd === 'object' ? { ...e.markerEnd, color: edgeColor } : e.markerEnd,
            };
            return updated;
        }));
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

            const type = event.dataTransfer.getData('application/reactflow/type') as AnyNodeType;
            const label = event.dataTransfer.getData('application/reactflow/label');
            const c4Type = event.dataTransfer.getData('application/reactflow/c4type') as C4NodeType | '';
            const additionalDataRaw = event.dataTransfer.getData('application/reactflow/additionalData');
            let additionalData: Record<string, any> = {};
            try { if (additionalDataRaw) additionalData = JSON.parse(additionalDataRaw); } catch {}

            if (!type || !label || !reactFlowInstance) return;

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            let newIdNum = 1;
            while (nodes.some(n => n.id === newIdNum.toString())) newIdNum++;
            const newNodeId = newIdNum.toString();

            const isC4 = C4_NODE_TYPES.has(type);

            let newNode: Node;
            if (isC4) {
                const rfType = getC4ReactFlowType(type);
                const isBoundary = type === 'C4_BOUNDARY';
                newNode = {
                    id: newNodeId,
                    type: rfType,
                    position,
                    data: { label, type, c4Type: type, technology: '', description: '', external: false, c4Level: activeC4Level, onNavigate: handleJumpToFlow },
                    style: { background: 'transparent', border: 'none', padding: 0, ...(isBoundary ? { width: 300, height: 200 } : {}) },
                    zIndex: isBoundary ? -1 : 1,
                };
            } else {
                newNode = {
                    id: newNodeId,
                    type: type === 'ENVIRONMENT' ? 'ENVIRONMENT' : type === 'ICON' ? 'ICON' : type === 'IMAGE' ? 'IMAGE' : 'visioShape',
                    position,
                    data: { label, type, onNavigate: handleJumpToFlow, ...additionalData },
                    style: type === 'ENVIRONMENT' 
                        ? { ...getNodeStyle(type), width: 400, height: 300, border: '2px dashed #94a3b8', borderRadius: '12px' } 
                        : type === 'ICON' || type === 'IMAGE'
                        ? { background: 'transparent', border: 'none', padding: 0, width: 64, height: 64 }
                        : { background: 'transparent', border: 'none', padding: 0, width: 120, height: 80 },
                    sourcePosition: Position.Right,
                    targetPosition: Position.Left,
                };
            }

            setNodes((nds) => nds.concat(newNode));
            setTimeout(takeSnapshot, 0);
        },
        [reactFlowInstance, setNodes, nodes, activeC4Level],
    );


    const onNodeDragStop = useCallback((_event: any, draggedNode: Node) => {
        // Use React Flow's own computed absolute position — it's the most reliable source during drag
        const absX = (draggedNode as any).computed?.positionAbsolute?.x ?? (draggedNode as any).positionAbsolute?.x;
        const absY = (draggedNode as any).computed?.positionAbsolute?.y ?? (draggedNode as any).positionAbsolute?.y;

        // If we can't get absolute position, just persist the relative position as-is
        if (absX == null || absY == null || isNaN(absX) || isNaN(absY)) {
            // Just persist the current position without re-parenting
            setGraph(prev => ({
                ...prev,
                nodes: prev.nodes.map(n => {
                    if (n.id === draggedNode.id) {
                        return { ...n, position: draggedNode.position };
                    }
                    return n;
                })
            }));
            setTimeout(takeSnapshot, 0);
            return;
        }

        const currentParentId = draggedNode.parentId;

        // Helper to get absolute position of a container
        const getContainerAbsPos = (container: Node): { x: number; y: number } => {
            const cx = (container as any).computed?.positionAbsolute?.x ?? (container as any).positionAbsolute?.x ?? container.position.x;
            const cy = (container as any).computed?.positionAbsolute?.y ?? (container as any).positionAbsolute?.y ?? container.position.y;
            return { x: cx, y: cy };
        };

        // Hit test: find all containers the node center is inside of
        const containers = nodes.filter(n => {
            if (n.id === draggedNode.id) return false;
            if (n.type !== 'ENVIRONMENT' && n.type !== 'C4_BOUNDARY') return false;
            // Don't allow a container to be parented to itself or to its own children
            if (draggedNode.type === 'ENVIRONMENT' || draggedNode.type === 'C4_BOUNDARY') {
                if (n.parentId === draggedNode.id) return false;
            }
            const envAbs = getContainerAbsPos(n);
            const w = n.measured?.width ?? (n.style?.width as number) ?? 0;
            const h = n.measured?.height ?? (n.style?.height as number) ?? 0;
            if (w === 0 || h === 0) return false;
            return (absX >= envAbs.x && absY >= envAbs.y && absX <= envAbs.x + w && absY <= envAbs.y + h);
        });

        // Pick the smallest (innermost) container
        let targetEnv: Node | null = null;
        if (containers.length > 0) {
            containers.sort((a, b) => {
                const areaA = (a.measured?.width ?? (a.style?.width as number) ?? 9999) * (a.measured?.height ?? (a.style?.height as number) ?? 9999);
                const areaB = (b.measured?.width ?? (b.style?.width as number) ?? 9999) * (b.measured?.height ?? (b.style?.height as number) ?? 9999);
                return areaA - areaB;
            });
            targetEnv = containers[0];
        }

        const newParentId = targetEnv?.id || undefined;
        const parentChanged = currentParentId !== newParentId;

        // If parent didn't change, just persist the position React Flow already set (it's already relative to parent)
        if (!parentChanged) {
            setGraph(prev => ({
                ...prev,
                nodes: prev.nodes.map(n => {
                    if (n.id === draggedNode.id) {
                        return { ...n, position: draggedNode.position };
                    }
                    return n;
                })
            }));
            setTimeout(takeSnapshot, 0);
            return;
        }

        // Parent changed — need to recalculate relative position for the new parent
        let newRelativePos: { x: number; y: number };
        if (targetEnv) {
            const envAbs = getContainerAbsPos(targetEnv);
            newRelativePos = { x: absX - envAbs.x, y: absY - envAbs.y };
        } else {
            // Moving out of a container — use absolute position
            newRelativePos = { x: absX, y: absY };
        }

        // Update visual state immediately
        setNodes(nds => nds.map(n => {
            if (n.id === draggedNode.id) {
                return { ...n, parentId: newParentId, position: newRelativePos };
            }
            return n;
        }));

        // Persist to graph
        setGraph(prev => ({
            ...prev,
            nodes: prev.nodes.map(n => {
                if (n.id === draggedNode.id) {
                    return { ...n, parentId: newParentId, position: newRelativePos };
                }
                return n;
            })
        }));

        setTimeout(takeSnapshot, 0);
    }, [nodes, setNodes, setGraph, takeSnapshot]);

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
        syncNodesFromGraph(mergedGraph);
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
            // Mode-aware prompt: C4 passes the description directly; visual wraps it with intent context
            const mode = getMode(graph.docType);
            const prompt = mode.id === 'c4'
                ? wizardInput
                : `Describe the initial data flow: ${wizardInput}. Create nodes representing these systems and the flow of information between them.`;

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
                    ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
                    schemaVersion: CURRENT_SCHEMA_VERSION,
                };
            } else {
                // Re-sync React Flow visually into the abstract FlowGraph
                const updatedGraphNodes: FlowNode[] = nodes.map(n => {
                    const isC4 = C4_NODE_TYPES.has(n.data.type as string);
                    const isBoundaryLike = n.data.type === 'ENVIRONMENT' || n.data.type === 'C4_BOUNDARY';
                    return {
                        id: n.id,
                        type: (n.data.type as AnyNodeType) || (n.type === 'TEXT' ? 'TEXT' : 'OPERATION'),
                        label: isBoundaryLike
                            ? (n.data.label as string)
                            : isC4
                                ? (n.data.label as string)
                                : (n.data.label as string).replace(new RegExp(`^${n.id}\\.\\s*`), ''),
                        position: n.position,
                        ...(n.parentId ? { parentId: n.parentId } : {}),
                        ...(n.data.isLocked !== undefined ? { isLocked: n.data.isLocked as boolean } : {}),
                        ...(n.style?.width !== undefined ? { width: n.style.width as number } : {}),
                        ...(n.style?.height !== undefined ? { height: n.style.height as number } : {}),
                        // C4-specific fields
                        ...(isC4 && n.data.technology ? { technology: n.data.technology as string } : {}),
                        ...(isC4 && n.data.description ? { description: n.data.description as string } : {}),
                        ...(isC4 && n.data.external !== undefined ? { external: n.data.external as boolean } : {}),
                        ...(isC4 && n.data.c4Level ? { c4Level: n.data.c4Level as 1|2|3|4 } : {}),
                        // Inter-flow hyperlinking
                        targetFlowId: n.data.targetFlowId as string | undefined,
                        targetNodeId: n.data.targetNodeId as string | undefined,
                        additionalData: {
                            ...(n.data.additionalData || {}),
                            ...(n.data.rotation ? { rotation: n.data.rotation } : {}),
                            ...(n.data.imageUrl ? { imageUrl: n.data.imageUrl } : {}),
                            ...(n.data.iconId ? { iconId: n.data.iconId } : {}),
                        }
                    };
                });

                const updatedGraphEdges: FlowEdge[] = edges.map(e => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
                    ...(e.targetHandle ? { targetHandle: e.targetHandle } : {}),
                    ...(e.label ? { label: e.label as string } : {}),
                    // Persist visual styles
                    animated: e.animated,
                    style: e.style,
                    markerEnd: e.markerEnd,
                    // Persist C4 data if present
                    ...(e.data?.c4RelType ? { c4RelType: e.data.c4RelType as any } : {}),
                    ...(e.data?.protocol ? { protocol: e.data.protocol as string } : {}),
                    ...(e.data?.c4Description ? { c4Description: e.data.c4Description as string } : {}),
                    pathPoints: (e.data?.pathPoints as any[]) || []
                }));

                finalGraph = {
                    ...graph,
                    ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
                    nodes: updatedGraphNodes,
                    edges: updatedGraphEdges,
                    showGrid,
                    schemaVersion: CURRENT_SCHEMA_VERSION,
                };
            }

            await saveFlowDraft(tenantToUse, finalGraph, user.uid);
            setGraph(finalGraph);
            setSourceMermaidFlowId(null); // draft is now saved — no longer a conversion draft

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
    // For C4: only passes nodes visible at the current view level (AI doesn't need dimmed context).
    const liveGraph = useMemo<FlowGraph>(() => {
        const allNodes: FlowNode[] = nodes.map(n => {
            const isC4 = C4_NODE_TYPES.has(n.data.type as string);
            const isBoundaryLike = n.data.type === 'ENVIRONMENT' || n.data.type === 'C4_BOUNDARY';
            return {
                id: n.id,
                type: (n.data.type as AnyNodeType) || 'OPERATION',
                label: isBoundaryLike || isC4
                    ? (n.data.label as string)
                    : (n.data.label as string).replace(new RegExp(`^${n.id}\\.\\s*`), ''),
                position: n.position,
                parentId: n.parentId,
                isLocked: n.data.isLocked as boolean | undefined,
                width: n.style?.width as number | undefined,
                height: n.style?.height as number | undefined,
                ...(isC4 ? {
                    technology: n.data.technology as string | undefined,
                    description: n.data.description as string | undefined,
                    external: n.data.external as boolean | undefined,
                    c4Level: n.data.c4Level as 1|2|3|4 | undefined,
                } : {}),
                targetFlowId: n.data.targetFlowId as string | undefined,
                targetNodeId: n.data.targetNodeId as string | undefined,
            };
        });
        const allEdges: FlowEdge[] = edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label as string | undefined,
            ...(e.data?.c4RelType ? { c4RelType: e.data.c4RelType as any } : {}),
            ...(e.data?.protocol ? { protocol: e.data.protocol as string } : {}),
            // Pass visual styles to AI so it understands the current aesthetic
            animated: e.animated,
            style: e.style,
            markerEnd: e.markerEnd,
        }));

        // For C4: trim to only what's visible at the current level so the AI gets clean context
        const { nodes: visibleNodes, edges: visibleEdges } = graph.docType === 'c4'
            ? getAIVisibleGraph(allNodes, allEdges, activeC4Level)
            : { nodes: allNodes, edges: allEdges };

        return { ...graph, nodes: visibleNodes, edges: visibleEdges };
    }, [graph, nodes, edges, activeC4Level]);

    return (
        <div className="w-full h-screen bg-gray-50 flex flex-col relative overflow-hidden">
            <header className="h-14 bg-slate-950 border-b border-slate-800 px-4 md:px-6 flex items-center justify-between z-20 shadow-lg">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <ListTree className="w-5 h-5" />
                        <span className="text-sm font-bold hidden sm:inline">Explorador</span>
                    </button>

                    <button
                        onClick={() => setShowTemplatesModal(true)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <LayoutTemplate className="w-5 h-5" />
                        <span className="text-sm font-bold hidden sm:inline">Plantillas</span>
                    </button>

                    <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>

                    <div className="flex items-center gap-2">
                        {isEditingName ? (
                            <input
                                autoFocus
                                value={editNameValue}
                                onChange={(e) => setEditNameValue(e.target.value)}
                                onBlur={handleNameRename}
                                onKeyDown={(e) => e.key === 'Enter' && handleNameRename()}
                                className="text-sm font-medium text-white bg-slate-800 border border-blue-500 rounded-md px-2 py-1 outline-none w-48"
                            />
                        ) : (
                            <div
                                onClick={() => { setEditNameValue(graph.name); setIsEditingName(true); }}
                                className="text-sm font-medium text-slate-200 bg-slate-900 px-3 py-1.5 rounded-md border border-slate-700 hover:border-slate-500 hover:bg-slate-800 cursor-pointer flex items-center gap-2 group transition-colors"
                                title="Click para renombrar el flujo"
                            >
                                {graph.name}
                                <Pencil className="w-3 h-3 text-slate-500 group-hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        )}
                        {/* C4 level badge — visible only in C4 mode */}
                        {graph.docType === 'c4' && (
                            <div className="flex items-center gap-1">
                                {([1, 2, 3] as const).map(lvl => (
                                    <button
                                        key={lvl}
                                        onClick={() => handleC4LevelChange(lvl)}
                                        title={lvl === 1 ? 'L1 Context' : lvl === 2 ? 'L2 Container' : 'L3 Component'}
                                        className={`text-[10px] font-bold px-2 py-1 rounded border transition-all ${
                                            activeC4Level === lvl
                                                ? 'text-white border-blue-600'
                                                : 'text-blue-600 bg-white border-blue-200 hover:border-blue-400'
                                        }`}
                                        style={activeC4Level === lvl ? { background: 'linear-gradient(135deg, #1168BD, #438DD5)' } : {}}
                                    >
                                        L{lvl}
                                    </button>
                                ))}
                            </div>
                        )}
                        {/* Mermaid badge */}
                        {graph.docType === 'mermaid' && (
                            <span className="text-[10px] font-bold text-teal-600 bg-teal-50 border border-teal-200 px-2 py-1 rounded">
                                Mermaid DSL
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="text-xs sm:text-sm border border-slate-700 bg-slate-900 hover:bg-slate-800 py-1.5 px-3 rounded-lg font-medium text-slate-200 outline-none cursor-pointer hidden md:block focus:border-blue-500"
                    >
                        <option value="" disabled>1. Seleccionar Proyecto...</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleSave}
                        disabled={isSaving || !selectedProjectId}
                        className="flex items-center gap-2 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-400"
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

                {/* Flow Management Sidebar Overlay - Removed to prevent blocking interaction */}

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

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0">
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
                                    const isC4 = flow.docType === 'c4';
                                    const nodeCount = (isMermaid || isC4) ? null : (flow.nodes?.length ?? 0);
                                    const isActive = graph.id === flow.id;
                                    return (
                                        <div
                                            key={flow.id}
                                            className={`w-full text-left rounded-xl border transition-all group ${isActive
                                                ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-100'
                                                : 'bg-white border-gray-100 hover:border-purple-200 hover:shadow-sm'
                                                }`}
                                        >
                                            {confirmDeleteId === flow.id ? (
                                                // ── Confirm delete state ──
                                                <div className="flex items-center gap-2 p-3">
                                                    <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                                                    <span className="text-xs font-bold text-red-600 flex-1">¿Borrar "{flow.name || 'Sin título'}"?</span>
                                                    <button
                                                        onClick={() => handleDeleteFlow(flow.id)}
                                                        disabled={isDeletingFlow}
                                                        className="px-2 py-1 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        {isDeletingFlow ? '...' : 'Borrar'}
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        disabled={isDeletingFlow}
                                                        className="px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            ) : (
                                                // ── Normal flow item ──
                                                <div className="flex items-center gap-3 p-3">
                                                    <button
                                                        onClick={() => handleLoadFlow(flow.id)}
                                                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                                    >
                                                        <div className={`p-2 rounded-lg shrink-0 ${isActive
                                                            ? isC4 ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                                            : 'bg-gray-50 text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-600'}`}>
                                                            {isMermaid ? <GitBranch className="w-4 h-4" /> : isC4 ? <Building2 className="w-4 h-4" /> : <ListTree className="w-4 h-4" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className={`text-sm font-bold truncate ${isActive ? (isC4 ? 'text-blue-900' : 'text-purple-900') : 'text-gray-700'}`}>
                                                                {flow.name || 'Sin título'}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                                {isMermaid
                                                                    ? <span className="text-[10px] text-teal-500 font-medium">Mermaid DSL</span>
                                                                    : isC4
                                                                        ? <span className="text-[10px] text-blue-500 font-medium">C4 Architecture · L{flow.c4Level ?? 1}</span>
                                                                        : <span className="text-[10px] text-gray-400">{nodeCount} nodos</span>
                                                                }
                                                                {dateStr && <><span className="text-[10px] text-gray-300">·</span><span className="text-[10px] text-gray-400">{dateStr}</span></>}
                                                            </div>
                                                        </div>
                                                    </button>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                                                        {/* Visible solo si admin (≥80) o creador del flujo */}
                                                        {(roleLevel >= 80 || (flow as any).createdBy === user?.uid) && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(flow.id); }}
                                                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Borrar flujo"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
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
                            Nuevo Flujo Visual
                        </button>
                        <button
                            onClick={handleNewC4Flow}
                            className="w-full flex justify-center items-center gap-2 py-2.5 bg-white border border-blue-200 hover:border-blue-400 hover:text-blue-700 text-blue-600 rounded-xl font-bold text-sm transition-all shadow-sm"
                        >
                            <Building2 className="w-4 h-4" />
                            Nuevo Diagrama C4
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

                {/* AI Interaction Layer — hidden only in Mermaid mode */}
                {!showWizard && graph.docType !== 'mermaid' && <UnifluxToolbar currentGraph={liveGraph} onGraphUpdate={handleGraphUpdate} />}

                {/* Initial Wizard Overlay — hidden in Mermaid mode */}
                {showWizard && graph.docType !== 'mermaid' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm">
                        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border border-gray-100">
                            {graph.docType === 'c4' ? (
                                <>
                                    <h2 className="text-2xl font-bold mb-2" style={{ background: 'linear-gradient(135deg, #1168BD, #438DD5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                        Nuevo Diagrama C4
                                    </h2>
                                    <p className="text-gray-600 mb-2">
                                        Describe la arquitectura a documentar. La IA generará el diagrama en nivel {activeC4Level === 1 ? 'L1 Context' : activeC4Level === 2 ? 'L2 Container' : 'L3 Component'}.
                                    </p>
                                    <div className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-5">
                                        {activeC4Level === 1 && '🌐 L1 Context — sistemas, actores y relaciones principales'}
                                        {activeC4Level === 2 && '📦 L2 Container — apps, APIs, bases de datos y colas'}
                                        {activeC4Level === 3 && '🧩 L3 Component — módulos y servicios internos'}
                                        {' · Cambia el nivel en la paleta izquierda.'}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 mb-2">
                                        Iniciar Nuevo Flujo
                                    </h2>
                                    <p className="text-gray-600 mb-6">
                                        ¿Qué sistemas van a interactuar? Describe el escenario inicial para generar la estructura base.
                                    </p>
                                </>
                            )}

                            <form onSubmit={handleWizardSubmit}>
                                <textarea
                                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none mb-4"
                                    rows={4}
                                    placeholder={graph.docType === 'c4'
                                        ? activeC4Level === 1 ? 'Ej: Sistema e-commerce con clientes web, app móvil, pasarela de pagos externa y ERP interno.'
                                        : activeC4Level === 2 ? 'Ej: Backend de pedidos con API REST en Node.js, PostgreSQL y cola Kafka.'
                                        : 'Ej: Módulo de autenticación con JWT service, user repository y email notification.'
                                        : 'Ej: El cliente hace un pedido en la App Móvil, se registra en el CRM y pasa al ERP para facturación.'
                                    }
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
                                        className={`px-6 py-2 text-white rounded-lg hover:shadow-lg hover:opacity-90 transition-all font-medium disabled:opacity-50 flex items-center gap-2 ${graph.docType === 'c4' ? '' : 'bg-gradient-to-r from-purple-600 to-blue-600'}`}
                                        style={graph.docType === 'c4' ? { background: 'linear-gradient(135deg, #1168BD, #438DD5)' } : {}}
                                    >
                                        {isGeneratingWizard ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                {graph.docType === 'c4' ? 'Generando C4...' : 'Generando Flujo...'}
                                            </>
                                        ) : graph.docType === 'c4' ? 'Generar Diagrama C4' : 'Generar Flujo Inicial'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Templates and Area Generator Modal */}
                {showTemplatesModal && (
                    <UnifluxTemplatesModal
                        onApplyTemplate={handleApplyC4Template}
                        onGenerateAreas={handleGenerateAreas}
                        onOpenAIWizard={() => setShowWizard(true)}
                        onClose={() => setShowTemplatesModal(false)}
                        docType={graph.docType || 'visual'}
                    />
                )}

                {/* Node Palette — visual flow palette or C4 palette depending on mode */}
                {graph.docType === 'c4'
                    ? <UnifluxC4Palette activeLevel={activeC4Level} onLevelChange={handleC4LevelChange} onOpenTemplates={() => setShowTemplatesModal(true)} />
                    : !showWizard && graph.docType !== 'mermaid' && <VisioStencilPalette />
                }

                <div className="flex-1 relative h-full overflow-hidden">
                    {/* Node Editor — C4 editor or standard editor depending on node type */}
                    {selectedNode && graph.docType !== 'mermaid' && (
                    C4_NODE_TYPES.has(selectedNode.data.type as string)
                        ? <UnifluxC4NodeEditor
                            key={selectedNode.id}
                            nodeId={selectedNode.id}
                            initialLabel={selectedNode.data.label as string}
                            initialType={selectedNode.data.c4Type as C4NodeType || selectedNode.data.type as C4NodeType}
                            initialTechnology={selectedNode.data.technology as string | undefined}
                            initialDescription={selectedNode.data.description as string | undefined}
                            initialExternal={selectedNode.data.external as boolean | undefined}
                            isLocked={selectedNode.data.isLocked as boolean | undefined}
                            onSave={handleC4NodeSave}
                            onClose={() => setSelectedNode(null)}
                            onDelete={handleNodeDelete}
                            onToggleLock={selectedNode.data.type === 'C4_BOUNDARY' ? handleToggleLock : undefined}
                            availableFlows={savedFlows}
                            initialData={selectedNode.data}
                          />
                        : <UnifluxNodeEditor
                            key={selectedNode.id}
                            nodeId={selectedNode.id}
                            initialLabel={
                                selectedNode.data.type === 'ENVIRONMENT'
                                    ? (selectedNode.data.label as string)
                                    : (selectedNode.data.label as string).replace(new RegExp(`^${selectedNode.id}\\.\\s*`), '')
                            }
                            initialType={selectedNode.data.type as NodeType || 'OPERATION'}
                            initialData={selectedNode.data}
                            isLocked={selectedNode.data.isLocked as boolean | undefined}
                            onSave={handleNodeSave}
                            onClose={() => setSelectedNode(null)}
                            onDelete={handleNodeDelete}
                            onToggleLock={selectedNode.data.type === 'ENVIRONMENT' ? handleToggleLock : undefined}
                            availableFlows={savedFlows}
                          />
                )}

                {/* Inline Edge Editor — standard for visual flow, enriched for C4 */}
                {editingEdge && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-96">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-3">
                            {graph.docType === 'c4' ? 'Editar relación C4' : 'Editar etiqueta de conexión'}
                        </p>

                        {graph.docType === 'c4' && (
                            <>
                                {/* Relationship type selector */}
                                <div className="mb-3">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1.5">Tipo de relación</label>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {[
                                            { id: 'sync',     label: '→ Sync',     color: '#1168BD' },
                                            { id: 'async',    label: '⇢ Async',    color: '#438DD5' },
                                            { id: 'event',    label: '⚡ Evento',   color: '#f59e0b' },
                                            { id: 'database', label: '🗄 Database', color: '#10b981' },
                                            { id: 'external', label: '🌍 Externo',  color: '#9ca3af' },
                                        ].map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setEdgeRelType(t.id)}
                                                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all"
                                                style={edgeRelType === t.id
                                                    ? { background: t.color, color: '#fff', borderColor: t.color }
                                                    : { background: '#f9fafb', color: '#374151', borderColor: '#e5e7eb' }
                                                }
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {/* Protocol */}
                                <div className="mb-3">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Protocolo / Tecnología</label>
                                    <input
                                        value={edgeProtocol}
                                        onChange={e => setEdgeProtocol(e.target.value)}
                                        placeholder="Ej: HTTPS/JSON, SQL queries, gRPC"
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>
                                {/* Description */}
                                <div className="mb-3">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Descripción (opcional)</label>
                                    <input
                                        autoFocus
                                        value={edgeEditValue}
                                        onChange={e => setEdgeEditValue(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleEdgeLabelSave(); if (e.key === 'Escape') setEditingEdge(null); }}
                                        placeholder="¿Qué hace esta llamada?"
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>
                            </>
                        )}

                        {graph.docType !== 'c4' && (
                            <>
                                <input
                                    autoFocus
                                    value={edgeEditValue}
                                    onChange={e => setEdgeEditValue(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleEdgeLabelSave(); if (e.key === 'Escape') setEditingEdge(null); }}
                                    placeholder="Texto de la conexión (vacío = sin etiqueta)"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 mb-3"
                                />
                                <div className="flex gap-2 mb-3">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tipo de línea</label>
                                        <select
                                            value={edgeLineType}
                                            onChange={e => setEdgeLineType(e.target.value)}
                                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-400"
                                        >
                                            <option value="default">Curva (Bezier)</option>
                                            <option value="smoothstep">Escalón Suave</option>
                                            <option value="orthogonal">Ortogonal Pro</option>
                                            <option value="step">Escalón</option>
                                            <option value="straight">Recta</option>
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Animación</label>
                                        <button
                                            onClick={() => setEdgeAnimated(!edgeAnimated)}
                                            className={`w-full py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all ${edgeAnimated ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                                        >
                                            {edgeAnimated ? '⚡ Animada' : 'Estática'}
                                        </button>
                                    </div>
                                    <div className="w-16">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Color</label>
                                        <input
                                            type="color"
                                            value={edgeColor}
                                            onChange={e => setEdgeColor(e.target.value)}
                                            className="w-full h-[30px] border border-gray-200 rounded-lg cursor-pointer p-0.5 bg-white"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
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

                {/* Conversion draft banner — shown when current visual is an unsaved conversion */}
                {sourceMermaidFlowId && graph.docType !== 'mermaid' && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-amber-50 border border-amber-200 shadow-lg rounded-xl px-4 py-2.5 text-sm">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
                        <span className="text-amber-800 font-medium">Borrador de conversión — no guardado</span>
                        <button
                            onClick={() => handleLoadFlow(sourceMermaidFlowId)}
                            className="ml-1 px-3 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                        >
                            Reconvertir desde Mermaid
                        </button>
                        <button
                            onClick={() => setSourceMermaidFlowId(null)}
                            className="p-1 text-amber-400 hover:text-amber-700"
                            title="Descartar aviso"
                        >
                            <X className="w-3 h-3" />
                        </button>
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
                    onReconnect={onReconnect}
                    edgesReconnectable={true}
                    panOnDrag={interactionMode === 'pan'}
                    selectionOnDrag={interactionMode === 'selection'}
                    selectionMode={SelectionMode.Partial}
                    onInit={setReactFlowInstance}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onNodeDragStop={onNodeDragStop}
                    onEdgeClick={onEdgeClick}
                    onNodeDoubleClick={(_, node) => setSelectedNode(node)}
                    onEdgeDoubleClick={onEdgeDoubleClick}
                    onNodeContextMenu={onNodeContextMenu}
                    onPaneContextMenu={onPaneContextMenu}
                    onEdgeContextMenu={onEdgeContextMenu}
                    onPaneClick={() => { setSelectedNode(null); setEditingEdge(null); closeMenu(); }}
                    edgeTypes={edgeTypes}
                    snapToGrid={true}
                    snapGrid={[15, 15]}
                    fitView
                    fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
                    minZoom={0.1}
                    maxZoom={2}
                    defaultEdgeOptions={{ 
                        type: 'smoothstep', 
                        animated: false,
                        style: { strokeWidth: 2, stroke: '#94a3b8' },
                        markerEnd: {
                            type: 'arrowclosed' as any,
                            color: '#94a3b8',
                        },
                    }}
                    connectionLineStyle={{ strokeWidth: 2, stroke: '#3b82f6' }}
                    connectionLineType={'smoothstep' as any}
                    connectionMode={ConnectionMode.Loose}
                    elevateNodesOnSelect={false}
                >
                    {showGrid && <Background color="#94a3b8" variant={BackgroundVariant.Dots} gap={15} size={1} />}
                    <MiniMap 
                        nodeColor={(n) => n.type === 'visioShape' ? '#94a3b8' : '#cbd5e1'}
                        maskColor="rgba(0,0,0,0.1)"
                        pannable
                        zoomable
                    />
                    <Controls position="bottom-right" className="z-50" />
                    <Panel position="top-right" className="flex items-center gap-1.5 p-1 bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-slate-200">
                        <div className="flex bg-slate-100 rounded-lg p-0.5 mr-1">
                            <button 
                                onClick={() => setInteractionMode('pan')} 
                                className={`p-1.5 rounded-md transition-all ${interactionMode === 'pan' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                title="Modo Mano (Panorámica)"
                            >
                                <Hand className="w-3.5 h-3.5" />
                            </button>
                            <button 
                                onClick={() => setInteractionMode('selection')} 
                                className={`p-1.5 rounded-md transition-all ${interactionMode === 'selection' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                title="Modo Selección (Arrastrar para seleccionar varios)"
                            >
                                <MousePointer2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="w-px h-4 bg-slate-200 mr-1"></div>
                        <button 
                            onClick={() => setShowGrid(!showGrid)} 
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${showGrid ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-slate-600 hover:bg-slate-100'}`}
                            title={showGrid ? 'Ocultar Cuadrícula' : 'Mostrar Cuadrícula'}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            Grid
                        </button>
                        <div className="w-px h-4 bg-slate-200"></div>
                        <button onClick={() => triggerAutoLayout('LR')} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors" title="Diagrama Horizontal">
                            <LayoutTemplate className="w-3.5 h-3.5" />
                            Auto Layout
                        </button>
                        <div className="w-px h-4 bg-slate-200"></div>
                        <div className="relative group">
                            <button className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-blue-600 rounded-lg flex items-center gap-1.5 transition-colors" title="Exportar Diseño en Alta Resolución">
                                <Download className="w-3.5 h-3.5" />
                                Exportar HQ
                            </button>
                            <div className="absolute right-0 top-full pt-1 hidden group-hover:block w-40 bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden py-1 z-[100]">
                                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Seleccionar Formato</span>
                                </div>
                                <button onClick={() => handleExport('svg')} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-b border-slate-100">Vectorial (.svg)</button>
                                <button onClick={() => handleExport('png')} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700">Imagen PNG (.png)</button>
                                <button onClick={() => handleExport('jpeg')} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 border-b border-slate-100">Imagen JPG (.jpg)</button>
                                <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700">Documento PDF (.pdf)</button>
                            </div>
                        </div>
                    </Panel>
                </ReactFlow>}
                </div>
                {/* Context Menu */}
                {menu && (
                    <div
                        ref={menuRef}
                        style={{ top: menu.top, left: menu.left }}
                        className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 min-w-[180px] animate-in fade-in zoom-in duration-150"
                    >
                        {menu.type === 'node' && (
                            <>
                                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Acciones Nodo</div>
                                <button onClick={() => { setSelectedNode(nodes.find(n => n.id === menu.id) || null); closeMenu(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-purple-700 hover:bg-purple-50 rounded-lg transition-colors text-left font-bold">
                                    <Settings className="w-4 h-4 text-purple-600" /> Propiedades / Vincular
                                </button>
                                <button onClick={() => { handleNodeDuplicate(menu.id!); closeMenu(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left">
                                    <Copy className="w-4 h-4 text-slate-400" /> Duplicar
                                </button>
                                <button onClick={() => { handleToggleLock(menu.id!, !nodes.find(n => n.id === menu.id)?.data.isLocked); closeMenu(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left">
                                    <Save className="w-4 h-4 text-slate-400" /> {nodes.find(n => n.id === menu.id)?.data.isLocked ? 'Desbloquear' : 'Bloquear'}
                                </button>
                                <div className="h-px bg-slate-100 my-1" />
                                <button onClick={() => { handleNodeDelete(menu.id!); closeMenu(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left">
                                    <Trash2 className="w-4 h-4" /> Eliminar
                                </button>
                            </>
                        )}
                        {menu.type === 'pane' && (
                            <>
                                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lienzo</div>
                                <button onClick={() => { reactFlowInstance?.fitView({ duration: 400 }); closeMenu(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left">
                                    <Map className="w-4 h-4 text-slate-400" /> Centrar Vista
                                </button>
                                <button onClick={() => { handleNewFlow(); closeMenu(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left">
                                    <Plus className="w-4 h-4 text-slate-400" /> Nuevo Flujo
                                </button>
                                <div className="h-px bg-slate-100 my-1" />
                                <button onClick={() => { handleExport('png'); closeMenu(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left">
                                    <Download className="w-4 h-4 text-slate-400" /> Exportar PNG
                                </button>
                                <div className="h-px bg-slate-100 my-1" />
                                <button onClick={() => { 
                                    if (reactFlowInstance && menu) {
                                        const position = reactFlowInstance.screenToFlowPosition({ x: menu.left, y: menu.top });
                                        const newNodeId = `text-${Date.now()}`;
                                        const newNode = {
                                            id: newNodeId,
                                            type: 'TEXT',
                                            position,
                                            data: { label: '', type: 'TEXT', onResizeStop: onNodeResizeStop },
                                            style: { width: 250, height: 100 }
                                        };
                                        setNodes(nds => nds.concat(newNode));
                                        setTimeout(takeSnapshot, 0);
                                    }
                                    closeMenu(); 
                                }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-left">
                                    <Type className="w-4 h-4" /> Añadir Comentario
                                </button>
                            </>
                        )}
                    </div>
                )}
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
            if (type.startsWith('C4_')) {
                return { background: 'transparent', border: 'none', padding: 0 };
            }
            return { ...base, background: '#FFFFFF', borderColor: '#9E9E9E' };
    }
}

// C4 edge visual styles by relationship type
function getC4EdgeStyle(relType?: string, dimmed?: boolean) {
    const alpha = dimmed ? '33' : 'ff';
    const styles: Record<string, { line: React.CSSProperties; markerEnd?: any }> = {
        sync:     { line: { stroke: `#1168BD${alpha}`, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: `#1168BD${alpha}` } },
        async:    { line: { stroke: `#438DD5${alpha}`, strokeWidth: 2, strokeDasharray: '6 3' }, markerEnd: { type: MarkerType.ArrowClosed, color: `#438DD5${alpha}` } },
        event:    { line: { stroke: `#f59e0b${alpha}`, strokeWidth: 2, strokeDasharray: '2 4' }, markerEnd: { type: MarkerType.ArrowClosed, color: `#f59e0b${alpha}` } },
        database: { line: { stroke: `#10b981${alpha}`, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: `#10b981${alpha}` } },
        external: { line: { stroke: `#9ca3af${alpha}`, strokeWidth: 1.5, strokeDasharray: '8 4' }, markerEnd: { type: MarkerType.ArrowClosed, color: `#9ca3af${alpha}` } },
    };
    return styles[relType ?? 'sync'] ?? styles.sync;
}

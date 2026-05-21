'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ReactFlow, Background, BackgroundVariant, Controls, MiniMap, Panel, Node, Edge, useNodesState, useEdgesState, Connection, addEdge, reconnectEdge, Position, ConnectionMode, SelectionMode, MarkerType, getNodesBounds } from '@xyflow/react';
import { FlowGraph, FlowNode, FlowEdge, NodeType, C4NodeType, AnyNodeType, MermaidEngine } from '@/app/uniflux/core/types';
import { getMode, MODE_REGISTRY } from '@/app/uniflux/core/modes';
import { migrateGraph, needsMigration } from '@/app/uniflux/core/migrations';
import { getNodeVisibility, getEdgeVisibility, buildNodeMap, getAIVisibleGraph, shouldRender, OPACITY } from '@/app/uniflux/core/visibility';
import { CURRENT_SCHEMA_VERSION } from '@/app/uniflux/core/migrations';
import UnifluxToolbar from './UnifluxToolbar';
import { useAuth } from '@/context/AuthContext';
import { saveFlowDraft, listProjectFlows, getFlow, deleteFlow, createBidirectionalLink, lockFlow, unlockFlow } from '@/app/actions/uniflux';
import { getActiveProjects } from '@/lib/projects';
import { Project } from '@/types';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Save, Loader2, CheckCircle2, Folder, Plus, File, X, ListTree, Pencil, RotateCcw, GitBranch, Trash2, Building2, Map, LayoutTemplate, Download, Copy, Type, LayoutGrid, MousePointer2, Hand, Settings, Link as LinkIcon, ExternalLink, ArrowLeftRight, Tags } from 'lucide-react';
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
import UnifluxOrthogonalEdge from './edges/UnifluxOrthogonalEdge';
import { UnifluxDirtyContext } from './UnifluxContext';
import UnifluxAlignmentGuides, { AlignmentGuide, DistanceIndicator } from './UnifluxAlignmentGuides';

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

function getReactFlowNodeType(type: string): string {
    if (type === 'ENVIRONMENT') return 'ENVIRONMENT';
    if (type === 'ICON') return 'ICON';
    if (type === 'IMAGE') return 'IMAGE';
    if (type === 'TEXT') return 'TEXT';
    if (type === 'PRO_NODE') return 'PRO_NODE';
    return 'visioShape';
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
    orthogonal: UnifluxOrthogonalEdge,
    smoothstep: UnifluxOrthogonalEdge,
    step: UnifluxOrthogonalEdge,
    straight: UnifluxOrthogonalEdge,
    movable: UnifluxOrthogonalEdge,
    // 'default' is intentionally NOT overridden: C4 edges use type='default'
    // and need React Flow's built-in bezier renderer with their own styled props.
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
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isDirty, setIsDirty] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [showSaveToast, setShowSaveToast] = useState(false);
    const [backupNotice, setBackupNotice] = useState<{ flowId: string; timestamp: string } | null>(null);
    const [tenantLogoUrl, setTenantLogoUrl] = useState<string | null>(null);
    const [tenantLogoBase64, setTenantLogoBase64] = useState<string | null>(null);

    // Flow Management State
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [copyTargetFlow, setCopyTargetFlow] = useState<FlowGraph | null>(null);
    const [copyTargetProjectId, setCopyTargetProjectId] = useState<string>('');
    const [isCopyingFlow, setIsCopyingFlow] = useState(false);
    const [savedFlows, setSavedFlows] = useState<FlowGraph[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLoadingFlows, setIsLoadingFlows] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [isDeletingFlow, setIsDeletingFlow] = useState(false);

    // Tracks whether the user has active selected/created a flow since initialization.
    // Controls the display of the welcome startup screen.
    const [isWorkflowInitialized, setIsWorkflowInitialized] = useState(false);

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
    
    // Wrapped handlers to track dirtiness
    const onNodesChangeWrapped = useCallback((changes: any) => {
        onNodesChange(changes);
        // 'dimensions' is excluded: React Flow fires it on initial DOM measurement,
        // which would mark dirty before Firestore data loads (root cause of the F5 wipe bug).
        // Actual user resizes are captured by onNodeResizeStop.
        const hasMeaningfulChange = changes.some((c: any) =>
            c.type === 'position' || c.type === 'remove' || c.type === 'add' || c.type === 'replace'
        );
        if (hasMeaningfulChange) setIsDirty(true);
    }, [onNodesChange]);

    const onEdgesChangeWrapped = useCallback((changes: any) => {
        onEdgesChange(changes);
        // 'select' is excluded: clicking an edge to select it is not a persistable change.
        const hasMeaningfulChange = changes.some((c: any) =>
            c.type === 'remove' || c.type === 'add'
        );
        if (hasMeaningfulChange) setIsDirty(true);
    }, [onEdgesChange]);

    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [showGrid, setShowGrid] = useState<boolean>(graph.showGrid ?? true);
    const [showLogisticsLabels, setShowLogisticsLabels] = useState(true);
    const [interactionMode, setInteractionMode] = useState<'pan' | 'selection'>('pan');
    
    // V10: Alignment Guides
    const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
    const [distanceIndicators, setDistanceIndicators] = useState<DistanceIndicator[]>([]);

    const onNodeDrag = useCallback((event: React.MouseEvent, node: Node) => {
        // GUIAS DESACTIVADAS TEMPORALMENTE A PETICIÓN DE USUARIO
        // const threshold = 5;
        // ... logic omitted
    }, []);
    
    // V9: Inter-flow navigation (deep linking)
    const pendingNavigationNodeId = useRef<string | null>(null);
    const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
    
    // Stable callback exposed via context so edge components can signal dirtiness
    const markDirty = useCallback(() => setIsDirty(true), []);
    const edgeCtxValue = useMemo(() => ({ markDirty, showLogisticsLabels }), [markDirty, showLogisticsLabels]);

    // Break circular dependency: syncNodesFromGraph -> handleJumpToFlow -> handleLoadFlow -> syncNodesFromGraph
    const jumpToFlowRef = useRef<(flowId: string, nodeId?: string) => Promise<void>>(null as any);
    // V12: Bridge reference to allow history hydration access to node handlers without circular dependencies
    const onResizeStopRef = useRef<any>(null);

    // Track active flow ID dynamically to prevent background save race conditions
    const currentGraphIdRef = useRef(graph.id);
    // Absolute barrier: block auto-save while a flow is being loaded into React state
    const isLoadingFlowRef = useRef(false);
    // Bridge ref so effects declared before handleSave can always call the freshest version
    const handleSaveRef = useRef<(isAutoSave: boolean) => Promise<void>>(async () => {});
    // Unique ID for this browser tab — used to block same-user multi-tab edits on the same flow
    const tabIdRef = useRef(crypto.randomUUID());
    // Mirrors isDirty synchronously so handleLoadFlow/handleNewFlow (useCallback closures that
    // don't list isDirty as a dependency) can always read the freshest value without stale closure.
    const isDirtyRef = useRef(false);
    useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);
    // Fallback sync: keeps currentGraphIdRef up-to-date for paths not explicitly covered below.
    useEffect(() => {
        currentGraphIdRef.current = graph.id;
    }, [graph.id]);



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

    const snapshotDebounceRef = useRef<NodeJS.Timeout | null>(null);

    const takeSnapshot = useCallback(() => {
        if (snapshotDebounceRef.current) clearTimeout(snapshotDebounceRef.current);
        
        snapshotDebounceRef.current = setTimeout(() => {
            setNodes(nds => {
                setEdges(eds => {
                    // Strip attachedImage from history: base64 strings can be 150KB+ each.
                    // The image persists in Firestore; undo just restores node structure/position.
                    const stripped = nds.map(n => n.data?.attachedImage
                        ? { ...n, data: { ...n.data, attachedImage: undefined } }
                        : n
                    );
                    const snapshot = { nodes: JSON.parse(JSON.stringify(stripped)), edges: JSON.parse(JSON.stringify(eds)) };
                    const currentIndex = historyIndexRef.current;
                    setHistory(prev => {
                        const newHistory = prev.slice(0, currentIndex + 1);
                        // Optimization: prevent duplicates
                        if (newHistory.length > 0) {
                            const last = newHistory[newHistory.length - 1];
                            if (JSON.stringify(last) === JSON.stringify(snapshot)) return prev;
                        }
                        return [...newHistory, snapshot].slice(-50);
                    });
                    setHistoryIndex(prev => {
                         // Note: We aren't fully guarding the index here if prev was returned, 
                         // but worst case is a safe shallow pointer step. 
                         // The simple debounce solves 99% of concurrency overlaps anyway.
                         return prev + 1;
                    });
                    return eds;
                });
                return nds;
            });
        }, 300); // 300ms de-jitter interval
    }, [setNodes, setEdges]);

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            if (prevState && prevState.nodes) {
                // V12 HYDRATION FIX: JSON.stringify in takeSnapshot stripped function pointers.
                // We explicitly re-inject live handlers so the restored node remains fully interactive!
                const hydratedNodes = prevState.nodes.map(n => ({
                    ...n,
                    data: {
                        ...(n.data || {}),
                        onResizeStop: onResizeStopRef.current,
                        onNavigate: (fid: string, nid?: string) => jumpToFlowRef.current?.(fid, nid)
                    }
                }));
                setNodes(hydratedNodes);
                setEdges(prevState.edges);
                setHistoryIndex(historyIndex - 1);
            }
        }
    }, [history, historyIndex, setNodes, setEdges]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            if (nextState && nextState.nodes) {
                const hydratedNodes = nextState.nodes.map(n => ({
                    ...n,
                    data: {
                        ...(n.data || {}),
                        onResizeStop: onResizeStopRef.current,
                        onNavigate: (fid: string, nid?: string) => jumpToFlowRef.current?.(fid, nid)
                    }
                }));
                setNodes(hydratedNodes);
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

    const handleExport = useCallback(async (format: 'png' | 'jpeg' | 'svg' | 'pdf') => {
        if (!nodes || nodes.length === 0) return;

        const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
        if (!viewport) return;

        // 1. Bounding box in absolute coords
        const absoluteNodes = nodes.map(n => {
            const absX = (n as any).computed?.positionAbsolute?.x ?? (n as any).positionAbsolute?.x ?? n.position.x;
            const absY = (n as any).computed?.positionAbsolute?.y ?? (n as any).positionAbsolute?.y ?? n.position.y;
            return { ...n, position: { x: absX, y: absY } };
        });
        const nodesBounds = getNodesBounds(absoluteNodes);

        const padding = 60;
        const titlePaddingTop = 120;
        const imageWidth  = nodesBounds.width  + padding * 2;
        const imageHeight = nodesBounds.height + padding * 2 + titlePaddingTop;
        const pixelRatio  = format === 'svg' ? 1 : 3;

        // 2. Inject title (no watermark DOM injection — done via canvas compositing instead)
        const titleEl = document.createElement('div');
        titleEl.innerText = graph.name || 'Flujo UniFlux';
        titleEl.style.cssText = `
            position:absolute;
            top:${nodesBounds.y - titlePaddingTop + 25}px;
            left:${nodesBounds.x - padding + 25}px;
            max-width:${Math.max(400, imageWidth / 2)}px;
            font-size:36px; font-weight:800; color:#0f172a;
            font-family:Inter,system-ui,sans-serif; letter-spacing:-0.02em;
        `;
        const dateEl = document.createElement('div');
        dateEl.innerText = `${new Date().toLocaleDateString()} · Generado en UniFlux`;
        dateEl.style.cssText = 'font-size:16px;font-weight:500;color:#64748b;margin-top:6px;';
        titleEl.appendChild(dateEl);
        viewport.appendChild(titleEl);
        
        let watermarkEl: HTMLImageElement | null = null;
        let logoDataUrl = tenantLogoBase64;
        
        if (!logoDataUrl && tenantLogoUrl) {
            try {
                const noCacheUrl = tenantLogoUrl + (tenantLogoUrl.includes('?') ? '&' : '?') + 'cb=' + Date.now();
                const r = await fetch(noCacheUrl, { mode: 'cors' });
                const blob = await r.blob();
                logoDataUrl = await new Promise<string>((res, rej) => {
                    const reader = new FileReader();
                    reader.onload = () => res(reader.result as string);
                    reader.onerror = rej;
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                console.error("Fallback logo fetch failed:", e);
            }
        }

        if (logoDataUrl) {
            watermarkEl = document.createElement('img');
            watermarkEl.src = logoDataUrl;
            watermarkEl.style.position = 'absolute';
            const centerX = nodesBounds.x + nodesBounds.width / 2;
            const centerY = nodesBounds.y + nodesBounds.height / 2;
            const baseSize = Math.max(nodesBounds.width, nodesBounds.height) * 0.7;
            const watermarkSize = Math.min(1600, Math.max(400, baseSize));
            watermarkEl.style.width = `${watermarkSize}px`;
            watermarkEl.style.height = `${watermarkSize}px`;
            watermarkEl.style.objectFit = 'contain';
            watermarkEl.style.left = `${centerX - watermarkSize / 2}px`;
            watermarkEl.style.top = `${centerY - watermarkSize / 2}px`;
            watermarkEl.style.opacity = '0.10';
            // Convertimos el logo a negro (por si es blanco) para que destaque como marca de agua en fondo blanco
            watermarkEl.style.filter = 'brightness(0)';
            watermarkEl.style.zIndex = '0';
            watermarkEl.style.pointerEvents = 'none';
            viewport.insertBefore(watermarkEl, viewport.firstChild);

            try {
                await watermarkEl.decode();
                // Permitir que el navegador pinte la imagen en el DOM antes de capturar
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (err) {
                console.warn("Watermark decode failed:", err);
            }
        }

        const config = {
            backgroundColor: '#ffffff',
            width: imageWidth,
            height: imageHeight,
            pixelRatio,
            cacheBust: true,
            style: {
                width:  `${imageWidth}px`,
                height: `${imageHeight}px`,
                transform: `translate(${-nodesBounds.x + padding}px, ${-nodesBounds.y + titlePaddingTop}px) scale(1)`,
            },
        };

        const downloadFile = (dataUrl: string, ext: string) => {
            const a = document.createElement('a');
            a.setAttribute('download', `uniflux-${graph.name.toLowerCase().replace(/\s/g, '-')}.${ext}`);
            a.setAttribute('href', dataUrl);
            a.click();
        };

        try {
            // 3. Capture raw flow (SVG or raster) with everything inside the DOM natively
            let rawDataUrl: string;
            if (format === 'svg') {
                rawDataUrl = await toSvg(viewport, config);
            } else if (format === 'jpeg') {
                rawDataUrl = await toJpeg(viewport, config);
            } else {
                rawDataUrl = await toPng(viewport, config);
            }

            // 5. Download or generate PDF
            if (format === 'pdf') {
                const pdf = new jsPDF({
                    orientation: imageWidth > imageHeight ? 'landscape' : 'portrait',
                    unit: 'px',
                    format: [imageWidth, imageHeight],
                });
                pdf.addImage(rawDataUrl, 'PNG', 0, 0, imageWidth, imageHeight);
                pdf.save(`uniflux-${graph.name.toLowerCase().replace(/\s/g, '-')}.pdf`);
            } else {
                downloadFile(rawDataUrl, format === 'jpeg' ? 'jpg' : format);
            }
        } catch (err) {
            console.error('Falló la exportación del flujo:', err);
        } finally {
            if (viewport.contains(titleEl)) viewport.removeChild(titleEl);
            if (watermarkEl && viewport.contains(watermarkEl)) viewport.removeChild(watermarkEl);
        };
    }, [graph.name, nodes, tenantLogoBase64]);

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
                handleSaveRef.current(false);
            } else if (e.key === 'Escape') {
                setZoomedImage(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [undo, redo]);

    // Auto-save effect — with critical guard against saving empty state
    useEffect(() => {
        if (!isDirty || !user || !tenantId || !selectedProjectId || isSaving) return;

        // ABSOLUTE BARRIER: Never auto-save while a flow is being loaded into React state.
        if (isLoadingFlowRef.current) {
            console.warn("[uniflux] Auto-save BLOCKED: flow is currently loading.");
            return;
        }

        // CRITICAL GUARD: Never auto-save if nodes array is empty but we have a real flow loaded.
        // This prevents F5/reload from wiping Firestore data before the flow is restored.
        if (nodes.length === 0 && graph.id && graph.id !== INITIAL_GRAPH.id) {
            console.warn("[uniflux] Auto-save BLOCKED: nodes are empty but graph has a real ID. Likely mid-reload.");
            return;
        }

        const timer = setTimeout(() => {
            console.log("[uniflux] Auto-saving...");
            handleSaveRef.current(true);
        }, 5000); // 5 seconds of inactivity triggers auto-save

        return () => clearTimeout(timer);
    }, [nodes, edges, isDirty, user, tenantId, selectedProjectId, isSaving, graph.id]);

    // Local backup effect (every 2 seconds if dirty)
    // Stores a full snapshot including graph metadata so recovery can reconstruct
    // name, docType, and schema even if Firestore is unreachable.
    useEffect(() => {
        if (!isDirty || !graph.id) return;

        const timer = setTimeout(() => {
            const backup = {
                nodes,
                edges,
                name: graph.name,
                docType: graph.docType,
                c4Level: graph.c4Level,
                schemaVersion: graph.schemaVersion,
                projectId: graph.projectId || selectedProjectId,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(`uniflux_backup_${graph.id}`, JSON.stringify(backup));
        }, 2000);

        return () => clearTimeout(timer);
    }, [nodes, edges, isDirty, graph.id, graph.projectId, selectedProjectId]);

    // V9: Handle cross-flow navigation with auto-centering
    useEffect(() => {
        if (pendingNavigationNodeId.current && reactFlowInstance && nodes.length > 0) {
            const targetNode = nodes.find(n => n.id === pendingNavigationNodeId.current);
            if (targetNode) {
                console.log('UniFlux: Navegando a nodo profundo', targetNode.id);
                const nodeId = targetNode.id;
                setTimeout(() => {
                    reactFlowInstance.fitView({ 
                        nodes: [targetNode], 
                        duration: 800, 
                        padding: 0.5 
                    });
                    pendingNavigationNodeId.current = null;
                    setHighlightedNodeId(nodeId);
                    setTimeout(() => setHighlightedNodeId(null), 3000);
                }, 100);
            }
        }
    }, [nodes, reactFlowInstance]);

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
    const [edgeTextColor, setEdgeTextColor] = useState<string>('#000000');
    const [edgeFontFamily, setEdgeFontFamily] = useState<string>('Garamond');
    const [edgePickupType, setEdgePickupType] = useState<string>('');
    const [edgeDeliveryType, setEdgeDeliveryType] = useState<string>('');
    const [edgeJornada, setEdgeJornada] = useState<string>('');
    const [edgeOperacion, setEdgeOperacion] = useState<string>('');
    const [edgeEstadoPedido, setEdgeEstadoPedido] = useState<string>('');
    const [edgeFecha, setEdgeFecha] = useState<string>('');

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
        
        setTimeout(takeSnapshot, 0); setIsDirty(true);
        setIsDirty(true);
    }, [setNodes, setGraph, takeSnapshot]);

    // V12: Bridge current closure to reference so undo/redo hydration is never stale
    useEffect(() => {
        onResizeStopRef.current = onNodeResizeStop;
    }, [onNodeResizeStop]);

    const syncNodesFromGraph = useCallback((targetGraph: FlowGraph, initializeHistory = false) => {
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
                type: isC4 ? getC4ReactFlowType(n.type) : getReactFlowNodeType(n.type),
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
                    onNavigate: (fid: string, nid?: string) => jumpToFlowRef.current?.(fid, nid),
                } : {
                    label: n.label,
                    type: n.type,
                    isLocked: n.isLocked,
                    onResizeStop: onNodeResizeStop,
                    // V9
                    targetFlowId: n.targetFlowId,
                    targetNodeId: n.targetNodeId,
                    onNavigate: (fid: string, nid?: string) => jumpToFlowRef.current?.(fid, nid),
                    onZoomImage: (url: string) => setZoomedImage(url),
                    ...n.additionalData
                },
                zIndex: isBoundaryLike ? (n.isLocked ? -10 : -1) : 1,
                style: isC4
                    ? { background: 'transparent', border: 'none', padding: 0, width: n.width, height: n.height, opacity, transition: 'opacity 0.25s ease' }
                    : (n.type === 'ENVIRONMENT'
                         ? { ...getNodeStyle(n.type), width: n.width, height: n.height, opacity: n.isLocked ? 0.8 : 1, pointerEvents: 'all' }
                         : n.type === 'ICON' || n.type === 'IMAGE'
                         ? { background: 'transparent', border: 'none', padding: 0, width: n.width ?? 64, height: n.height ?? 64, opacity: n.isLocked ? 0.8 : 1 }
                         : { background: 'transparent', border: 'none', padding: 0, width: n.width ?? (n.type === 'PRO_NODE' ? 200 : 120), height: n.height ?? (n.type === 'PRO_NODE' ? 100 : n.type === 'TEXT' ? 50 : 80), opacity: n.isLocked ? 0.8 : 1 }
                      ),
                parentId: n.parentId || undefined,
                draggable: !n.isLocked && visTier === 'full',
                selectable: isBoundaryLike ? true : visTier === 'full',
                sourcePosition: isC4 ? undefined : Position.Right,
                targetPosition: isC4 ? undefined : Position.Left,
                className: highlightedNodeId === n.id ? 'node-highlight-pulse' : undefined,
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
                type: isC4Edge ? 'default' : (e.type || 'orthogonal'),
                animated: isC4Edge ? (e.c4RelType === 'async' || e.c4RelType === 'event') : false,
                style: isC4Edge ? edgeStyle.line : e.style,
                markerEnd: isC4Edge 
                    ? (edgeStyle.markerEnd || { type: MarkerType.ArrowClosed, color: isC4Edge ? getC4EdgeStyle(e.c4RelType, edgeDimmed).line.stroke : '#94a3b8' }) 
                    : (e.markerEnd || { type: MarkerType.ArrowClosed, width: 20, height: 20, color: (e.style?.stroke || '#94a3b8') }),
                labelStyle: { fill: edgeDimmed ? '#d1d5db' : '#4b5563', fontWeight: 600, fontSize: 11, fontFamily: 'inherit' },
                labelBgStyle: { fill: '#ffffff', stroke: edgeDimmed ? '#f3f4f6' : '#cbd5e1', strokeWidth: 1.5, fillOpacity: 0.95 },
                labelBgPadding: [10, 5] as [number, number],
                labelBgBorderRadius: 6,
                data: isC4Edge ? { 
                    c4RelType: e.c4RelType, 
                    protocol: e.protocol, 
                    c4Description: e.c4Description,
                    textColor: e.textColor || '#000000',
                    fontFamily: e.fontFamily || 'Garamond'
                } : {
                    animated: e.animated,
                    style: e.style,
                    markerEnd: e.markerEnd,
                    textColor: e.textColor || '#000000',
                    fontFamily: e.fontFamily || 'Garamond',
                    ...(e.pickupType   ? { pickupType:   e.pickupType   } : {}),
                    ...(e.deliveryType ? { deliveryType: e.deliveryType } : {}),
                    ...(e.jornada       ? { jornada:       e.jornada       } : {}),
                    ...(e.operacion     ? { operacion:     e.operacion     } : {}),
                    ...(e.estadoPedido  ? { estadoPedido:  e.estadoPedido  } : {}),
                    ...(e.fecha         ? { fecha:         e.fecha         } : {}),
                },
            };
        });

        setNodes(rfNodes);
        setEdges(rfEdges);

        // V11 Fix: Clean history state ensuring baseline captures EXACTLY what we just calculated
        if (initializeHistory) {
            const initialSnap = { nodes: JSON.parse(JSON.stringify(rfNodes)), edges: JSON.parse(JSON.stringify(rfEdges)) };
            setHistory([initialSnap]);
            setHistoryIndex(0);
            historyIndexRef.current = 0;
            setIsDirty(false);
        }

    }, [activeC4Level, isNodeVisibleAtLevel, onNodeResizeStop, highlightedNodeId]);

    // Fetch Tenant Watermark Logo
    useEffect(() => {
        if (!tenantId || tenantId === "unknown" || tenantId === "__DENY__") return;
        let isMounted = true;
        const fetchLogo = async () => {
            try {
                const tDoc = await getDoc(doc(db, 'tenants', tenantId));
                if (isMounted && tDoc.exists()) {
                    const data = tDoc.data();
                    if (data.logos && data.logos.length > 0) {
                        const principal = data.logos.find((l: any) => l.label?.toLowerCase().includes('principal'));
                        setTenantLogoUrl(principal?.url || data.logos[0].url);
                    } else if (data.logoUrl) {
                        setTenantLogoUrl(data.logoUrl);
                    }
                }
            } catch (e) {
                console.warn("Uniflux: Error pre-cargando marca de agua del tenant", e);
            }
        };
        fetchLogo();
        return () => { isMounted = false; };
    }, [tenantId]);

    // Convert logo URL to base64 data URL so canvas compositing never hits CORS taint.
    // fetch() can retrieve the resource; FileReader converts the blob to a data URL
    // which is always same-origin — canvas.toDataURL() will never throw.
    useEffect(() => {
        if (!tenantLogoUrl) { setTenantLogoBase64(null); return; }
        let cancelled = false;
        const noCacheUrl = tenantLogoUrl + (tenantLogoUrl.includes('?') ? '&' : '?') + 'cb=' + Date.now();
        fetch(noCacheUrl, { mode: 'cors' })
            .then(r => r.blob())
            .then(blob => new Promise<string>((res, rej) => {
                const reader = new FileReader();
                reader.onload  = () => res(reader.result as string);
                reader.onerror = rej;
                reader.readAsDataURL(blob);
            }))
            .then(b64 => { if (!cancelled) setTenantLogoBase64(b64); })
            .catch(() => { if (!cancelled) setTenantLogoBase64(null); });
        return () => { cancelled = true; };
    }, [tenantLogoUrl]);

    // Fetch Projects — and auto-restore last active session on mount
    const hasRestoredSession = useRef(false);
    useEffect(() => {
        if (!user) return;
        const tenantToUse = tenantId || '1';
        getActiveProjects(tenantToUse, user.uid).then(async (data) => {
            setProjects(data);

            // Try to restore the last active session from localStorage (survives F5)
            const savedProjectId = localStorage.getItem('uniflux_active_project_id');
            const savedFlowId = localStorage.getItem('uniflux_active_flow_id');

            if (data.length > 0 && !selectedProjectId) {
                // Prefer the persisted project, fall back to graph.projectId, then first project
                const projectToSelect = (savedProjectId && data.some(p => p.id === savedProjectId))
                    ? savedProjectId
                    : (graph.projectId || data[0].id);
                setSelectedProjectId(projectToSelect);
            }

            // Auto-restore the last flow ONCE on mount
            if (savedFlowId && !hasRestoredSession.current && !isWorkflowInitialized) {
                hasRestoredSession.current = true;
                console.log('[uniflux] Auto-restoring last active flow:', savedFlowId);
                // Small delay to let project state settle before loading
                setTimeout(() => {
                    handleLoadFlow(savedFlowId).catch(err => {
                        console.warn('[uniflux] Failed to auto-restore flow:', err);
                    });
                }, 300);
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, tenantId]);

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
    const handleLoadFlow = useCallback(async (flowId: string) => {
        if (!user) return;

        // PRE-SWITCH SAVE: persist the current flow before abandoning it.
        // isDirtyRef is used instead of isDirty to avoid the stale closure problem
        // (handleLoadFlow's useCallback deps don't include isDirty).
        // We only save if the target is a different flow AND the current one is dirty.
        if (
            currentGraphIdRef.current &&
            currentGraphIdRef.current !== flowId &&
            isDirtyRef.current
        ) {
            console.log(`[uniflux] Pre-switch save: saving ${currentGraphIdRef.current} before loading ${flowId}`);
            try {
                await handleSaveRef.current(true);
            } catch (e) {
                console.error('[uniflux] Pre-switch save failed — continuing to load new flow', e);
            }
        }

        // SYNCHRONOUS ref update: set the new active flow ID immediately so any in-flight
        // save (whose Firestore write may be completing right now) hits the post-write guard
        // and does NOT call setGraph() for the old flow after we've already moved to the new one.
        currentGraphIdRef.current = flowId;

        isLoadingFlowRef.current = true;
        try {
        const tenantToUse = tenantId || '1';
        const rawFlowInfo = await getFlow(tenantToUse, flowId);

        if (rawFlowInfo) {
            // --- CONCURRENCY LOCK CHECK ---
            if ((rawFlowInfo as any).lockedBy) {
                const lock = (rawFlowInfo as any).lockedBy;
                // Block only if a DIFFERENT user has a fresh lock (< 3 min)
                const isFresh = (Date.now() - lock.timestamp) < (1000 * 60 * 3);
                if (isFresh && lock.uid !== user.uid) {
                    alert(`⚠️ ACCESO DENEGADO: Este flujo está siendo editado actualmente por "${lock.name}". \n\nPara evitar la pérdida de datos o sobreescrituras accidentales, no puedes abrirlo hasta que se libere.`);
                    setIsSidebarOpen(false);
                    return;
                }
            }
            
            // 1. Update remote lock to reserve this document immediately
            await lockFlow(flowId, user.uid, user.displayName || user.email || "Desconocido", tabIdRef.current);
            
            // 2. Perform migration and clean slate rendering
            const flowInfo = needsMigration(rawFlowInfo) ? migrateGraph(rawFlowInfo) : rawFlowInfo;
            
            // Critical Fix: Hard Clear existing node state before loading new one to prevent leakage
            setNodes([]);
            setEdges([]);
            
            setGraph(flowInfo);
            setSelectedProjectId(flowInfo.projectId || selectedProjectId);
            setIsSidebarOpen(false);
            setShowWizard(false);
            setSourceMermaidFlowId(null);
            setIsWorkflowInitialized(true); // Deactivate welcome screen
            if (flowInfo.docType === 'c4' && flowInfo.c4Level) {
                setActiveC4Level(flowInfo.c4Level as 1 | 2 | 3);
            }
            
            // V11 Fix: syncNodesFromGraph handles setting exact nodes AND atomic history seeding
            syncNodesFromGraph(flowInfo, true);

            // PERSIST session: remember which flow & project was active so F5 can restore it
            try {
                localStorage.setItem('uniflux_active_flow_id', flowId);
                localStorage.setItem('uniflux_active_project_id', flowInfo.projectId || selectedProjectId);
            } catch (e) { /* localStorage may be full or disabled */ }

            // Check if there is a local backup newer than the server version.
            // This happens when a previous session saved locally but Firestore write failed.
            try {
                const raw = localStorage.getItem(`uniflux_backup_${flowId}`);
                if (raw) {
                    const bk = JSON.parse(raw);
                    const backupMs = new Date(bk.timestamp).getTime();
                    const ua = (flowInfo as any).updatedAt;
                    const serverMs = ua
                        ? (typeof ua.toDate === 'function' ? ua.toDate().getTime()
                            : ua instanceof Date ? ua.getTime()
                            : typeof ua === 'string' ? new Date(ua).getTime()
                            : (ua.seconds ? ua.seconds * 1000 : 0))
                        : 0;
                    if (backupMs > serverMs) {
                        setBackupNotice({ flowId, timestamp: bk.timestamp });
                    } else {
                        // Backup is stale — server has same or newer data, clean up
                        localStorage.removeItem(`uniflux_backup_${flowId}`);
                    }
                }
            } catch { /* ignore malformed backup */ }
        }
        } finally {
            isLoadingFlowRef.current = false;
        }
    }, [tenantId, user, selectedProjectId, syncNodesFromGraph, takeSnapshot]);

    // Restores nodes/edges and graph metadata from the localStorage backup for the current flow.
    const handleRestoreBackup = useCallback(() => {
        if (!backupNotice) return;
        try {
            const raw = localStorage.getItem(`uniflux_backup_${backupNotice.flowId}`);
            if (!raw) return;
            const bk = JSON.parse(raw);
            if (bk.nodes) setNodes(bk.nodes);
            if (bk.edges) setEdges(bk.edges);
            setGraph(prev => ({
                ...prev,
                ...(bk.name ? { name: bk.name } : {}),
                ...(bk.docType ? { docType: bk.docType } : {}),
                ...(bk.c4Level !== undefined ? { c4Level: bk.c4Level } : {}),
                ...(bk.schemaVersion !== undefined ? { schemaVersion: bk.schemaVersion } : {}),
            }));
            setIsDirty(true);
            setBackupNotice(null);
        } catch (e) {
            console.error('[uniflux] Failed to restore backup', e);
        }
    }, [backupNotice, setNodes, setEdges]);

    // V11 Heartbeat: Maintain active edit lock every minute
    useEffect(() => {
        if (!user || !graph.id || graph.id.includes('draft-')) return; 
        
        const renewLock = () => {
            lockFlow(graph.id, user.uid, user.displayName || user.email || "Desconocido", tabIdRef.current);
        };
        
        const interval = setInterval(renewLock, 60 * 1000);
        return () => clearInterval(interval);
    }, [graph.id, user]);

    // V11 Cleanup: Free the document when navigation away or unmounting
    useEffect(() => {
        const flowToUnlock = graph.id;
        return () => {
            if (flowToUnlock && !flowToUnlock.includes('draft-')) {
                unlockFlow(flowToUnlock);
            }
        };
    }, [graph.id]);

    const handleJumpToFlow = useCallback(async (flowId: string, nodeId?: string) => {
        if (!flowId) return;
        console.log('UniFlux: Saltando a flujo', flowId, nodeId ? `nodo ${nodeId}` : '');
        pendingNavigationNodeId.current = nodeId || null;
        await handleLoadFlow(flowId);
    }, [handleLoadFlow]);

    useEffect(() => {
        jumpToFlowRef.current = handleJumpToFlow;
    }, [handleJumpToFlow]);

    const handleNewFlow = async () => {
        // PRE-NEW SAVE: persist current flow before discarding it, same logic as handleLoadFlow.
        if (currentGraphIdRef.current && isDirtyRef.current) {
            console.log(`[uniflux] Pre-new save: saving ${currentGraphIdRef.current} before creating new flow`);
            try {
                await handleSaveRef.current(true);
            } catch (e) {
                console.error('[uniflux] Pre-new save failed — continuing to create new flow', e);
            }
        }

        const newTemplate = {
            ...INITIAL_GRAPH,
            id: `draft-${Date.now()}`,
            projectId: selectedProjectId,
            name: 'Nuevo Flujo'
        };
        // Synchronous ref update: must happen AFTER the pre-save so the save guard for the
        // old flow still passes, and BEFORE setGraph so no in-flight saves race against us.
        currentGraphIdRef.current = newTemplate.id;
        setGraph(newTemplate);
        setShowGrid(true);
        setIsSidebarOpen(false);
        setNodes([]);
        setEdges([]);
        setShowWizard(true);
        setSourceMermaidFlowId(null);
        setHistory([{ nodes: [], edges: [] }]);
        setHistoryIndex(0);
        historyIndexRef.current = 0;
        setIsDirty(false);
        setIsWorkflowInitialized(true);
    };

    const handleNewC4Flow = async () => {
        if (currentGraphIdRef.current && isDirtyRef.current) {
            console.log(`[uniflux] Pre-new save: saving ${currentGraphIdRef.current} before creating C4 flow`);
            try {
                await handleSaveRef.current(true);
            } catch (e) {
                console.error('[uniflux] Pre-new save failed — continuing to create C4 flow', e);
            }
        }

        const newTemplate: FlowGraph = {
            ...INITIAL_GRAPH,
            id: `draft-${Date.now()}`,
            projectId: selectedProjectId,
            name: 'Nuevo Diagrama C4',
            docType: 'c4',
            c4Level: 1,
            schemaVersion: 3,
        };
        currentGraphIdRef.current = newTemplate.id;
        setGraph(newTemplate);
        setShowGrid(true);
        setIsSidebarOpen(false);
        setNodes([]);
        setEdges([]);
        setShowWizard(true);
        handleC4LevelChange(1);
        setSourceMermaidFlowId(null);
        setHistory([{ nodes: [], edges: [] }]);
        setHistoryIndex(0);
        historyIndexRef.current = 0;
        setIsDirty(false);
        setIsWorkflowInitialized(true);
    };

    const handleApplyC4Template = (tplNodes: FlowNode[], tplEdges: FlowEdge[]) => {
        const newGraph = { ...graph, nodes: tplNodes, edges: tplEdges };
        setGraph(newGraph);
        syncNodesFromGraph(newGraph, true); // True to init history
        setShowWizard(false);
        setShowTemplatesModal(false);
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
        setTimeout(takeSnapshot, 0); setIsDirty(true);
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
        setIsWorkflowInitialized(true);
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

    const handleDuplicateFlow = async (flowToDuplicate: FlowGraph) => {
        if (!user || !tenantId) return;
        const tenantToUse = tenantId || '1';
        
        const newFlowId = `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const duplicatedGraph: FlowGraph = {
            ...flowToDuplicate,
            id: newFlowId,
            name: `${flowToDuplicate.name} (Copia)`,
            nodes: JSON.parse(JSON.stringify(flowToDuplicate.nodes || [])),
            edges: JSON.parse(JSON.stringify(flowToDuplicate.edges || [])),
            metadata: {
                ...flowToDuplicate.metadata,
                createdAt: new Date(),
                updatedAt: new Date(),
                authorId: user.uid
            },
            createdBy: user.uid
        } as any;

        try {
            await saveFlowDraft(tenantToUse, duplicatedGraph, user.uid);
            const flows = await listProjectFlows(tenantToUse, selectedProjectId);
            setSavedFlows(flows as FlowGraph[]);
            alert(`✓ Flujo duplicado con éxito: "${duplicatedGraph.name}"`);
        } catch (e) {
            console.error("Failed to duplicate flow", e);
            alert("Error al duplicar el flujo");
        }
    };

    const handleCopyToOtherProject = async () => {
        if (!copyTargetFlow || !copyTargetProjectId || !user || !tenantId) return;
        const tenantToUse = tenantId || '1';
        setIsCopyingFlow(true);

        const newFlowId = `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const targetProjectName = projects.find(p => p.id === copyTargetProjectId)?.name || 'otro proyecto';

        const duplicatedGraph: FlowGraph = {
            ...copyTargetFlow,
            id: newFlowId,
            projectId: copyTargetProjectId,
            name: `${copyTargetFlow.name} (Copia)`,
            nodes: JSON.parse(JSON.stringify(copyTargetFlow.nodes || [])),
            edges: JSON.parse(JSON.stringify(copyTargetFlow.edges || [])),
            metadata: {
                ...copyTargetFlow.metadata,
                createdAt: new Date(),
                updatedAt: new Date(),
                authorId: user.uid
            },
            createdBy: user.uid
        } as any;

        try {
            await saveFlowDraft(tenantToUse, duplicatedGraph, user.uid);
            alert(`✓ Flujo copiado con éxito al proyecto "${targetProjectName}"`);
            setCopyTargetFlow(null);
            setCopyTargetProjectId('');
        } catch (e) {
            console.error("Failed to copy flow to other project", e);
            alert("Error al copiar el flujo al proyecto");
        } finally {
            setIsCopyingFlow(false);
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
            projectId: graph.projectId || selectedProjectId,
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
    }, [graph.id, graph.projectId, graph.name, selectedProjectId, tenantId, user]);

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
                    type: getReactFlowNodeType(newType), // Make sure the React Flow type is updated
                    data: { 
                        ...node.data, 
                        label: newLabel, 
                        type: newType,
                        onNavigate: (fid: string, nid?: string) => jumpToFlowRef.current?.(fid, nid),
                        ...additionalData 
                    },
                    style: (newType === 'ENVIRONMENT')
                        ? { ...getNodeStyle(newType), width: node.style?.width ?? 400, height: node.style?.height ?? 300, border: '2px dashed #94a3b8', borderRadius: '12px', opacity: node.data.isLocked ? 0.8 : 1, pointerEvents: 'all' }
                        : { background: 'transparent', border: 'none', padding: 0, width: node.style?.width ?? (newType === 'PRO_NODE' ? 200 : newType === 'ICON' || newType === 'IMAGE' ? 64 : 120), height: node.style?.height ?? (newType === 'PRO_NODE' ? 100 : newType === 'ICON' || newType === 'IMAGE' ? 64 : newType === 'TEXT' ? 50 : 80), opacity: node.data.isLocked ? 0.8 : 1 }
                };
            }
            return node;
        }));
        setGraph(prev => ({
            ...prev,
            nodes: prev.nodes.map(n => n.id === nodeId ? { 
                ...n, 
                label: newLabel, 
                type: newType, 
                targetFlowId: additionalData?.targetFlowId,
                targetNodeId: additionalData?.targetNodeId,
                additionalData: { ...n.additionalData, ...additionalData } 
            } : n)
        }));
        setSelectedNode(null);
        setTimeout(takeSnapshot, 0); setIsDirty(true);
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
                        onNavigate: (fid: string, nid?: string) => jumpToFlowRef.current?.(fid, nid),
                        ...additionalData
                    },
                    style: { background: 'transparent', border: 'none', padding: 0, opacity: node.data.isLocked ? 0.8 : 1 },
                };
            }
            return node;
        }));
        setGraph(prev => ({
            ...prev,
            nodes: prev.nodes.map(n => n.id === nodeId ? { 
                ...n, 
                label: newLabel, 
                type: newType, 
                technology, 
                description, 
                external,
                targetFlowId: additionalData?.targetFlowId,
                targetNodeId: additionalData?.targetNodeId,
                additionalData: { ...n.additionalData, ...additionalData }
            } : n)
        }));
        if (additionalData?.targetFlowId && additionalData?.targetNodeId && graph.id) {
            console.log('UniFlux: Creando vínculo bidireccional (C4)...');
            createBidirectionalLink(tenantId || '1', graph.id, nodeId, additionalData.targetFlowId, additionalData.targetNodeId)
                .catch(err => console.error("Error creating bidirectional C4 link", err));
        }
        setSelectedNode(null);
        setTimeout(takeSnapshot, 0); setIsDirty(true);
    };

    const handleNodeDelete = (nodeId: string) => {
        setNodes(nds => nds.filter(node => node.id !== nodeId));
        setEdges(eds => eds.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
        setGraph(prev => ({
            ...prev,
            nodes: prev.nodes.filter(n => n.id !== nodeId),
            edges: prev.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
        }));
        setSelectedNode(null);
        setTimeout(takeSnapshot, 0); setIsDirty(true);
    };

    const getNextNodeId = useCallback((currentNodes: Node[]) => {
        const numericIds = currentNodes
            .map(n => parseInt(n.id))
            .filter(id => !isNaN(id));
        const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
        return (maxId + 1).toString();
    }, []);

    const handleNodeDuplicate = (nodeId: string) => {
        const nodeToCopy = nodes.find(n => n.id === nodeId);
        if (!nodeToCopy) return;
        
        const newNodeId = getNextNodeId(nodes);
        
        // Update label if it starts with the old ID prefix (e.g., "5. My Node")
        let newLabel = nodeToCopy.data.label as string;
        const oldIdPrefix = new RegExp(`^${nodeToCopy.id}\\.\\s*`);
        if (oldIdPrefix.test(newLabel)) {
            newLabel = newLabel.replace(oldIdPrefix, `${newNodeId}. `);
        }

        const newNode = {
            ...nodeToCopy,
            id: newNodeId,
            data: {
                ...nodeToCopy.data,
                label: newLabel,
            },
            position: { x: nodeToCopy.position.x + 50, y: nodeToCopy.position.y + 50 },
            selected: false,
        };
        
        setNodes(nds => nds.map(n => ({ ...n, selected: false })).concat(newNode));
        setTimeout(takeSnapshot, 0); setIsDirty(true);
        setIsDirty(true);
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

        setSelectedNode(prev => prev?.id === nodeId
            ? { ...prev, data: { ...prev.data, isLocked: locked }, draggable: !locked }
            : prev
        );
        setTimeout(takeSnapshot, 0); setIsDirty(true);
        setIsDirty(true);
    }, [setNodes, takeSnapshot]);

    const onConnect = useCallback((params: Connection) => {
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
        setTimeout(takeSnapshot, 0); setIsDirty(true);
        setIsDirty(true);
    }, [setEdges, takeSnapshot]);

    const onReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
        setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
        setTimeout(takeSnapshot, 0); setIsDirty(true);
        setIsDirty(true);
    }, [setEdges, takeSnapshot]);



    const onEdgeDoubleClick = (event: React.MouseEvent, edge: Edge) => {
        event.stopPropagation();
        setEditingEdge(edge);
        setEdgeEditValue((edge.label as string) || '');
        setEdgeProtocol((edge.data?.protocol as string) || '');
        setEdgeRelType((edge.data?.c4RelType as string) || 'sync');
        setEdgeLineType(edge.type || 'smoothstep');
        setEdgeAnimated(edge.animated || false);
        setEdgeColor(edge.style?.stroke || '#94a3b8');
        setEdgeTextColor((edge.data?.textColor as string) || '#000000');
        setEdgeFontFamily((edge.data?.fontFamily as string) || 'Garamond');
        setEdgePickupType((edge.data?.pickupType as string) || '');
        setEdgeDeliveryType((edge.data?.deliveryType as string) || '');
        setEdgeJornada((edge.data?.jornada as string) || '');
        setEdgeOperacion((edge.data?.operacion as string) || '');
        setEdgeEstadoPedido((edge.data?.estadoPedido as string) || '');
        setEdgeFecha((edge.data?.fecha as string) || '');
    };

    const handleEdgeLabelSave = () => {
        if (!editingEdge) return;
        const isC4 = graph.docType === 'c4';
        setEdges(eds => eds.map(e => {
            if (e.id !== editingEdge.id) return e;
            const updated = {
                ...e,
                label: isC4 ? (edgeProtocol || edgeEditValue || undefined) : edgeEditValue,
                data: isC4 ? { 
                    ...e.data, 
                    c4RelType: edgeRelType, 
                    protocol: edgeProtocol, 
                    c4Description: edgeEditValue,
                    textColor: edgeTextColor,
                    fontFamily: edgeFontFamily
                } : {
                    ...e.data,
                    textColor: edgeTextColor,
                    fontFamily: edgeFontFamily,
                    pickupType:   edgePickupType   || undefined,
                    deliveryType: edgeDeliveryType || undefined,
                    jornada:      edgeJornada      || undefined,
                    operacion:    edgeOperacion    || undefined,
                    estadoPedido: edgeEstadoPedido || undefined,
                    fecha:        edgeFecha        || undefined,
                },
                ...getC4EdgeStyle(isC4 ? edgeRelType : undefined, false),
                type: isC4 ? e.type : edgeLineType,
                animated: isC4 ? (edgeRelType === 'async' || edgeRelType === 'event') : edgeAnimated,
                style: { ...e.style, stroke: edgeColor, strokeWidth: 2 },
                markerEnd: typeof e.markerEnd === 'object' ? { ...e.markerEnd, color: edgeColor } : e.markerEnd,
            };
            return updated;
        }));
        setEditingEdge(null);
        setTimeout(takeSnapshot, 0); setIsDirty(true);
    };

    const handleEdgeDelete = () => {
        if (!editingEdge) return;
        setEdges(eds => eds.filter(e => e.id !== editingEdge.id));
        setEditingEdge(null);
        setTimeout(takeSnapshot, 0); setIsDirty(true);
    };

    const handleEdgeInvert = () => {
        if (!editingEdge) return;
        setEdges(eds => eds.map(e => {
            if (e.id !== editingEdge.id) return e;
            return {
                ...e,
                source: e.target,
                target: e.source,
                sourceHandle: e.targetHandle,
                targetHandle: e.sourceHandle,
            };
        }));
        setEditingEdge(null);
        setTimeout(takeSnapshot, 0); setIsDirty(true);
    };

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

            const newNodeId = getNextNodeId(nodes);

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
                    type: getReactFlowNodeType(type),
                    position,
                    data: { label, type, onNavigate: handleJumpToFlow, ...additionalData },
                    style: type === 'ENVIRONMENT' 
                        ? { ...getNodeStyle(type), width: 400, height: 300, border: '2px dashed #94a3b8', borderRadius: '12px' } 
                        : { background: 'transparent', border: 'none', padding: 0, width: type === 'PRO_NODE' ? 200 : type === 'ICON' || type === 'IMAGE' ? 64 : 120, height: type === 'PRO_NODE' ? 100 : type === 'ICON' || type === 'IMAGE' ? 64 : type === 'TEXT' ? 50 : 80 },
                    sourcePosition: Position.Right,
                    targetPosition: Position.Left,
                };
            }

            setNodes((nds) => nds.concat(newNode));
            setTimeout(takeSnapshot, 0); setIsDirty(true);
            setIsDirty(true);
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
            setTimeout(takeSnapshot, 0); setIsDirty(true);
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
            setTimeout(takeSnapshot, 0); setIsDirty(true);
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

        setTimeout(takeSnapshot, 0); setIsDirty(true);
        setAlignmentGuides([]);
        setDistanceIndicators([]);
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
        setTimeout(takeSnapshot, 0); setIsDirty(true);
        setIsDirty(true);
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
    const handleSave = useCallback(async (isAutoSave: boolean = false) => {
        if (!user || !tenantId) return;
        const tenantToUse = tenantId || '1';

        const activeProjectId = graph.projectId || selectedProjectId;
        if (!activeProjectId) {
            if (!isAutoSave) alert("Por favor selecciona un proyecto primero.");
            return;
        }

        // SAFETY NET: Never persist an empty nodes array for an existing flow.
        // This catches any edge case where auto-save or manual save fires before flow data loads.
        if (graph.docType !== 'mermaid' && nodes.length === 0 && graph.nodes && graph.nodes.length > 0) {
            console.warn("[uniflux] Save ABORTED: React Flow nodes are empty but graph has data. Preventing data wipe.");
            return;
        }

        const savingGraphId = graph.id;

        setIsSaving(true);
        setSaveStatus('saving');

        try {
            let finalGraph: FlowGraph;

            if (graph.docType === 'mermaid') {
                // Mermaid flows: persist code directly, no RF serialization
                finalGraph = {
                    ...graph,
                    projectId: activeProjectId,
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
                        ...((n.style?.width ?? n.measured?.width) !== undefined ? { width: (n.style?.width ?? n.measured?.width) as number } : {}),
                        ...((n.style?.height ?? n.measured?.height) !== undefined ? { height: (n.style?.height ?? n.measured?.height) as number } : {}),
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
                            ...(n.data.iconName ? { iconName: n.data.iconName } : {}),
                            ...(n.data.color ? { color: n.data.color } : {}),
                            ...(n.data.bgColor ? { bgColor: n.data.bgColor } : {}),
                            ...(n.data.strokeColor ? { strokeColor: n.data.strokeColor } : {}),
                            ...(n.data.items ? { items: n.data.items } : {}),
                            ...(n.data.unileaksNoteId ? { unileaksNoteId: n.data.unileaksNoteId } : {}),
                            ...(n.data.unileaksNoteTitle ? { unileaksNoteTitle: n.data.unileaksNoteTitle } : {}),
                            ...(n.data.accessoryIcons ? { accessoryIcons: n.data.accessoryIcons } : {}),
                            ...(n.data.attachedImage ? { attachedImage: n.data.attachedImage } : {}),
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
                    type: e.type,
                    animated: e.animated,
                    style: e.style,
                    markerEnd: e.markerEnd,
                    // Persist C4 data if present
                    ...(e.data?.c4RelType ? { c4RelType: e.data.c4RelType as any } : {}),
                    ...(e.data?.protocol ? { protocol: e.data.protocol as string } : {}),
                    ...(e.data?.c4Description ? { c4Description: e.data.c4Description as string } : {}),
                    pathPoints: (e.data?.pathPoints as any[]) || [],
                    textColor: (e.data?.textColor as string) || '#000000',
                    fontFamily: (e.data?.fontFamily as string) || 'Garamond',
                    ...(e.data?.pickupType   ? { pickupType:   e.data.pickupType   as string } : {}),
                    ...(e.data?.deliveryType ? { deliveryType: e.data.deliveryType as string } : {}),
                    ...(e.data?.jornada       ? { jornada:       e.data.jornada       as string } : {}),
                    ...(e.data?.operacion     ? { operacion:     e.data.operacion     as string } : {}),
                    ...(e.data?.estadoPedido  ? { estadoPedido:  e.data.estadoPedido  as string } : {}),
                    ...(e.data?.fecha         ? { fecha:         e.data.fecha         as string } : {}),
                }));

                finalGraph = {
                    ...graph,
                    projectId: activeProjectId,
                    nodes: updatedGraphNodes,
                    edges: updatedGraphEdges,
                    showGrid,
                    schemaVersion: CURRENT_SCHEMA_VERSION,
                };
            }

            // Guard BEFORE the write: if the active flow changed while we were serializing,
            // the finalGraph we built is stale. Abort entirely — no write, no UI update.
            if (currentGraphIdRef.current !== savingGraphId) {
                console.warn(`[uniflux] Active flow changed to ${currentGraphIdRef.current} while serializing ${savingGraphId}. Save aborted.`);
                return;
            }

            await saveFlowDraft(tenantToUse, finalGraph, user.uid);

            // Guard POST-write: the Firestore write succeeded but if the active flow changed
            // while the write was in-flight, do NOT update local React state for the old flow.
            // Without this, setGraph(finalGraph) would revert the canvas to the old flow, and
            // the next auto-save would write the new flow's nodes under the old flow's Firestore ID.
            if (currentGraphIdRef.current !== savingGraphId) {
                console.warn(`[uniflux] Flow changed to ${currentGraphIdRef.current} while writing ${savingGraphId}. Post-write state update aborted.`);
                setIsSaving(false);
                return;
            }

            setGraph(finalGraph);
            setSourceMermaidFlowId(null); // draft is now saved — no longer a conversion draft

            setSaveStatus('saved');
            setIsDirty(false);
            setLastSaved(new Date());
            setTimeout(() => setSaveStatus('idle'), 3000);
            
            if (!isAutoSave) {
                setShowSaveToast(true);
                setTimeout(() => setShowSaveToast(false), 4000);
            }

            // Remove local backup after successful cloud save
            localStorage.removeItem(`uniflux_backup_${savingGraphId}`);

            // Refresh sidebar flows
            listProjectFlows(tenantToUse, activeProjectId).then(f => setSavedFlows(f as FlowGraph[]));
        } catch (e) {
            console.error("Failed to save draft", e);
            setSaveStatus('idle');
            const hasBackup = !!localStorage.getItem(`uniflux_backup_${savingGraphId}`);
            alert(
                `Error al guardar el flujo en la nube.` +
                (hasBackup ? '\n\nTus cambios están a salvo en una copia local. Se ofrecerá restaurarlos la próxima vez que abras este flujo.' : '')
            );
        } finally {
            setIsSaving(false);
        }
    }, [user, tenantId, selectedProjectId, graph, nodes, edges, showGrid]);

    useEffect(() => {
        handleSaveRef.current = handleSave;
    }, [handleSave]);

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
                additionalData: {
                    ...(n.data.additionalData || {}),
                    ...(n.data.rotation ? { rotation: n.data.rotation } : {}),
                    ...(n.data.imageUrl ? { imageUrl: n.data.imageUrl } : {}),
                    ...(n.data.iconId ? { iconId: n.data.iconId } : {}),
                    ...(n.data.iconName ? { iconName: n.data.iconName } : {}),
                    ...(n.data.color ? { color: n.data.color } : {}),
                    ...(n.data.bgColor ? { bgColor: n.data.bgColor } : {}),
                    ...(n.data.strokeColor ? { strokeColor: n.data.strokeColor } : {}),
                    ...(n.data.items ? { items: n.data.items } : {}),
                    ...(n.data.unileaksNoteId ? { unileaksNoteId: n.data.unileaksNoteId } : {}),
                    ...(n.data.unileaksNoteTitle ? { unileaksNoteTitle: n.data.unileaksNoteTitle } : {}),
                    ...(n.data.accessoryIcons ? { accessoryIcons: n.data.accessoryIcons } : {}),
                    ...(n.data.attachedImage ? { attachedImage: n.data.attachedImage } : {}),
                }
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
            textColor: (e.data?.textColor as string) || '#000000',
            fontFamily: (e.data?.fontFamily as string) || 'Garamond',
        }));

        // For C4: trim to only what's visible at the current level so the AI gets clean context
        const { nodes: visibleNodes, edges: visibleEdges } = graph.docType === 'c4'
            ? getAIVisibleGraph(allNodes, allEdges, activeC4Level)
            : { nodes: allNodes, edges: allEdges };

        return { ...graph, nodes: visibleNodes, edges: visibleEdges };
    }, [graph, nodes, edges, activeC4Level]);

    return (
        <UnifluxDirtyContext.Provider value={edgeCtxValue}>
        <div className="w-full h-screen bg-gray-50 flex flex-col relative overflow-hidden">
            <header className="h-14 bg-slate-950 border-b border-slate-800 px-4 md:px-6 flex items-center justify-between z-20 shadow-lg">
                <div className="flex items-center gap-4">
                    <img 
                        src="/uniflux_logo.svg" 
                        alt="UniFlux Logo" 
                        className="h-6 w-auto invert brightness-0 opacity-80 mr-1 hidden sm:block select-none"
                    />
                    
                    <div className="h-6 w-px bg-slate-800 mr-1 hidden sm:block"></div>

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

                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-2">
                                    {isDirty && !isSaving && (
                                        <span className="text-[10px] text-amber-500 font-medium flex items-center gap-1 animate-pulse">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                            Cambios sin guardar
                                        </span>
                                    )}
                                    {saveStatus === 'saving' && (
                                        <span className="text-[10px] text-blue-500 font-medium flex items-center gap-1">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            Guardando...
                                        </span>
                                    )}
                                    {saveStatus === 'saved' && (
                                        <span className="text-[10px] text-green-500 font-medium flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Guardado
                                        </span>
                                    )}
                                    {lastSaved && !isDirty && saveStatus === 'idle' && (
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            Auto-guardado a las {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleSave(false)}
                                disabled={isSaving}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold transition-all shadow-sm active:scale-95 text-sm",
                                    isDirty 
                                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/20" 
                                        : "bg-slate-800 text-slate-500 border border-slate-700 cursor-default"
                                )}
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
                            </button>
                        </div>
                </div>
            </header>

            <div className="flex-1 relative flex overflow-hidden h-full">

                {/* Flow Management Sidebar Overlay - Removed to prevent blocking interaction */}

                {/* Flow Management Sidebar Panel */}
                <div className={`absolute top-0 bottom-0 left-0 w-80 bg-white border-r shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col max-h-full ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="h-14 border-b flex items-center justify-between px-4 shrink-0 bg-gray-50">
                        <h2 className="font-bold flex items-center gap-2 text-gray-800">
                            <Folder className="w-4 h-4 text-purple-600" />
                            Gestor de Flujos
                        </h2>
                        <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-gray-200 rounded-md text-gray-500">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-4 border-b bg-gray-50 flex flex-col gap-2 shrink-0">
                        <button
                            onClick={handleNewFlow}
                            className="w-full flex justify-center items-center gap-2 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-purple-100"
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo Flujo Visual
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleNewC4Flow}
                                className="flex justify-center items-center gap-2 py-2 bg-white border border-blue-200 hover:border-blue-400 hover:text-blue-700 text-blue-600 rounded-xl font-bold text-[11px] transition-all shadow-sm"
                            >
                                <Building2 className="w-3.5 h-3.5" />
                                C4
                            </button>
                            <button
                                onClick={handleNewMermaidFlow}
                                className="flex justify-center items-center gap-2 py-2 bg-white border border-teal-200 hover:border-teal-400 hover:text-teal-700 text-teal-600 rounded-xl font-bold text-[11px] transition-all shadow-sm"
                            >
                                <GitBranch className="w-3.5 h-3.5" />
                                Mermaid
                            </button>
                        </div>
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
                                                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1" />}
                                                        
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDuplicateFlow(flow); }}
                                                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Duplicar flujo en este proyecto"
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>

                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setCopyTargetFlow(flow); }}
                                                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Copiar flujo a otro proyecto"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </button>

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

                    <div className="p-4 border-t bg-gray-50 shrink-0 text-[10px] text-gray-400 text-center italic">
                        UniFlux Flow Designer v1.2
                    </div>
                </div>


                {/* Initial Wizard Overlay — hidden in Mermaid mode */}
                {showWizard && graph.docType !== 'mermaid' && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/40 backdrop-blur-sm p-4 overflow-y-auto">
                        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-100 my-auto">
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
                    {/* AI Interaction Layer — hidden only in Mermaid mode */}
                    {!showWizard && graph.docType !== 'mermaid' && <UnifluxToolbar currentGraph={liveGraph} onGraphUpdate={handleGraphUpdate} />}

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
                            projectId={graph.projectId || selectedProjectId}
                            tenantId={tenantId || undefined}
                            currentUserId={user?.uid || undefined}
                            roleLevel={roleLevel}
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
                                {/* ── Logística ── */}
                                <div className="border-t border-gray-100 pt-3 mt-1">
                                    <div className="text-[10px] font-bold text-amber-500 uppercase mb-2 flex items-center gap-1">
                                        <span>◈</span> Datos logísticos (opcional)
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Pickup (origen)</label>
                                            <input
                                                value={edgePickupType}
                                                onChange={e => setEdgePickupType(e.target.value)}
                                                placeholder="Ej: FTL, LTL, Parcial"
                                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Delivery (destino)</label>
                                            <input
                                                value={edgeDeliveryType}
                                                onChange={e => setEdgeDeliveryType(e.target.value)}
                                                placeholder="Ej: FTL, LTL, Parcial"
                                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-400"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tipo de jornada</label>
                                            <input
                                                value={edgeJornada}
                                                onChange={e => setEdgeJornada(e.target.value)}
                                                placeholder="Ej: Completa, Nocturna"
                                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Operación</label>
                                            <input
                                                value={edgeOperacion}
                                                onChange={e => setEdgeOperacion(e.target.value)}
                                                placeholder="Ej: #1234, OP-99"
                                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-400"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Estado pedido</label>
                                            <input
                                                value={edgeEstadoPedido}
                                                onChange={e => setEdgeEstadoPedido(e.target.value)}
                                                placeholder="Ej: Pendiente, Cerrado"
                                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Fecha / Plazo</label>
                                            <input
                                                value={edgeFecha}
                                                onChange={e => setEdgeFecha(e.target.value)}
                                                placeholder="Ej: +3, D+1, 15/06"
                                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-400"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Estilo de Texto Section */}
                        <div className="border-t border-gray-100 pt-3 mt-1 mb-3">
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tipografía</label>
                                    <select
                                        value={edgeFontFamily}
                                        onChange={e => setEdgeFontFamily(e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-purple-400"
                                        style={{ 
                                            fontFamily: edgeFontFamily === 'Garamond' 
                                                ? '"EB Garamond", Garamond, Georgia, serif' 
                                                : edgeFontFamily === 'Playfair Display' 
                                                    ? '"Playfair Display", serif'
                                                    : `${edgeFontFamily}, sans-serif`
                                        }}
                                    >
                                        <option value="Garamond">Garamond</option>
                                        <option value="Outfit">Outfit</option>
                                        <option value="Inter">Inter</option>
                                        <option value="Montserrat">Montserrat</option>
                                        <option value="Playfair Display">Playfair Display</option>
                                    </select>
                                </div>
                                <div className="w-20">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Color Texto</label>
                                    <input
                                        type="color"
                                        value={edgeTextColor}
                                        onChange={e => setEdgeTextColor(e.target.value)}
                                        className="w-full h-[28px] border border-gray-200 rounded-lg cursor-pointer p-0.5 bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={handleEdgeLabelSave} className="flex-1 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
                                Guardar
                            </button>
                            <button onClick={handleEdgeInvert} className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 text-sm font-medium rounded-lg transition-colors border border-blue-100 flex items-center justify-center gap-1" title="Invertir Dirección">
                                <ArrowLeftRight className="w-4 h-4" />
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
                    <div className="absolute bottom-24 left-6 z-50 flex items-center gap-3 bg-purple-900 text-white shadow-xl rounded-xl px-4 py-3">
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

                {/* Backup Recovery Banner */}
                {backupNotice && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-amber-50 border border-amber-200 shadow-xl rounded-xl px-4 py-3 animate-fade-in max-w-md w-full">
                        <RotateCcw className="w-4 h-4 text-amber-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-amber-900">Cambios locales sin guardar</p>
                            <p className="text-xs text-amber-700 truncate">
                                Backup del {new Date(backupNotice.timestamp).toLocaleString()} — la nube puede estar desactualizada.
                            </p>
                        </div>
                        <button
                            onClick={handleRestoreBackup}
                            className="text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-lg shrink-0"
                        >
                            Restaurar
                        </button>
                        <button
                            onClick={() => {
                                localStorage.removeItem(`uniflux_backup_${backupNotice.flowId}`);
                                setBackupNotice(null);
                            }}
                            className="p-1 text-amber-300 hover:text-amber-500 shrink-0"
                        >
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
                    onNodesChange={onNodesChangeWrapped}
                    onEdgesChange={onEdgesChangeWrapped}
                    onConnect={onConnect}
                    onReconnect={onReconnect}
                    edgesReconnectable={true}
                    panOnDrag={interactionMode === 'pan'}
                    selectionOnDrag={interactionMode === 'selection'}
                    selectionMode={SelectionMode.Partial}
                    onInit={setReactFlowInstance}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onNodeDrag={onNodeDrag}
                    onNodeDragStop={onNodeDragStop}
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
                        <div className="flex bg-slate-100 rounded-lg p-0.5">
                            <button 
                                onClick={undo} 
                                disabled={historyIndex <= 0}
                                className={`p-1.5 rounded-md transition-all ${historyIndex > 0 ? 'hover:bg-white hover:shadow-sm text-slate-700' : 'text-slate-300 cursor-not-allowed'}`}
                                title="Deshacer (Ctrl+Z)"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button 
                                onClick={redo} 
                                disabled={historyIndex >= history.length - 1}
                                className={`p-1.5 rounded-md transition-all ${historyIndex < history.length - 1 ? 'hover:bg-white hover:shadow-sm text-slate-700' : 'text-slate-300 cursor-not-allowed'}`}
                                title="Rehacer (Ctrl+Y)"
                            >
                                <RotateCcw className="w-3.5 h-3.5 scale-x-[-1]" />
                            </button>
                        </div>
                        <div className="w-px h-4 bg-slate-200 mr-1"></div>
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
                        <button
                            onClick={() => setShowLogisticsLabels(v => !v)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${showLogisticsLabels ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-slate-600 hover:bg-slate-100'}`}
                            title={showLogisticsLabels ? 'Ocultar etiquetas logísticas' : 'Mostrar etiquetas logísticas'}
                        >
                            <Tags className="w-3.5 h-3.5" />
                            Logística
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

                {/* Modal para copiar flujo a otro proyecto */}
                {copyTargetFlow && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-950/50 backdrop-blur-sm p-4">
                        <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 animate-in fade-in zoom-in duration-200">
                            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Copy className="w-5 h-5 text-purple-600" />
                                Copiar a otro proyecto
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Selecciona el proyecto de destino para hacer una copia del flujo <span className="font-bold text-gray-700">"{copyTargetFlow.name}"</span>.
                            </p>

                            <div className="mb-6">
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Proyecto de destino</label>
                                <select
                                    value={copyTargetProjectId}
                                    onChange={(e) => setCopyTargetProjectId(e.target.value)}
                                    className="w-full border bg-gray-50 border-gray-200 py-2 px-3 rounded-lg text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                >
                                    <option value="" disabled>Seleccionar proyecto...</option>
                                    {projects
                                        .filter(p => p.id !== copyTargetFlow.projectId)
                                        .map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setCopyTargetFlow(null); setCopyTargetProjectId(''); }}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
                                    disabled={isCopyingFlow}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCopyToOtherProject}
                                    disabled={!copyTargetProjectId || isCopyingFlow}
                                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg hover:opacity-90 transition-all font-medium text-sm disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isCopyingFlow ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Copiando...
                                        </>
                                    ) : (
                                        'Copiar Flujo'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
                                {nodes.find(n => n.id === menu.id)?.data.targetFlowId && (
                                    <button onClick={() => { 
                                        const node = nodes.find(n => n.id === menu.id);
                                        if (node) handleJumpToFlow(node.data.targetFlowId as string, node.data.targetNodeId as string);
                                        closeMenu(); 
                                    }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 rounded-lg transition-colors text-left font-bold">
                                        <ExternalLink className="w-4 h-4 text-blue-600" /> Ir al flujo vinculado
                                    </button>
                                )}
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
                                        setTimeout(takeSnapshot, 0); setIsDirty(true);
                                    }
                                    closeMenu(); 
                                }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-left">
                                    <Type className="w-4 h-4" /> Añadir Comentario
                                </button>
                            </>
                        )}
                    </div>
                )}
                {/* WELCOME SPLASH SCREEN: Renders until explicit interaction initializing/loading a flow */}
                {!isWorkflowInitialized && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-40 overflow-hidden">
                        {/* Premium Aesthetic Grid Overlay */}
                        <div 
                            className="absolute inset-0 opacity-[0.04] pointer-events-none" 
                            style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}
                        />
                        
                        <div className="relative flex flex-col items-center max-w-2xl w-full px-6 text-center animate-in fade-in zoom-in-95 duration-700">
                            {/* Giant Hero Logo */}
                            <div className="relative group mb-12 drop-shadow-[0_20px_50px_rgba(24,95,165,0.15)] transition-all duration-500 hover:drop-shadow-[0_25px_60px_rgba(24,95,165,0.25)]">
                                <img 
                                    src="/uniflux_logo.svg" 
                                    alt="UniFlux Workspace" 
                                    className="w-80 md:w-[420px] h-auto select-none transition-transform duration-500 group-hover:scale-[1.02]"
                                />
                            </div>
                            
                            <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mb-3">
                                Bienvenid@ al <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Diseñador de Flujos</span>
                            </h1>
                            
                            <p className="text-slate-500 text-sm md:text-lg mb-12 max-w-lg font-medium leading-relaxed">
                                Comienza a estructurar tus arquitecturas C4, flujos de procesos lógicos y modelos técnicos impulsados por IA.
                            </p>

                            {/* Hero Quick Actions Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg">
                                <button
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="group relative flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-3xl shadow-lg hover:shadow-2xl hover:border-blue-400 hover:-translate-y-1.5 transition-all duration-300 text-center overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-blue-100/50 transition-colors" />
                                    
                                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm shadow-blue-100">
                                        <Folder className="w-7 h-7" />
                                    </div>
                                    
                                    <h3 className="font-black text-slate-800 text-lg tracking-tight group-hover:text-blue-700 transition-colors">Explorar Diseños</h3>
                                    <p className="text-sm text-slate-500 mt-1.5 font-medium">Recuperar y editar flujos guardados</p>
                                </button>

                                <button
                                    onClick={handleNewFlow}
                                    className="group relative flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-3xl shadow-lg hover:shadow-2xl hover:border-purple-400 hover:-translate-y-1.5 transition-all duration-300 text-center overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50/50 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-purple-100/50 transition-colors" />
                                    
                                    <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-sm shadow-purple-100">
                                        <Plus className="w-7 h-7" />
                                    </div>
                                    
                                    <h3 className="font-black text-slate-800 text-lg tracking-tight group-hover:text-purple-700 transition-colors">Nuevo Flujo</h3>
                                    <p className="text-sm text-slate-500 mt-1.5 font-medium">Crear un lienzo en blanco desde cero</p>
                                </button>
                            </div>
                            
                            <div className="mt-12 flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-[0.2em] select-none">
                                 <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                 Motor Gráfico Listo
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Lightbox — full-screen image viewer */}
        {zoomedImage && (
            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md"
                onClick={() => setZoomedImage(null)}
            >
                <button
                    onClick={() => setZoomedImage(null)}
                    className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all border border-white/20"
                >
                    <X className="w-5 h-5" />
                </button>
                <img
                    src={zoomedImage}
                    alt="Vista ampliada"
                    className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/10"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        )}
        </UnifluxDirtyContext.Provider>
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

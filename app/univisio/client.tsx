'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import JSZip from 'jszip';
import { 
    Upload, FileCode, Network, CheckCircle, AlertTriangle, Play,
    Plus, Trash2, ArrowUp, ArrowDown, Download, Send, RefreshCw, FileText,
    Save, FolderOpen, Folder, Image as ImageIcon, ChevronLeft, ChevronRight, Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { analyzeSubflowWithGemini, chatWithUniVisio, analyzeDiagramImageWithGemini } from './actions';
import * as XLSX from 'xlsx';

import { TableRow, ParsedNode, ParsedEdge, Doubt, UniVisioSession, Project, NodeCoverageMap, NodeCoverageStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useTenantQuery } from '@/hooks/useTenantQuery';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { saveUniVisioSession, getProjectSessions, updateUniVisioSession, deleteUniVisioSession } from '@/lib/univisio';
import { useTheme } from '@/hooks/useTheme';

const StepPositionInput = ({ 
    step, 
    max, 
    onMove, 
    isLight 
}: { 
    step: number; 
    max: number; 
    onMove: (newStep: number) => void; 
    isLight: boolean;
}) => {
    const [val, setVal] = useState(step.toString());

    useEffect(() => {
        setVal(step.toString());
    }, [step]);

    const handleBlur = () => {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num >= 1 && num <= max && num !== step) {
            onMove(num);
        } else {
            setVal(step.toString());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        } else if (e.key === 'Escape') {
            setVal(step.toString());
        }
    };

    return (
        <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={val}
            onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={cn(
                "w-10 text-center font-bold bg-transparent border rounded px-1 py-0.5 transition-colors focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 text-xs",
                isLight 
                    ? "border-zinc-300 text-zinc-800 focus:bg-white" 
                    : "border-zinc-800 text-zinc-250 focus:bg-zinc-950/60"
            )}
        />
    );
};

export default function ClientPage() {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const isRed = theme === 'red';
    // State
    const [file, setFile] = useState<File | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'narrative' | 'consolidator'>('table');
    const [isImageMode, setIsImageMode] = useState<boolean>(false);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [imageInstruction, setImageInstruction] = useState<string>('');
    const [showFullImageModal, setShowFullImageModal] = useState<boolean>(false);
    const [pages, setPages] = useState<string[]>([]);
    const [selectedPage, setSelectedPage] = useState<string>('');
    const [zipInstance, setZipInstance] = useState<JSZip | null>(null);
    
    const [nodes, setNodes] = useState<ParsedNode[]>([]);
    const [edges, setEdges] = useState<ParsedEdge[]>([]);
    const [swimlanes, setSwimlanes] = useState<string[]>([]);
    const [cycles, setCycles] = useState<string[][]>([]);
    const [nodeMap, setNodeMap] = useState<NodeCoverageMap>({});

    const [tableRows, setTableRows] = useState<TableRow[]>([]);
    const [doubts, setDoubts] = useState<Doubt[]>([]);
    const [draftRows, setDraftRows] = useState<TableRow[]>([]);
    const [activeBatchUnderReview, setActiveBatchUnderReview] = useState<{ index: number, nodeIds: string[] } | null>(null);
    const [startNodeId, setStartNodeId] = useState<string | null>(null);
    const [excludedNodeIds, setExcludedNodeIds] = useState<Set<string>>(new Set());
    const [traversalMode, setTraversalMode] = useState<'forward' | 'backward' | 'undirected'>('forward');
    
    const [parsingStatus, setParsingStatus] = useState<string>('');
    const [isParsing, setIsParsing] = useState<boolean>(false);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    // Sidebar chat
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; content: string }[]>([]);
    const [chatInput, setChatInput] = useState<string>('');
    const [isChatting, setIsChatting] = useState<boolean>(false);

    // Selected row for centering / details
    const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const keepProgressRef = useRef<boolean>(false);

    // Drag-and-drop state
    const [isDragging, setIsDragging] = useState<boolean>(false);

    // New Session & Project State
    const { tenantId, user } = useAuth();
    const qProjects = useTenantQuery('projects');
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [sessions, setSessions] = useState<UniVisioSession[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [sessionNameInput, setSessionNameInput] = useState<string>('');
    const [isDirty, setIsDirty] = useState<boolean>(false);
    const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
    const [showSkippedList, setShowSkippedList] = useState<boolean>(false);
    const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
    const [consolidatorSteps, setConsolidatorSteps] = useState<TableRow[]>([]);
    const [clientLogo, setClientLogo] = useState<string | null>(null);
    const [isCopilotCollapsed, setIsCopilotCollapsed] = useState<boolean>(false);
    const [sessionToDelete, setSessionToDelete] = useState<UniVisioSession | null>(null);
    
    // Fetch projects on mount
    useEffect(() => {
        if (qProjects) {
            getDocs(qProjects).then(snap => {
                const projs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
                setProjects(projs);
            }).catch(console.error);
        }
    }, [qProjects]);

    // Fetch sessions when a project is selected
    useEffect(() => {
        if (selectedProjectId) {
            getProjectSessions(selectedProjectId).then(setSessions).catch(console.error);
        } else {
            setSessions([]);
        }
    }, [selectedProjectId]);

    // Load client logo when project changes
    useEffect(() => {
        if (!selectedProjectId) {
            setClientLogo(null);
            return;
        }
        let isMounted = true;
        const loadClientLogo = async () => {
            try {
                const project = projects.find(p => p.id === selectedProjectId);
                if (project && (project as any).clientLogoUrl && typeof (project as any).clientLogoUrl === 'string' && (project as any).clientLogoUrl.trim() !== '') {
                    if (isMounted) setClientLogo((project as any).clientLogoUrl);
                } else {
                    const docsSnap = await getDocs(collection(db, "projects", selectedProjectId, "documents"));
                    let logoDoc = docsSnap.docs.find(d => d.data().typeCode?.toUpperCase() === 'LOGO');
                    if (!logoDoc) logoDoc = docsSnap.docs.find(d => d.data().name?.toUpperCase().includes('LOGO'));
                    if (!logoDoc) logoDoc = docsSnap.docs.find(d => (d.data().type || '').toLowerCase().startsWith('image/') && d.data().url);
                    if (logoDoc && isMounted) {
                        const data = logoDoc.data();
                        const logoUrl = data.url || data.fileUrl || data.downloadURL;
                        if (logoUrl) setClientLogo(logoUrl);
                    } else {
                        if (isMounted) setClientLogo(null);
                    }
                }
            } catch (e) {
                console.error("Error loading client logo for univisio:", e);
                if (isMounted) setClientLogo(null);
            }
        };
        loadClientLogo();
        return () => { isMounted = false; };
    }, [selectedProjectId, projects]);

    const handleProjectChange = (newProjectId: string) => {
        if (isDirty) {
            if (!window.confirm("Tienes cambios sin guardar. ¿Continuar sin guardar?")) {
                return;
            }
        }
        setIsDirty(false);
        setSelectedProjectId(newProjectId);
        setSelectedSessionId(null);
        // Clear current canvas
        setTableRows([]);
        setDoubts([]);
        setNodes([]);
        setEdges([]);
        setSwimlanes([]);
        setCycles([]);
        setNodeMap({});
        setFile(null);
        setIsImageMode(false);
        setImagePreviewUrl(null);
        setImageInstruction('');
    };

    const handleLoadSession = (session: UniVisioSession) => {
        if (isDirty) {
            if (!window.confirm("Tienes cambios sin guardar. ¿Continuar y sobreescribir la vista actual?")) {
                return;
            }
        }
        setIsDirty(false);
        setSelectedSessionId(session.id);
        setSessionNameInput(session.sessionName);
        setTableRows(session.tableRows || []);
        setDoubts(session.doubts || []);
        setSwimlanes(session.swimlanes || []);
        setCycles(session.cycles || []);
        setNodes([]); // Nodes and edges are not loaded from DB
        setEdges([]);
        if (session.nodeMap) {
            setNodeMap(session.nodeMap);
        } else {
            const reconstructedMap: NodeCoverageMap = {};
            (session.tableRows || []).forEach(row => {
                if (row.linkedNodeId) reconstructedMap[row.linkedNodeId] = 'covered';
                row.coveredNodeIds?.forEach(id => {
                    reconstructedMap[id] = 'covered';
                });
            });
            setNodeMap(reconstructedMap);
        }
        const isImg = /\.(png|jpe?g)$/i.test(session.fileName || '');
        setIsImageMode(isImg);
        setImagePreviewUrl(null);
        setImageInstruction('');
        setFile(new File([], session.fileName || (isImg ? 'Recuperado.png' : 'Recuperado.vsdx')));
        setParsingStatus(isImg 
            ? `Sesión visual recuperada: ${session.sessionName}. Sube de nuevo el archivo PNG/JPG si deseas ver la imagen o re-compilar.`
            : `Sesión recuperada: ${session.sessionName}. Geometría original no disponible (vuelve a subir el archivo para visualizar el grafo).`
        );
    };

    const handleSaveSession = async (saveAsNew = false) => {
        if (!selectedProjectId) {
            alert("Selecciona un proyecto primero.");
            return;
        }
        if (!sessionNameInput.trim()) {
            alert("Por favor, introduce un nombre para la sesión.");
            return;
        }
        
        try {
            const dataToSave = {
                sessionName: sessionNameInput.trim(),
                fileName: file?.name || 'diagram.vsdx',
                tenantId: tenantId || '',
                projectId: selectedProjectId,
                tableRows,
                doubts,
                swimlanes,
                cycles,
                nodeMap,
                version: 1,
                createdBy: user?.uid || ''
            };

            if (selectedSessionId && !saveAsNew) {
                await updateUniVisioSession(selectedProjectId, selectedSessionId, dataToSave);
                alert("Sesión actualizada.");
            } else {
                const newId = await saveUniVisioSession(selectedProjectId, dataToSave);
                setSelectedSessionId(newId);
                alert("Nueva sesión guardada.");
            }
            
            setIsDirty(false);
            setShowSaveModal(false);
            // Refresh sessions
            const updatedSessions = await getProjectSessions(selectedProjectId);
            setSessions(updatedSessions);
            
        } catch (error: any) {
            console.error(error);
            alert("Error al guardar la sesión: " + error.message);
        }
    };

    const handleDeleteSession = async () => {
        if (!sessionToDelete || !selectedProjectId) return;
        
        try {
            await deleteUniVisioSession(selectedProjectId, sessionToDelete.id);
            
            // If the deleted session was the currently selected one, clear it
            if (selectedSessionId === sessionToDelete.id) {
                setSelectedSessionId(null);
                setSessionNameInput('');
                setTableRows([]);
                setDoubts([]);
                setSwimlanes([]);
                setCycles([]);
                setNodes([]);
                setEdges([]);
                setNodeMap({});
                setFile(null);
                setIsImageMode(false);
                setImagePreviewUrl(null);
                setImageInstruction('');
                setIsDirty(false);
            }
            
            // Refresh sessions
            const updatedSessions = await getProjectSessions(selectedProjectId);
            setSessions(updatedSessions);
        } catch (error: any) {
            console.error("Error deleting session:", error);
            alert("Error al borrar la sesión: " + error.message);
        } finally {
            setSessionToDelete(null);
        }
    };

    // Expose dynamic analysis batch size
    const lotSize = 40;

    // Computed sub-flows (lotes)
    const lotes = useMemo(() => {
        const activeNodes = nodes.filter(n => !excludedNodeIds.has(n.id));
        if (activeNodes.length === 0) return [];
        const result = [];
        for (let i = 0; i < activeNodes.length; i += lotSize) {
            result.push({
                index: i / lotSize + 1,
                start: i + 1,
                end: Math.min(i + lotSize, activeNodes.length),
                nodeIds: activeNodes.slice(i, i + lotSize).map(n => n.id)
            });
        }
        return result;
    }, [nodes, excludedNodeIds]);

    const availableStates = useMemo(() => {
        const states = new Set<string>();
        tableRows.forEach(row => {
            if (row.origin && row.origin !== '-') {
                states.add(row.origin.trim());
            }
            if (row.destination && row.destination !== '-') {
                states.add(row.destination.trim());
            }
            if (row.resultState && row.resultState !== '-') {
                states.add(row.resultState.trim());
            }
        });
        nodes.forEach(n => {
            if (n.label) {
                states.add(n.label.trim());
            }
        });
        return Array.from(states).filter(Boolean).sort();
    }, [tableRows, nodes]);

    const availableActors = useMemo(() => {
        const actors = new Set<string>();
        swimlanes.forEach(s => {
            if (s) actors.add(s.trim());
        });
        tableRows.forEach(row => {
            if (row.actor && row.actor !== '-') {
                actors.add(row.actor.trim());
            }
        });
        return Array.from(actors).filter(Boolean).sort();
    }, [tableRows, swimlanes]);

    const [activeLoteIndex, setActiveLoteIndex] = useState<number>(0);

    // Dynamic computations for closing artifacts
    const entityStateMatrix = useMemo(() => {
        const matrix: Record<string, string[]> = {};
        tableRows.forEach(row => {
            row.stateChanges?.forEach(sc => {
                if (!sc.entity) return;
                const ent = sc.entity.toUpperCase().trim();
                if (!matrix[ent]) {
                    matrix[ent] = [];
                }
                const states = matrix[ent];
                const cleanFrom = sc.from ? sc.from.trim() : '';
                const cleanTo = sc.to ? sc.to.trim() : '';
                if (cleanFrom) {
                    if (states.length === 0) {
                        states.push(cleanFrom);
                    } else if (states[states.length - 1] !== cleanFrom) {
                        states.push(cleanFrom);
                    }
                }
                if (cleanTo) {
                    if (states.length === 0 || states[states.length - 1] !== cleanTo) {
                        states.push(cleanTo);
                    }
                }
            });
        });
        return matrix;
    }, [tableRows]);

    const interfaceRegistry = useMemo(() => {
        const registryMap: Record<number, { num: number; name: string; direction: string; data: string; criticality: 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'INFORMATIVA' }> = {};
        tableRows.forEach(row => {
            row.interfaceRefs?.forEach(ref => {
                if (ref.num == null) return;
                if (!registryMap[ref.num]) {
                    registryMap[ref.num] = {
                        num: ref.num,
                        name: ref.name || `Interfaz #${ref.num}`,
                        direction: ref.direction || '-',
                        data: ref.data || '-',
                        criticality: ref.criticality || 'MEDIA'
                    };
                } else {
                    const existing = registryMap[ref.num];
                    if (existing.name.startsWith('Interfaz #') && ref.name && !ref.name.startsWith('Interfaz #')) {
                        existing.name = ref.name;
                    }
                    if (existing.direction === '-' && ref.direction && ref.direction !== '-') {
                        existing.direction = ref.direction;
                    }
                    if (existing.data === '-' && ref.data && ref.data !== '-') {
                        existing.data = ref.data;
                    }
                }
            });
        });
        return Object.values(registryMap).sort((a, b) => a.num - b.num);
    }, [tableRows]);

    const coverage = useMemo(() => {
        const vals = Object.values(nodeMap);
        const total = vals.length;
        if (total === 0) return null;
        const covered = vals.filter(s => s === 'covered').length;
        const skipped = vals.filter(s => s === 'skipped').length;
        const pending = vals.filter(s => s === 'pending').length;
        const orphan = vals.filter(s => s === 'orphan').length;
        return {
            total,
            covered,
            skipped,
            pending,
            orphan,
            pct: total > orphan ? Math.round(covered / (total - orphan) * 100) : 0
        };
    }, [nodeMap]);

    const skippedNodes = useMemo(() => {
        return nodes
            .filter(n => {
                const status = nodeMap[n.id];
                if (status === 'skipped') return true;
                if (tableRows.length > 0 && status === 'pending') return true;
                return false;
            })
            .map(n => ({
                ...n,
                prevNodeLabel: edges.find(e => e.to === n.id)
                    ? nodes.find(nd => nd.id === edges.find(e => e.to === n.id)!.from)?.label
                    : null,
                nextNodeLabel: edges.find(e => e.from === n.id)
                    ? nodes.find(nd => nd.id === edges.find(e => e.from === n.id)!.to)?.label
                    : null,
            }));
    }, [nodeMap, nodes, edges, tableRows.length]);

    const mergeNewRows = (
        prevRows: TableRow[], 
        newRows: TableRow[], 
        activeNodeIds?: Set<string>
    ): TableRow[] => {
        let filteredPrev = prevRows;
        // Solo reemplazar filas del lote activo en modo análisis limpio.
        // En modo "conservar progreso" (archivos VSDX separados comparten pagePath "page1.xml")
        // los IDs de nodo colisionan entre archivos — nunca filtrar filas existentes.
        if (activeNodeIds && !keepProgressRef.current) {
            filteredPrev = prevRows.filter(r => {
                if (!r.linkedNodeId) return true;
                if (!activeNodeIds.has(r.linkedNodeId)) return true;
                if (!r.pagePath) return true;
                if (r.pagePath !== selectedPage) return true;
                return false;
            });
        }

        if (nodes.length === 0) {
            const combined = [...filteredPrev, ...newRows];
            return combined.map((r, i) => ({ ...r, step: i + 1 }));
        }

        const nodeToIndex = new Map<string, number>();
        nodes.forEach((n, idx) => {
            nodeToIndex.set(n.id, idx);
        });

        const nodeToPrevPosition = new Map<string, number>();
        filteredPrev.forEach((row, idx) => {
            if (row.linkedNodeId) {
                nodeToPrevPosition.set(row.linkedNodeId, idx);
            }
            row.coveredNodeIds?.forEach(id => {
                nodeToPrevPosition.set(id, idx);
            });
        });

        const findTargetPosition = (nodeId: string): number => {
            const topoIdx = nodeToIndex.get(nodeId);
            if (topoIdx === undefined) {
                return filteredPrev.length;
            }

            for (let i = topoIdx - 1; i >= 0; i--) {
                const prevNodeId = nodes[i].id;
                if (nodeToPrevPosition.has(prevNodeId)) {
                    return nodeToPrevPosition.get(prevNodeId)! + 0.5 + (topoIdx * 0.0001);
                }
            }

            for (let i = topoIdx + 1; i < nodes.length; i++) {
                const nextNodeId = nodes[i].id;
                if (nodeToPrevPosition.has(nextNodeId)) {
                    return nodeToPrevPosition.get(nextNodeId)! - 0.5 + (topoIdx * 0.0001);
                }
            }

            return filteredPrev.length + (topoIdx * 0.0001);
        };

        const positionedPrev = filteredPrev.map((row, idx) => ({
            row,
            position: idx
        }));

        const positionedNew = newRows.map(row => {
            const nodeId = row.linkedNodeId || '';
            const position = nodeId ? findTargetPosition(nodeId) : filteredPrev.length;
            return {
                row,
                position
            };
        });

        const combined = [...positionedPrev, ...positionedNew];
        combined.sort((a, b) => a.position - b.position);

        return combined.map((item, i) => ({
            ...item.row,
            step: i + 1
        }));
    };

    const runSkippedSemanticAnalysis = async () => {
        const skippedList = nodes.filter(n => {
            const status = nodeMap[n.id];
            if (status === 'skipped') return true;
            if (tableRows.length > 0 && status === 'pending') return true;
            return false;
        });
        if (skippedList.length === 0) return;
        setIsGenerating(true);
        
        try {
            const skippedIds = new Set(skippedList.map(n => n.id));
            const subEdges = edges.filter(e => skippedIds.has(e.from) || skippedIds.has(e.to));
            
            const graphContext = {
                nodes: skippedList,
                edges: subEdges,
                swimlanes
            };
            
            const response = await analyzeSubflowWithGemini(JSON.stringify(graphContext));
            
            if (response && response.success && response.steps) {
                const newRows: TableRow[] = response.steps.map((step, idx) => ({
                    step: idx + 1,
                    title: step.title || 'Paso (Ignorado)',
                    subtitle: step.subtitle || '',
                    systems: step.systems || '-',
                    phase: step.phase || 'NOCUBIERTOS / AJUSTES',
                    stateChanges: step.stateChanges || [],
                    conditionalPaths: step.conditionalPaths || [],
                    actor: step.actor || 'General',
                    origin: step.origin || '-',
                    destination: step.destination || '-',
                    event: step.event || '-',
                    resultState: step.resultState || '-',
                    actionType: step.actionType || 'A',
                    precondition: step.precondition || '-',
                    exception: step.exception || '-',
                    rule: step.rule || '-',
                    linkedNodeId: step.linkedNodeId || '',
                    pagePath: selectedPage,
                    coveredNodeIds: step.coveredNodeIds || [],
                    confidence: step.confidence || 1.0,
                    interfaceRefs: step.interfaceRefs || [],
                    isLoop: !!step.isLoop,
                    loopNote: step.loopNote || null,
                    operativeDesc: step.operativeDesc || '',
                    needsReview: (step.confidence || 1.0) < 0.7
                }));
                
                const coveredInThisCall = new Set<string>();
                newRows.forEach(step => {
                    step.coveredNodeIds?.forEach(id => coveredInThisCall.add(id));
                    if (step.linkedNodeId) coveredInThisCall.add(step.linkedNodeId);
                });
                
                setNodeMap(prev => {
                    const next = { ...prev };
                    skippedIds.forEach(id => {
                        if (coveredInThisCall.has(id)) {
                            next[id] = 'covered';
                        }
                    });
                    return next;
                });
                
                setTableRows(prev => {
                    setIsDirty(true);
                    return mergeNewRows(prev, newRows);
                });
            } else if (response && response.error) {
                alert(`Error al analizar nodos ignorados: ${response.error}`);
            } else {
                alert(`Error al analizar nodos ignorados: Respuesta inesperada del servidor.`);
            }
        } catch (e: any) {
            console.error(e);
            alert(`Error al analizar nodos ignorados: ${e.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        const compiled: TableRow[] = [];
        selectedSessionIds.forEach(sessId => {
            const session = sessions.find(s => s.id === sessId);
            if (session) {
                const clonedRows = (session.tableRows || []).map(r => ({
                    ...r,
                    _sourceSessionName: session.sessionName
                }));
                compiled.push(...clonedRows);
            }
        });
        setConsolidatorSteps(compiled.map((r, i) => ({ ...r, step: i + 1 })));
    }, [selectedSessionIds, sessions]);

    const toggleSessionSelection = (sessionId: string) => {
        setSelectedSessionIds(prev => {
            if (prev.includes(sessionId)) {
                return prev.filter(id => id !== sessionId);
            } else {
                return [...prev, sessionId];
            }
        });
    };

    const moveSessionInOrder = (index: number, direction: 'up' | 'down') => {
        setSelectedSessionIds(prev => {
            const copy = [...prev];
            const target = direction === 'up' ? index - 1 : index + 1;
            if (target < 0 || target >= copy.length) return prev;
            const temp = copy[index];
            copy[index] = copy[target];
            copy[target] = temp;
            return copy;
        });
    };

    const movePreviewStep = (index: number, direction: 'up' | 'down') => {
        setConsolidatorSteps(prev => {
            const copy = [...prev];
            const target = direction === 'up' ? index - 1 : index + 1;
            if (target < 0 || target >= copy.length) return prev;
            const temp = copy[index];
            copy[index] = copy[target];
            copy[target] = temp;
            return copy.map((r, i) => ({ ...r, step: i + 1 }));
        });
    };

    const removePreviewStep = (index: number) => {
        setConsolidatorSteps(prev => {
            return prev.filter((_, i) => i !== index).map((r, i) => ({ ...r, step: i + 1 }));
        });
    };

    const applyConsolidation = () => {
        if (consolidatorSteps.length === 0) {
            alert("Selecciona al menos una sesión para consolidar.");
            return;
        }

        const mergedDoubts: Doubt[] = [];
        const mergedNodeMap: NodeCoverageMap = {};

        selectedSessionIds.forEach(sessId => {
            const session = sessions.find(s => s.id === sessId);
            if (session) {
                if (session.doubts) {
                    mergedDoubts.push(...session.doubts);
                }
                if (session.nodeMap) {
                    Object.assign(mergedNodeMap, session.nodeMap);
                }
            }
        });

        const finalSteps = consolidatorSteps.map(({ _sourceSessionName, ...r }: any) => r);

        setTableRows(finalSteps);
        setDoubts(mergedDoubts);
        setNodeMap(mergedNodeMap);
        setFile(new File([], 'Proceso_Consolidado.vsdx'));
        setSessionNameInput("Proceso Consolidado");
        setSelectedSessionId(null);
        setIsDirty(true);
        setViewMode('table');

        alert(`Flujo consolidado con ${finalSteps.length} pasos cargado en el editor. Recuerda guardar la sesión para persistirlo.`);
    };

    // Handle File Drop / Select
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    };

    const processFile = async (selectedFile: File) => {
        setFile(selectedFile);
        setIsParsing(true);
        setParsingStatus('Cargando archivo...');
        
        let keepProgress = false;
        if (tableRows.length > 0) {
            keepProgress = window.confirm(
                "Se ha detectado progreso o una sesión cargada. ¿Deseas conservar los pasos existentes para continuar con el análisis sobre este diagrama (recomendado para continuar un paquete grabado)?"
            );
        }
        keepProgressRef.current = keepProgress;

        if (!keepProgress) {
            setTableRows([]);
            setDoubts([]);
        }

        setNodes([]);
        setEdges([]);
        setActiveLoteIndex(0);

        const ext = selectedFile.name.split('.').pop()?.toLowerCase();
        setIsImageMode(false);
        setImagePreviewUrl(null);
        setImageInstruction('');

        if (ext === 'vsdx') {
            try {
                setParsingStatus('Descomprimiendo archivo VSDX (paquete ZIP)...');
                const zip = await JSZip.loadAsync(selectedFile);
                setZipInstance(zip);
                
                // Find pages XML in /visio/pages/page[0-9]+.xml
                const pageFiles = Object.keys(zip.files).filter(name => 
                    name.toLowerCase().startsWith('visio/pages/page') && name.toLowerCase().endsWith('.xml')
                );

                if (pageFiles.length === 0) {
                    throw new Error('No se encontraron páginas de Visio en el archivo VSDX.');
                }

                setPages(pageFiles);
                const firstPage = pageFiles[0];
                setSelectedPage(firstPage);
                await parseVisioPage(zip, firstPage);
            } catch (err: any) {
                console.error(err);
                alert(`Error al abrir el archivo VSDX: ${err.message}`);
                setIsParsing(false);
            }
        } else if (ext === 'svg') {
            try {
                setParsingStatus('Parseando archivo SVG de Visio...');
                const text = await selectedFile.text();
                parseVisioSvgText(text);
            } catch (err: any) {
                console.error(err);
                alert(`Error al abrir el archivo SVG: ${err.message}`);
                setIsParsing(false);
            }
        } else if (['png', 'jpg', 'jpeg'].includes(ext || '')) {
            setParsingStatus('Cargando y optimizando imagen...');
            setIsImageMode(true);
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                const img = new Image();
                img.onload = () => {
                    const maxDim = 1600;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        } else {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                        setImagePreviewUrl(compressedDataUrl);
                    } else {
                        setImagePreviewUrl(dataUrl);
                    }
                    setParsingStatus('Imagen cargada y optimizada. Lista para compilar con IA.');
                    setIsParsing(false);
                };
                img.onerror = () => {
                    setImagePreviewUrl(dataUrl);
                    setParsingStatus('Imagen cargada. Lista para compilar con IA.');
                    setIsParsing(false);
                };
                img.src = dataUrl;
            };
            reader.onerror = () => {
                alert('Error al leer la imagen.');
                setIsParsing(false);
            };
            reader.readAsDataURL(selectedFile);
        } else {
            setParsingStatus('Formato no soportado. Por favor sube VSDX, SVG, PNG o JPG.');
            setIsParsing(false);
        }
    };

    // Parse VSDX Page XML file using browser DOMParser
    const parseVisioPage = async (zip: JSZip, pagePath: string) => {
        try {
            setParsingStatus(`Extrayendo contenido de ${pagePath}...`);
            const xmlText = await zip.files[pagePath].async('string');
            
            setParsingStatus('Analizando estructura XML (nodos y conectores)...');
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

            // 1. Get connectors from <Connects>
            const connects = xmlDoc.getElementsByTagNameNS('*', 'Connect');
            const connectorsMap: Record<string, { from?: string; to?: string }> = {};

            for (let i = 0; i < connects.length; i++) {
                const connect = connects[i];
                const fromSheet = connect.getAttribute('FromSheet');
                const fromCell = connect.getAttribute('FromCell');
                const toSheet = connect.getAttribute('ToSheet');

                if (fromSheet && toSheet) {
                    if (!connectorsMap[fromSheet]) {
                        connectorsMap[fromSheet] = {};
                    }
                    if (fromCell === 'BeginX') {
                        connectorsMap[fromSheet].from = toSheet;
                    } else if (fromCell === 'EndX') {
                        connectorsMap[fromSheet].to = toSheet;
                    }
                }
            }

            // 2. Extract shapes (Nodes, Labels, Positions, Swimlanes)
            const shapesList = xmlDoc.getElementsByTagNameNS('*', 'Shape');
            const nodesMap: Record<string, ParsedNode> = {};
            const extractedEdges: ParsedEdge[] = [];
            const extractedSwimlanesSet = new Set<string>();
            const swimlaneContainers: Record<string, string> = {}; // id -> swimlane label

            // First loop: Find swimlanes and functional containers
            for (let i = 0; i < shapesList.length; i++) {
                const shape = shapesList[i];
                const id = shape.getAttribute('ID');
                const nameU = shape.getAttribute('NameU') || '';
                const name = shape.getAttribute('Name') || '';

                if (!id) continue;

                if (nameU.toLowerCase().includes('swimlane') || name.toLowerCase().includes('swimlane') ||
                    nameU.toLowerCase().includes('carril') || name.toLowerCase().includes('carril')) {
                    const textEl = shape.getElementsByTagNameNS('*', 'Text')[0];
                    const swimlaneName = textEl ? textEl.textContent?.trim() || '' : '';
                    if (swimlaneName) {
                        extractedSwimlanesSet.add(swimlaneName);
                        swimlaneContainers[id] = swimlaneName;
                    }
                }
            }

            // Second loop: Process regular shapes and connect lines
            for (let i = 0; i < shapesList.length; i++) {
                const shape = shapesList[i];
                const id = shape.getAttribute('ID');
                const type = shape.getAttribute('Type');
                const nameU = shape.getAttribute('NameU') || '';

                if (!id || type === 'Group') continue;

                // Check if this shape is a connector line
                if (connectorsMap[id]) {
                    const connData = connectorsMap[id];
                    if (connData.from && connData.to) {
                        const textEl = shape.getElementsByTagNameNS('*', 'Text')[0];
                        const label = textEl ? textEl.textContent?.trim() || '' : '';
                        extractedEdges.push({
                            id,
                            from: connData.from,
                            to: connData.to,
                            label
                        });
                    }
                    continue;
                }

                // Skip swimlane shapes themselves
                if (swimlaneContainers[id]) continue;

                const textEl = shape.getElementsByTagNameNS('*', 'Text')[0];
                const label = textEl ? textEl.textContent?.trim() || '' : '';

                // Get coordinates (PinX / PinY cells)
                let x = 0;
                let y = 0;
                const cells = shape.getElementsByTagNameNS('*', 'Cell');
                for (let j = 0; j < cells.length; j++) {
                    const cell = cells[j];
                    const cellName = cell.getAttribute('Name');
                    if (cellName === 'PinX') {
                        x = parseFloat(cell.getAttribute('V') || '0') * 80;
                    } else if (cellName === 'PinY') {
                        y = parseFloat(cell.getAttribute('V') || '0') * 80;
                    }
                }

                // Match swimlane context from parent containment hierarchy
                let swimlane = 'General';
                let parent = shape.parentElement;
                while (parent) {
                    if (parent.localName === 'Shape') {
                        const parentId = parent.getAttribute('ID');
                        if (parentId && swimlaneContainers[parentId]) {
                            swimlane = swimlaneContainers[parentId];
                            break;
                        }
                    }
                    parent = parent.parentElement;
                }

                let shapeType = 'rectangle';
                if (nameU.toLowerCase().includes('decision') || nameU.toLowerCase().includes('decisión')) {
                    shapeType = 'decision';
                } else if (nameU.toLowerCase().includes('start') || nameU.toLowerCase().includes('inicio') || nameU.toLowerCase().includes('terminator')) {
                    shapeType = 'start';
                }

                nodesMap[id] = {
                    id,
                    label: label || `ID ${id}`,
                    shapeType,
                    swimlane,
                    position: { x, y: -y }
                };
            }

            // Exclude unconnected nodes that have no text labels
            const connectedIds = new Set<string>();
            extractedEdges.forEach(e => {
                connectedIds.add(e.from);
                connectedIds.add(e.to);
            });

            const parsedNodes = Object.values(nodesMap).filter(n =>
                n.label !== `ID ${n.id}` || connectedIds.has(n.id)
            );

            // Execute topological sorts and loops detection
            setParsingStatus('Analizando dependencias causales y ciclos...');
            const orderedNodes = topologicalSort(parsedNodes, extractedEdges);
            const cyclesList = detectCycles(parsedNodes, extractedEdges);

            setNodes(orderedNodes);
            setEdges(extractedEdges);
            setCycles(cyclesList);
            initializeNodeMap(orderedNodes, extractedEdges);
            setSwimlanes(extractedSwimlanesSet.size > 0 ? Array.from(extractedSwimlanesSet) : ['General']);

            // Lazy migration: sólo en análisis limpio (sin progreso previo).
            // En modo multi-página los IDs de Visio se repiten entre páginas y la migración
            // estamparía el pagePath incorrecto en filas de otras páginas.
            if (!keepProgressRef.current) {
                const migrationNodeIds = new Set(orderedNodes.map(n => n.id));
                setTableRows(prev => {
                    let changed = false;
                    const next = prev.map(row => {
                        if (row.linkedNodeId && migrationNodeIds.has(row.linkedNodeId) && !row.pagePath) {
                            changed = true;
                            return { ...row, pagePath };
                        }
                        return row;
                    });
                    return changed ? next : prev;
                });
            }

            // Auto-generate preliminary doubts
            generatePreliminaryDoubts(orderedNodes, extractedEdges, cyclesList);

            setParsingStatus('Grafo estructurado cargado correctamente.');
            setIsParsing(false);
        } catch (err: any) {
            console.error(err);
            alert(`Error parsing Visio page: ${err.message}`);
            setIsParsing(false);
        }
    };

    // Parse Visio SVG directly using XML Parser
    const parseVisioSvgText = (svgText: string) => {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(svgText, 'image/svg+xml');

            const shapesList = xmlDoc.getElementsByTagNameNS('*', 'g');
            const nodesMap: Record<string, ParsedNode> = {};
            const extractedEdges: ParsedEdge[] = [];

            // Detect if this is a bpmn-js / diagram-js SVG
            const isDjs = svgText.includes('djs-element');

            if (isDjs) {
                // Helpers for diagram-js parsing
                const parseTransform = (transform: string | null): { x: number; y: number } => {
                    if (!transform) return { x: 0, y: 0 };
                    const nums = transform.match(/[-+]?[0-9]*\.?[0-9]+/g);
                    if (!nums) return { x: 0, y: 0 };
                    if (transform.includes('matrix') && nums.length >= 6) {
                        return { x: parseFloat(nums[4]), y: parseFloat(nums[5]) };
                    }
                    if (transform.includes('translate') && nums.length >= 2) {
                        return { x: parseFloat(nums[0]), y: parseFloat(nums[1]) };
                    }
                    return { x: 0, y: 0 };
                };

                const getPathEndpoints = (d: string): { start: { x: number; y: number } | null, end: { x: number; y: number } | null } => {
                    const coords = d.match(/[-+]?[0-9]*\.?[0-9]+/g);
                    if (!coords || coords.length < 4) return { start: null, end: null };
                    const start = { x: parseFloat(coords[0]), y: parseFloat(coords[1]) };
                    const end = { x: parseFloat(coords[coords.length - 2]), y: parseFloat(coords[coords.length - 1]) };
                    return { start, end };
                };

                const shapes: Element[] = [];
                const connections: Element[] = [];

                for (let i = 0; i < shapesList.length; i++) {
                    const shape = shapesList[i];
                    const className = shape.getAttribute('class') || '';
                    const id = shape.getAttribute('data-element-id') || shape.getAttribute('id');
                    if (!id) continue;

                    if (className.includes('djs-shape')) {
                        shapes.push(shape);
                    } else if (className.includes('djs-connection')) {
                        connections.push(shape);
                    }
                }

                const swimlaneZones: { id: string; label: string; yMin: number; yMax: number }[] = [];
                const swimlanesSet = new Set<string>();

                // First pass: Find swimlanes (large rectangular containers)
                for (const shape of shapes) {
                    const id = shape.getAttribute('data-element-id') || shape.getAttribute('id') || '';
                    const transform = shape.getAttribute('transform');
                    const { x, y } = parseTransform(transform);
                    
                    const rect = shape.getElementsByTagNameNS('*', 'rect')[0];
                    const width = rect ? parseFloat(rect.getAttribute('width') || '0') : 0;
                    const height = rect ? parseFloat(rect.getAttribute('height') || '0') : 0;

                    if (width > 500 && height > 150) {
                        const textEls = shape.getElementsByTagNameNS('*', 'text');
                        let label = '';
                        if (textEls.length > 0) {
                            label = textEls[0].textContent?.trim() || '';
                        }
                        if (label) {
                            swimlaneZones.push({ id, label, yMin: y, yMax: y + height });
                            swimlanesSet.add(label);
                        }
                    }
                }

                // Second pass: Parse regular shapes (nodes)
                for (const shape of shapes) {
                    const id = shape.getAttribute('data-element-id') || shape.getAttribute('id') || '';
                    const transform = shape.getAttribute('transform');
                    const { x, y } = parseTransform(transform);
                    
                    const rect = shape.getElementsByTagNameNS('*', 'rect')[0];
                    const width = rect ? parseFloat(rect.getAttribute('width') || '0') : 90;
                    const height = rect ? parseFloat(rect.getAttribute('height') || '0') : 60;

                    if (width > 500 && height > 150) continue;

                    const textEls = shape.getElementsByTagNameNS('*', 'text');
                    let label = '';
                    if (textEls.length > 0) {
                        const tspans = textEls[0].getElementsByTagNameNS('*', 'tspan');
                        if (tspans.length > 0) {
                            label = Array.from(tspans).map(t => t.textContent?.trim() || '').filter(Boolean).join(' ');
                        } else {
                            label = textEls[0].textContent?.trim() || '';
                        }
                    }

                    // Match swimlane based on y coordinate overlap
                    let swimlane = 'General';
                    const centerY = y + height / 2;
                    for (const zone of swimlaneZones) {
                        if (centerY >= zone.yMin && centerY <= zone.yMax) {
                            swimlane = zone.label;
                            break;
                        }
                    }

                    let shapeType = 'rectangle';
                    const circle = shape.getElementsByTagNameNS('*', 'circle')[0];
                    if (circle) {
                        shapeType = 'start';
                    }
                    const polygon = shape.getElementsByTagNameNS('*', 'polygon')[0];
                    if (polygon) {
                        shapeType = 'decision';
                    }

                    nodesMap[id] = {
                        id,
                        label: label || `ID ${id}`,
                        shapeType,
                        swimlane,
                        position: { x, y }
                    };
                }

                // Third pass: Parse connections (edges)
                for (const conn of connections) {
                    const id = conn.getAttribute('data-element-id') || conn.getAttribute('id') || '';
                    const path = conn.getElementsByTagNameNS('*', 'path')[0];
                    if (!path) continue;

                    const d = path.getAttribute('d') || '';
                    const endpoints = getPathEndpoints(d);
                    if (!endpoints.start || !endpoints.end) continue;

                    const textEls = conn.getElementsByTagNameNS('*', 'text');
                    let label = '';
                    if (textEls.length > 0) {
                        label = textEls[0].textContent?.trim() || '';
                    }

                    let fromNodeId = '';
                    let minStartDist = Infinity;
                    let toNodeId = '';
                    let minEndDist = Infinity;

                    for (const node of Object.values(nodesMap)) {
                        const nodeCenterX = node.position.x + 45;
                        const nodeCenterY = node.position.y + 30;

                        const startDist = Math.hypot(endpoints.start.x - nodeCenterX, endpoints.start.y - nodeCenterY);
                        if (startDist < minStartDist) {
                            minStartDist = startDist;
                            fromNodeId = node.id;
                        }

                        const endDist = Math.hypot(endpoints.end.x - nodeCenterX, endpoints.end.y - nodeCenterY);
                        if (endDist < minEndDist) {
                            minEndDist = endDist;
                            toNodeId = node.id;
                        }
                    }

                    if (fromNodeId && toNodeId && fromNodeId !== toNodeId) {
                        extractedEdges.push({
                            id,
                            from: fromNodeId,
                            to: toNodeId,
                            label
                        });
                    }
                }

                // Execute topological sorts and loops detection
                setParsingStatus('Analizando dependencias causales y ciclos...');
                const orderedNodes = topologicalSort(Object.values(nodesMap), extractedEdges);
                const cyclesList = detectCycles(Object.values(nodesMap), extractedEdges);

                setNodes(orderedNodes);
                setEdges(extractedEdges);
                setCycles(cyclesList);
                initializeNodeMap(orderedNodes, extractedEdges);
                setSwimlanes(swimlanesSet.size > 0 ? Array.from(swimlanesSet) : ['General']);

                generatePreliminaryDoubts(orderedNodes, extractedEdges, cyclesList);
                setParsingStatus('Grafo estructurado SVG cargado correctamente.');
                setIsParsing(false);

            } else {
                // Parse standard Visio SVG
                const connectorsMap: Record<string, { from?: string; to?: string }> = {};

                for (let i = 0; i < shapesList.length; i++) {
                    const shape = shapesList[i];
                    const id = shape.getAttribute('v:mID');
                    const groupContext = shape.getAttribute('v:groupContext');

                    if (!id) continue;

                    if (groupContext === 'connector') {
                        const textEl = shape.getElementsByTagNameNS('*', 'text')[0];
                        const label = textEl ? textEl.textContent?.trim() || '' : '';
                        connectorsMap[id] = { from: '', to: '' };
                    } else if (groupContext === 'shape') {
                        const textEl = shape.getElementsByTagNameNS('*', 'text')[0];
                        const label = textEl ? textEl.textContent?.trim() || '' : '';

                        nodesMap[id] = {
                            id,
                            label: label || `ID ${id}`,
                            shapeType: 'rectangle',
                            swimlane: 'General',
                            position: { x: i * 50, y: i * 50 }
                        };
                    }
                }

                const stdNodes = Object.values(nodesMap);
                setNodes(stdNodes);
                initializeNodeMap(stdNodes, []);
                setParsingStatus('SVG parsed.');
                setIsParsing(false);
            }
        } catch (err: any) {
            console.error(err);
            alert('Error al parsear SVG: ' + err.message);
            setIsParsing(false);
        }
    };

    const initializeNodeMap = (nodesList: ParsedNode[], edgesList: ParsedEdge[]) => {
        const connectedIds = new Set(edgesList.flatMap(e => [e.from, e.to]));
        const coveredInTable = new Set<string>();
        tableRows.forEach(row => {
            if (row.linkedNodeId) coveredInTable.add(row.linkedNodeId);
            row.coveredNodeIds?.forEach(id => coveredInTable.add(id));
        });

        const initialMap: NodeCoverageMap = {};
        nodesList.forEach(n => {
            if (coveredInTable.has(n.id)) {
                initialMap[n.id] = 'covered';
            } else {
                initialMap[n.id] = connectedIds.has(n.id) ? 'pending' : 'orphan';
            }
        });
        setNodeMap(initialMap);
    };

    // Topological Sort Logic
    const topologicalSort = (nodesList: ParsedNode[], edgesList: ParsedEdge[]) => {
        // 1. Filter out excluded nodes
        const filteredNodes = nodesList.filter(n => !excludedNodeIds.has(n.id));
        const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
        const filteredEdges = edgesList.filter(e => filteredNodeIds.has(e.from) && filteredNodeIds.has(e.to));

        const adj: Record<string, string[]> = {};
        const inDegree: Record<string, number> = {};
        
        filteredNodes.forEach(n => {
            adj[n.id] = [];
            inDegree[n.id] = 0;
        });

        filteredEdges.forEach(e => {
            let from = e.from;
            let to = e.to;
            if (traversalMode === 'backward') {
                from = e.to;
                to = e.from;
            }
            if (adj[from] && adj[to] !== undefined) {
                adj[from].push(to);
                inDegree[to]++;
                if (traversalMode === 'undirected') {
                    adj[to].push(from);
                    inDegree[from]++;
                }
            }
        });

        const order: string[] = [];
        const orderedSet = new Set<string>();

        if (startNodeId && filteredNodeIds.has(startNodeId)) {
            // BFS from startNodeId
            const queue: string[] = [startNodeId];
            const visited = new Set<string>([startNodeId]);
            
            while (queue.length > 0) {
                const u = queue.shift()!;
                order.push(u);
                orderedSet.add(u);
                
                const neighbors = adj[u] || [];
                neighbors.forEach(v => {
                    if (!visited.has(v)) {
                        visited.add(v);
                        queue.push(v);
                    }
                });
            }
        } else {
            // Standard Kahn's algorithm
            const queue: string[] = [];
            filteredNodes.forEach(n => {
                if (inDegree[n.id] === 0) {
                    queue.push(n.id);
                }
            });

            while (queue.length > 0) {
                const u = queue.shift()!;
                order.push(u);
                orderedSet.add(u);

                const neighbors = adj[u] || [];
                neighbors.forEach(v => {
                    inDegree[v]--;
                    if (inDegree[v] === 0) {
                        queue.push(v);
                    }
                });
            }
        }

        // Add nodes inside loops/cycles or unreached nodes
        filteredNodes.forEach(n => {
            if (!orderedSet.has(n.id)) {
                order.push(n.id);
            }
        });

        const nodeMap = new Map(filteredNodes.map(n => [n.id, n]));
        const orderedNodes = order.map(id => nodeMap.get(id)).filter(Boolean) as ParsedNode[];
        const excludedNodesArr = nodesList.filter(n => excludedNodeIds.has(n.id));
        return [...orderedNodes, ...excludedNodesArr];
    };

    const recalculateFlow = () => {
        if (nodes.length === 0) return;
        setParsingStatus('Re-calculando flujos y dependencias causales...');
        const orderedNodes = topologicalSort(nodes, edges);
        setNodes(orderedNodes);
        setParsingStatus('');
    };

    // Detect loops using Tarjan's strongly connected components algorithm
    const detectCycles = (nodesList: ParsedNode[], edgesList: ParsedEdge[]) => {
        const adj: Record<string, string[]> = {};
        nodesList.forEach(n => adj[n.id] = []);
        edgesList.forEach(e => {
            if (adj[e.from] && adj[e.to]) {
                adj[e.from].push(e.to);
            }
        });

        const index: Record<string, number> = {};
        const lowlink: Record<string, number> = {};
        const onStack: Record<string, boolean> = {};
        const stack: string[] = [];
        let counter = 0;
        const cyclesList: string[][] = [];

        function strongConnect(v: string) {
            index[v] = counter;
            lowlink[v] = counter;
            counter++;
            stack.push(v);
            onStack[v] = true;

            const neighbors = adj[v] || [];
            for (const w of neighbors) {
                if (index[w] === undefined) {
                    strongConnect(w);
                    lowlink[v] = Math.min(lowlink[v], lowlink[w]);
                } else if (onStack[w]) {
                    lowlink[v] = Math.min(lowlink[v], index[w]);
                }
            }

            if (lowlink[v] === index[v]) {
                const scc: string[] = [];
                let w = '';
                do {
                    w = stack.pop()!;
                    onStack[w] = false;
                    scc.push(w);
                } while (w !== v);

                if (scc.length > 1) {
                    cyclesList.push(scc.reverse());
                }
            }
        }

        nodesList.forEach(n => {
            if (index[n.id] === undefined) {
                strongConnect(n.id);
            }
        });

        return cyclesList;
    };

    // Proactively generate doubt cards based on the topological graph
    const generatePreliminaryDoubts = (nodesList: ParsedNode[], edgesList: ParsedEdge[], cyclesList: string[][]) => {
        const generatedDoubts: Doubt[] = [];

        // 1. Identify isolated nodes
        const connectedIds = new Set<string>();
        edgesList.forEach(e => {
            connectedIds.add(e.from);
            connectedIds.add(e.to);
        });

        nodesList.forEach(n => {
            if (!connectedIds.has(n.id) && n.label.startsWith('ID')) {
                generatedDoubts.push({
                    id: `isolated-${n.id}`,
                    severity: 'critical',
                    message: `Nodo aislado sin texto legible detectado en Visio (Shape ID: ${n.id}).`,
                    nodeId: n.id
                });
            }
        });

        // 2. Identify loop cycles
        cyclesList.forEach((cycle, index) => {
            generatedDoubts.push({
                id: `cycle-${index}`,
                severity: 'medium',
                message: `Bucle recursivo detectado entre los nodos: [${cycle.join(' ➔ ')}]. Se catalogará como loop.`,
                nodeId: cycle[0]
            });
        });

        // 3. Multi-path output warnings
        const outDegrees: Record<string, number> = {};
        edgesList.forEach(e => {
            outDegrees[e.from] = (outDegrees[e.from] || 0) + 1;
        });

        Object.entries(outDegrees).forEach(([fromId, count]) => {
            if (count > 1) {
                const node = nodesList.find(n => n.id === fromId);
                if (node && node.shapeType !== 'decision') {
                    generatedDoubts.push({
                        id: `multi-path-${fromId}`,
                        severity: 'low',
                        message: `El nodo "${node.label}" tiene ${count} ramificaciones de salida pero no está etiquetado como decisión.`,
                        nodeId: fromId
                    });
                }
            }
        });

        if (keepProgressRef.current) {
            setDoubts(prev => {
                const existingIds = new Set(prev.map(d => d.id));
                const filteredNew = generatedDoubts.filter(d => !existingIds.has(d.id));
                return [...prev, ...filteredNew];
            });
        } else {
            setDoubts(generatedDoubts);
        }
    };

    // Run Semantic Extraction on current selected sub-flow (Lote)
    const runSemanticAnalysis = async () => {
        if (nodes.length === 0) return;
        setIsGenerating(true);

        try {
            // Get sub-graph for active lote
            const activeLote = lotes[activeLoteIndex] ?? lotes[0];
            if (!activeLote) { setIsGenerating(false); return; }
            const activeNodeIds = new Set(activeLote.nodeIds);
            
            const subNodes = nodes.filter(n => activeNodeIds.has(n.id));
            const subEdges = edges.filter(e => activeNodeIds.has(e.from) || activeNodeIds.has(e.to));

            const graphContext = {
                nodes: subNodes,
                edges: subEdges,
                swimlanes
            };

            const response = await analyzeSubflowWithGemini(JSON.stringify(graphContext));
            
            if (response && response.success && response.steps) {
                // Map API response to UI table state
                const newRows: TableRow[] = response.steps.map(step => ({
                    step: (step.step || 1) + (activeLote.start - 1), // Offset based on lote
                    title: step.title || 'Paso',
                    subtitle: step.subtitle || '',
                    systems: step.systems || '-',
                    phase: step.phase || 'FASE GENERAL',
                    stateChanges: step.stateChanges || [],
                    conditionalPaths: step.conditionalPaths || [],
                    actor: step.actor || 'General',
                    origin: step.origin || '-',
                    destination: step.destination || '-',
                    event: step.event || '-',
                    resultState: step.resultState || '-',
                    actionType: step.actionType || 'A',
                    precondition: step.precondition || '-',
                    exception: step.exception || '-',
                    rule: step.rule || '-',
                    linkedNodeId: step.linkedNodeId || '',
                    pagePath: selectedPage,
                    coveredNodeIds: step.coveredNodeIds || [],
                    confidence: step.confidence || 1.0,
                    interfaceRefs: step.interfaceRefs || [],
                    isLoop: !!step.isLoop,
                    loopNote: step.loopNote || null,
                    operativeDesc: step.operativeDesc || '',
                    needsReview: (step.confidence || 1.0) < 0.7
                }));

                // Store in draft instead of immediate merge
                setDraftRows(newRows);
                setActiveBatchUnderReview({
                    index: activeLoteIndex,
                    nodeIds: Array.from(activeNodeIds)
                });
            } else if (response && response.error) {
                alert(`Error al analizar sub-flujo: ${response.error}`);
            } else {
                alert(`Error al analizar sub-flujo: Respuesta inesperada del servidor.`);
            }
        } catch (e: any) {
            console.error(e);
            alert(`Error al analizar sub-flujo: ${e.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const approveDraftBatch = () => {
        if (!activeBatchUnderReview) return;
        const activeNodeIds = new Set(activeBatchUnderReview.nodeIds);
        
        const coveredInThisCall = new Set<string>();
        draftRows.forEach(step => {
            step.coveredNodeIds?.forEach(id => coveredInThisCall.add(id));
            if (step.linkedNodeId) coveredInThisCall.add(step.linkedNodeId);
        });

        setNodeMap(prev => {
            const next = { ...prev };
            activeNodeIds.forEach(id => {
                if (coveredInThisCall.has(id)) {
                    next[id] = 'covered';
                } else if (next[id] === 'pending') {
                    next[id] = 'skipped';
                }
            });
            return next;
        });

        setTableRows(prev => {
            setIsDirty(true);
            return mergeNewRows(prev, draftRows, activeNodeIds);
        });
        
        setDraftRows([]);
        setActiveBatchUnderReview(null);
    };

    const discardDraftBatch = () => {
        setDraftRows([]);
        setActiveBatchUnderReview(null);
    };

    const runImageAnalysis = async () => {
        if (!imagePreviewUrl) return;
        setIsGenerating(true);
        setParsingStatus('Enviando imagen a Gemini para su análisis estructural...');

        try {
            const response = await analyzeDiagramImageWithGemini(imagePreviewUrl, imageInstruction);

            if (response && response.success && response.steps) {
                const newRows: TableRow[] = response.steps.map(step => ({
                    step: step.step || 1,
                    title: step.title || 'Paso',
                    subtitle: step.subtitle || '',
                    systems: step.systems || '-',
                    phase: step.phase || 'FASE GENERAL',
                    stateChanges: step.stateChanges || [],
                    conditionalPaths: step.conditionalPaths || [],
                    actor: step.actor || 'General',
                    origin: step.origin || '-',
                    destination: step.destination || '-',
                    event: step.event || '-',
                    resultState: step.resultState || '-',
                    actionType: step.actionType || 'H',
                    precondition: step.precondition || '-',
                    exception: step.exception || '-',
                    rule: step.rule || '-',
                    linkedNodeId: step.linkedNodeId || 'shape_1',
                    pagePath: 'Análisis Visual',
                    coveredNodeIds: step.coveredNodeIds || [],
                    confidence: step.confidence || 1.0,
                    interfaceRefs: step.interfaceRefs || [],
                    isLoop: !!step.isLoop,
                    loopNote: step.loopNote || null,
                    operativeDesc: step.operativeDesc || '',
                    needsReview: (step.confidence || 1.0) < 0.7
                }));

                setTableRows(newRows);
                setDoubts([]);
                setNodes([]);
                setEdges([]);
                setCycles([]);
                
                const uniqueActors = Array.from(new Set(newRows.map(r => r.actor || 'General').filter(Boolean)));
                setSwimlanes(uniqueActors.length > 0 ? uniqueActors : ['General']);

                const initialMap: NodeCoverageMap = {};
                newRows.forEach(row => {
                    if (row.linkedNodeId) initialMap[row.linkedNodeId] = 'covered';
                    row.coveredNodeIds?.forEach(id => {
                        initialMap[id] = 'covered';
                    });
                });
                setNodeMap(initialMap);

                setIsDirty(true);
                setParsingStatus('Diagrama visual compilado correctamente.');
            } else if (response && response.error) {
                alert(`Error al analizar la imagen: ${response.error}`);
            } else {
                alert(`Error al analizar la imagen: Respuesta inesperada del servidor.`);
            }
        } catch (e: any) {
            console.error(e);
            alert(`Error al analizar la imagen: ${e.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // Handle Chat refiners
    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || isChatting) return;

        const userMessage = chatInput;
        setChatInput('');
        setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsChatting(true);

        try {
            const tableRowsJson = JSON.stringify(tableRows);
            const response = await chatWithUniVisio(chatHistory, userMessage, tableRowsJson);

            if (response && response.success && response.reply) {
                const replyText = response.reply;
                setChatHistory(prev => [...prev, { role: 'model', content: replyText }]);

                // Apply AI Command modifications to the table rows if returned
                if (response.command) {
                    const cmd = response.command;
                    if (cmd.type === 'update_row' && cmd.params.stepIndex !== undefined) {
                        setTableRows(prev => prev.map(row => 
                            row.step === cmd.params.stepIndex ? { ...row, ...cmd.params.fields } : row
                        ));
                        setIsDirty(true);
                    } else if (cmd.type === 'delete_row' && cmd.params.stepIndex !== undefined) {
                        setTableRows(prev => prev.filter(row => row.step !== cmd.params.stepIndex)
                            .map((row, i) => ({ ...row, step: i + 1 }))
                        );
                        setIsDirty(true);
                    } else if (cmd.type === 'insert_row' && cmd.params.index !== undefined) {
                        setTableRows(prev => {
                            const copy = [...prev];
                            copy.splice(cmd.params.index, 0, {
                                step: cmd.params.index + 1,
                                title: cmd.params.row.title || 'Nuevo Paso',
                                subtitle: cmd.params.row.subtitle || '',
                                systems: cmd.params.row.systems || '-',
                                phase: cmd.params.row.phase || 'FASE GENERAL',
                                stateChanges: cmd.params.row.stateChanges || [],
                                conditionalPaths: cmd.params.row.conditionalPaths || [],
                                actor: cmd.params.row.actor || 'General',
                                origin: cmd.params.row.origin || '-',
                                destination: cmd.params.row.destination || '-',
                                event: cmd.params.row.event || '-',
                                resultState: cmd.params.row.resultState || '-',
                                actionType: cmd.params.row.actionType || 'H',
                                precondition: cmd.params.row.precondition || '-',
                                exception: cmd.params.row.exception || '-',
                                rule: cmd.params.row.rule || '-',
                                linkedNodeId: '',
                                confidence: 1.0,
                                interfaceRefs: cmd.params.row.interfaceRefs || [],
                                isLoop: !!cmd.params.row.isLoop,
                                loopNote: cmd.params.row.loopNote || null,
                                operativeDesc: cmd.params.row.operativeDesc || ''
                            });
                            setIsDirty(true);
                            return copy.map((row, i) => ({ ...row, step: i + 1 }));
                        });
                    }
                }
            } else if (response && response.error) {
                setChatHistory(prev => [...prev, { role: 'model', content: `❌ Error al conectar con el copiloto: ${response.error}` }]);
            } else {
                setChatHistory(prev => [...prev, { role: 'model', content: `❌ Error: Respuesta inesperada del copiloto.` }]);
            }
        } catch (err: any) {
            console.error(err);
            setChatHistory(prev => [...prev, { role: 'model', content: `❌ Error al conectar con el copiloto: ${err.message}` }]);
        } finally {
            setIsChatting(false);
        }
    };

    // Table modifications helpers
    const handleCellChange = (rowIndex: number, column: keyof TableRow, value: any) => {
        setIsDirty(true);
        setTableRows(prev => prev.map((row, i) => 
            i === rowIndex ? { ...row, [column]: value } : row
        ));
    };

    const handleInterfaceRefsChange = (rowIndex: number, val: string) => {
        const nums = val.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        const currentRefs = tableRows[rowIndex].interfaceRefs || [];
        const newRefs = nums.map(n => {
            const existing = currentRefs.find(r => r.num === n);
            if (existing) return existing;
            return {
                num: n,
                name: `Interfaz #${n}`,
                direction: `${tableRows[rowIndex].origin || '-'} → ${tableRows[rowIndex].destination || '-'}`,
                data: tableRows[rowIndex].resultState || '-',
                criticality: 'MEDIA' as const
            };
        });
        handleCellChange(rowIndex, 'interfaceRefs', newRefs);
    };

    const handleAddRow = () => {
        setIsDirty(true);
        setTableRows(prev => [
            ...prev,
            {
                step: prev.length + 1,
                title: 'NUEVO PASO',
                subtitle: 'Descripción breve',
                systems: '-',
                phase: prev[prev.length - 1]?.phase || 'FASE GENERAL',
                stateChanges: [],
                conditionalPaths: [],
                actor: 'General',
                origin: '-',
                destination: '-',
                event: 'Nueva transacción',
                resultState: '-',
                actionType: 'H',
                precondition: '-',
                exception: '-',
                rule: '-',
                linkedNodeId: '',
                pagePath: selectedPage,
                confidence: 1.0,
                interfaceRefs: [],
                isLoop: false,
                loopNote: null,
                operativeDesc: 'Descripción operativa del paso.'
            }
        ]);
    };

    const handleDeleteRow = (index: number) => {
        if (!confirm('¿Estás seguro de eliminar este paso?')) return;
        setIsDirty(true);
        setTableRows(prev => prev.filter((_, i) => i !== index)
            .map((row, i) => ({ ...row, step: i + 1 }))
        );
    };

    const handleDuplicateRow = (index: number) => {
        setIsDirty(true);
        setTableRows(prev => {
            const rowToDuplicate = prev[index];
            const duplicatedRow = {
                ...rowToDuplicate,
                linkedNodeId: '', 
                step: index + 2
            };
            const copy = [...prev];
            copy.splice(index + 1, 0, duplicatedRow);
            return copy.map((row, i) => ({ ...row, step: i + 1 }));
        });
    };

    const handleInsertRow = (index: number) => {
        setIsDirty(true);
        setTableRows(prev => {
            const newRow = {
                step: index + 2,
                title: 'NUEVO PASO',
                subtitle: 'Descripción breve',
                systems: '-',
                phase: prev[index]?.phase || 'FASE GENERAL',
                stateChanges: [],
                conditionalPaths: [],
                actor: prev[index]?.actor || 'General',
                origin: '-',
                destination: '-',
                event: 'Nueva transacción',
                resultState: '-',
                actionType: 'H',
                precondition: '-',
                exception: '-',
                rule: '-',
                linkedNodeId: '',
                pagePath: selectedPage,
                confidence: 1.0,
                interfaceRefs: [],
                isLoop: false,
                loopNote: null,
                operativeDesc: 'Descripción operativa del paso.'
            };
            const copy = [...prev];
            copy.splice(index + 1, 0, newRow);
            return copy.map((row, i) => ({ ...row, step: i + 1 }));
        });
    };

    const moveRow = (index: number, direction: 'up' | 'down') => {
        setIsDirty(true);
        setTableRows(prev => {
            const copy = [...prev];
            const target = direction === 'up' ? index - 1 : index + 1;
            if (target < 0 || target >= copy.length) return prev;
            
            // Swap
            const temp = copy[index];
            copy[index] = copy[target];
            copy[target] = temp;

            return copy.map((row, i) => ({ ...row, step: i + 1 }));
        });
    };

    const moveRowToPosition = (fromIndex: number, toStep: number) => {
        if (isNaN(toStep) || toStep < 1) return;
        setIsDirty(true);
        setTableRows(prev => {
            const copy = [...prev];
            const toIndex = Math.min(Math.max(toStep - 1, 0), copy.length - 1);
            if (fromIndex === toIndex) return prev;

            const [movedRow] = copy.splice(fromIndex, 1);
            copy.splice(toIndex, 0, movedRow);

            return copy.map((row, i) => ({ ...row, step: i + 1 }));
        });
    };

    // Exporters
    const exportCSV = () => {
        if (tableRows.length === 0) return;
        const headers = [
            'Paso', 'Título', 'Subtítulo', 'Sistemas', 'Fase', 'Actor/Swimlane', 
            'Origen del Dato', 'Destino/Consumidor', 'Evento/Transición', 'Estado Resultante', 
            'Tipo Acción', 'Precondición', 'Excepción', 'Regla de Negocio', 
            'Ref. Interfaz', 'Bucle', 'Nota Bucle', 'Descripción Operativa'
        ];
        const csvContent = [
            headers.join(','),
            ...tableRows.map(r => [
                r.step,
                `"${(r.title || '').replace(/"/g, '""')}"`,
                `"${(r.subtitle || '').replace(/"/g, '""')}"`,
                `"${(r.systems || '').replace(/"/g, '""')}"`,
                `"${(r.phase || '').replace(/"/g, '""')}"`,
                `"${(r.actor || '').replace(/"/g, '""')}"`,
                `"${(r.origin || '').replace(/"/g, '""')}"`,
                `"${(r.destination || '').replace(/"/g, '""')}"`,
                `"${(r.event || '').replace(/"/g, '""')}"`,
                `"${(r.resultState || '').replace(/"/g, '""')}"`,
                `"${(r.actionType || '').replace(/"/g, '""')}"`,
                `"${(r.precondition || '').replace(/"/g, '""')}"`,
                `"${(r.exception || '').replace(/"/g, '""')}"`,
                `"${(r.rule || '').replace(/"/g, '""')}"`,
                `"${(r.interfaceRefs?.map(i => i.num).join(', ') || '').replace(/"/g, '""')}"`,
                r.isLoop ? 'SI' : 'NO',
                `"${(r.loopNote || '').replace(/"/g, '""')}"`,
                `"${(r.operativeDesc || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${file?.name.split('.')[0] || 'UniVisio'}_narrativa.csv`);
        link.click();
    };

    const exportMarkdown = () => {
        if (tableRows.length === 0) return;
        const headers = [
            '#', 'Fase', 'Título', 'Sistemas', 'Actor / Swimlane', 'Origen del Dato', 
            'Destino / Consumidor', 'Evento / Transición', 'Estado Resultante', 'Acción', 
            'Precondición', 'Excepción', 'Regla de Negocio', 'Ref. Interfaz', 'Descripción Operativa'
        ];
        const separators = headers.map(() => '---');
        const rows = tableRows.map(r => [
            r.step,
            r.phase || 'General',
            r.title || '-',
            r.systems || '-',
            r.actor || '-',
            r.origin || '-',
            r.destination || '-',
            r.event || '-',
            r.resultState || '-',
            r.actionType || '-',
            r.precondition || '-',
            r.exception || '-',
            r.rule || '-',
            r.interfaceRefs && r.interfaceRefs.length > 0 ? r.interfaceRefs.map(i => `#${i.num}`).join(', ') : '-',
            r.operativeDesc || '-'
        ]);

        const mdLines = [
            `# Narrativa de Proceso de Visio: ${file?.name || 'Proceso'}`,
            '',
            `| ${headers.join(' | ')} |`,
            `| ${separators.join(' | ')} |`,
            ...rows.map(row => `| ${row.join(' | ')} |`),
            '',
            '## Matriz Completa de Estados por Entidad',
            ''
        ];

        if (Object.keys(entityStateMatrix).length > 0) {
            Object.entries(entityStateMatrix).forEach(([entity, states]) => {
                mdLines.push(`- **${entity}**: ${states.join(' ➔ ')}`);
            });
        } else {
            mdLines.push('No se definieron transiciones de estado.');
        }

        mdLines.push('', '## Registro de Interfaces', '');
        if (interfaceRegistry.length > 0) {
            mdLines.push('| # | Nombre | Flujo | Datos | Criticidad |');
            mdLines.push('|---|--------|-------|-------|------------|');
            interfaceRegistry.forEach(item => {
                mdLines.push(`| ${item.num} | ${item.name} | ${item.direction} | ${item.data} | ${item.criticality} |`);
            });
        } else {
            mdLines.push('No se registraron interfaces.');
        }

        const mdContent = mdLines.join('\n');
        const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${file?.name.split('.')[0] || 'UniVisio'}_narrativa.md`);
        link.click();
    };

    const exportExcel = () => {
        if (tableRows.length === 0) return;
        
        const worksheetSteps = XLSX.utils.json_to_sheet(tableRows.map(r => ({
            Paso: r.step,
            Fase: r.phase || 'General',
            Título: r.title || '-',
            Subtítulo: r.subtitle || '',
            Sistemas: r.systems || '-',
            'Actor / Swimlane': r.actor || '-',
            'Origen del Dato': r.origin || '-',
            'Destino / Consumidor': r.destination || '-',
            'Evento / Transición': r.event || '-',
            'Estado Resultante': r.resultState || '-',
            'Tipo de Acción': r.actionType || '-',
            Precondición: r.precondition || '-',
            Excepción: r.exception || '-',
            'Regla de Negocio': r.rule || '-',
            'Ref. Interfaz': r.interfaceRefs?.map(i => `#${i.num}`).join(', ') || '-',
            Bucle: r.isLoop ? 'SI' : 'NO',
            'Nota Bucle': r.loopNote || '',
            'Descripción Operativa': r.operativeDesc || ''
        })));
        
        const matrixRows = Object.entries(entityStateMatrix).map(([entity, states]) => ({
            Entidad: entity,
            'Secuencia de Estados': states.join(' ➔ ')
        }));
        const worksheetMatrix = XLSX.utils.json_to_sheet(matrixRows);

        const interfaceRows = interfaceRegistry.map(item => ({
            'Número Interfaz': item.num,
            Nombre: item.name,
            Dirección: item.direction,
            Dato: item.data,
            Criticidad: item.criticality
        }));
        const worksheetInterfaces = XLSX.utils.json_to_sheet(interfaceRows);

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheetSteps, 'Narrativa de Pasos');
        XLSX.utils.book_append_sheet(workbook, worksheetMatrix, 'Matriz de Estados');
        XLSX.utils.book_append_sheet(workbook, worksheetInterfaces, 'Registro de Interfaces');
        
        XLSX.writeFile(workbook, `${file?.name.split('.')[0] || 'UniVisio'}_narrativa.xlsx`);
    };

    const triggerPrintPDF = () => {
        window.print();
    };

    return (
        <div className="flex flex-col h-screen max-h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans univisio-workspace">
            
            {/* Main view container */}
            <div className="flex flex-1 overflow-hidden min-h-0">
                
                {/* Left panel: File drop and page details */}
                <div className="w-80 border-r border-zinc-800 bg-zinc-900/60 p-5 flex flex-col gap-6 overflow-y-auto print:hidden">
                    <div>
                        <h2 className="text-xl font-bold text-red-500 flex items-center gap-2">
                            <Network className="w-5 h-5" /> UniVisio
                        </h2>
                        <p className="text-xs text-zinc-400 mt-1">Ingesta y documentación de diagramas de Microsoft Visio</p>
                    </div>

                    {/* Project Selector */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Proyecto</label>
                        <select
                            value={selectedProjectId}
                            onChange={(e) => handleProjectChange(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-red-500 text-zinc-200"
                        >
                            <option value="">Selecciona un proyecto...</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sessions List */}
                    {selectedProjectId && sessions.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Sesiones Guardadas</label>
                            <div className="flex flex-col gap-1 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                {sessions.map(s => (
                                    <div
                                        key={s.id}
                                        className={cn(
                                            "group flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors border",
                                            selectedSessionId === s.id 
                                                ? "bg-red-500/20 text-red-300 border-red-500/30" 
                                                : "bg-zinc-900 hover:bg-zinc-800/80 text-zinc-300 border-zinc-800"
                                        )}
                                    >
                                        <button
                                            onClick={() => handleLoadSession(s)}
                                            className="flex-1 text-left min-w-0 flex flex-col gap-0.5"
                                        >
                                            <div className="font-semibold truncate w-full pr-1">{s.sessionName}</div>
                                            <div className="text-[9px] text-zinc-500 truncate w-full pr-1">{s.fileName}</div>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSessionToDelete(s);
                                            }}
                                            className="p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-950/40 rounded transition-colors shrink-0 opacity-60 group-hover:opacity-100"
                                            title="Borrar Sesión"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* File Drop Zone (only show if project is selected) */}
                    {selectedProjectId && (
                        <div 
                            className={cn(
                                "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer text-center",
                                isDragging ? "border-red-500 bg-red-500/10" : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/50"
                            )}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept=".vsdx,.svg,image/png,image/jpeg"
                                onChange={handleFileChange}
                            />
                            {file ? (
                                <>
                                    {isImageMode && imagePreviewUrl ? (
                                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 flex items-center justify-center mb-1">
                                            <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <FileCode className="w-10 h-10 text-red-500" />
                                    )}
                                    <div className="text-sm font-semibold text-zinc-300 truncate w-full px-2">{file.name}</div>
                                    <div className="text-[10px] text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-10 h-10 text-zinc-500" />
                                    <div className="text-sm font-semibold text-zinc-300">Arrastra tu archivo aquí</div>
                                    <div className="text-[10px] text-zinc-500">Soporta VSDX, SVG, PNG o JPG</div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Loader */}
                    {isParsing && (
                        <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-xs text-zinc-300">
                                <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
                                <span>Procesando archivo...</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono leading-relaxed">{parsingStatus}</div>
                        </div>
                    )}

                    {/* VSDX Page Selector */}
                    {pages.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Páginas de Visio</label>
                            <select 
                                value={selectedPage} 
                                onChange={(e) => {
                                    setSelectedPage(e.target.value);
                                    if (zipInstance) parseVisioPage(zipInstance, e.target.value);
                                }}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-red-500 text-zinc-200"
                            >
                                {pages.map(p => (
                                    <option key={p} value={p}>{p.replace('visio/pages/', '')}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Visual Flowchart Preview in Sidebar */}
                    {isImageMode && imagePreviewUrl && tableRows.length > 0 && (
                        <details className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 group [&_summary::-webkit-details-marker]:hidden">
                            <summary className="flex justify-between items-center text-[10px] font-black text-zinc-400 uppercase tracking-widest cursor-pointer list-none">
                                <span>Ver Diagrama Original</span>
                                <span className="text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="mt-3 bg-zinc-950/60 rounded-lg overflow-hidden border border-zinc-850 flex items-center justify-center p-1.5 cursor-zoom-in" onClick={() => setShowFullImageModal(true)}>
                                <img 
                                    src={imagePreviewUrl} 
                                    alt="Flowchart original" 
                                    className="max-w-full max-h-40 object-contain"
                                />
                            </div>
                        </details>
                    )}

                    {/* Topology info */}
                    {nodes.length > 0 && (
                        <div className="flex flex-col gap-3 bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4">
                            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-800/60 pb-1.5">Info de Estructura</div>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <div className="text-lg font-black text-red-500">{nodes.length}</div>
                                    <div className="text-[9px] text-zinc-500 uppercase font-semibold">Nodos</div>
                                </div>
                                <div>
                                    <div className="text-lg font-black text-zinc-300">{edges.length}</div>
                                    <div className="text-[9px] text-zinc-500 uppercase font-semibold">Conexiones</div>
                                </div>
                            </div>
                            {cycles.length > 0 && (
                                <div className="flex items-center gap-2 mt-2 bg-yellow-950/20 border border-yellow-950 text-yellow-500 px-3 py-2 rounded-lg text-[10px]">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span>Se detectaron {cycles.length} bucles (loops) en el flujo.</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Batch / Lote processing */}
                    {lotes.length > 0 && (
                        <div className="flex flex-col gap-3">
                            <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Lotes de Extracción</label>
                            <div className="flex flex-col gap-2">
                                {lotes.map((l, idx) => (
                                    <button
                                        key={l.index}
                                        onClick={() => setActiveLoteIndex(idx)}
                                        className={cn(
                                            "w-full text-left px-3 py-2.5 rounded-lg text-xs flex justify-between items-center transition-all border",
                                            activeLoteIndex === idx
                                                ? "bg-red-500/10 border-red-500/50 text-red-400"
                                                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-950/80"
                                        )}
                                    >
                                        <span>Lote {l.index} ({l.start} - {l.end})</span>
                                        <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-full font-mono">
                                            {l.nodeIds.length} Nodos
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={runSemanticAnalysis}
                                disabled={isGenerating}
                                className="w-full bg-red-600 hover:bg-red-500 text-white disabled:bg-zinc-800 disabled:text-zinc-600 font-semibold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all mt-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Analizando Lote {activeLoteIndex + 1}...</span>
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4" />
                                        <span>Extraer Tabla Semántica</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Flow Configuration Dashboard */}
                    {nodes.length > 0 && (
                        <div className="flex flex-col gap-3 bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4">
                            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-800/60 pb-1.5">
                                Configuración de Flujo
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] text-zinc-400 uppercase font-semibold">Nodo de Inicio (Opcional)</label>
                                <select 
                                    value={startNodeId || ''} 
                                    onChange={(e) => setStartNodeId(e.target.value || null)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none focus:border-red-500 truncate"
                                >
                                    <option value="">-- Autodetectar --</option>
                                    {nodes.map(n => (
                                        <option key={n.id} value={n.id}>{n.label || n.id}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] text-zinc-400 uppercase font-semibold">Modo de Recorrido</label>
                                <select 
                                    value={traversalMode} 
                                    onChange={(e) => setTraversalMode(e.target.value as any)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none focus:border-red-500"
                                >
                                    <option value="forward">Normal (Sigue las flechas)</option>
                                    <option value="backward">Inverso (Contra las flechas)</option>
                                    <option value="undirected">Sin dirección (Ignora flechas)</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-2 mt-2">
                                <label className="text-[10px] text-zinc-400 uppercase font-semibold flex justify-between">
                                    <span>Nodos Excluidos ({excludedNodeIds.size})</span>
                                    {excludedNodeIds.size > 0 && (
                                        <button onClick={() => setExcludedNodeIds(new Set())} className="text-red-500 hover:text-red-400">Limpiar</button>
                                    )}
                                </label>
                                <select 
                                    multiple
                                    value={Array.from(excludedNodeIds)} 
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        setExcludedNodeIds(new Set(selected));
                                    }}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none focus:border-red-500 h-24 custom-scrollbar"
                                >
                                    {nodes.map(n => (
                                        <option key={n.id} value={n.id}>{n.label || n.id}</option>
                                    ))}
                                </select>
                                <div className="text-[9px] text-zinc-500">Usa Ctrl+Click o arrastra para seleccionar nodos a excluir del análisis.</div>
                            </div>
                            
                            {(startNodeId || excludedNodeIds.size > 0 || traversalMode !== 'forward') && (
                                <button 
                                    onClick={recalculateFlow} 
                                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs py-2 rounded-lg font-semibold mt-1 transition-colors"
                                >
                                    Re-calcular Lotes
                                </button>
                            )}
                        </div>
                    )}

                    {/* Coverage Dashboard */}
                    {coverage && (
                        <div className="flex flex-col gap-3 bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4">
                            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-800/60 pb-1.5 flex justify-between items-center">
                                <span>Cobertura de Análisis</span>
                                <span className="text-red-400 font-mono font-bold text-xs">{coverage.pct}%</span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800/40">
                                <div 
                                    className="bg-red-500 h-full rounded-full transition-all duration-500" 
                                    style={{ width: `${coverage.pct}%` }} 
                                />
                            </div>

                            {/* Detailed metrics */}
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
                                <div className="bg-zinc-900/40 border border-zinc-800/20 p-2 rounded-lg text-center">
                                    <div className="font-bold text-zinc-200">{coverage.covered} / {coverage.total - coverage.orphan}</div>
                                    <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Cubiertos</div>
                                </div>
                                <div className="bg-zinc-900/40 border border-zinc-800/20 p-2 rounded-lg text-center">
                                    <div className="font-bold text-yellow-500">{coverage.skipped}</div>
                                    <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Ignorados</div>
                                </div>
                                <div className="bg-zinc-900/40 border border-zinc-800/20 p-2 rounded-lg text-center">
                                    <div className="font-bold text-zinc-400">{coverage.pending}</div>
                                    <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Pendientes</div>
                                </div>
                                <div className="bg-zinc-900/40 border border-zinc-800/20 p-2 rounded-lg text-center">
                                    <div className="font-bold text-zinc-500">{coverage.orphan}</div>
                                    <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Huérfanos</div>
                                </div>
                            </div>

                            {/* Collapsible Skipped List */}
                            {skippedNodes.length > 0 && (
                                <div className="mt-1 border-t border-zinc-800/40 pt-2 flex flex-col gap-1.5">
                                    <button 
                                        onClick={() => setShowSkippedList(!showSkippedList)}
                                        className="w-full flex justify-between items-center text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors uppercase font-bold tracking-wider"
                                    >
                                        <span>Nodos Pendientes / Ignorados ({skippedNodes.length})</span>
                                        <span>{showSkippedList ? '▲' : '▼'}</span>
                                    </button>

                                    {showSkippedList && (
                                        <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1 mt-1">
                                            {skippedNodes.map(node => (
                                                <div key={node.id} className="bg-yellow-950/5 border border-yellow-950/20 rounded-lg p-2 flex flex-col gap-0.5 text-[10px]">
                                                     <div className="flex items-center gap-1.5 text-yellow-500 font-semibold">
                                                         <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                                         <span className="truncate">{node.label}</span>
                                                     </div>
                                                     {(node.prevNodeLabel || node.nextNodeLabel) && (
                                                         <div className="text-[9px] text-zinc-500 italic pl-5 truncate">
                                                             {node.prevNodeLabel || '?'} → {node.nextNodeLabel || '?'}
                                                         </div>
                                                     )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <button
                                        onClick={runSkippedSemanticAnalysis}
                                        disabled={isGenerating}
                                        className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all mt-1"
                                    >
                                        <Play className="w-3 h-3" />
                                        <span>Analizar pendientes / ignorados</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Center Workspace: Table rendering */}
                <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 print:bg-white print:text-black relative">
                    
                    {/* Marca de agua de UNIGIS para impresión (10% transparencia) */}
                    <div className="hidden print:flex fixed inset-0 items-center justify-center pointer-events-none z-0 opacity-10">
                        <img 
                            src="/LogoApp.jpg" 
                            alt="UNIGIS Watermark" 
                            className="w-[500px] h-[500px] object-contain" 
                        />
                    </div>

                    {/* Cabecera de impresión (sólo visible al imprimir) */}
                    <div className="hidden print:flex items-center justify-between border-b border-zinc-300 pb-4 mb-6 z-10">
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-black uppercase tracking-wide text-zinc-900">
                                {sessionNameInput || "Flujo sin nombre"}
                            </h1>
                            <p className="text-xs text-zinc-500 mt-1 font-semibold">
                                Proyecto: {projects.find(p => p.id === selectedProjectId)?.name || ""}
                            </p>
                        </div>
                        {clientLogo ? (
                            <img 
                                src={clientLogo} 
                                alt="Logo Cliente" 
                                className="max-h-16 object-contain" 
                            />
                        ) : (
                            <div className="h-16" />
                        )}
                    </div>
                    
                    {/* Toolbar */}
                    <div className="h-14 border-b border-zinc-800 px-6 flex items-center justify-between bg-zinc-900/40 shrink-0 print:hidden">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                                <FileCode className="w-4 h-4 text-red-500" />
                                <span>UniVisio</span>
                                {isDirty && <span className="text-xs text-amber-500 ml-2 font-normal italic">* Cambios sin guardar</span>}
                            </div>
                            <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all",
                                        viewMode === 'table'
                                            ? "bg-red-600 text-white shadow"
                                            : "text-zinc-400 hover:text-zinc-200"
                                    )}
                                >
                                    <span>📋 Tabla</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('narrative')}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all",
                                        viewMode === 'narrative'
                                            ? "bg-red-600 text-white shadow"
                                            : "text-zinc-400 hover:text-zinc-200"
                                    )}
                                >
                                    <span>📄 Relato</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('consolidator')}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all",
                                        viewMode === 'consolidator'
                                            ? "bg-red-600 text-white shadow"
                                            : "text-zinc-400 hover:text-zinc-200"
                                    )}
                                >
                                    <span>🧩 Consolidador</span>
                                </button>
                            </div>
                        </div>
                        {tableRows.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowSaveModal(true)}
                                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Guardar Progreso</span>
                                </button>
                                <button
                                    onClick={exportCSV}
                                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-red-500/20"
                                    title="Exportar CSV"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>CSV</span>
                                </button>
                                <button
                                    onClick={exportMarkdown}
                                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-red-500/20"
                                    title="Exportar MD"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>MD</span>
                                </button>
                                <button
                                    onClick={exportExcel}
                                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-red-500/20"
                                    title="Exportar Excel"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Excel</span>
                                </button>
                                <button
                                    onClick={triggerPrintPDF}
                                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-red-500/20"
                                    title="Exportar PDF"
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>PDF</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Table workspace */}
                    <div className="flex-1 overflow-auto p-6 custom-scrollbar print:p-0">
                        {viewMode === 'consolidator' ? (
                            <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[400px]">
                                {/* Left column: Session selector and order */}
                                <div className="w-full lg:w-80 shrink-0 bg-zinc-900/40 border border-zinc-850 rounded-xl p-5 flex flex-col gap-5">
                                    <div>
                                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-1.5 flex items-center gap-1.5">
                                            <span>1. Seleccionar Flujos</span>
                                        </h3>
                                        <div className="flex flex-col gap-2 mt-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                            {sessions.length === 0 ? (
                                                <div className="text-xs text-zinc-500 italic">No hay sesiones guardadas en este proyecto.</div>
                                            ) : (
                                                sessions.map(s => {
                                                    const isSelected = selectedSessionIds.includes(s.id);
                                                    return (
                                                        <label key={s.id} className="flex items-start gap-2.5 p-2 bg-zinc-950/20 border border-zinc-850 hover:border-zinc-800 rounded-lg cursor-pointer transition-colors text-xs">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isSelected}
                                                                onChange={() => toggleSessionSelection(s.id)}
                                                                className="mt-0.5 rounded accent-red-500 text-zinc-950 border-zinc-800"
                                                            />
                                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                                <span className="font-semibold text-zinc-200 truncate">{s.sessionName}</span>
                                                                <span className="text-[10px] text-zinc-500 truncate">{s.fileName}</span>
                                                            </div>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-1.5">
                                            <span>2. Secuencia de Flujos</span>
                                        </h3>
                                        <div className="flex flex-col gap-2 mt-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                            {selectedSessionIds.length === 0 ? (
                                                <div className="text-xs text-zinc-500 italic py-2 text-center border border-dashed border-zinc-800 rounded-lg">
                                                    Ningún flujo seleccionado.
                                                </div>
                                            ) : (
                                                selectedSessionIds.map((id, idx) => {
                                                    const s = sessions.find(sess => sess.id === id);
                                                    return (
                                                        <div key={id} className="flex items-center justify-between gap-3 p-2.5 bg-zinc-950/40 border border-zinc-800 rounded-lg text-xs">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                                                    {idx + 1}
                                                                </span>
                                                                <span className="font-semibold text-zinc-200 truncate">{s?.sessionName || 'Sesión'}</span>
                                                            </div>
                                                            <div className="flex gap-1 shrink-0">
                                                                <button 
                                                                    onClick={() => moveSessionInOrder(idx, 'up')}
                                                                    className="p-1 border border-zinc-800 bg-zinc-950 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
                                                                    disabled={idx === 0}
                                                                >
                                                                    <ArrowUp className="w-3 h-3" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => moveSessionInOrder(idx, 'down')}
                                                                    className="p-1 border border-zinc-800 bg-zinc-950 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
                                                                    disabled={idx === selectedSessionIds.length - 1}
                                                                >
                                                                    <ArrowDown className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right column: Preview and actions */}
                                <div className="flex-1 flex flex-col gap-4 bg-zinc-900/20 border border-zinc-850 rounded-xl p-5 min-w-0">
                                    <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 shrink-0">
                                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                                            <span>3. Vista Previa y Ordenación de Pasos</span>
                                        </h3>
                                        <span className="text-[10px] bg-zinc-950 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono font-semibold">
                                            {consolidatorSteps.length} Pasos
                                        </span>
                                    </div>

                                    <div className="flex-1 overflow-auto custom-scrollbar border border-zinc-850/80 rounded-xl bg-zinc-950/20">
                                        {consolidatorSteps.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-48 text-center text-zinc-500 p-8 select-none">
                                                <Network className="w-8 h-8 text-zinc-700 mb-2" />
                                                <div className="text-xs font-semibold text-zinc-400">Sin pasos para mostrar</div>
                                                <p className="text-[10px] text-zinc-600 mt-1 max-w-xs">Selecciona y ordena flujos de la izquierda para generar la vista previa consolidada.</p>
                                            </div>
                                        ) : (
                                            <table className="min-w-full divide-y divide-zinc-800 text-xs">
                                                <thead className="bg-zinc-950/60 text-zinc-400 uppercase tracking-widest text-[9px] sticky top-0 backdrop-blur-md">
                                                    <tr>
                                                        <th className="px-3 py-3 text-center w-12">Paso</th>
                                                        <th className="px-3 py-3 text-left w-32">Fase</th>
                                                        <th className="px-3 py-3 text-left">Título / Actor</th>
                                                        <th className="px-3 py-3 text-left w-32">Flujo Origen</th>
                                                        <th className="px-3 py-3 text-center w-24">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-800/40 text-[11px]">
                                                    {consolidatorSteps.map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-zinc-900/10 transition-colors">
                                                            <td className="px-3 py-2.5 text-center font-bold text-red-400 font-mono">
                                                                {row.step}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-zinc-400 font-mono text-[10px] uppercase truncate max-w-[120px]" title={row.phase}>
                                                                {row.phase}
                                                            </td>
                                                            <td className="px-3 py-2.5 min-w-0">
                                                                <div className="font-bold text-zinc-200 truncate uppercase" title={row.title}>{row.title}</div>
                                                                <div className="text-[10px] text-zinc-500 italic truncate" title={row.actor}>{row.actor}</div>
                                                            </td>
                                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                                <span className="bg-red-500/10 text-red-300 border border-red-500/20 text-[9px] px-1.5 py-0.5 rounded font-semibold max-w-[120px] truncate block" title={row._sourceSessionName}>
                                                                    {row._sourceSessionName}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                                                <div className="flex justify-center gap-1">
                                                                    <button 
                                                                        onClick={() => movePreviewStep(idx, 'up')}
                                                                        className="p-1 border border-zinc-800 bg-zinc-950 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
                                                                        disabled={idx === 0}
                                                                        title="Subir paso"
                                                                    >
                                                                        <ArrowUp className="w-3 h-3" />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => movePreviewStep(idx, 'down')}
                                                                        className="p-1 border border-zinc-800 bg-zinc-950 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
                                                                        disabled={idx === consolidatorSteps.length - 1}
                                                                        title="Bajar paso"
                                                                    >
                                                                        <ArrowDown className="w-3 h-3" />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => removePreviewStep(idx)}
                                                                        className="p-1 border border-zinc-800 bg-zinc-950 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-500 ml-1"
                                                                        title="Excluir paso de la consolidación"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>

                                    {consolidatorSteps.length > 0 && (
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-zinc-950/60 border border-zinc-850 rounded-xl shrink-0">
                                            <div className="text-xs text-zinc-400">
                                                Se consolidarán <span className="text-red-400 font-bold">{consolidatorSteps.length}</span> pasos en total, de <span className="text-zinc-200 font-semibold">{selectedSessionIds.length}</span> flujos.
                                            </div>
                                            <button
                                                onClick={applyConsolidation}
                                                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-red-600/10"
                                            >
                                                <RefreshCw className="w-4 h-4 shrink-0" />
                                                <span>Compilar y Cargar en Editor</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (tableRows.length > 0 || draftRows.length > 0) ? (
                            <div className="flex flex-col gap-8 w-full">
                                {draftRows.length > 0 && (
                                    <div className={cn("border rounded-xl p-4 md:p-6 shadow-xl", isLight ? "border-amber-400 bg-amber-50" : "border-amber-500/30 bg-amber-950/20")}>
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                                            <div>
                                                <h3 className={cn("font-bold text-lg", isLight ? "text-amber-800" : "text-amber-500")}>Lote en Borrador (Pendiente de Revisión)</h3>
                                                <p className={cn("text-xs mt-1", isLight ? "text-amber-700" : "text-amber-400/80")}>Revisa y ajusta estos pasos antes de integrarlos al Relato principal.</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2 shrink-0">
                                                <button onClick={discardDraftBatch} className={cn("px-4 py-2 rounded-lg text-xs font-semibold transition-colors", isLight ? "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50" : "bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800")}>
                                                    Descartar Lote
                                                </button>
                                                <button onClick={approveDraftBatch} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-lg text-xs font-bold transition-colors shadow-lg hover:shadow-amber-500/20 flex items-center gap-2">
                                                    <CheckCircle className="w-4 h-4" />
                                                    Aprobar e Integrar
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className={cn("overflow-x-auto min-w-full border rounded-lg", isLight ? "border-amber-200 bg-white" : "border-amber-500/20 bg-zinc-950/50")}>
                                            <table className={cn("min-w-full divide-y text-xs", isLight ? "divide-amber-200" : "divide-amber-500/20")}>
                                                <thead className={cn("uppercase tracking-widest text-[9px]", isLight ? "bg-amber-100/50 text-amber-800" : "bg-amber-500/10 text-amber-400")}>
                                                    <tr>
                                                        <th className="px-3 py-3 font-semibold text-left">Paso</th>
                                                        <th className="px-3 py-3 font-semibold text-left">Título</th>
                                                        <th className="px-3 py-3 font-semibold text-left">Actor</th>
                                                        <th className="px-3 py-3 font-semibold text-left">Evento</th>
                                                        <th className="px-3 py-3 font-semibold text-left">Descripción Operativa</th>
                                                    </tr>
                                                </thead>
                                                <tbody className={cn("divide-y", isLight ? "divide-amber-100" : "divide-amber-500/10")}>
                                                    {draftRows.map((row, idx) => (
                                                        <tr key={idx} className={isLight ? "hover:bg-amber-50/50" : "hover:bg-amber-500/5"}>
                                                            <td className="px-3 py-2 text-center font-bold">{row.step}</td>
                                                            <td className="px-3 py-2"><input value={row.title} onChange={(e) => { const newD = [...draftRows]; newD[idx].title = e.target.value; setDraftRows(newD); }} className="w-full bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none" /></td>
                                                            <td className="px-3 py-2"><input value={row.actor} onChange={(e) => { const newD = [...draftRows]; newD[idx].actor = e.target.value; setDraftRows(newD); }} className="w-full bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none" /></td>
                                                            <td className="px-3 py-2"><input value={row.event} onChange={(e) => { const newD = [...draftRows]; newD[idx].event = e.target.value; setDraftRows(newD); }} className="w-full bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none" /></td>
                                                            <td className="px-3 py-2"><textarea value={row.operativeDesc} onChange={(e) => { const newD = [...draftRows]; newD[idx].operativeDesc = e.target.value; setDraftRows(newD); }} className="w-full bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none resize-y min-h-[40px] text-xs" /></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                                
                                {tableRows.length > 0 && (
                                    viewMode === 'table' ? (
                                        <div className={cn("overflow-x-auto min-w-full border rounded-xl print:border-none", isLight ? "border-zinc-200 bg-white" : "border-zinc-800/80 bg-zinc-900/10")}>
                                    <table className={cn("min-w-full divide-y text-xs print:divide-zinc-400", isLight ? "divide-zinc-200" : "divide-zinc-800")}>
                                        <thead className={cn("uppercase tracking-widest text-[9px] print:bg-zinc-100 print:text-zinc-700", isLight ? "bg-zinc-50 text-zinc-600 border-b border-zinc-200" : "bg-zinc-900/60 text-zinc-400")}>
                                            <tr>
                                                <th className="px-2 py-3 font-semibold text-center w-12 print:hidden">#</th>
                                                <th className="px-2 py-3 font-semibold text-center w-10">Paso</th>
                                                <th className="px-3 py-3 font-semibold text-left w-36">Fase</th>
                                                <th className="px-3 py-3 font-semibold text-left w-[50ch] min-w-[400px]">Evento / Transición</th>
                                                <th className="px-4 py-3 font-semibold text-left w-[50ch] min-w-[400px]">Descripción Operativa</th>
                                                <th className="px-3 py-3 font-semibold text-left">Origen</th>
                                                <th className="px-3 py-3 font-semibold text-left">Destino</th>
                                                <th className="px-2 py-3 font-semibold text-center w-20">Acción</th>
                                                <th className="px-3 py-3 font-semibold text-left w-20">Ref. Interfaz</th>
                                                <th className="px-2 py-3 font-semibold text-center w-10 print:hidden"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/50 print:divide-zinc-300">
                                            {(() => {
                                                let lastPhase = '';
                                                return tableRows.map((row, idx) => {
                                                    const renderPhaseHeader = row.phase && row.phase !== lastPhase;
                                                    if (renderPhaseHeader) {
                                                        lastPhase = row.phase;
                                                    }

                                                    const phaseSteps = tableRows.filter(r => r.phase === row.phase);
                                                    const firstStep = phaseSteps[0]?.step;
                                                    const lastStep = phaseSteps[phaseSteps.length - 1]?.step;
                                                    const rangeText = firstStep && lastStep ? `(Pasos ${firstStep}–${lastStep})` : '';

                                                    return (
                                                        <React.Fragment key={idx}>
                                                            {renderPhaseHeader && (
                                                                <tr className={cn("border-y", isLight ? "bg-red-50/80 border-zinc-200" : "bg-red-950/25 border-zinc-800/80")}>
                                                                    <td colSpan={10} className={cn("px-4 py-2.5 font-black tracking-wider text-[10px] uppercase font-sans", isLight ? "text-red-700" : "text-red-400")}>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                                                                            <span>{row.phase}</span>
                                                                            <span className="text-zinc-500 font-normal normal-case ml-2">{rangeText}</span>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                            <tr 
                                                                onClick={() => setActiveRowIndex(idx)}
                                                                className={cn(
                                                                    "transition-colors",
                                                                    activeRowIndex === idx 
                                                                        ? (isLight ? "bg-red-50" : "bg-red-500/5")
                                                                        : (isLight ? "hover:bg-zinc-50" : "hover:bg-zinc-900/30"),
                                                                    row.needsReview ? (isLight ? "bg-amber-50" : "bg-amber-950/15") : "",
                                                                    "print:bg-transparent"
                                                                )}
                                                            >
                                                                <td className="px-2 py-3 text-center align-middle whitespace-nowrap print:hidden">
                                                                    <div className="flex flex-col gap-1 items-center">
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); moveRow(idx, 'up'); }}
                                                                            className="text-zinc-600 hover:text-zinc-300 p-0.5"
                                                                            disabled={idx === 0}
                                                                        >
                                                                            <ArrowUp className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); moveRow(idx, 'down'); }}
                                                                            className="text-zinc-600 hover:text-zinc-300 p-0.5"
                                                                            disabled={idx === tableRows.length - 1}
                                                                        >
                                                                            <ArrowDown className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </td>

                                                                <td className={cn("px-2 py-3 text-center font-bold align-middle", isLight ? "text-zinc-700" : "text-zinc-300")}>
                                                                    <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                                        {row.needsReview && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 print:hidden" />}
                                                                        <StepPositionInput 
                                                                            step={row.step} 
                                                                            max={tableRows.length} 
                                                                            onMove={(newStep) => moveRowToPosition(idx, newStep)} 
                                                                            isLight={isLight}
                                                                        />
                                                                    </div>
                                                                </td>

                                                                <td className="px-3 py-3 align-middle">
                                                                    <input 
                                                                        type="text" 
                                                                        value={row.phase}
                                                                        onChange={(e) => handleCellChange(idx, 'phase', e.target.value)}
                                                                        className={cn("bg-transparent border-none w-full focus:ring-1 focus:ring-red-500 rounded p-1", isLight ? "text-zinc-800 focus:bg-zinc-100" : "text-zinc-200 focus:bg-zinc-900")}
                                                                    />
                                                                </td>

                                                                <td className="px-3 py-3 align-middle">
                                                                    <input 
                                                                        type="text" 
                                                                        value={row.event}
                                                                        size={50}
                                                                        onChange={(e) => handleCellChange(idx, 'event', e.target.value)}
                                                                        className={cn("bg-transparent border-none w-full focus:ring-1 focus:ring-red-500 rounded p-1", isLight ? "text-zinc-800 focus:bg-zinc-100" : "text-zinc-200 focus:bg-zinc-900")}
                                                                    />
                                                                </td>

                                                                <td className="px-4 py-3 align-middle">
                                                                    <textarea 
                                                                        rows={2}
                                                                        value={row.operativeDesc || ''}
                                                                        onChange={(e) => handleCellChange(idx, 'operativeDesc', e.target.value)}
                                                                        className={cn("bg-transparent border-none w-full focus:ring-1 focus:ring-red-500 rounded p-1 resize-y min-h-[40px]", isLight ? "text-zinc-800 focus:bg-zinc-100" : "text-zinc-200 focus:bg-zinc-900")}
                                                                    />
                                                                </td>

                                                                <td className="px-3 py-3 align-middle">
                                                                    <input 
                                                                        type="text" 
                                                                        value={row.origin}
                                                                        list="available-states"
                                                                        onChange={(e) => handleCellChange(idx, 'origin', e.target.value)}
                                                                        className={cn("bg-transparent border-none w-full focus:ring-1 focus:ring-red-500 rounded p-1", isLight ? "text-zinc-800 focus:bg-zinc-100" : "text-zinc-200 focus:bg-zinc-900")}
                                                                    />
                                                                </td>

                                                                <td className="px-3 py-3 align-middle">
                                                                    <input 
                                                                        type="text" 
                                                                        value={row.destination}
                                                                        list="available-states"
                                                                        onChange={(e) => handleCellChange(idx, 'destination', e.target.value)}
                                                                        className={cn("bg-transparent border-none w-full focus:ring-1 focus:ring-red-500 rounded p-1", isLight ? "text-zinc-800 focus:bg-zinc-100" : "text-zinc-200 focus:bg-zinc-900")}
                                                                    />
                                                                </td>

                                                                <td className="px-2 py-3 text-center align-middle whitespace-nowrap">
                                                                    <input 
                                                                        type="text" 
                                                                        value={row.actionType}
                                                                        onChange={(e) => handleCellChange(idx, 'actionType', e.target.value)}
                                                                        className={cn("bg-transparent border-none w-full focus:ring-1 focus:ring-red-500 rounded p-1", isLight ? "text-zinc-800 focus:bg-zinc-100" : "text-zinc-200 focus:bg-zinc-900")}
                                                                    />
                                                                </td>

                                                                <td className="px-3 py-3 align-middle">
                                                                    <input 
                                                                        type="text" 
                                                                        value={row.interfaceRefs?.map(i => i.num).join(', ') || ''}
                                                                        onChange={(e) => handleInterfaceRefsChange(idx, e.target.value)}
                                                                        placeholder="Ej: 4"
                                                                        className={cn("bg-transparent border-none w-full focus:ring-1 focus:ring-red-500 rounded p-1", isLight ? "text-zinc-800 focus:bg-zinc-100" : "text-zinc-200 focus:bg-zinc-900")}
                                                                    />
                                                                </td>

                                                                <td className="px-2 py-3 text-center align-middle print:hidden">
                                                                    <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                                        <button 
                                                                            onClick={() => handleDuplicateRow(idx)}
                                                                            className="text-zinc-500 hover:text-red-500 transition-colors"
                                                                            title="Duplicar paso"
                                                                        >
                                                                            <Copy className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleInsertRow(idx)}
                                                                            className="text-zinc-500 hover:text-red-500 transition-colors"
                                                                            title="Insertar paso después"
                                                                        >
                                                                            <Plus className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleDeleteRow(idx)}
                                                                            className="text-zinc-500 hover:text-red-500 transition-colors"
                                                                            title="Eliminar paso"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </React.Fragment>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-16">
                                    <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto w-full print:max-w-full">
                                        {tableRows.map((row, idx) => (
                                            <div 
                                                key={idx}
                                                onClick={() => setActiveRowIndex(idx)}
                                                className={cn(
                                                    "border rounded-xl transition-all shadow-xl backdrop-blur-sm relative overflow-hidden flex flex-col",
                                                    activeRowIndex === idx 
                                                        ? (isLight ? "border-red-500 bg-white ring-1 ring-red-500/25 text-zinc-800" : "border-red-500 bg-zinc-900/80 ring-1 ring-red-500/25 text-zinc-100") 
                                                        : (isLight ? "border-zinc-200 bg-zinc-50/60 hover:border-zinc-300 hover:bg-white text-zinc-800" : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60 text-zinc-100"),
                                                    row.needsReview ? (isLight ? "border-amber-500/30 bg-amber-50/20" : "border-amber-500/40 bg-amber-950/5") : ""
                                                )}
                                            >
                                                {/* Header */}
                                                <div className={cn("px-5 py-4 border-b flex justify-between items-start gap-4", isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-950/20 border-zinc-800")}>
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                                <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md flex items-center gap-1.5">
                                                                    <span>PASO</span>
                                                                    <StepPositionInput 
                                                                        step={row.step} 
                                                                        max={tableRows.length} 
                                                                        onMove={(newStep) => moveRowToPosition(idx, newStep)} 
                                                                        isLight={isLight}
                                                                    />
                                                                </span>
                                                            </div>
                                                            {row.isLoop && (
                                                                <span className="bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                    🔄 Bucle {row.loopNote ? `(${row.loopNote})` : ''}
                                                                </span>
                                                            )}
                                                            {row.phase && (
                                                                <span className={cn("text-[10px] px-2 py-0.5 rounded-md uppercase font-semibold tracking-wider font-mono", isLight ? "bg-zinc-200 text-zinc-700" : "bg-zinc-800 text-zinc-400")}>
                                                                    {row.phase}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col gap-1 mt-1">
                                                            <input 
                                                                type="text"
                                                                value={row.title || ''}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (activeRowIndex !== idx) setActiveRowIndex(idx);
                                                                }}
                                                                onChange={(e) => handleCellChange(idx, 'title', e.target.value)}
                                                                placeholder="Título del paso"
                                                                className={cn("text-sm font-black uppercase tracking-wide bg-transparent border-none w-full focus:ring-1 focus:ring-red-500 rounded p-1 print:hidden", isLight ? "text-zinc-800 focus:bg-zinc-100" : "text-zinc-100 focus:bg-zinc-900")}
                                                            />
                                                            <div className="hidden print:block text-sm font-black uppercase tracking-wide text-black px-1">
                                                                {row.title || 'Paso sin título'}
                                                            </div>
                                                            <input 
                                                                type="text"
                                                                value={row.subtitle || ''}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (activeRowIndex !== idx) setActiveRowIndex(idx);
                                                                }}
                                                                onChange={(e) => handleCellChange(idx, 'subtitle', e.target.value)}
                                                                placeholder="Subtítulo o descripción corta"
                                                                className={cn("text-xs italic bg-transparent border-none w-full focus:ring-1 focus:ring-red-500 rounded p-1 print:hidden", isLight ? "text-zinc-500 focus:bg-zinc-100" : "text-zinc-450 focus:bg-zinc-900")}
                                                            />
                                                            {row.subtitle && (
                                                                <div className="hidden print:block text-[11px] italic text-zinc-500 px-1">
                                                                    {row.subtitle}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 print:hidden">
                                                                                        <button 
                                                                                            onClick={(e) => { e.stopPropagation(); moveRow(idx, 'up'); }}
                                                                                            className={cn("p-1 border rounded-lg disabled:opacity-40", isLight ? "border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600" : "border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300")}
                                                                                            disabled={idx === 0}
                                                                                            title="Subir paso"
                                                                                        >
                                                                                            <ArrowUp className="w-3.5 h-3.5" />
                                                                                        </button>
                                                                                        <button 
                                                                                            onClick={(e) => { e.stopPropagation(); moveRow(idx, 'down'); }}
                                                                                            className={cn("p-1 border rounded-lg disabled:opacity-40", isLight ? "border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600" : "border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300")}
                                                                                            disabled={idx === tableRows.length - 1}
                                                                                            title="Bajar paso"
                                                                                        >
                                                                                            <ArrowDown className="w-3.5 h-3.5" />
                                                                                        </button>
                                                                                        <button 
                                                                                            onClick={(e) => { e.stopPropagation(); handleDuplicateRow(idx); }}
                                                                                            className={cn("p-1 border rounded-lg ml-2", isLight ? "border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600" : "border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300")}
                                                                                            title="Duplicar paso"
                                                                                        >
                                                                                            <Copy className="w-3.5 h-3.5" />
                                                                                        </button>
                                                                                        <button 
                                                                                            onClick={(e) => { e.stopPropagation(); handleInsertRow(idx); }}
                                                                                            className={cn("p-1 border rounded-lg", isLight ? "border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600" : "border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300")}
                                                                                            title="Insertar paso después"
                                                                                        >
                                                                                            <Plus className="w-3.5 h-3.5" />
                                                                                        </button>
                                                                                        <button 
                                                                                            onClick={(e) => { e.stopPropagation(); handleDeleteRow(idx); }}
                                                                                            className={cn("p-1 border rounded-lg", isLight ? "border-zinc-200 bg-white hover:bg-red-50 text-zinc-400 hover:text-red-500" : "border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900 text-zinc-500 hover:text-red-500")}
                                                                                            title="Eliminar paso"
                                                                                        >
                                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                                        </button>
                                                                                    </div>
                                                </div>

                                                {/* Card body in a structured key-value grid */}
                                                <div className={cn("grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x text-xs", isLight ? "divide-zinc-200" : "divide-zinc-800")}>
                                                    
                                                    {/* Left column: Systems and state changes */}
                                                    <div className="p-5 flex flex-col gap-4 col-span-2">
                                                        <div>
                                                            <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1.5">Sistemas Involucrados</div>
                                                            <input 
                                                                type="text"
                                                                value={row.systems || ''}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (activeRowIndex !== idx) setActiveRowIndex(idx);
                                                                }}
                                                                onChange={(e) => handleCellChange(idx, 'systems', e.target.value)}
                                                                placeholder="Sistemas involucrados"
                                                                className={cn("border rounded-lg px-3 py-1.5 text-xs w-full focus:ring-1 focus:ring-red-500 focus:outline-none print:hidden", isLight ? "text-zinc-800 bg-white border-zinc-200" : "text-zinc-200 bg-zinc-950/40 border-zinc-800/60")}
                                                            />
                                                            <div className="hidden print:block text-xs font-semibold text-zinc-850 bg-zinc-50 border border-zinc-200 rounded px-2.5 py-1">
                                                                {row.systems || 'N/A'}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1.5">Cambios de Estado</div>
                                                            <div className={cn("flex flex-col gap-1.5 border rounded-lg p-3", isLight ? "bg-white border-zinc-200" : "bg-zinc-950/40 border-zinc-800/60")}>
                                                                {row.stateChanges && row.stateChanges.length > 0 ? (
                                                                    row.stateChanges.map((sc, scIdx) => (
                                                                        <div key={scIdx} className={cn("flex items-center gap-2 font-mono text-[11px]", isLight ? "text-zinc-700" : "text-zinc-300")}>
                                                                            <span className={cn("px-1.5 py-0.5 rounded font-semibold", isLight ? "bg-red-50 text-red-600 border border-red-100" : "bg-zinc-800 text-red-400")}>{sc.entity}</span>
                                                                            <span className={isLight ? "text-zinc-400" : "text-zinc-500"}>{sc.from || 'INICIO'}</span>
                                                                            <span className={isLight ? "text-red-600" : "text-red-500"}>➔</span>
                                                                            <span className={isLight ? "text-green-600 font-semibold" : "text-green-400 font-medium"}>{sc.to}</span>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="text-zinc-500 italic text-[11px]">Sin cambios de estado de entidades</div>
                                                                )}

                                                                {row.conditionalPaths && row.conditionalPaths.length > 0 && (
                                                                    <div className={cn("mt-2 pt-2 border-t flex flex-col gap-1", isLight ? "border-zinc-200" : "border-zinc-800/60")}>
                                                                        {row.conditionalPaths.map((cp, cpIdx) => (
                                                                            <div key={cpIdx} className={cn("flex items-start gap-1.5 text-[11px]", isLight ? "text-zinc-600" : "text-zinc-400")}>
                                                                                <span className="text-red-500 font-bold uppercase text-[9px] mt-0.5">SI</span>
                                                                                <span>{cp.condition} ➔ <span className={isLight ? "text-red-600 font-semibold" : "text-red-300 font-semibold"}>{cp.action}</span></span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Right column: Data origin/destination and action type */}
                                                    <div className="p-5 flex flex-col gap-4">
                                                        <div>
                                                            <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1.5">Origen / Destino Datos</div>
                                                            <div className={cn("flex flex-col gap-1 p-2 border rounded-lg", isLight ? "bg-white border-zinc-200" : "bg-zinc-950/40 border-zinc-800/60")}>
                                                                <div className="flex items-center gap-1">
                                                                    <span className={isLight ? "text-zinc-400 text-[10px] uppercase font-semibold w-8 shrink-0" : "text-zinc-500 text-[10px] uppercase font-semibold w-8 shrink-0"}>De:</span>
                                                                    <input 
                                                                        type="text"
                                                                        value={row.origin || ''}
                                                                        list="available-states"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (activeRowIndex !== idx) setActiveRowIndex(idx);
                                                                        }}
                                                                        onChange={(e) => handleCellChange(idx, 'origin', e.target.value)}
                                                                        placeholder="Origen"
                                                                        className={cn("bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-red-500 rounded px-1.5 py-0.5 print:hidden", isLight ? "text-zinc-800 focus:bg-zinc-100" : "text-zinc-200 focus:bg-zinc-900")}
                                                                    />
                                                                    <span className="hidden print:inline text-xs text-zinc-850 font-medium truncate">{row.origin || 'N/A'}</span>
                                                                </div>
                                                                <div className={cn("border-t", isLight ? "border-zinc-100" : "border-zinc-800/45")}></div>
                                                                <div className="flex items-center gap-1">
                                                                    <span className={isLight ? "text-zinc-400 text-[10px] uppercase font-semibold w-8 shrink-0" : "text-zinc-500 text-[10px] uppercase font-semibold w-8 shrink-0"}>A:</span>
                                                                    <input 
                                                                        type="text"
                                                                        value={row.destination || ''}
                                                                        list="available-states"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (activeRowIndex !== idx) setActiveRowIndex(idx);
                                                                        }}
                                                                        onChange={(e) => handleCellChange(idx, 'destination', e.target.value)}
                                                                        placeholder="Destino"
                                                                        className={cn("bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-red-500 rounded px-1.5 py-0.5 print:hidden", isLight ? "text-zinc-800 focus:bg-zinc-100" : "text-zinc-200 focus:bg-zinc-900")}
                                                                    />
                                                                    <span className="hidden print:inline text-xs text-zinc-850 font-medium truncate">{row.destination || 'N/A'}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1.5">Tipo de Acción</div>
                                                            <div className={cn("flex items-center gap-1 border px-2.5 py-1 rounded-lg print:border-none print:p-0", isLight ? "bg-white border-zinc-200 text-zinc-800" : "bg-zinc-950/40 border-zinc-800/60 text-zinc-200")}>
                                                                <span className="text-xs shrink-0">
                                                                    {row.actionType?.toLowerCase().includes('humana') || row.actionType === 'H' ? '👤' : 
                                                                     row.actionType?.toLowerCase().includes('autom') || row.actionType === 'A' ? '⚙️' : '🔌'}
                                                                </span>
                                                                <select
                                                                    value={row.actionType || 'H'}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (activeRowIndex !== idx) setActiveRowIndex(idx);
                                                                    }}
                                                                    onChange={(e) => handleCellChange(idx, 'actionType', e.target.value)}
                                                                    className={cn("bg-transparent border-none w-full text-xs font-semibold focus:ring-1 focus:ring-red-500 rounded p-0.5 focus:outline-none cursor-pointer print:hidden", isLight ? "text-zinc-850" : "text-zinc-200")}
                                                                >
                                                                    <option value="H">Humana (👤)</option>
                                                                    <option value="A">Automática (⚙️)</option>
                                                                    <option value="I">Integración (🔌)</option>
                                                                </select>
                                                                <span className="hidden print:inline text-xs font-semibold text-zinc-850 ml-1">
                                                                    {row.actionType === 'H' ? 'Humana' : row.actionType === 'A' ? 'Automática' : 'Integración'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                </div>

                                                {/* Operative Description (Bottom row) */}
                                                <div className={cn("px-5 py-4 border-t text-xs leading-relaxed", isLight ? "bg-zinc-50/50 border-zinc-200 text-zinc-700" : "bg-zinc-950/20 border-zinc-800 text-zinc-300")}>
                                                    <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1.5">Descripción Operativa</div>
                                                    <textarea 
                                                        rows={3}
                                                        value={row.operativeDesc || ''}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (activeRowIndex !== idx) setActiveRowIndex(idx);
                                                        }}
                                                        onChange={(e) => handleCellChange(idx, 'operativeDesc', e.target.value)}
                                                        placeholder="Describe detalladamente lo que ocurre en este paso..."
                                                        className={cn("border p-3.5 rounded-xl font-sans shadow-inner italic w-full focus:ring-1 focus:ring-red-500 focus:outline-none resize-y print:hidden", isLight ? "bg-white border-zinc-200 text-zinc-800" : "bg-zinc-950/40 border-zinc-800/60 text-zinc-200")}
                                                    />
                                                    <div className="hidden print:block font-sans italic text-xs text-zinc-800 whitespace-pre-wrap pl-1">
                                                        {row.operativeDesc || 'Sin descripción operativa.'}
                                                    </div>
                                                </div>

                                            </div>
                                        ))}
                                    </div>

                                    {/* Closing Artifacts Section */}
                                    <div className="mt-12 max-w-4xl mx-auto w-full flex flex-col gap-10 border-t border-zinc-800/80 pt-10">
                                        
                                        {/* 1. Entity State Matrix */}
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-1.5 rounded-lg">
                                                    <Network className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black tracking-widest text-zinc-100 uppercase">Matriz Completa de Estados por Entidad</h3>
                                                    <p className="text-[10px] text-zinc-400">Ciclo de vida y secuencias de transición de estados por cada objeto de negocio</p>
                                                </div>
                                            </div>

                                            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4 font-sans text-xs">
                                                {Object.keys(entityStateMatrix).length > 0 ? (
                                                    <div className="flex flex-col gap-4 divide-y divide-zinc-800/60">
                                                        {Object.entries(entityStateMatrix).map(([entity, states]) => (
                                                            <div key={entity} className="flex flex-col md:flex-row md:items-center gap-3 pt-4 first:pt-0">
                                                                <div className="font-bold text-red-400 w-24 shrink-0 font-mono text-sm tracking-wider uppercase">
                                                                    {entity}
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono leading-relaxed">
                                                                    {states.map((st, sIdx) => (
                                                                        <React.Fragment key={sIdx}>
                                                                            {sIdx > 0 && <span className="text-zinc-600 font-sans font-bold">➔</span>}
                                                                            <span className={cn(
                                                                                "px-2 py-0.5 rounded border shadow-sm font-semibold",
                                                                                sIdx === 0 
                                                                                    ? "bg-blue-950/20 border-blue-900/40 text-blue-400"
                                                                                    : sIdx === states.length - 1
                                                                                        ? "bg-green-950/20 border-green-900/40 text-green-400"
                                                                                        : "bg-zinc-850 border-zinc-700/60 text-zinc-300"
                                                                            )}>
                                                                                {st}
                                                                            </span>
                                                                        </React.Fragment>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-zinc-500 italic text-center py-4">No se detectaron transiciones de estado en ningún paso. Escribe en el chat para asignarle estados.</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 2. Interface Registry */}
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-1.5 rounded-lg">
                                                    <FileCode className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black tracking-widest text-zinc-100 uppercase">Registro de Interfaces (Integraciones)</h3>
                                                    <p className="text-[10px] text-zinc-400">Catálogo general de puntos de integración y llamadas entre sistemas</p>
                                                </div>
                                            </div>

                                            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
                                                {interfaceRegistry.length > 0 ? (
                                                    <table className="min-w-full divide-y divide-zinc-800 text-xs">
                                                        <thead className="bg-zinc-950/40 text-[9px] font-black tracking-wider uppercase text-zinc-400">
                                                            <tr>
                                                                <th className="px-4 py-3 text-center w-12 border-r border-zinc-800/40">#</th>
                                                                <th className="px-4 py-3 text-left">Nombre de Interfaz</th>
                                                                <th className="px-4 py-3 text-left">Flujo de Integración</th>
                                                                <th className="px-4 py-3 text-left">Datos Transportados</th>
                                                                <th className="px-4 py-3 text-center w-24">Criticidad</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-zinc-800/50 text-[11px] font-sans">
                                                            {interfaceRegistry.map((item) => (
                                                                <tr key={item.num} className="hover:bg-zinc-900/10 transition-colors">
                                                                    <td className="px-4 py-3 text-center font-bold text-red-400 border-r border-zinc-800/40 font-mono">
                                                                        {item.num}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-zinc-200 font-semibold">
                                                                        {item.name}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-zinc-300 font-mono text-[10px]">
                                                                        {item.direction}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-zinc-400 font-mono text-[10px]">
                                                                        {item.data}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center align-middle">
                                                                        <span className={cn(
                                                                            "px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase border",
                                                                            item.criticality === 'CRÍTICA' 
                                                                                ? "bg-red-950/30 border-red-800/40 text-red-400" 
                                                                                : item.criticality === 'ALTA' 
                                                                                    ? "bg-orange-950/30 border-orange-850/40 text-orange-400"
                                                                                    : item.criticality === 'MEDIA'
                                                                                        ? "bg-yellow-950/30 border-yellow-850/40 text-yellow-500"
                                                                                        : "bg-blue-950/30 border-blue-900/40 text-blue-400"
                                                                        )}>
                                                                            {item.criticality}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <div className="text-zinc-500 italic text-center py-6 text-xs bg-zinc-900/10">No se encontraron referencias a integraciones o interfaces en este flujo.</div>
                                                )}
                                            </div>
                                        </div>
                                        
                                    </div>
                                </div>
                                    )
                                )}
                            </div>
                        ) : isImageMode && imagePreviewUrl ? (
                            <div className={cn("border rounded-xl p-6 md:p-8 font-sans flex flex-col gap-6", isLight ? "border-zinc-200 bg-white" : "border-zinc-800 bg-zinc-900/10")}>
                                <div className="flex items-center gap-3">
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-2 rounded-lg">
                                        <ImageIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className={cn("text-base font-bold", isLight ? "text-zinc-800" : "text-zinc-100")}>Compilar Diagrama de Flujo Visual</h3>
                                        <p className={cn("text-xs mt-0.5", isLight ? "text-zinc-500" : "text-zinc-400")}>
                                            El modelo Gemini analizará la estructura visual del diagrama y la transcribirá en una tabla estructurada de pasos.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                    {/* Left: Image preview & interactive zoom */}
                                    <div className="flex flex-col gap-2">
                                        <div className={cn("text-[10px] font-black uppercase tracking-widest", isLight ? "text-zinc-500" : "text-zinc-400")}>Vista Previa del Diagrama</div>
                                        <div className={cn("border rounded-lg overflow-hidden flex flex-col items-center justify-center p-4 relative group max-h-[350px] bg-zinc-950/20 border-zinc-800/60")}>
                                            <img src={imagePreviewUrl} alt="Preview" className="max-h-[300px] object-contain rounded shadow-md" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowFullImageModal(true)}
                                                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                                >
                                                    <Network className="w-3.5 h-3.5" />
                                                    <span>Ver tamaño completo</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Prompt input & Compile trigger */}
                                    <div className="flex flex-col gap-4">
                                        <div className="flex flex-col gap-2">
                                            <label className={cn("text-[10px] font-black uppercase tracking-widest", isLight ? "text-zinc-500" : "text-zinc-400")}>
                                                Pautas de compilación (Opcional)
                                            </label>
                                            <textarea
                                                value={imageInstruction}
                                                onChange={(e) => setImageInstruction(e.target.value)}
                                                disabled={isGenerating}
                                                placeholder="Ej. 'Identifica las swimlanes como actores', 'Ignora los pasos que tengan fondo amarillo', 'Agrupa los pasos en fases según la cabecera', etc."
                                                rows={4}
                                                className={cn(
                                                    "w-full text-xs p-3 rounded-lg border focus:ring-1 focus:ring-red-500 focus:outline-none resize-none transition-colors",
                                                    isLight 
                                                        ? "border-zinc-200 bg-white text-zinc-800 placeholder-zinc-400" 
                                                        : "border-zinc-800 bg-zinc-950/60 text-zinc-100 placeholder-zinc-500"
                                                )}
                                            />
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <button
                                                type="button"
                                                onClick={runImageAnalysis}
                                                disabled={isGenerating}
                                                className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-red-600/10 cursor-pointer"
                                            >
                                                {isGenerating ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Play className="w-4 h-4" />
                                                )}
                                                <span>{isGenerating ? 'Compilando...' : 'Iniciar Compilación de Imagen'}</span>
                                            </button>

                                            {isGenerating && (
                                                <div className="flex flex-col gap-1 mt-1">
                                                    <div className={cn("text-[11px] font-medium animate-pulse text-center", isLight ? "text-zinc-600" : "text-zinc-300")}>
                                                        {parsingStatus || 'Procesando diagrama con Gemini 2.5 Flash...'}
                                                    </div>
                                                    <div className={cn("text-[9px] text-center", isLight ? "text-zinc-400" : "text-zinc-500")}>
                                                        Esto puede tardar unos segundos dependiendo del tamaño y complejidad del diagrama.
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-80 border border-zinc-800/80 rounded-xl bg-zinc-900/10 p-12 text-center select-none">
                                <Network className="w-12 h-12 text-zinc-600 mb-4" />
                                <div className="text-zinc-300 font-medium">Carga un diagrama para comenzar</div>
                                <p className="text-xs text-zinc-500 max-w-sm mt-1.5 leading-relaxed">
                                    Extrae de forma precisa la topología de un archivo de Visio (.vsdx), SVG, o carga un diagrama en formato JPG/PNG para compilarlo con Gemini Vision.
                                </p>
                            </div>
                        )}

                        {/* Add Step row button */}
                        {tableRows.length > 0 && (
                            <button
                                onClick={handleAddRow}
                                className="mt-4 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors print:hidden"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Añadir Paso Manual</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Right panel: Copilot chat and doubts */}
                <div className={cn(
                    "border-l border-zinc-800 bg-zinc-900/40 flex flex-col min-h-0 shrink-0 print:hidden transition-all duration-300",
                    isCopilotCollapsed ? "w-12 items-center" : "w-96"
                )}>
                    {isCopilotCollapsed ? (
                        <div className="flex flex-col items-center gap-4 py-4 w-full h-full">
                            <button 
                                onClick={() => setIsCopilotCollapsed(false)} 
                                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center cursor-pointer"
                                title="Desplegar Copiloto"
                            >
                                <ChevronLeft className="w-5 h-5 text-red-500 animate-pulse" />
                            </button>
                            <div className="h-px w-8 bg-zinc-800" />
                            
                            <div className="flex flex-col items-center gap-6 mt-4">
                                <button
                                    onClick={() => setIsCopilotCollapsed(false)}
                                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors relative cursor-pointer"
                                    title="Ver Chat del Copiloto"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                                
                                {doubts.length > 0 && (
                                    <div 
                                        className="relative p-2 hover:bg-zinc-850 rounded-lg cursor-pointer flex items-center justify-center"
                                        onClick={() => setIsCopilotCollapsed(false)}
                                        title={`Hay ${doubts.length} dudas a clarificar`}
                                    >
                                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                        <span className="absolute -top-1 -right-1 bg-yellow-500 text-[8px] font-black text-zinc-950 w-4 h-4 rounded-full flex items-center justify-center border border-zinc-900">
                                            {doubts.length}
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 flex items-center justify-center select-none">
                                <span className="rotate-90 text-[10px] font-black uppercase tracking-widest text-zinc-600 whitespace-nowrap">
                                    Copiloto
                                </span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="h-14 border-b border-zinc-800 px-5 flex items-center justify-between bg-zinc-900/60 shrink-0">
                                <div className="flex items-center gap-2">
                                    <Network className="w-4 h-4 text-red-500" />
                                    <h2 className="text-sm font-semibold text-zinc-200">Copiloto de Procesos</h2>
                                </div>
                                <button 
                                    onClick={() => setIsCopilotCollapsed(true)} 
                                    className="p-1.5 hover:bg-zinc-850 rounded-md text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center cursor-pointer"
                                    title="Minimizar Copiloto"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Proactive Doubts Panel */}
                            {doubts.length > 0 && (
                                <div className="border-b border-zinc-800/80 p-4 max-h-48 overflow-y-auto flex flex-col gap-2 bg-zinc-950/20 custom-scrollbar">
                                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Dudas a Clarificar ({doubts.length})</div>
                                    <div className="flex flex-col gap-2">
                                        {doubts.map(d => (
                                            <div 
                                                key={d.id}
                                                onClick={() => {
                                                    if (d.nodeId) {
                                                        const rowIdx = tableRows.findIndex(r => r.linkedNodeId === d.nodeId);
                                                        if (rowIdx !== -1) setActiveRowIndex(rowIdx);
                                                    }
                                                }}
                                                className={cn(
                                                    "border px-2.5 py-2 rounded-lg text-[10px] cursor-pointer hover:brightness-110 flex items-start gap-2 transition-all",
                                                    d.severity === 'critical' 
                                                        ? "bg-red-950/20 border-red-950/50 text-red-400" 
                                                        : d.severity === 'medium'
                                                            ? "bg-yellow-950/20 border-yellow-950/50 text-yellow-500"
                                                            : "bg-blue-950/20 border-blue-950/50 text-blue-400"
                                                )}
                                            >
                                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                                <span className="leading-relaxed">{d.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Conversational Chat History */}
                            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                                {chatHistory.length === 0 ? (
                                    <div className="text-center my-auto px-6 select-none">
                                        <Network className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                                        <div className="text-xs font-semibold text-zinc-400">¿Tienes dudas o cambios?</div>
                                        <p className="text-[10px] text-zinc-500 leading-relaxed mt-1">
                                            Pregunta sobre ramificaciones o dile al copiloto que actualice la tabla en lenguaje natural.
                                        </p>
                                    </div>
                                ) : (
                                    chatHistory.map((msg, i) => (
                                        <div 
                                            key={i} 
                                            className={cn(
                                                "flex flex-col max-w-[85%] rounded-xl p-3 text-xs leading-relaxed",
                                                msg.role === 'user' 
                                                    ? "bg-zinc-800 text-zinc-200 self-end rounded-tr-none" 
                                                    : "bg-zinc-900 border border-zinc-800/80 text-zinc-300 self-start rounded-tl-none"
                                            )}
                                        >
                                            <span>{msg.content}</span>
                                        </div>
                                    ))
                                )}
                                {isChatting && (
                                    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3 text-xs self-start rounded-tl-none flex items-center gap-2 max-w-[85%]">
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-500" />
                                        <span className="text-zinc-500 font-mono">Copiloto analizando...</span>
                                    </div>
                                )}
                            </div>

                            {/* Chat Input form */}
                            <form onSubmit={handleChatSubmit} className="p-4 border-t border-zinc-800 bg-zinc-900/20 shrink-0">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder="Escribe al copiloto o re-clasifica pasos..."
                                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-500 rounded-lg pl-3 pr-10 py-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-0"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!chatInput.trim() || isChatting}
                                        className="absolute right-1.5 top-1.5 p-1 text-zinc-500 hover:text-red-500 disabled:text-zinc-800"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>


            {/* Save Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-6">
                        <div>
                            <h3 className="text-lg font-bold text-zinc-100">Guardar Sesión</h3>
                            <p className="text-xs text-zinc-400 mt-1">Guarda el análisis actual vinculado al proyecto seleccionado.</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-zinc-300 uppercase">Nombre de la Sesión</label>
                            <input 
                                type="text"
                                placeholder="Ej: Flujo de Facturación v2"
                                value={sessionNameInput}
                                onChange={e => setSessionNameInput(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500"
                                autoFocus
                            />
                        </div>
                        <div className="flex flex-wrap gap-2.5 justify-end mt-2">
                            <button
                                onClick={() => setShowSaveModal(false)}
                                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            {selectedSessionId ? (
                                <>
                                    <button
                                        onClick={() => handleSaveSession(true)}
                                        className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-xs font-semibold text-zinc-200 rounded-lg transition-colors"
                                    >
                                        Guardar como Copia
                                    </button>
                                    <button
                                        onClick={() => handleSaveSession(false)}
                                        className="px-3.5 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-xs font-semibold text-white shadow-lg shadow-red-900/20 transition-all"
                                    >
                                        Actualizar Existente
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => handleSaveSession(false)}
                                    className="px-3.5 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-xs font-semibold text-white shadow-lg shadow-red-900/20 transition-all"
                                >
                                    Guardar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {sessionToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-5">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full shrink-0">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-zinc-100 truncate">¿Borrar sesión?</h3>
                                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                                    Estás a punto de borrar la sesión <span className="font-semibold text-zinc-200">"{sessionToDelete.sessionName}"</span>. Esta acción no se puede deshacer.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2.5 mt-2">
                            <button
                                onClick={() => setSessionToDelete(null)}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-zinc-200 rounded-lg text-xs font-semibold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteSession}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-red-900/20 transition-colors"
                            >
                                Borrar definitivamente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full-Screen Diagram Zoom Modal */}
            {showFullImageModal && imagePreviewUrl && (
                <div 
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out select-none"
                    onClick={() => setShowFullImageModal(false)}
                >
                    <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <img 
                            src={imagePreviewUrl} 
                            alt="Full Diagram" 
                            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border border-zinc-800" 
                        />
                        <button 
                            onClick={() => setShowFullImageModal(false)}
                            className="mt-4 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-850 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-lg"
                        >
                            Cerrar Vista
                        </button>
                    </div>
                </div>
            )}

            {/* Datalists for autocompletion */}
            <datalist id="available-states">
                {availableStates.map(state => (
                    <option key={state} value={state} />
                ))}
            </datalist>
            <datalist id="available-actors">
                {availableActors.map(actor => (
                    <option key={actor} value={actor} />
                ))}
            </datalist>
        </div>
    );
}

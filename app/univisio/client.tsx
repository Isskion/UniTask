'use client';

import React, { useState, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import { 
    Upload, FileCode, Network, CheckCircle, AlertTriangle, Play,
    Plus, Trash2, ArrowUp, ArrowDown, Download, Send, RefreshCw, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { analyzeSubflowWithGemini, chatWithUniVisio } from './actions';
import * as XLSX from 'xlsx';

interface TableRow {
    step: number;
    actor: string;
    origin: string;
    destination: string;
    event: string;
    resultState: string;
    actionType: 'H' | 'A' | 'I'; // Humana, Automática, Integración
    precondition: string;
    exception: string;
    rule: string;
    linkedNodeId: string;
    confidence: number;
    needsReview?: boolean;
}

interface ParsedNode {
    id: string;
    label: string;
    shapeType: string;
    swimlane: string;
    position: { x: number; y: number };
}

interface ParsedEdge {
    id: string;
    from: string;
    to: string;
    label: string;
}

interface Doubt {
    id: string;
    severity: 'critical' | 'medium' | 'low';
    stepIndex?: number;
    message: string;
    nodeId?: string;
}

export default function ClientPage() {
    // State
    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<string[]>([]);
    const [selectedPage, setSelectedPage] = useState<string>('');
    const [zipInstance, setZipInstance] = useState<JSZip | null>(null);
    
    const [nodes, setNodes] = useState<ParsedNode[]>([]);
    const [edges, setEdges] = useState<ParsedEdge[]>([]);
    const [swimlanes, setSwimlanes] = useState<string[]>([]);
    const [cycles, setCycles] = useState<string[][]>([]);

    const [tableRows, setTableRows] = useState<TableRow[]>([]);
    const [doubts, setDoubts] = useState<Doubt[]>([]);
    
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

    // Drag-and-drop state
    const [isDragging, setIsDragging] = useState<boolean>(false);

    // Expose dynamic analysis batch size
    const lotSize = 40;

    // Computed sub-flows (lotes)
    const lotes = useMemo(() => {
        if (nodes.length === 0) return [];
        const result = [];
        for (let i = 0; i < nodes.length; i += lotSize) {
            result.push({
                index: i / lotSize + 1,
                start: i + 1,
                end: Math.min(i + lotSize, nodes.length),
                nodeIds: nodes.slice(i, i + lotSize).map(n => n.id)
            });
        }
        return result;
    }, [nodes]);

    const [activeLoteIndex, setActiveLoteIndex] = useState<number>(0);

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
        setTableRows([]);
        setDoubts([]);
        setNodes([]);
        setEdges([]);

        const ext = selectedFile.name.split('.').pop()?.toLowerCase();

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
        } else {
            // PNG / JPG Fallback
            setParsingStatus('Imagen cargada. Procesando en modo de visión...');
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
            setSwimlanes(extractedSwimlanesSet.size > 0 ? Array.from(extractedSwimlanesSet) : ['General']);

            // Auto-generate preliminary topology doubts
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
            const connectorsMap: Record<string, { from?: string; to?: string }> = {};

            // Visio SVGs store shape metadata in v:mID or class groups
            for (let i = 0; i < shapesList.length; i++) {
                const shape = shapesList[i];
                const id = shape.getAttribute('v:mID');
                const groupContext = shape.getAttribute('v:groupContext');

                if (!id) continue;

                if (groupContext === 'connector') {
                    // Extract labels
                    const textEl = shape.getElementsByTagNameNS('*', 'text')[0];
                    const label = textEl ? textEl.textContent?.trim() || '' : '';
                    
                    // SVGs don't contain raw logical connects directly like page1.xml connects.
                    // Fall back to general coordinates or look for custom elements.
                    // If no explicit connections exist, we mock them for Vision refinement.
                    connectorsMap[id] = { from: '', to: '' };
                } else if (groupContext === 'shape') {
                    const textEl = shape.getElementsByTagNameNS('*', 'text')[0];
                    const label = textEl ? textEl.textContent?.trim() || '' : '';

                    nodesMap[id] = {
                        id,
                        label: label || `ID ${id}`,
                        shapeType: 'rectangle',
                        swimlane: 'General',
                        position: { x: i * 50, y: i * 50 } // Simple grid layout
                    };
                }
            }

            setNodes(Object.values(nodesMap));
            setParsingStatus('SVG parsed.');
            setIsParsing(false);
        } catch (err: any) {
            console.error(err);
            alert('Error al parsear SVG: ' + err.message);
            setIsParsing(false);
        }
    };

    // Topological Sort Logic
    const topologicalSort = (nodesList: ParsedNode[], edgesList: ParsedEdge[]) => {
        const adj: Record<string, string[]> = {};
        const inDegree: Record<string, number> = {};
        nodesList.forEach(n => {
            adj[n.id] = [];
            inDegree[n.id] = 0;
        });

        edgesList.forEach(e => {
            if (adj[e.from] && adj[e.to] !== undefined) {
                adj[e.from].push(e.to);
                inDegree[e.to]++;
            }
        });

        const queue: string[] = [];
        nodesList.forEach(n => {
            if (inDegree[n.id] === 0) {
                queue.push(n.id);
            }
        });

        const order: string[] = [];
        while (queue.length > 0) {
            const u = queue.shift()!;
            order.push(u);

            const neighbors = adj[u] || [];
            neighbors.forEach(v => {
                inDegree[v]--;
                if (inDegree[v] === 0) {
                    queue.push(v);
                }
            });
        }

        // Add nodes inside loops/cycles
        const orderedSet = new Set(order);
        nodesList.forEach(n => {
            if (!orderedSet.has(n.id)) {
                order.push(n.id);
            }
        });

        const nodeMap = new Map(nodesList.map(n => [n.id, n]));
        return order.map(id => nodeMap.get(id)).filter(Boolean) as ParsedNode[];
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

        setDoubts(generatedDoubts);
    };

    // Run Semantic Extraction on current selected sub-flow (Lote)
    const runSemanticAnalysis = async () => {
        if (nodes.length === 0) return;
        setIsGenerating(true);

        try {
            // Get sub-graph for active lote
            const activeLote = lotes[activeLoteIndex];
            const activeNodeIds = new Set(activeLote.nodeIds);
            
            const subNodes = nodes.filter(n => activeNodeIds.has(n.id));
            const subEdges = edges.filter(e => activeNodeIds.has(e.from) || activeNodeIds.has(e.to));

            const graphContext = {
                nodes: subNodes,
                edges: subEdges,
                swimlanes
            };

            const response = await analyzeSubflowWithGemini(JSON.stringify(graphContext));
            
            if (response && response.steps) {
                // Map API response to UI table state
                const newRows: TableRow[] = response.steps.map(step => ({
                    step: step.step + (activeLote.start - 1), // Offset based on lote
                    actor: step.actor || 'General',
                    origin: step.origin || '-',
                    destination: step.destination || '-',
                    event: step.event || '-',
                    resultState: step.resultState || '-',
                    actionType: step.actionType || 'H',
                    precondition: step.precondition || '-',
                    exception: step.exception || '-',
                    rule: step.rule || '-',
                    linkedNodeId: step.linkedNodeId || '',
                    confidence: step.confidence || 1.0,
                    needsReview: (step.confidence || 1.0) < 0.7
                }));

                setTableRows(prev => {
                    // Replace or concatenate rows
                    const filteredPrev = prev.filter(r => !activeNodeIds.has(r.linkedNodeId));
                    const combined = [...filteredPrev, ...newRows].sort((a, b) => a.step - b.step);
                    // Re-index steps sequentially
                    return combined.map((r, i) => ({ ...r, step: i + 1 }));
                });
            }
        } catch (e: any) {
            console.error(e);
            alert(`Error al analizar sub-flujo: ${e.message}`);
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

            setChatHistory(prev => [...prev, { role: 'model', content: response.reply }]);

            // Apply AI Command modifications to the table rows if returned
            if (response.command) {
                const cmd = response.command;
                if (cmd.type === 'update_row' && cmd.params.stepIndex !== undefined) {
                    setTableRows(prev => prev.map(row => 
                        row.step === cmd.params.stepIndex ? { ...row, ...cmd.params.fields } : row
                    ));
                } else if (cmd.type === 'delete_row' && cmd.params.stepIndex !== undefined) {
                    setTableRows(prev => prev.filter(row => row.step !== cmd.params.stepIndex)
                        .map((row, i) => ({ ...row, step: i + 1 }))
                    );
                } else if (cmd.type === 'insert_row' && cmd.params.index !== undefined) {
                    setTableRows(prev => {
                        const copy = [...prev];
                        copy.splice(cmd.params.index, 0, {
                            step: cmd.params.index + 1,
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
                            confidence: 1.0
                        });
                        return copy.map((row, i) => ({ ...row, step: i + 1 }));
                    });
                }
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
        setTableRows(prev => prev.map((row, i) => 
            i === rowIndex ? { ...row, [column]: value } : row
        ));
    };

    const handleAddRow = () => {
        setTableRows(prev => [
            ...prev,
            {
                step: prev.length + 1,
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
                confidence: 1.0
            }
        ]);
    };

    const handleDeleteRow = (index: number) => {
        if (!confirm('¿Estás seguro de eliminar este paso?')) return;
        setTableRows(prev => prev.filter((_, i) => i !== index)
            .map((row, i) => ({ ...row, step: i + 1 }))
        );
    };

    const moveRow = (index: number, direction: 'up' | 'down') => {
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

    // Exporters
    const exportCSV = () => {
        if (tableRows.length === 0) return;
        const headers = ['Paso', 'Actor/Swimlane', 'Origen del Dato', 'Destino/Consumidor', 'Evento/Transición', 'Estado Resultante', 'Tipo Acción', 'Precondición', 'Excepción', 'Regla de Negocio'];
        const csvContent = [
            headers.join(','),
            ...tableRows.map(r => [
                r.step,
                `"${r.actor}"`,
                `"${r.origin}"`,
                `"${r.destination}"`,
                `"${r.event}"`,
                `"${r.resultState}"`,
                r.actionType,
                `"${r.precondition}"`,
                `"${r.exception}"`,
                `"${r.rule}"`
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
        const headers = ['#', 'Actor / Swimlane', 'Origen del Dato', 'Destino / Consumidor', 'Evento / Transición', 'Estado Resultante', 'Acción', 'Precondición', 'Excepción', 'Regla de Negocio'];
        const separators = headers.map(() => '---');
        const rows = tableRows.map(r => [
            r.step,
            r.actor,
            r.origin,
            r.destination,
            r.event,
            r.resultState,
            r.actionType === 'H' ? '👤 Humana' : r.actionType === 'A' ? '⚙️ Automática' : '🔌 Integración',
            r.precondition,
            r.exception,
            r.rule
        ]);

        const mdContent = [
            `# Narrativa de Proceso de Visio: ${file?.name || 'Proceso'}`,
            '',
            `| ${headers.join(' | ')} |`,
            `| ${separators.join(' | ')} |`,
            ...rows.map(row => `| ${row.join(' | ')} |`)
        ].join('\n');

        const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${file?.name.split('.')[0] || 'UniVisio'}_narrativa.md`);
        link.click();
    };

    const exportExcel = () => {
        if (tableRows.length === 0) return;
        const worksheet = XLSX.utils.json_to_sheet(tableRows.map(r => ({
            Paso: r.step,
            'Actor / Swimlane': r.actor,
            'Origen del Dato': r.origin,
            'Destino / Consumidor': r.destination,
            'Evento / Transición': r.event,
            'Estado Resultante': r.resultState,
            'Tipo de Acción': r.actionType === 'H' ? 'Humana' : r.actionType === 'A' ? 'Automática' : 'Integración',
            Precondición: r.precondition,
            Excepción: r.exception,
            'Regla de Negocio': r.rule
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Narrativa de Pasos');
        XLSX.writeFile(workbook, `${file?.name.split('.')[0] || 'UniVisio'}_narrativa.xlsx`);
    };

    const triggerPrintPDF = () => {
        window.print();
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
            
            {/* Main view container */}
            <div className="flex flex-1 overflow-hidden min-h-0">
                
                {/* Left panel: File drop and page details */}
                <div className="w-80 border-r border-zinc-800 bg-zinc-900/60 p-5 flex flex-col gap-6 overflow-y-auto">
                    <div>
                        <h2 className="text-xl font-bold text-rose-500 flex items-center gap-2">
                            <Network className="w-5 h-5" /> UniVisio
                        </h2>
                        <p className="text-xs text-zinc-400 mt-1">Ingesta y documentación de diagramas de Microsoft Visio</p>
                    </div>

                    {/* File Dropzone */}
                    <div 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center gap-3",
                            isDragging ? "border-rose-500 bg-rose-500/10" : "border-zinc-700 bg-zinc-950/40 hover:border-zinc-600 hover:bg-zinc-950/60",
                            file ? "border-green-500/50 bg-green-950/10" : ""
                        )}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".vsdx,.svg,.png,.jpg,.jpeg"
                            className="hidden" 
                        />
                        {file ? (
                            <>
                                <CheckCircle className="w-10 h-10 text-green-500" />
                                <div className="text-xs font-semibold truncate max-w-full text-zinc-200">{file.name}</div>
                                <div className="text-[10px] text-zinc-400">Click para reemplazar</div>
                            </>
                        ) : (
                            <>
                                <Upload className="w-10 h-10 text-zinc-500" />
                                <div className="text-sm font-semibold text-zinc-300">Arrastra tu archivo aquí</div>
                                <div className="text-[10px] text-zinc-500">Soporta VSDX, SVG, PNG o JPG</div>
                            </>
                        )}
                    </div>

                    {/* Loader */}
                    {isParsing && (
                        <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-xs text-zinc-300">
                                <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
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
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-rose-500 text-zinc-200"
                            >
                                {pages.map(p => (
                                    <option key={p} value={p}>{p.replace('visio/pages/', '')}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Topology info */}
                    {nodes.length > 0 && (
                        <div className="flex flex-col gap-3 bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4">
                            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-800/60 pb-1.5">Info de Estructura</div>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <div className="text-lg font-black text-rose-500">{nodes.length}</div>
                                    <div className="text-[9px] text-zinc-500 uppercase font-semibold">Nodos</div>
                                </div>
                                <div>
                                    <div className="text-lg font-black text-indigo-400">{edges.length}</div>
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
                                                ? "bg-rose-500/10 border-rose-500/50 text-rose-400"
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
                                className="w-full bg-rose-600 hover:bg-rose-500 text-white disabled:bg-zinc-800 disabled:text-zinc-600 font-semibold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all mt-2"
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
                </div>

                {/* Center Workspace: Table rendering */}
                <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 print:bg-white print:text-black">
                    
                    {/* Toolbar */}
                    <div className="h-14 border-b border-zinc-800 px-6 flex items-center justify-between bg-zinc-900/40 shrink-0 print:hidden">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                            <FileCode className="w-4 h-4 text-rose-500" />
                            <span>Narrativa Tabular</span>
                        </div>
                        {tableRows.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={exportCSV}
                                    className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-zinc-700/60"
                                    title="Exportar CSV"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>CSV</span>
                                </button>
                                <button
                                    onClick={exportMarkdown}
                                    className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-zinc-700/60"
                                    title="Exportar MD"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>MD</span>
                                </button>
                                <button
                                    onClick={exportExcel}
                                    className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-zinc-700/60"
                                    title="Exportar Excel"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Excel</span>
                                </button>
                                <button
                                    onClick={triggerPrintPDF}
                                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-rose-500/20"
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
                        {tableRows.length > 0 ? (
                            <div className="overflow-x-auto min-w-full border border-zinc-800/80 rounded-xl bg-zinc-900/10 print:border-none">
                                <table className="min-w-full divide-y divide-zinc-800 text-xs print:divide-zinc-400">
                                    <thead className="bg-zinc-900/60 text-zinc-400 uppercase tracking-widest text-[9px] print:bg-zinc-100 print:text-zinc-700">
                                        <tr>
                                            <th className="px-3 py-3 font-semibold text-center w-12 print:hidden">#</th>
                                            <th className="px-3 py-3 font-semibold text-center w-10">Paso</th>
                                            <th className="px-4 py-3 font-semibold text-left">Actor / Swimlane</th>
                                            <th className="px-4 py-3 font-semibold text-left">Origen</th>
                                            <th className="px-4 py-3 font-semibold text-left">Destino</th>
                                            <th className="px-4 py-3 font-semibold text-left">Evento / Transición</th>
                                            <th className="px-4 py-3 font-semibold text-left">Estado Resultante</th>
                                            <th className="px-3 py-3 font-semibold text-center w-20">Acción</th>
                                            <th className="px-4 py-3 font-semibold text-left">Precondición</th>
                                            <th className="px-4 py-3 font-semibold text-left">Excepción</th>
                                            <th className="px-4 py-3 font-semibold text-left">Regla de Negocio</th>
                                            <th className="px-3 py-3 font-semibold text-center w-10 print:hidden"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/50 print:divide-zinc-300">
                                        {tableRows.map((row, idx) => (
                                            <tr 
                                                key={idx}
                                                onClick={() => setActiveRowIndex(idx)}
                                                className={cn(
                                                    "transition-colors",
                                                    activeRowIndex === idx ? "bg-rose-500/5" : "hover:bg-zinc-900/30",
                                                    row.needsReview ? "bg-amber-950/15" : "",
                                                    "print:bg-transparent"
                                                )}
                                            >
                                                {/* Reorder Buttons */}
                                                <td className="px-3 py-3 text-center align-middle whitespace-nowrap print:hidden">
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

                                                {/* Step # */}
                                                <td className="px-3 py-3 text-center font-bold text-zinc-300 align-middle">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {row.needsReview && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 print:hidden" />}
                                                        <span>{row.step}</span>
                                                    </div>
                                                </td>

                                                {/* Actor / Swimlane */}
                                                <td className="px-4 py-3 align-middle">
                                                    <input 
                                                        type="text" 
                                                        value={row.actor}
                                                        onChange={(e) => handleCellChange(idx, 'actor', e.target.value)}
                                                        className="bg-transparent focus:bg-zinc-900 border-none w-full text-zinc-200 focus:ring-1 focus:ring-rose-500 rounded p-1 print:border-none"
                                                    />
                                                </td>

                                                {/* Origen */}
                                                <td className="px-4 py-3 align-middle">
                                                    <input 
                                                        type="text" 
                                                        value={row.origin}
                                                        onChange={(e) => handleCellChange(idx, 'origin', e.target.value)}
                                                        className="bg-transparent focus:bg-zinc-900 border-none w-full text-zinc-200 focus:ring-1 focus:ring-rose-500 rounded p-1"
                                                    />
                                                </td>

                                                {/* Destino */}
                                                <td className="px-4 py-3 align-middle">
                                                    <input 
                                                        type="text" 
                                                        value={row.destination}
                                                        onChange={(e) => handleCellChange(idx, 'destination', e.target.value)}
                                                        className="bg-transparent focus:bg-zinc-900 border-none w-full text-zinc-200 focus:ring-1 focus:ring-rose-500 rounded p-1"
                                                    />
                                                </td>

                                                {/* Evento */}
                                                <td className="px-4 py-3 align-middle">
                                                    <input 
                                                        type="text" 
                                                        value={row.event}
                                                        onChange={(e) => handleCellChange(idx, 'event', e.target.value)}
                                                        className="bg-transparent focus:bg-zinc-900 border-none w-full text-zinc-200 focus:ring-1 focus:ring-rose-500 rounded p-1"
                                                    />
                                                </td>

                                                {/* Estado Resultante */}
                                                <td className="px-4 py-3 align-middle">
                                                    <input 
                                                        type="text" 
                                                        value={row.resultState}
                                                        onChange={(e) => handleCellChange(idx, 'resultState', e.target.value)}
                                                        className="bg-transparent focus:bg-zinc-900 border-none w-full text-zinc-200 focus:ring-1 focus:ring-rose-500 rounded p-1"
                                                    />
                                                </td>

                                                {/* Acción Type */}
                                                <td className="px-3 py-3 text-center align-middle whitespace-nowrap">
                                                    <select
                                                        value={row.actionType}
                                                        onChange={(e) => handleCellChange(idx, 'actionType', e.target.value)}
                                                        className="bg-zinc-950 text-zinc-300 border border-zinc-800 rounded px-2 py-1 focus:outline-none focus:border-rose-500 font-sans print:border-none print:bg-transparent"
                                                    >
                                                        <option value="H">👤 H</option>
                                                        <option value="A">⚙️ A</option>
                                                        <option value="I">🔌 I</option>
                                                    </select>
                                                </td>

                                                {/* Precondición */}
                                                <td className="px-4 py-3 align-middle">
                                                    <input 
                                                        type="text" 
                                                        value={row.precondition}
                                                        onChange={(e) => handleCellChange(idx, 'precondition', e.target.value)}
                                                        className="bg-transparent focus:bg-zinc-900 border-none w-full text-zinc-200 focus:ring-1 focus:ring-rose-500 rounded p-1"
                                                    />
                                                </td>

                                                {/* Excepción */}
                                                <td className="px-4 py-3 align-middle">
                                                    <input 
                                                        type="text" 
                                                        value={row.exception}
                                                        onChange={(e) => handleCellChange(idx, 'exception', e.target.value)}
                                                        className="bg-transparent focus:bg-zinc-900 border-none w-full text-zinc-200 focus:ring-1 focus:ring-rose-500 rounded p-1"
                                                    />
                                                </td>

                                                {/* Regla de negocio */}
                                                <td className="px-4 py-3 align-middle">
                                                    <textarea 
                                                        rows={1}
                                                        value={row.rule}
                                                        onChange={(e) => handleCellChange(idx, 'rule', e.target.value)}
                                                        className="bg-transparent focus:bg-zinc-900 border-none w-full text-zinc-200 focus:ring-1 focus:ring-rose-500 rounded p-1 resize-none h-auto overflow-y-hidden"
                                                    />
                                                </td>

                                                {/* Delete Action */}
                                                <td className="px-3 py-3 text-center align-middle print:hidden">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteRow(idx); }}
                                                        className="text-zinc-500 hover:text-red-500"
                                                        title="Eliminar fila"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-80 border border-zinc-800/80 rounded-xl bg-zinc-900/10 p-12 text-center select-none">
                                <Network className="w-12 h-12 text-zinc-600 mb-4" />
                                <div className="text-zinc-300 font-medium">Carga un diagrama para comenzar</div>
                                <p className="text-xs text-zinc-500 max-w-sm mt-1.5 leading-relaxed">
                                    Extrae de forma precisa la topología de un archivo de Visio (.vsdx) o SVG y genérale la narrativa relacional.
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
                <div className="w-96 border-l border-zinc-800 bg-zinc-900/40 flex flex-col min-h-0 shrink-0 print:hidden">
                    
                    {/* Header */}
                    <div className="h-14 border-b border-zinc-800 px-5 flex items-center gap-2 bg-zinc-900/60">
                        <Network className="w-4 h-4 text-rose-500" />
                        <h2 className="text-sm font-semibold text-zinc-200">Copiloto de Procesos</h2>
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
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
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
                                className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-lg pl-3 pr-10 py-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-0"
                            />
                            <button
                                type="submit"
                                disabled={!chatInput.trim() || isChatting}
                                className="absolute right-1.5 top-1.5 p-1 text-zinc-500 hover:text-rose-500 disabled:text-zinc-800"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Print specific styles to output beautifully structured pages */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    main, .flex-1.overflow-auto, table, table * {
                        visibility: visible;
                    }
                    main {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .flex-1.overflow-auto {
                        overflow: visible !important;
                    }
                    input, textarea, select {
                        border: none !important;
                        outline: none !important;
                        background: transparent !important;
                        padding: 0 !important;
                        color: black !important;
                        resize: none !important;
                    }
                }
            `}</style>
        </div>
    );
}

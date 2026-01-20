"use client";

import React, { useState, useRef, useEffect } from 'react';
import { BoundingBox } from '@/app/actions/analyze-document';
import { Maximize, Save, X, MousePointer2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Loader2, Sparkles, Trash2, BoxSelect } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure Worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface VisualTemplateDesignerProps {
    fileUrl?: string;
    initialZones: BoundingBox[];
    onSave: (zones: BoundingBox[]) => void;
    onClose: () => void;
}

interface BlockBuilder {
    xmin: number;
    xmax: number;
    ymin: number;
    ymax: number;
    items: any[];
}

export default function VisualTemplateDesigner({ fileUrl, initialZones, onSave, onClose }: VisualTemplateDesignerProps) {
    const [zones, setZones] = useState<BoundingBox[]>(initialZones);
    const [selectedZone, setSelectedZone] = useState<number | null>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState(1.0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [pdfDimensions, setPdfDimensions] = useState<{ width: number, height: number } | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
    const [dragCurrent, setDragCurrent] = useState<{ x: number, y: number } | null>(null);

    const isPdf = fileUrl?.startsWith('data:application/pdf');

    const runAutoDetection = async (page: any) => {
        setIsDetecting(true);
        try {
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 1.0 });

            // Algorithm to cluster text items into blocks
            const blocks: BoundingBox[] = [];
            let currentBlock: BlockBuilder | null = null;

            // Sort items by Y (top to bottom) then X (left to right)
            const items = textContent.items.sort((a: any, b: any) => {
                // Determine vertical position (inverted in PDF usually)
                const yA = viewport.height - a.transform[5];
                const yB = viewport.height - b.transform[5];
                if (Math.abs(yA - yB) > 10) return yA - yB; // significant line difference
                return a.transform[4] - b.transform[4]; // X
            });

            // Iterate and cluster
            for (const item of items) {
                // PDF coords to normalized 0-1000
                // transform[4] = x, transform[5] = y (from bottom)
                // item.width, item.height

                // Calculate item bounding box (unscaled pixels)
                const x = item.transform[4];
                const y = viewport.height - item.transform[5] - item.height; // Top-left Y
                const w = item.width;
                const h = item.height;

                // Normalized to 1000x1000
                const normX = (x / viewport.width) * 1000;
                const normY = (y / viewport.height) * 1000;
                const normW = (w / viewport.width) * 1000;
                const normH = (h / viewport.height) * 1000;

                // Very simple clustering: if close to current block, add to it
                if (currentBlock) {
                    const verticalGap = normY - currentBlock.ymax;
                    const horizontalGap = normX - currentBlock.xmax;

                    // If vertical gap is small (same paragraph) and horizontal alignment is reasonable
                    if (verticalGap < 20 && verticalGap > -50) { // arbitrary thresholds
                        // Extend block
                        currentBlock.xmin = Math.min(currentBlock.xmin, normX);
                        currentBlock.ymin = Math.min(currentBlock.ymin, normY);
                        currentBlock.xmax = Math.max(currentBlock.xmax, normX + normW);
                        currentBlock.ymax = Math.max(currentBlock.ymax, normY + normH);
                        currentBlock.items.push(item);
                        continue;
                    }
                }

                // Close previous block and start new
                if (currentBlock) {
                    const cb = currentBlock;
                    // Filter out tiny noise blocks
                    if ((cb.xmax - cb.xmin) > 10 && (cb.ymax - cb.ymin) > 10) {
                        blocks.push({
                            label: determineLabel(cb.items),
                            xmin: cb.xmin,
                            ymin: cb.ymin,
                            xmax: cb.xmax,
                            ymax: cb.ymax,
                        });
                    }
                }

                currentBlock = {
                    xmin: normX,
                    ymin: normY,
                    xmax: normX + normW,
                    ymax: normY + normH,
                    items: [item]
                };
            }

            // Push last block
            if (currentBlock) {
                const cb = currentBlock;
                blocks.push({
                    label: determineLabel(cb.items),
                    xmin: cb.xmin,
                    ymin: cb.ymin,
                    xmax: cb.xmax,
                    ymax: cb.ymax,
                });
            }

            // Merge closely overlapping blocks
            // (Skipped for simplicity, but could improve quality)

            if (blocks.length > 0) {
                setZones(prev => [...prev, ...blocks]);
            }
        } catch (e) {
            console.error("Auto detection failed", e);
        } finally {
            setIsDetecting(false);
        }
    };

    const determineLabel = (items: any[]) => {
        const text = items.map(i => i.str).join(' ').toLowerCase();
        if (text.includes('fecha') || text.includes('date')) return 'Fecha';
        if (text.includes('total') || text.includes('amount')) return 'Total';
        if (text.includes('invoice') || text.includes('factura')) return 'Nº Factura';
        if (text.length > 50) return 'Párrafo';
        return 'Texto';
    };

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    function onPageLoadSuccess(page: any) {
        const { width, height } = page.getViewport({ scale: 1.0 });
        setPdfDimensions({ width, height });

        // If no zones exist, run auto-detection
        if (initialZones.length === 0 && zones.length === 0) {
            runAutoDetection(page);
        }
    }

    // Drag to create
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current || !pdfDimensions) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width * 1000;
        const y = (e.clientY - rect.top) / rect.height * 1000;
        setDragStart({ x, y });
        setDragCurrent({ x, y });
        setSelectedZone(null);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragStart || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width * 1000;
        const y = (e.clientY - rect.top) / rect.height * 1000;
        setDragCurrent({ x, y });
    };

    const handleMouseUp = () => {
        if (!dragStart || !dragCurrent) return;

        const xmin = Math.min(dragStart.x, dragCurrent.x);
        const ymin = Math.min(dragStart.y, dragCurrent.y);
        const xmax = Math.max(dragStart.x, dragCurrent.x);
        const ymax = Math.max(dragStart.y, dragCurrent.y);

        // Only create if big enough
        if ((xmax - xmin) > 20 && (ymax - ymin) > 20) {
            const newZone: BoundingBox = {
                label: "Nueva Zona",
                xmin, ymin, xmax, ymax
            };
            setZones(prev => [...prev, newZone]);
            setSelectedZone(zones.length);
        }

        setDragStart(null);
        setDragCurrent(null);
    };

    const deleteSelected = () => {
        if (selectedZone === null) return;
        setZones(z => z.filter((_, i) => i !== selectedZone));
        setSelectedZone(null);
    }

    const clearAll = () => {
        if (confirm("¿Estás seguro de que quieres borrar todas las zonas?")) {
            setZones([]);
            setSelectedZone(null);
        }
    }

    return (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-6 backdrop-blur-md">
            <div className="bg-background w-full h-full max-w-[1800px] rounded-2xl flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/10">

                {/* Toolbar */}
                <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Maximize className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Diseñador de Plantillas</h2>
                            <p className="text-xs text-muted-foreground">Define las zonas visuales del documento</p>
                        </div>

                        <div className="h-8 w-px bg-border mx-4" />

                        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg border border-border p-1">
                            <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-2 hover:bg-background rounded-md transition-colors"><ZoomOut className="w-4 h-4" /></button>
                            <span className="text-xs font-mono w-12 text-center font-bold">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale(s => Math.min(2.0, s + 0.1))} className="p-2 hover:bg-background rounded-md transition-colors"><ZoomIn className="w-4 h-4" /></button>
                        </div>

                        <button
                            onClick={clearAll}
                            className="ml-4 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Trash2 className="w-3 h-3" /> Limpiar Todo
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 hover:bg-secondary rounded-xl font-medium text-sm transition-colors">
                            Cancelar
                        </button>
                        <button onClick={() => onSave(zones)} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 text-sm flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                            <Save className="w-4 h-4" /> Guardar Diseño
                        </button>
                    </div>
                </div>

                {/* Main Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-80 border-r border-border bg-card p-4 overflow-y-auto flex flex-col gap-4">
                        <div className="bg-secondary/30 p-4 rounded-xl border border-border">
                            <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-2">
                                <BoxSelect className="w-3 h-3" /> Modo de Selección
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Arrastra el ratón sobre el documento para crear nuevas zonas. Haz clic en una zona para editarla.
                            </p>
                        </div>

                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold">Zonas ({zones.length})</h3>
                        </div>

                        <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                            {zones.map((zone, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setSelectedZone(idx)}
                                    className={`p-3 rounded-xl border text-sm cursor-pointer transition-all group relative ${selectedZone === idx ? 'border-primary bg-primary/5 shadow-md scale-[1.02]' : 'border-border hover:border-primary/50 hover:bg-secondary/50'}`}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${selectedZone === idx ? 'bg-primary' : 'bg-muted-foreground'}`} />
                                            <input
                                                value={zone.label}
                                                onChange={(e) => {
                                                    const newZones = [...zones];
                                                    newZones[idx].label = e.target.value;
                                                    setZones(newZones);
                                                }}
                                                className="bg-transparent font-medium w-32 focus:outline-none focus:text-primary"
                                                placeholder="Nombre..."
                                            />
                                        </div>
                                        <button onClick={(e) => {
                                            e.stopPropagation();
                                            const newZones = zones.filter((_, i) => i !== idx);
                                            setZones(newZones);
                                            if (selectedZone === idx) setSelectedZone(null);
                                        }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 transition-opacity">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="flex gap-4 text-[10px] text-muted-foreground font-mono">
                                        <span>Y: {Math.round(zone.ymin)}</span>
                                        <span>H: {Math.round(zone.ymax - zone.ymin)}</span>
                                    </div>
                                </div>
                            ))}
                            {zones.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground text-xs opacity-50">
                                    No hay zonas definidas
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div className="flex-1 bg-slate-900/50 p-8 overflow-auto flex justify-center relative select-none">
                        <div
                            className="relative shadow-2xl ring-1 ring-white/10 bg-white transition-transform ease-out duration-200"
                            ref={containerRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        >
                            {isPdf ? (
                                <Document
                                    file={fileUrl}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    loading={
                                        <div className="flex flex-col items-center justify-center h-[800px] w-[600px] gap-4">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                            <span className="text-sm font-medium text-muted-foreground">Analizando estructura visual...</span>
                                        </div>
                                    }
                                >
                                    <Page
                                        pageNumber={pageNumber}
                                        scale={scale}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                        onLoadSuccess={onPageLoadSuccess}
                                        className="pointer-events-none" // Events handled by container
                                    />
                                </Document>
                            ) : (
                                <div className="w-[800px] h-[1100px] bg-white flex flex-col items-center justify-center p-12 text-center">
                                    <Sparkles className="w-12 h-12 text-slate-300 mb-4" />
                                    <h3 className="text-lg font-bold text-slate-800">Modo Lienzo Libre</h3>
                                    <p className="text-sm text-slate-500 max-w-sm mt-2">
                                        Dibuja las zonas manualmente sobre este lienzo.
                                    </p>
                                </div>
                            )}

                            {/* Zones Overlay */}
                            {pdfDimensions && zones.map((zone, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        position: 'absolute',
                                        left: `${zone.xmin / 10}%`,
                                        top: `${zone.ymin / 10}%`,
                                        width: `${(zone.xmax - zone.xmin) / 10}%`,
                                        height: `${(zone.ymax - zone.ymin) / 10}%`,
                                    }}
                                    onMouseDown={(e) => { e.stopPropagation(); setSelectedZone(idx); }} // Select on click, prevent drag creation start
                                    className={`
                                        absolute border-2 transition-all duration-200 group
                                        ${selectedZone === idx
                                            ? 'border-primary bg-primary/10 z-20 ring-4 ring-primary/10'
                                            : 'border-blue-400/30 bg-blue-400/5 hover:border-blue-500 hover:bg-blue-500/10 z-10'}
                                    `}
                                >
                                    {selectedZone === idx && (
                                        <div className="absolute -top-3 -right-3 flex gap-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteSelected(); }}
                                                className="bg-destructive text-destructive-foreground p-1 rounded-full shadow-sm hover:scale-110 transition-transform"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                    <div className={`
                                        absolute top-0 left-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-br
                                        ${selectedZone === idx ? 'bg-primary text-primary-foreground' : 'bg-blue-100 text-blue-700 opacity-0 group-hover:opacity-100'}
                                    `}>
                                        {zone.label}
                                    </div>
                                </div>
                            ))}

                            {/* Drag Selection Draft */}
                            {dragStart && dragCurrent && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: `${Math.min(dragStart.x, dragCurrent.x) / 10}%`,
                                        top: `${Math.min(dragStart.y, dragCurrent.y) / 10}%`,
                                        width: `${Math.abs(dragCurrent.x - dragStart.x) / 10}%`,
                                        height: `${Math.abs(dragCurrent.y - dragStart.y) / 10}%`,
                                    }}
                                    className="border-2 border-dashed border-primary bg-primary/20 z-30 pointer-events-none"
                                />
                            )}
                        </div>

                        {/* Pagination */}
                        {numPages > 1 && (
                            <div className="absolute bottom-8 flex items-center gap-4 bg-background/80 backdrop-blur p-2 rounded-full border border-border shadow-2xl">
                                <button
                                    disabled={pageNumber <= 1}
                                    onClick={() => setPageNumber(p => p - 1)}
                                    className="p-2 hover:bg-secondary rounded-full disabled:opacity-50 transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="font-bold text-sm px-2 font-mono">
                                    {pageNumber} / {numPages}
                                </span>
                                <button
                                    disabled={pageNumber >= numPages}
                                    onClick={() => setPageNumber(p => p + 1)}
                                    className="p-2 hover:bg-secondary rounded-full disabled:opacity-50 transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

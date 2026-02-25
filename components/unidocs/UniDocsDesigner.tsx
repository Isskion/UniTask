"use client";

import React, { useState, useRef, useEffect } from 'react';
import { BoundingBox } from '@/app/actions/unidocs';
import { Maximize, Save, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Loader2, Sparkles, Trash2, BoxSelect, Info, HelpCircle, CheckCircle2, ArrowRight, Image, FileText, AlignLeft, Hash, Calendar, Building2, Users, MousePointer2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// --- Zone Label Catalog ---
interface ZoneLabelDef {
    value: string;
    label: string;
    icon: React.ElementType;
    hint: string;
    source?: string;
    color: string;
}

const ZONE_LABELS: ZoneLabelDef[] = [
    { value: 'Logo Empresa', label: 'Logo de tu empresa', icon: Building2, hint: 'El logo de tu organización que aparece fijo en todos los documentos.', source: 'Se carga desde la configuración de tu cuenta (Tenant).', color: 'text-violet-500' },
    { value: 'Logo Cliente', label: 'Logo del Cliente', icon: Users, hint: 'El logo del cliente o empresa receptora del documento.', source: 'Se recupera de la ficha del proyecto → campo tipo "logo".', color: 'text-blue-500' },
    { value: 'Título', label: 'Título / Asunto', icon: Hash, hint: 'El título principal del documento.', source: 'Se rellena con el título de la nota o el nombre de la reunión.', color: 'text-amber-500' },
    { value: 'Fecha', label: 'Fecha del documento', icon: Calendar, hint: 'La fecha en que se genera el documento.', source: 'Se rellena automáticamente con la fecha de hoy.', color: 'text-emerald-500' },
    { value: 'Párrafo', label: 'Cuerpo / Contenido', icon: AlignLeft, hint: 'El bloque principal de contenido del documento (texto, tablas, etc.).', source: 'Se rellena con el contenido de la nota de UniLeaks.', color: 'text-slate-400' },
    { value: 'Referencia', label: 'Nº Referencia / ID', icon: FileText, hint: 'Un identificador único del documento (nº de acta, expediente, etc.).', source: 'Se rellena con la referencia del proyecto o pedido.', color: 'text-orange-500' },
    { value: 'Pie', label: 'Pie de página', icon: AlignLeft, hint: 'Información que aparece al final de todas las páginas (contacto, avisos, etc.).', source: 'Se rellena con el pie de página de la plantilla o el sumario.', color: 'text-slate-500' },
    { value: 'Texto', label: 'Texto libre', icon: AlignLeft, hint: 'Zona de texto genérico o notas adicionales.', source: 'Texto estático o complementario de la nota.', color: 'text-slate-400' },
    { value: 'Imagen', label: 'Imagen / Adjunto', icon: Image, hint: 'Una imagen o figura que forma parte del documento.', source: 'Imagen adjunta en la nota.', color: 'text-pink-500' },
];

// Steps guide
const STEPS = [
    { n: 1, text: 'Dibuja zonas arrastrando el ratón sobre el documento' },
    { n: 2, text: 'Haz clic en una zona para seleccionarla' },
    { n: 3, text: 'Elige qué tipo de información irá en esa zona' },
    { n: 4, text: 'Repite para todas las zonas y pulsa "Guardar Diseño"' },
];

interface VisualTemplateDesignerProps {
    fileUrl?: string;
    initialZones: BoundingBox[];
    onSave: (zones: BoundingBox[], margins?: { headerMm: number; footerMm: number }) => void;
    onClose: () => void;
}

interface BlockBuilder {
    xmin: number; xmax: number; ymin: number; ymax: number; items: any[];
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
    const [showHelp, setShowHelp] = useState(true);

    const isPdf = fileUrl?.startsWith('data:application/pdf');

    // Capture the PDF canvas area under a zone and return a base64 data URL
    const captureZoneImage = (zoneIdx: number): string | null => {
        if (!containerRef.current) return null;
        const canvas = containerRef.current.querySelector('canvas') as HTMLCanvasElement;
        if (!canvas) return null;

        const zone = zones[zoneIdx];
        const canvasW = canvas.width;
        const canvasH = canvas.height;

        // Convert normalized coords (0-1000) to canvas pixel coords
        const sx = Math.round((zone.xmin / 1000) * canvasW);
        const sy = Math.round((zone.ymin / 1000) * canvasH);
        const sw = Math.round(((zone.xmax - zone.xmin) / 1000) * canvasW);
        const sh = Math.round(((zone.ymax - zone.ymin) / 1000) * canvasH);

        if (sw <= 0 || sh <= 0) return null;

        try {
            const offscreen = document.createElement('canvas');
            offscreen.width = sw;
            offscreen.height = sh;
            const ctx = offscreen.getContext('2d');
            if (!ctx) return null;
            ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
            return offscreen.toDataURL('image/png');
        } catch (e) {
            console.error('Failed to capture zone image:', e);
            return null;
        }
    };

    const selectedDef = selectedZone !== null
        ? ZONE_LABELS.find(z => z.value === zones[selectedZone]?.label) ?? ZONE_LABELS[4]
        : null;

    // ---- AUTO-DETECTION (same logic, unchanged) ----
    const runAutoDetection = async (page: any) => {
        setIsDetecting(true);
        try {
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 1.0 });
            const blocks: BoundingBox[] = [];
            let currentBlock: BlockBuilder | null = null;
            const items = textContent.items.sort((a: any, b: any) => {
                const yA = viewport.height - a.transform[5];
                const yB = viewport.height - b.transform[5];
                if (Math.abs(yA - yB) > 10) return yA - yB;
                return a.transform[4] - b.transform[4];
            });
            for (const item of items) {
                const x = item.transform[4];
                const y = viewport.height - item.transform[5] - item.height;
                const w = item.width;
                const h = item.height;
                const normX = (x / viewport.width) * 1000;
                const normY = (y / viewport.height) * 1000;
                const normW = (w / viewport.width) * 1000;
                const normH = (h / viewport.height) * 1000;
                if (currentBlock) {
                    const verticalGap = normY - currentBlock.ymax;
                    if (verticalGap < 20 && verticalGap > -50) {
                        currentBlock.xmin = Math.min(currentBlock.xmin, normX);
                        currentBlock.ymin = Math.min(currentBlock.ymin, normY);
                        currentBlock.xmax = Math.max(currentBlock.xmax, normX + normW);
                        currentBlock.ymax = Math.max(currentBlock.ymax, normY + normH);
                        currentBlock.items.push(item);
                        continue;
                    }
                }
                if (currentBlock) {
                    const cb = currentBlock;
                    if ((cb.xmax - cb.xmin) > 10 && (cb.ymax - cb.ymin) > 10) {
                        blocks.push({ label: determineLabel(cb.items), xmin: cb.xmin, ymin: cb.ymin, xmax: cb.xmax, ymax: cb.ymax });
                    }
                }
                currentBlock = { xmin: normX, ymin: normY, xmax: normX + normW, ymax: normY + normH, items: [item] };
            }
            if (currentBlock) {
                const cb = currentBlock;
                blocks.push({ label: determineLabel(cb.items), xmin: cb.xmin, ymin: cb.ymin, xmax: cb.xmax, ymax: cb.ymax });
            }
            if (blocks.length > 0) setZones(prev => [...prev, ...blocks]);
        } catch (e) { console.error("Auto detection failed", e); }
        finally { setIsDetecting(false); }
    };

    const determineLabel = (items: any[]) => {
        const text = items.map(i => i.str).join(' ').toLowerCase();
        if (text.includes('fecha') || text.includes('date')) return 'Fecha';
        if (text.includes('total') || text.includes('amount')) return 'Total';
        if (text.includes('invoice') || text.includes('factura')) return 'Referencia';
        if (text.length > 50) return 'Párrafo';
        return 'Texto';
    };

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) { setNumPages(numPages); }
    function onPageLoadSuccess(page: any) {
        const { width, height } = page.getViewport({ scale: 1.0 });
        setPdfDimensions({ width, height });
        if (initialZones.length === 0 && zones.length === 0) runAutoDetection(page);
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current || !pdfDimensions) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width * 1000;
        const y = (e.clientY - rect.top) / rect.height * 1000;
        setDragStart({ x, y }); setDragCurrent({ x, y }); setSelectedZone(null);
    };
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragStart || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setDragCurrent({ x: (e.clientX - rect.left) / rect.width * 1000, y: (e.clientY - rect.top) / rect.height * 1000 });
    };
    const handleMouseUp = () => {
        if (!dragStart || !dragCurrent) return;
        const xmin = Math.min(dragStart.x, dragCurrent.x);
        const ymin = Math.min(dragStart.y, dragCurrent.y);
        const xmax = Math.max(dragStart.x, dragCurrent.x);
        const ymax = Math.max(dragStart.y, dragCurrent.y);
        if ((xmax - xmin) > 20 && (ymax - ymin) > 20) {
            setZones(prev => { const newZones = [...prev, { label: 'Párrafo', xmin, ymin, xmax, ymax }]; setSelectedZone(newZones.length - 1); return newZones; });
        }
        setDragStart(null); setDragCurrent(null);
    };

    const deleteSelected = () => { if (selectedZone === null) return; setZones(z => z.filter((_, i) => i !== selectedZone)); setSelectedZone(null); };
    const clearAll = () => { if (confirm("¿Estás seguro de que quieres borrar todas las zonas?")) { setZones([]); setSelectedZone(null); } };

    // Auto-calculate header and footer margins from zone positions
    const computeMargins = () => {
        let headerBottomNorm = 0; // lowest point of header zones (0-1000)
        let footerTopNorm = 1000; // highest point of footer zones (0-1000)

        zones.forEach(zone => {
            const label = (zone.label || '').toLowerCase();
            const isHeader = label.includes('logo') || label === 'título' || label === 'fecha' || label === 'referencia';
            const isFooter = label.includes('pie');

            if (isHeader) {
                headerBottomNorm = Math.max(headerBottomNorm, zone.ymax);
            } else if (isFooter) {
                footerTopNorm = Math.min(footerTopNorm, zone.ymin);
            }
        });

        // Convert from 0-1000 to mm (A4 height = 297mm)
        const headerMm = headerBottomNorm > 0 ? Math.ceil((headerBottomNorm / 1000) * 297) + 3 : 25;
        const footerMm = footerTopNorm < 1000 ? Math.ceil(((1000 - footerTopNorm) / 1000) * 297) + 3 : 20;

        return { headerMm, footerMm };
    };

    const margins = computeMargins();
    // Convert mm back to percentage for guide lines (297mm = 100%)
    const headerGuideYPct = (margins.headerMm / 297) * 100;
    const footerGuideYPct = 100 - (margins.footerMm / 297) * 100;

    const ZONE_COLORS: Record<string, string> = {
        'Logo Empresa': 'border-violet-500 bg-violet-500/10',
        'Logo Cliente': 'border-blue-500 bg-blue-500/10',
        'Título': 'border-amber-500 bg-amber-500/10',
        'Fecha': 'border-emerald-500 bg-emerald-500/10',
        'Imagen': 'border-pink-500 bg-pink-500/10',
        'Referencia': 'border-orange-500 bg-orange-500/10',
    };
    const getZoneColor = (label: string) => ZONE_COLORS[label] || 'border-blue-400/30 bg-blue-400/5';

    return (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-background w-full h-full max-w-[1800px] rounded-2xl flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/10">

                {/* Toolbar */}
                <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg"><Maximize className="w-5 h-5 text-primary" /></div>
                        <div>
                            <h2 className="text-base font-bold">Diseñador de Plantilla</h2>
                            <p className="text-xs text-muted-foreground">Define las secciones del documento</p>
                        </div>
                        <div className="h-6 w-px bg-border mx-2" />
                        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg border border-border p-1">
                            <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1.5 hover:bg-background rounded-md transition-colors"><ZoomOut className="w-3.5 h-3.5" /></button>
                            <span className="text-xs font-mono w-10 text-center font-bold">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale(s => Math.min(2.0, s + 0.1))} className="p-1.5 hover:bg-background rounded-md transition-colors"><ZoomIn className="w-3.5 h-3.5" /></button>
                        </div>
                        {zones.length > 0 && (
                            <button onClick={clearAll} className="px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg flex items-center gap-1.5 transition-colors">
                                <Trash2 className="w-3 h-3" /> Limpiar todo
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowHelp(h => !h)} className={`px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors ${showHelp ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'}`}>
                            <HelpCircle className="w-4 h-4" /> Guía
                        </button>
                        <button onClick={onClose} className="px-5 py-2 hover:bg-secondary rounded-xl font-medium text-sm transition-colors">Cancelar</button>
                        <button onClick={() => onSave(zones, margins)} className="px-5 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 text-sm flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                            <Save className="w-4 h-4" /> Guardar Diseño ({zones.length} zona{zones.length !== 1 ? 's' : ''})
                        </button>
                    </div>
                </div>

                {/* Main Area */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Sidebar */}
                    <div className="w-80 border-r border-border bg-card/80 flex flex-col overflow-hidden shrink-0">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">

                            {/* Step Guide */}
                            {showHelp && (
                                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                        <span className="text-xs font-bold uppercase tracking-widest text-primary">Cómo funciona</span>
                                    </div>
                                    {STEPS.map(step => (
                                        <div key={step.n} className="flex items-start gap-3">
                                            <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{step.n}</div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{step.text}</p>
                                        </div>
                                    ))}
                                    <div className="mt-3 pt-3 border-t border-primary/10 flex items-start gap-2">
                                        <Info className="w-4 h-4 text-primary/60 shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-muted-foreground/70">La IA ha marcado automáticamente las zonas que detectó en el documento. Revísalas y ajusta los tipos.</p>
                                    </div>
                                </div>
                            )}

                            {/* Contextual Panel — changes based on selection */}
                            {selectedZone !== null && zones[selectedZone] ? (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Zona seleccionada</span>
                                        <button onClick={deleteSelected} className="text-xs text-destructive hover:underline flex items-center gap-1">
                                            <Trash2 className="w-3 h-3" /> Eliminar
                                        </button>
                                    </div>

                                    {/* Type Selector */}
                                    <div className="space-y-2">
                                        {ZONE_LABELS.map(def => {
                                            const Icon = def.icon;
                                            const isSelected = zones[selectedZone].label === def.value;
                                            return (
                                                <button
                                                    key={def.value}
                                                    onClick={() => {
                                                        const newZones = [...zones];
                                                        newZones[selectedZone] = { ...newZones[selectedZone], label: def.value };
                                                        setZones(newZones);
                                                    }}
                                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/30 hover:bg-secondary/40'}`}
                                                >
                                                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-primary' : def.color}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-foreground truncate">{def.label}</p>
                                                    </div>
                                                    {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Source Selector (for Logo, Imagen, Pie) */}
                                    {(zones[selectedZone].label.includes('Logo') || zones[selectedZone].label === 'Imagen' || zones[selectedZone].label === 'Pie') && (
                                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-3 animate-in zoom-in-95 duration-200">
                                            <p className="text-[10px] font-bold uppercase text-primary tracking-widest flex items-center gap-2">
                                                <Sparkles className="w-3 h-3" /> Origen del contenido
                                            </p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => {
                                                        const newZones = [...zones];
                                                        newZones[selectedZone] = { ...newZones[selectedZone], sourceType: 'dynamic' };
                                                        setZones(newZones);
                                                    }}
                                                    className={`py-2 px-3 rounded-lg border text-[10px] font-bold transition-all ${zones[selectedZone].sourceType !== 'static' ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background border-border text-muted-foreground hover:border-primary/30'}`}
                                                >
                                                    Logo Proyecto
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const newZones = [...zones];
                                                        newZones[selectedZone] = { ...newZones[selectedZone], sourceType: 'static' };
                                                        // Capture the zone image from the PDF canvas
                                                        const captured = captureZoneImage(selectedZone);
                                                        if (captured) {
                                                            newZones[selectedZone] = { ...newZones[selectedZone], sourceType: 'static', staticValue: captured };
                                                        }
                                                        setZones(newZones);
                                                    }}
                                                    className={`py-2 px-3 rounded-lg border text-[10px] font-bold transition-all ${zones[selectedZone].sourceType === 'static' ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background border-border text-muted-foreground hover:border-primary/30'}`}
                                                >
                                                    Captar zona
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-tight italic">
                                                {zones[selectedZone].sourceType === 'static'
                                                    ? zones[selectedZone].staticValue
                                                        ? '✅ Imagen capturada correctamente de esta zona del PDF.'
                                                        : '⚠️ No se pudo capturar la imagen. Asegúrate de que el PDF esté cargado.'
                                                    : 'Buscará automáticamente el campo "logo" en la ficha del proyecto o cliente.'}
                                            </p>
                                        </div>
                                    )}

                                    {/* Tip for selected label type */}
                                    {selectedDef && (
                                        <div className="bg-secondary/40 border border-border rounded-xl p-3 space-y-2 animate-in fade-in duration-200">
                                            <div className="flex items-center gap-2">
                                                <Info className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">¿Qué hará esta zona?</span>
                                            </div>
                                            <p className="text-xs text-foreground/80 leading-relaxed">{selectedDef.hint}</p>
                                            {selectedDef.source && (
                                                <div className="flex items-start gap-1.5 pt-1 border-t border-border/50">
                                                    <ArrowRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                                                    <p className="text-[11px] text-muted-foreground">{selectedDef.source}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <p className="text-[10px] text-muted-foreground/50 text-center pt-1">
                                        Haz clic en otra zona del documento para seleccionarla
                                    </p>
                                </div>
                            ) : (
                                // No zone selected — show zone list summary
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Zonas definidas</span>
                                        <span className="text-xs bg-secondary/60 px-2 py-0.5 rounded-full font-mono">{zones.length}</span>
                                    </div>

                                    {zones.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40 gap-3">
                                            <MousePointer2 className="w-8 h-8" />
                                            <p className="text-xs text-center leading-relaxed">Arrastra sobre el documento para crear la primera zona</p>
                                        </div>
                                    ) : (
                                        zones.map((zone, idx) => {
                                            const def = ZONE_LABELS.find(d => d.value === zone.label);
                                            const Icon = def?.icon ?? AlignLeft;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => setSelectedZone(idx)}
                                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/40 transition-all text-left"
                                                >
                                                    <Icon className={`w-4 h-4 shrink-0 ${def?.color ?? 'text-muted-foreground'}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-foreground truncate">{zone.label ?? 'Sin tipo'}</p>
                                                        <p className="text-[10px] text-muted-foreground font-mono">Y:{Math.round(zone.ymin)} H:{Math.round(zone.ymax - zone.ymin)}</p>
                                                    </div>
                                                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Bottom CTA */}
                        {zones.length > 0 && selectedZone === null && (
                            <div className="p-4 border-t border-border bg-card shrink-0">
                                <button
                                    onClick={() => onSave(zones, margins)}
                                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Confirmar y Guardar Diseño
                                </button>
                                <p className="text-[10px] text-muted-foreground text-center mt-2">{zones.length} zona{zones.length !== 1 ? 's' : ''} definida{zones.length !== 1 ? 's' : ''}</p>
                            </div>
                        )}
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
                                            <span className="text-sm font-medium text-muted-foreground">Analizando estructura del documento...</span>
                                        </div>
                                    }
                                >
                                    <Page pageNumber={pageNumber} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} onLoadSuccess={onPageLoadSuccess} className="pointer-events-none" />
                                </Document>
                            ) : (
                                <div className="w-[800px] h-[1100px] bg-white flex flex-col items-center justify-center p-12 text-center">
                                    <BoxSelect className="w-12 h-12 text-slate-300 mb-4" />
                                    <h3 className="text-lg font-bold text-slate-800">Lienzo Libre</h3>
                                    <p className="text-sm text-slate-500 max-w-sm mt-2">Arrastra para definir las zonas de tu plantilla sobre el lienzo en blanco.</p>
                                </div>
                            )}

                            {/* Zones Overlay */}
                            {pdfDimensions && zones.map((zone, idx) => (
                                <div
                                    key={idx}
                                    style={{ position: 'absolute', left: `${zone.xmin / 10}%`, top: `${zone.ymin / 10}%`, width: `${(zone.xmax - zone.xmin) / 10}%`, height: `${(zone.ymax - zone.ymin) / 10}%` }}
                                    onMouseDown={(e) => { e.stopPropagation(); setSelectedZone(idx); }}
                                    className={`absolute border-2 transition-all duration-200 group cursor-pointer ${selectedZone === idx ? 'border-primary bg-primary/10 z-20 ring-4 ring-primary/10' : `${getZoneColor(zone.label ?? '')} hover:z-10`}`}
                                >
                                    {selectedZone === idx && (
                                        <div className="absolute -top-3 -right-3">
                                            <button onClick={(e) => { e.stopPropagation(); deleteSelected(); }} className="bg-destructive text-destructive-foreground p-1 rounded-full shadow-sm hover:scale-110 transition-transform">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                    <div className={`absolute top-0 left-0 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-br truncate max-w-full ${selectedZone === idx ? 'bg-primary text-primary-foreground' : 'bg-white/80 text-slate-700 opacity-0 group-hover:opacity-100'}`}>
                                        {zone.label ?? 'Sin tipo'}
                                    </div>
                                </div>
                            ))}

                            {/* Margin Guide Lines */}
                            {pdfDimensions && zones.length > 0 && (
                                <>
                                    {/* Header margin line */}
                                    <div
                                        style={{ position: 'absolute', left: 0, right: 0, top: `${headerGuideYPct}%`, height: '1px', borderTop: '2px dashed #3b82f6', zIndex: 50, pointerEvents: 'none', opacity: 0.7 }}
                                    >
                                        <span style={{ position: 'absolute', right: 4, top: 2, fontSize: '9px', color: '#3b82f6', fontWeight: 700, background: 'rgba(255,255,255,0.9)', padding: '0 4px', borderRadius: 3 }}>▼ Cabecera: {margins.headerMm}mm</span>
                                    </div>
                                    {/* Footer margin line */}
                                    <div
                                        style={{ position: 'absolute', left: 0, right: 0, top: `${footerGuideYPct}%`, height: '1px', borderTop: '2px dashed #ef4444', zIndex: 50, pointerEvents: 'none', opacity: 0.7 }}
                                    >
                                        <span style={{ position: 'absolute', right: 4, bottom: 2, fontSize: '9px', color: '#ef4444', fontWeight: 700, background: 'rgba(255,255,255,0.9)', padding: '0 4px', borderRadius: 3 }}>▲ Pie: {margins.footerMm}mm</span>
                                    </div>
                                </>
                            )}

                            {/* Drag Draft */}
                            {dragStart && dragCurrent && (
                                <div style={{ position: 'absolute', left: `${Math.min(dragStart.x, dragCurrent.x) / 10}%`, top: `${Math.min(dragStart.y, dragCurrent.y) / 10}%`, width: `${Math.abs(dragCurrent.x - dragStart.x) / 10}%`, height: `${Math.abs(dragCurrent.y - dragStart.y) / 10}%` }}
                                    className="border-2 border-dashed border-primary bg-primary/20 z-30 pointer-events-none" />
                            )}

                            {/* Detecting indicator */}
                            {isDetecting && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-40 rounded">
                                    <div className="bg-card px-5 py-4 rounded-xl flex items-center gap-3 shadow-2xl">
                                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                        <span className="text-sm font-medium">IA detectando bloques...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {numPages > 1 && (
                            <div className="absolute bottom-8 flex items-center gap-4 bg-background/80 backdrop-blur p-2 rounded-full border border-border shadow-2xl">
                                <button disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)} className="p-2 hover:bg-secondary rounded-full disabled:opacity-50 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                                <span className="font-bold text-sm px-2 font-mono">{pageNumber} / {numPages}</span>
                                <button disabled={pageNumber >= numPages} onClick={() => setPageNumber(p => p + 1)} className="p-2 hover:bg-secondary rounded-full disabled:opacity-50 transition-colors"><ChevronRight className="w-5 h-5" /></button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

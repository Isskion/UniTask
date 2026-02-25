"use client";

import { useState, useEffect } from "react";
import {
    X, Printer, Check, Copy, ChevronRight, FileText,
    Link, Shield, Code, Download, FileJson, Share2,
    CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InterfaceEntry, Project } from "@/types";
import { useTheme } from "@/hooks/useTheme";

interface InterfaceReportProps {
    project: Project;
    interfaces: InterfaceEntry[];
    onClose: () => void;
}

export function InterfaceReport({ project, interfaces, onClose }: InterfaceReportProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";
    const [selectedIds, setSelectedIds] = useState<string[]>(interfaces.map(i => i.id));
    const [view, setView] = useState<'selector' | 'report'>('selector');

    const toggleInterface = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selectedInterfaces = interfaces.filter(i => selectedIds.includes(i.id));

    const handlePrint = () => {
        window.print();
    };

    useEffect(() => {
        if (view === 'report') {
            document.body.classList.add('report-open');
            return () => document.body.classList.remove('report-open');
        }
    }, [view]);

    if (view === 'report') {
        return (
            <div id="unitask-interface-report" className="fixed inset-0 z-[70] bg-background overflow-y-auto custom-scrollbar animate-in fade-in duration-300 print:relative print:inset-0 print:overflow-visible print:bg-white">
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        @page {
                            margin: 2cm;
                            size: auto;
                        }
                        /* Reset document for multi-page flow */
                        html, body {
                            height: auto !important;
                            overflow: visible !important;
                            background: white !important;
                            color: black !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        /* 
                         * STRATEGY: Use visibility to hide everything, then re-show the report.
                         * This works regardless of DOM nesting depth (fixes #__next issue).
                         * Step 1: Hide ALL content globally.
                         */
                        body * {
                            visibility: hidden !important;
                        }
                        /* Step 2: Make the report container and ALL its children visible */
                        #unitask-interface-report,
                        #unitask-interface-report * {
                            visibility: visible !important;
                        }
                        /* Step 3: Position the report at the top of the page */
                        #unitask-interface-report {
                            position: absolute !important;
                            top: 0 !important;
                            left: 0 !important;
                            width: 100% !important;
                            display: block !important;
                            height: auto !important;
                            overflow: visible !important;
                            background: white !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            z-index: 99999 !important;
                        }
                        /* Text colors for print */
                        #unitask-interface-report * {
                            color: black !important;
                            border-color: #eee !important;
                        }
                        /* Link colors and primary accents on print */
                        .text-primary {
                            color: #000 !important;
                            font-weight: bold !important;
                        }
                        /* Control Bar and UI elements MUST be hidden */
                        .print-hidden {
                            display: none !important;
                            visibility: hidden !important;
                        }
                        /* Avoid cutting sections or cards */
                        .break-inside-avoid, section, .rounded-2xl {
                            break-inside: avoid !important;
                            page-break-inside: avoid !important;
                        }
                        /* Ensure code blocks wrap instead of horizontal scroll */
                        pre, code {
                            white-space: pre-wrap !important;
                            word-break: break-all !important;
                            background: #f8f8f8 !important;
                            border: 1px solid #ddd !important;
                            color: #333 !important;
                        }
                        /* Reset background colors for cleaner print */
                        .bg-zinc-50, .bg-zinc-900, .bg-card, .bg-background {
                            background-color: transparent !important;
                            background: none !important;
                        }
                        .border {
                            border-color: #ddd !important;
                        }
                    }
                `}} />
                {/* Control Bar (Hidden on print) */}
                <div className="sticky top-0 z-10 p-4 border-b bg-background/80 backdrop-blur-md flex items-center justify-between print:hidden print-hidden">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setView('selector')}
                            className="p-2 hover:bg-black/5 rounded-full text-muted-foreground"
                        >
                            <ChevronRight className="w-5 h-5 rotate-180" />
                        </button>
                        <div>
                            <h2 className="text-sm font-bold">Vista Previa del Informe</h2>
                            <p className="text-[10px] text-muted-foreground">{selectedInterfaces.length} interfaces seleccionadas</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-lg shadow-primary/20"
                        >
                            <Printer className="w-4 h-4" />
                            Imprimir / Guardar PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-black/5 rounded-full"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Report Content */}
                <div className="max-w-5xl mx-auto p-8 md:p-12 space-y-12 print:p-0 print:max-w-none">
                    {/* Header */}
                    <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-12">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest">
                                Reporte Técnico de Interfaces
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight">{project.name}</h1>
                            <p className="text-muted-foreground max-w-xl">
                                Documentación consolidada de puntos de conexión, credenciales y especificaciones técnicas para las integraciones del proyecto.
                            </p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                            <div className="text-xs font-bold uppercase text-muted-foreground">Generado el</div>
                            <div className="text-lg font-mono">{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                        </div>
                    </header>

                    {/* Content Grid */}
                    <div className="space-y-12">
                        {selectedInterfaces.map((iface, index) => (
                            <section key={iface.id} className="space-y-6 break-inside-avoid">
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-black text-sm">
                                        {index + 1}
                                    </span>
                                    <h2 className="text-2xl font-bold">{iface.name}</h2>
                                    <div className="flex-1 border-b border-dashed border-primary/20" />
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 uppercase">
                                        {iface.formatType}
                                    </span>
                                </div>

                                <p className="text-sm opacity-80 leading-relaxed">
                                    {iface.description || "Sin descripción proporcionada."}
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Connectivity */}
                                    <div className="md:col-span-2 space-y-4">
                                        <div className={cn("p-6 rounded-2xl border space-y-4", isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900 border-white/5")}>
                                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground">
                                                <Link className="w-3 h-3" />
                                                Punto de Acceso (Endpoint)
                                            </div>
                                            <div className="font-mono text-sm break-all text-primary font-bold">
                                                {iface.url || "URL no especificada"}
                                            </div>

                                            {(iface.clientId || iface.clientSecret) && (
                                                <div className="pt-4 mt-4 border-t border-dashed border-primary/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {iface.clientId && (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-muted-foreground">
                                                                <Shield className="w-2.5 h-2.5" /> Client ID
                                                            </div>
                                                            <div className="font-mono text-xs select-all bg-black/5 p-2 rounded-md border border-black/5">
                                                                {iface.clientId}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {iface.clientSecret && (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-muted-foreground">
                                                                <Shield className="w-2.5 h-2.5" /> API Secret
                                                            </div>
                                                            <div className="font-mono text-xs p-2 bg-black/5 rounded-md border border-black/5">
                                                                ••••••••••••••••••••
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status / Meta */}
                                    <div className={cn("p-6 rounded-2xl border flex flex-col justify-between", isLight ? "bg-white border-zinc-200" : "bg-card/50 border-white/5")}>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold uppercase opacity-50">Estado</span>
                                                <span className="flex items-center gap-1 text-[9px] font-bold uppercase text-green-500">
                                                    <CheckCircle2 className="w-3 h-3" /> Activa
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold uppercase opacity-50">Versión Prod</span>
                                                <span className="text-[9px] font-bold uppercase">
                                                    {iface.versions.find(v => v.isProduction)?.versionName || "No definida"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="pt-4">
                                            <div className="text-[9px] font-bold uppercase opacity-30 text-center tracking-tighter">
                                                UniTask Connectivity Report
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Code Snippet */}
                                <div className={cn("rounded-2xl border overflow-hidden", isLight ? "bg-zinc-950 text-zinc-300" : "bg-black border-white/10 text-zinc-400")}>
                                    <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between bg-white/5">
                                        <div className="flex items-center gap-2">
                                            <Code className="w-3 h-3 text-primary" />
                                            <span className="text-[10px] font-bold uppercase font-mono">Payload Sample</span>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <pre className="text-xs font-mono whitespace-pre-wrap break-all leading-relaxed">
                                            {iface.formatContent || "// No sample content available"}
                                        </pre>
                                    </div>
                                </div>
                            </section>
                        ))}
                    </div>

                    {/* Footer */}
                    <footer className="pt-20 border-t flex flex-col md:flex-row items-baseline justify-between gap-4 opacity-40">
                        <div className="text-sm font-bold tracking-tighter">UNITASK REPORTING SYSTEM</div>
                        <div className="text-[10px] uppercase font-bold tracking-widest">{project.name} // CONFIDENCIAL</div>
                    </footer>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={cn(
                "w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300",
                isLight ? "bg-white border-zinc-200" : "bg-zinc-950 border-white/10"
            )}>
                <div className="p-6 border-b flex justify-between items-center bg-black/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Exportar Informe de Interfaces</h3>
                            <p className="text-xs text-muted-foreground">Selecciona las interfaces que quieres incluir en el reporte técnico.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    <div className="grid grid-cols-1 gap-2">
                        {interfaces.map(iface => (
                            <button
                                key={iface.id}
                                onClick={() => toggleInterface(iface.id)}
                                className={cn(
                                    "flex items-center gap-4 p-4 rounded-xl border transition-all text-left group",
                                    selectedIds.includes(iface.id)
                                        ? "bg-primary/5 border-primary shadow-sm"
                                        : isLight ? "bg-zinc-50 border-zinc-100 hover:border-zinc-300" : "bg-white/5 border-white/5 hover:border-white/10"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                                    selectedIds.includes(iface.id)
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "border-muted-foreground/30 group-hover:border-primary/50"
                                )}>
                                    {selectedIds.includes(iface.id) && <Check className="w-3.5 h-3.5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold truncate group-hover:text-primary transition-colors">{iface.name}</h4>
                                    <p className="text-[10px] text-muted-foreground line-clamp-1">{iface.description || "Sin descripción"}</p>
                                </div>
                                <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 uppercase opacity-60">
                                    {iface.formatType}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t bg-black/5 flex items-center justify-between gap-4">
                    <div className="text-xs font-bold text-muted-foreground">
                        {selectedIds.length} seleccionadas
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-sm font-bold opacity-60 hover:opacity-100 transition-all text-zinc-500"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={selectedIds.length === 0}
                            onClick={() => setView('report')}
                            className="px-8 py-2 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Ver Vista Previa
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

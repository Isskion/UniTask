"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    X, Printer, Check, Copy, ChevronRight, FileText,
    Link, Shield, Code, Download, FileJson, Share2,
    CheckCircle2, ArrowRightLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InterfaceEntry, Project } from "@/types";
import { useTheme } from "@/hooks/useTheme";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

interface InterfaceReportProps {
    project: Project;
    interfaces: InterfaceEntry[];
    onClose: () => void;
}

const FORBIDDEN_EMAIL = "daniel.delamo@unigis.com";

const maskCredential = (val: string | undefined): string => {
    if (!val) return "";
    if (val.toLowerCase() === FORBIDDEN_EMAIL.toLowerCase()) return "";
    return val;
};

export function InterfaceReport({ project, interfaces, onClose }: InterfaceReportProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";
    const [selectedIds, setSelectedIds] = useState<string[]>(interfaces.map(i => i.id));
    const [view, setView] = useState<'selector' | 'report'>('selector');
    const [isClient, setIsClient] = useState(false);
    
    const { user } = useAuth();
    const [tenantLogo, setTenantLogo] = useState<string | null>(null);
    const [clientLogo, setClientLogo] = useState<string | null>(null);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        let isMounted = true;
        const loadLogos = async () => {
            if (!user?.tenantId) return;
            try {
                // Tenant Logo
                const tenantDoc = await getDoc(doc(db, "tenants", user.tenantId));
                if (tenantDoc.exists() && isMounted) {
                    const data = tenantDoc.data();
                    if (data.logos?.length > 0) {
                        const empresaLogo = data.logos.find((l: any) => l.label?.toUpperCase().includes("EMPRESA"));
                        const principalLogo = data.logos.find((l: any) => l.label?.toUpperCase().includes("PRINCIPAL"));
                        setTenantLogo(empresaLogo?.url || principalLogo?.url || data.logos[0].url);
                    } else if (data.logoUrl) {
                        setTenantLogo(data.logoUrl);
                    }
                }

                // Client Logo
                if ((project as any).clientLogoUrl && typeof (project as any).clientLogoUrl === 'string' && (project as any).clientLogoUrl.trim() !== '') {
                    setClientLogo((project as any).clientLogoUrl);
                } else {
                    const docsSnap = await getDocs(collection(db, "projects", project.id, "documents"));
                    let logoDoc = docsSnap.docs.find(d => d.data().typeCode?.toUpperCase() === 'LOGO');
                    if (!logoDoc) logoDoc = docsSnap.docs.find(d => d.data().name?.toUpperCase().includes('LOGO'));
                    if (!logoDoc) logoDoc = docsSnap.docs.find(d => (d.data().type || '').toLowerCase().startsWith('image/') && d.data().url);
                    if (logoDoc && isMounted) {
                        const data = logoDoc.data();
                        const logoUrl = data.url || data.fileUrl || data.downloadURL;
                        if (logoUrl) setClientLogo(logoUrl);
                    }
                }
            } catch (e) {
                console.error("Error loading logos:", e);
            }
        };
        loadLogos();
        return () => { isMounted = false; };
    }, [user?.tenantId, project.id, (project as any).clientLogoUrl]);

    const toggleInterface = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selectedInterfaces = interfaces
        .filter(i => selectedIds.includes(i.id))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const handlePrint = () => {
        window.print();
    };

    useEffect(() => {
        if (view === 'report') {
            document.body.classList.add('report-open');
            return () => document.body.classList.remove('report-open');
        }
    }, [view]);

    if (!isClient) return null;

    return createPortal(
        <>
            {view === 'report' ? (
                <div id="unitask-interface-report" className="fixed inset-0 z-[110] bg-background border-none overflow-y-auto custom-scrollbar animate-in fade-in duration-300 print:relative print:inset-0 print:overflow-visible print:bg-white">
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @media print {
                            @page {
                                margin: 2cm;
                                size: auto;
                            }
                            html, body {
                                height: auto !important;
                                overflow: visible !important;
                                background: white !important;
                                color: black !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            body * {
                                visibility: hidden !important;
                            }
                            #unitask-interface-report,
                            #unitask-interface-report * {
                                visibility: visible !important;
                            }
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
                            #unitask-interface-report * {
                                color: black !important;
                                border-color: #eee !important;
                            }
                            /* Forzar fondo claro en bloques de código y contenedores oscuros para que el texto negro sea visible */
                            #unitask-interface-report .bg-black,
                            #unitask-interface-report .bg-zinc-950,
                            #unitask-interface-report .bg-zinc-900,
                            #unitask-interface-report pre {
                                background-color: #f4f4f5 !important;
                            }
                            .text-primary {
                                color: #000 !important;
                                font-weight: bold !important;
                            }
                            .print\\:hidden {
                                display: none !important;
                            }
                        }
                    `}} />

                    {/* Report Control Bar */}
                    <div className="sticky top-0 z-50 p-4 border-b bg-background/80 backdrop-blur-md flex items-center justify-between print:hidden">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setView('selector')}
                                className="p-2 hover:bg-black/5 rounded-full transition-all"
                            >
                                <ChevronRight className="w-5 h-5 rotate-180" />
                            </button>
                            <div className="h-6 w-px bg-border mx-2" />
                            <h2 className="text-sm font-bold uppercase tracking-widest opacity-60">Vista de Impresión</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrint}
                                className="p-2 px-4 rounded-xl bg-primary text-primary-foreground flex items-center gap-2 text-xs font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                <Printer className="w-4 h-4" />
                                Imprimir Reporte
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-black/5 rounded-full transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Report Content */}
                    <div className="max-w-5xl mx-auto p-8 md:p-12 space-y-12 print:p-0 print:max-w-none">
                        {/* Header Logos for Print/Preview */}
                        <div className="flex items-center justify-between mb-8 pb-8 border-b">
                            <div className="w-40 flex justify-start">
                                {tenantLogo ? (
                                    <img src={tenantLogo} alt="Logo Empresa" className="max-h-16 object-contain" />
                                ) : (
                                    <div className="h-16" />
                                )}
                            </div>
                            <div className="flex-1 text-center px-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
                                    Reporte Técnico de Interfaces
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase">{project.name}</h1>
                            </div>
                            <div className="w-40 flex justify-end">
                                {clientLogo ? (
                                    <img src={clientLogo} alt="Logo Cliente" className="max-h-16 object-contain" />
                                ) : (
                                    <div className="h-16" />
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
                            <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
                                Documentación consolidada de puntos de conexión, credenciales y especificaciones técnicas para las integraciones del proyecto.
                            </p>
                            <div className="text-right flex flex-col items-end gap-1 shrink-0">
                                <div className="text-[10px] font-bold uppercase text-muted-foreground">Generado el</div>
                                <div className="text-base font-mono">{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className="space-y-12">
                            {selectedInterfaces.map((iface, index) => (
                                <section key={iface.id} className="space-y-6 break-inside-avoid animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                                    <div className="flex items-center gap-4">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-black text-sm">
                                            {index + 1}
                                        </span>
                                        <h2 className="text-2xl font-bold tracking-tight">{iface.name}</h2>
                                        <div className="flex-1 border-b border-dashed border-primary/20" />
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 uppercase font-bold">
                                            {iface.formatType}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="md:col-span-2 space-y-4">
                                            <div className={cn("p-6 rounded-2xl border space-y-4 shadow-sm", isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900 border-white/5")}>
                                                <div className="flex items-center gap-2 text-[9px] font-bold uppercase text-muted-foreground tracking-widest">
                                                    <Link className="w-3 h-3" />
                                                    Punto de Acceso (Endpoint)
                                                </div>
                                                <div className="font-mono text-sm break-all text-primary font-bold">
                                                    {iface.url || "URL no especificada"}
                                                </div>

                                                <div className="pt-4 mt-4 border-t border-dashed border-primary/10 space-y-2">
                                                    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-muted-foreground tracking-widest">
                                                        <FileText className="w-3.5 h-3.5" /> Descripción de la Interfaz
                                                    </div>
                                                    <p className="text-sm opacity-90 leading-relaxed font-medium">
                                                        {iface.description || "Sin descripción proporcionada."}
                                                    </p>
                                                </div>

                                                {iface.formatContent && (
                                                    <div className="pt-4 mt-4 border-t border-dashed border-primary/10 space-y-2">
                                                        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-muted-foreground tracking-widest">
                                                            <Code className="w-3.5 h-3.5" /> Especificación Técnica ({iface.formatType})
                                                        </div>
                                                        <pre className="text-[11px] font-mono whitespace-pre-wrap break-all leading-relaxed bg-black/5 dark:bg-black/20 p-4 rounded-xl border border-black/5 text-zinc-650 dark:text-zinc-400">
                                                            {iface.formatContent}
                                                        </pre>
                                                    </div>
                                                )}

                                                {iface.mapping && iface.mapping.length > 0 && (
                                                    <div className="pt-4 mt-4 border-t border-dashed border-primary/10 space-y-2">
                                                        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-muted-foreground tracking-widest">
                                                            <ArrowRightLeft className="w-3.5 h-3.5" /> Mapeo de Campos
                                                        </div>
                                                        <pre className="text-[11px] font-mono whitespace-pre-wrap break-all leading-relaxed bg-black/5 dark:bg-black/20 p-4 rounded-xl border border-black/5 text-zinc-650 dark:text-zinc-400">
                                                            {iface.mapping}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className={cn("p-6 rounded-2xl border flex flex-col justify-between shadow-sm", isLight ? "bg-white border-zinc-200" : "bg-card/50 border-white/5")}>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] font-bold uppercase opacity-50 tracking-tighter">Estado Operativo</span>
                                                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase text-green-500">
                                                        <CheckCircle2 className="w-3 h-3" /> Activa
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] font-bold uppercase opacity-50 tracking-tighter">Versión Producción</span>
                                                    <span className="text-[9px] font-mono font-bold uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                                        {iface.versions.find(v => v.isProduction)?.versionName || "v1.0.0"}
                                                    </span>
                                                </div>
                                                {iface.direction && (
                                                    <div className="flex items-center justify-between pt-2 border-t border-dashed border-zinc-200 dark:border-white/5">
                                                        <span className="text-[9px] font-bold uppercase opacity-50 tracking-tighter">Dirección</span>
                                                        <span className={cn(
                                                            "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded font-black",
                                                            iface.direction === 'salida' ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                                                        )}>
                                                            {iface.direction === 'salida' ? 'Salida' : 'Entrada'}
                                                        </span>
                                                    </div>
                                                )}
                                                {(iface.source || iface.destination) && (
                                                    <div className="flex items-center justify-between pt-2 border-t border-dashed border-zinc-200 dark:border-white/5">
                                                        <span className="text-[9px] font-bold uppercase opacity-50 tracking-tighter">Flujo (Ori → Dest)</span>
                                                        <span className="text-[9px] font-mono font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                                            {iface.source || '?'} → {iface.destination || '?'}
                                                        </span>
                                                    </div>
                                                )}
                                                {iface.interfaceType && (
                                                    <div className="flex items-center justify-between pt-2 border-t border-dashed border-zinc-200 dark:border-white/5">
                                                        <span className="text-[9px] font-bold uppercase opacity-50 tracking-tighter">Tipo Interfaz</span>
                                                        <span className="text-[9px] font-mono font-bold text-zinc-600 dark:text-zinc-400">
                                                            {iface.interfaceType}
                                                        </span>
                                                    </div>
                                                )}
                                                {iface.method && (
                                                    <div className="flex flex-col gap-1 pt-2 border-t border-dashed border-zinc-200 dark:border-white/5">
                                                        <span className="text-[9px] font-bold uppercase opacity-50 tracking-tighter text-left">Método</span>
                                                        <span className="text-[9px] font-mono text-zinc-600 dark:text-zinc-450 bg-zinc-50 dark:bg-zinc-950 p-2 rounded border border-zinc-100 dark:border-zinc-800 break-all leading-normal text-left">
                                                            {iface.method}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="pt-4">
                                                <div className="text-[8px] font-bold uppercase opacity-20 text-center tracking-[0.2em]">
                                                    UniTask // Technical Doc
                                                </div>
                                            </div>
                                        </div>
                                    </div>


                                </section>
                            ))}
                        </div>

                        {/* Footer */}
                        <footer className="pt-12 border-t flex flex-col md:flex-row items-baseline justify-between gap-4 opacity-30 mt-12 print:mt-8">
                            <div className="text-[10px] font-black tracking-widest">UNITASK REPORTING SYSTEM // v14.0</div>
                            <div className="text-[9px] uppercase font-bold tracking-[0.2em]">{project.name} // INTERNAL USE ONLY</div>
                        </footer>
                    </div>
                </div>
            ) : (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
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
                                    <h3 className="text-lg font-bold">Generar Reporte de Interfaces</h3>
                                    <p className="text-xs text-muted-foreground">Selecciona las configuraciones para incluir en el documento técnico.</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            <div className="grid grid-cols-1 gap-2">
                                {[...interfaces].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map(iface => (
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
                                            <p className="text-[10px] text-muted-foreground line-clamp-1">{iface.description || "Protocolo de integración estándar"}</p>
                                        </div>
                                        <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 uppercase font-bold opacity-60">
                                            {iface.formatType}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 border-t bg-black/5 flex items-center justify-between gap-4">
                            <div className="text-xs font-bold text-muted-foreground">
                                {selectedIds.length} interfaces seleccionadas
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2 text-sm font-bold opacity-60 hover:opacity-100 transition-all text-zinc-500"
                                >
                                    Cerrar
                                </button>
                                <button
                                    disabled={selectedIds.length === 0}
                                    onClick={() => setView('report')}
                                    className="px-8 py-2 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    Ver Reporte
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>,
        document.body
    );
}

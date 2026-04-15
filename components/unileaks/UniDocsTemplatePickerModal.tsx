"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { X, FileText, Loader2, Printer, Download, ArrowLeft, Check, FileType } from "lucide-react";
import { cn } from "@/lib/utils";
import { UniDocsTemplate } from "@/types/unidocs";
import { buildPrintHtml, buildWordHtml } from "@/lib/unidocs-print";

interface UniDocsTemplatePickerModalProps {
    noteTitle: string;
    noteHtml: string;
    projectId?: string;
    tenantId?: string;
    onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component — buildPrintHtml / buildWordHtml imported from @/lib/unidocs-print
// ---------------------------------------------------------------------------
export default function UniDocsTemplatePickerModal({
    noteTitle, noteHtml, projectId, tenantId, onClose,
}: UniDocsTemplatePickerModalProps) {
    const { tenantId: authTenantId } = useAuth();
    const effectiveTenantId = tenantId || authTenantId;

    const [templates, setTemplates] = useState<UniDocsTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [tenantLogo, setTenantLogo] = useState<string | null>(null);
    const [clientLogo, setClientLogo] = useState<string | null>(null);

    // Preview state — blob URL avoids iframe sandbox issues with print()
    const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<UniDocsTemplate | null>(null);
    const [previewCoverTemplate, setPreviewCoverTemplate] = useState<UniDocsTemplate | null>(null);
    const [projectData, setProjectData] = useState<any>(null);
    const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
    const [selectedCoverId, setSelectedCoverId] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchTemplates = async () => {
            if (!effectiveTenantId) return;
            setLoading(true);
            setLoadError(null);
            try {
                const q = query(collection(db, "unidocs_templates"), where("tenantId", "==", effectiveTenantId));
                const snap = await getDocs(q);
                if (isMounted) {
                    const allTemplates = snap.docs.map(d => ({ id: d.id, ...d.data() } as UniDocsTemplate));
                    setTemplates(allTemplates);
                    
                    // Pre-select first body template
                    const firstBody = allTemplates.find(t => (t.templateType ?? 'body') === 'body');
                    if (firstBody) setSelectedBodyId(firstBody.id);
                }
            } catch (e) {
                console.error("[UniDocs] Error loading templates:", e);
                if (isMounted) setLoadError("No se pudieron cargar las plantillas.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        const fetchProjectDetails = async () => {
            if (!projectId) return;
            try {
                const projectDoc = await getDoc(doc(db, "projects", projectId));
                if (isMounted && projectDoc.exists()) {
                    setProjectData(projectDoc.data());
                }
            } catch (err) {
                console.error("Error fetching project details:", err);
            }
        };

        const fetchTenantLogo = async () => {
            if (!effectiveTenantId || effectiveTenantId === "unknown" || effectiveTenantId === "__DENY__") return;
            try {
                const tenantDoc = await getDoc(doc(db, "tenants", effectiveTenantId));
                if (isMounted && tenantDoc.exists()) {
                    const data = tenantDoc.data();
                    if (data.logos && data.logos.length > 0) {
                        const principal = data.logos.find((l: any) => l.label?.toLowerCase().includes('principal'));
                        setTenantLogo(principal?.url || data.logos[0].url);
                    } else if (data.logoUrl) {
                        setTenantLogo(data.logoUrl);
                    }
                }
            } catch (err: any) {
                if (isMounted && err.code !== 'permission-denied') {
                    console.error("Error fetching tenant logo in UniDocs:", err);
                }
            }
        };

        const fetchClientLogo = async () => {
            if (!projectId) return;
            try {
                const docsQ = query(collection(db, "projects", projectId, "documents"));
                const docsSnap = await getDocs(docsQ);
                let logoDoc = docsSnap.docs.find(d => d.data().typeCode?.toUpperCase() === 'LOGO');
                if (!logoDoc) logoDoc = docsSnap.docs.find(d => d.data().name?.toUpperCase().includes('LOGO'));
                if (!logoDoc) logoDoc = docsSnap.docs.find(d => (d.data().type || '').toLowerCase().startsWith('image/') && d.data().url);
                if (logoDoc && isMounted) {
                    const data = logoDoc.data();
                    const logoUrl = data.url || data.fileUrl || data.downloadURL;
                    if (logoUrl) setClientLogo(logoUrl);
                }
            } catch (err) {
                console.error("Error fetching client logo:", err);
            }
        };

        fetchTemplates();
        fetchProjectDetails();
        fetchTenantLogo();
        fetchClientLogo();
        return () => { isMounted = false; };
    }, [effectiveTenantId, projectId]);

    const getMinutaContext = () => {
        const today = new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
        return {
            minutaTitle: noteTitle,
            meetingDate: today,
            projectName: projectData?.name || "",
            clientName: projectData?.clientName || "",
            projectCode: projectData?.code || "",
            projectEmail: projectData?.email || undefined,
            projectPhone: projectData?.phone || undefined,
        };
    };

    const handlePreviewComposition = () => {
        const bodyTemplate = templates.find(t => t.id === selectedBodyId);
        if (!bodyTemplate) return;

        const coverTemplate = templates.find(t => t.id === selectedCoverId);
        const minutaContext = getMinutaContext();

        const html = buildPrintHtml(
            bodyTemplate,
            noteTitle,
            noteHtml,
            tenantLogo,
            clientLogo,
            coverTemplate,
            minutaContext
        );

        const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
        setPreviewBlobUrl(url);
        setPreviewTemplate(bodyTemplate);
        setPreviewCoverTemplate(coverTemplate || null);
    };

    const closePreview = () => {
        if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
        setPreviewBlobUrl(null);
        setPreviewTemplate(null);
        setPreviewCoverTemplate(null);
    };

    // Print triggered by user click — no auto-print, no loop.
    const handlePrintFromPreview = () => {
        iframeRef.current?.contentWindow?.print();
    };

    const handleWordDownload = () => {
        if (!previewTemplate) return;
        const wordHtml = buildWordHtml(
            previewTemplate,
            noteTitle,
            noteHtml,
            tenantLogo,
            clientLogo,
            previewCoverTemplate || undefined,
            getMinutaContext()
        );
        const blob = new Blob([wordHtml], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${noteTitle || 'documento'}.doc`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // -----------------------------------------------------------------------
    // Preview overlay (full-screen iframe + toolbar)
    // -----------------------------------------------------------------------
    if (previewBlobUrl) {
        return (
            <div className="fixed inset-0 z-[110] flex flex-col bg-gray-900">
                {/* Toolbar — hidden in print */}
                <div className="shrink-0 bg-card border-b border-border flex items-center gap-2 px-3 py-2 print:hidden">
                    <button
                        onClick={closePreview}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver
                    </button>

                    <div className="flex-1 min-w-0 px-2">
                        <p className="text-sm font-medium text-foreground truncate">{noteTitle}</p>
                        <p className="text-xs text-muted-foreground">{previewTemplate?.name}</p>
                    </div>

                    <button
                        onClick={handleWordDownload}
                        className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-bold hover:bg-secondary/80 transition-all"
                    >
                        <Download className="w-4 h-4" />
                        Word (.doc)
                    </button>

                    <button
                        onClick={handlePrintFromPreview}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimir / PDF
                    </button>
                </div>

                {/* Blob URL iframe — no sandbox, full print() support */}
                <iframe
                    ref={iframeRef}
                    src={previewBlobUrl}
                    className="flex-1 w-full border-0 bg-white"
                    title="Vista previa del documento"
                />
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Template picker
    // -----------------------------------------------------------------------
    const bodyTemplates = templates.filter(t => (t.templateType ?? 'body') === 'body');
    const coverTemplates = templates.filter(t => t.templateType === 'cover');

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-background w-full max-w-2xl rounded-2xl flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/10">
                <div className="p-6 border-b flex items-center justify-between bg-card shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Generar Documento</h2>
                            <p className="text-sm text-muted-foreground">Configura la composición del documento</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 max-h-[60vh] space-y-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
                            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                            <p className="text-muted-foreground animate-pulse">Cargando plantillas...</p>
                        </div>
                    ) : loadError ? (
                        <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-center space-y-4">
                            <p className="text-sm text-destructive font-medium">{loadError}</p>
                            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-destructive text-white rounded-lg text-xs font-bold hover:bg-destructive/90 transition-all">
                                Recargar
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Body Templates Section */}
                            <section>
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">1. Plantilla de Cuerpo (Obligatorio)</h3>
                                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">1 SELECCIONADA</span>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {bodyTemplates.map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setSelectedBodyId(t.id)}
                                            className={cn(
                                                "group flex items-center justify-between p-4 border rounded-xl transition-all text-left shadow-sm",
                                                selectedBodyId === t.id 
                                                    ? "bg-primary/5 border-primary ring-1 ring-primary/50" 
                                                    : "bg-card hover:border-primary/40 hover:bg-primary/[0.02]"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                                    selectedBodyId === t.id ? "bg-primary text-white" : "bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                                )}>
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-sm text-foreground">{t.name}</h3>
                                                    <p className="text-xs text-muted-foreground line-clamp-1">{t.description || `${(t.blocks || []).length} bloques`}</p>
                                                </div>
                                            </div>
                                            {selectedBodyId === t.id && (
                                                <div className="bg-primary text-white p-1 rounded-full">
                                                    <Check className="w-3.5 h-3.5" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                    {bodyTemplates.length === 0 && (
                                        <div className="p-8 text-center bg-muted/30 rounded-xl border border-dashed">
                                            <p className="text-sm text-muted-foreground">No hay plantillas de cuerpo disponibles.</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Cover Templates Section */}
                            <section>
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">2. Plantilla de Portada (Opcional)</h3>
                                    {selectedCoverId ? (
                                        <button 
                                            onClick={() => setSelectedCoverId(null)}
                                            className="text-[10px] text-destructive hover:underline font-bold"
                                        >
                                            QUITAR PORTADA
                                        </button>
                                    ) : (
                                        <span className="text-[10px] text-muted-foreground font-medium">OPCIONAL</span>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {coverTemplates.map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setSelectedCoverId(t.id)}
                                            className={cn(
                                                "group flex items-center justify-between p-4 border rounded-xl transition-all text-left shadow-sm",
                                                selectedCoverId === t.id 
                                                    ? "bg-primary/5 border-primary ring-1 ring-primary/50" 
                                                    : "bg-card hover:border-primary/40 hover:bg-primary/[0.02]"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                                    selectedCoverId === t.id ? "bg-primary text-white" : "bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                                )}>
                                                    <FileType className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-sm text-foreground">{t.name}</h3>
                                                    <p className="text-xs text-muted-foreground line-clamp-1">{t.description || "Portada de documento"}</p>
                                                </div>
                                            </div>
                                            {selectedCoverId === t.id && (
                                                <div className="bg-primary text-white p-1 rounded-full">
                                                    <Check className="w-3.5 h-3.5" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                    {coverTemplates.length === 0 && (
                                        <div className="p-8 text-center bg-muted/30 rounded-xl border border-dashed">
                                            <p className="text-sm text-muted-foreground">No hay plantillas de portada disponibles.</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </>
                    )}
                </div>

                <div className="p-6 border-t bg-card flex items-center justify-between gap-3 shrink-0">
                    <div className="hidden sm:block">
                        <p className="text-xs text-muted-foreground">
                            {selectedCoverId ? "Composición con portada seleccionada" : "Composición sin portada"}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button onClick={onClose} className="flex-1 sm:flex-none px-6 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-bold hover:bg-secondary/80 transition-all">
                            Cancelar
                        </button>
                        <button 
                            disabled={!selectedBodyId || loading}
                            onClick={handlePreviewComposition}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Printer className="w-4 h-4" />
                            Previsualizar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { X, FileText, Loader2, Printer, Download, ArrowLeft } from "lucide-react";
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
                if (isMounted) setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as UniDocsTemplate)));
            } catch (e) {
                console.error("[UniDocs] Error loading templates:", e);
                if (isMounted) setLoadError("No se pudieron cargar las plantillas.");
            } finally {
                if (isMounted) setLoading(false);
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
        fetchTenantLogo();
        fetchClientLogo();
        return () => { isMounted = false; };
    }, [effectiveTenantId, projectId]);

    const handlePreview = (template: UniDocsTemplate) => {
        const html = buildPrintHtml(template, noteTitle, noteHtml, tenantLogo, clientLogo);
        const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
        setPreviewBlobUrl(url);
        setPreviewTemplate(template);
    };

    const closePreview = () => {
        if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
        setPreviewBlobUrl(null);
        setPreviewTemplate(null);
    };

    // Print triggered by user click — no auto-print, no loop.
    const handlePrintFromPreview = () => {
        iframeRef.current?.contentWindow?.print();
    };

    const handleWordDownload = () => {
        if (!previewTemplate) return;
        const wordHtml = buildWordHtml(previewTemplate, noteTitle, noteHtml, tenantLogo, clientLogo);
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
                            <p className="text-sm text-muted-foreground">Selecciona una plantilla para previsualizar</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 max-h-[60vh]">
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
                    ) : templates.length === 0 ? (
                        <div className="text-center py-16 opacity-50">
                            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground">No hay plantillas disponibles.</p>
                            <p className="text-xs text-muted-foreground mt-2">Crea una desde el módulo UniDocs en Ajustes.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {templates.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => handlePreview(t)}
                                    className="group flex items-center justify-between p-5 bg-card border rounded-2xl hover:border-primary hover:bg-primary/5 transition-all text-left shadow-sm hover:shadow-md"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                            <FileText className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-foreground">{t.name}</h3>
                                            <p className="text-sm text-muted-foreground">{t.description || `${(t.blocks || []).length} bloques`}</p>
                                        </div>
                                    </div>
                                    <Printer className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-muted/50 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-bold hover:bg-secondary/80 transition-all">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

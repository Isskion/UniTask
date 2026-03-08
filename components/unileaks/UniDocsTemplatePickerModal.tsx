"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { X, FileText, Loader2, Printer, Download, ArrowLeft } from "lucide-react";
import { UniDocsTemplate } from "@/types/unidocs";
import type { TemplateBlock } from "@/types/unidocs";

interface UniDocsTemplatePickerModalProps {
    noteTitle: string;
    noteHtml: string;
    projectId?: string;
    tenantId?: string;
    onClose: () => void;
}

const A4_HEIGHT_MM = 297;

// ---------------------------------------------------------------------------
// HTML generator for print (used inside iframe)
//
// Architecture: <table> with <thead> / <tfoot> / <tbody>
//  · <thead> repeats at the top of every printed page (browser guarantee)
//  · <tfoot> repeats at the bottom of every printed page (browser guarantee)
//  · <tbody> flows between them — body content CANNOT overlap header/footer
//  · @page { margin: 0 } → removes browser date/URL/page-number chrome
//  · Header blocks positioned absolutely within thead cell (coords = paper-absolute)
//  · Footer blocks positioned absolutely within tfoot cell (relative to tfoot top)
//  · No auto-print — print triggered by user button via iframe.contentWindow.print()
// ---------------------------------------------------------------------------
function buildPrintHtml(
    template: UniDocsTemplate,
    noteTitle: string,
    noteHtml: string,
    tenantLogoSrc: string | null,
    clientLogoSrc: string | null,
): string {
    const blocks = template.blocks || [];
    const margins = template.pageMargins || { top: 15, right: 15, bottom: 15, left: 15 };
    const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    const cuerpoBlock = blocks.find(b => b.type === 'cuerpo');
    const footerBlocks = blocks.filter(b => b.type === 'pie');
    const headerBlocks = blocks.filter(b => b.type !== 'cuerpo' && b.type !== 'pie');

    // thead height = paper y where body starts (= cuerpo block's y coordinate)
    const theadHeight = cuerpoBlock ? (cuerpoBlock.y ?? margins.top) : margins.top;

    // tfoot: spans from topmost footer block to bottom of paper
    const footerTopY = footerBlocks.length > 0
        ? Math.min(...footerBlocks.map(b => b.y ?? 0))
        : A4_HEIGHT_MM;
    const tfootHeight = footerBlocks.length > 0 ? A4_HEIGHT_MM - footerTopY : 0;

    // tbody cell padding comes from cuerpo block coordinates
    const cuerpoLeft = cuerpoBlock ? (cuerpoBlock.x ?? margins.left) : margins.left;
    const cuerpoWidth = cuerpoBlock ? (cuerpoBlock.width ?? (210 - margins.left - margins.right)) : (210 - margins.left - margins.right);
    const cuerpoRight = Math.max(0, 210 - cuerpoLeft - cuerpoWidth);

    // Cuerpo text style
    const cfg0 = cuerpoBlock?.config ?? {};
    const cuerpoStyle = [
        cfg0.fontFamily ? `font-family: '${cfg0.fontFamily}', Georgia, serif` : 'font-family: Garamond, Georgia, serif',
        `font-size: ${cfg0.fontSize || 11}pt`,
        cfg0.fontWeight ? `font-weight: ${cfg0.fontWeight}` : '',
        cfg0.color ? `color: ${cfg0.color}` : '',
    ].filter(Boolean).join('; ');

    // Renders a block's inner HTML
    const renderBlock = (block: TemplateBlock): string => {
        const cfg = block.config;
        const textStyle = [
            cfg.fontFamily ? `font-family: '${cfg.fontFamily}', Georgia, serif` : '',
            cfg.fontSize ? `font-size: ${cfg.fontSize}pt` : '',
            cfg.fontWeight ? `font-weight: ${cfg.fontWeight}` : '',
            cfg.fontStyle ? `font-style: ${cfg.fontStyle}` : '',
            cfg.color ? `color: ${cfg.color}` : '',
            cfg.textAlign ? `text-align: ${cfg.textAlign}` : '',
            cfg.padding ? `padding: ${cfg.padding}mm` : '',
        ].filter(Boolean).join('; ');

        switch (block.type) {
            case 'logo_empresa':
                return tenantLogoSrc
                    ? `<img src="${tenantLogoSrc}" alt="Logo" style="max-width:100%;max-height:100%;object-fit:contain;display:block;" />`
                    : `<div style="width:100%;height:100%;border:1px dashed #ccc;"></div>`;
            case 'logo_cliente':
                return clientLogoSrc
                    ? `<img src="${clientLogoSrc}" alt="Logo Cliente" style="max-width:100%;max-height:100%;object-fit:contain;display:block;" />`
                    : '';
            case 'titulo':
                return `<div style="${textStyle};line-height:1.2;">${noteTitle}</div>`;
            case 'fecha':
                return `<div style="${textStyle}">${today}</div>`;
            case 'pie': {
                const align = cfg.textAlign === 'center' ? 'justify-content:center;'
                    : cfg.textAlign === 'right' ? 'justify-content:flex-end;' : '';
                return `<div style="${textStyle};width:100%;height:100%;display:flex;align-items:center;${align}">${cfg.staticText || ''}</div>`;
            }
            case 'texto_libre':
                return `<div style="${textStyle}">${cfg.staticText || ''}</div>`;
            case 'separador':
                return `<hr style="border:none;border-top:1px solid ${cfg.borderColor || '#ddd'};margin:0;" />`;
            default:
                return '';
        }
    };

    // Header blocks: absolutely positioned within thead (thead top = paper top = y:0)
    const headerHtml = headerBlocks.map(block => {
        const bx = block.x ?? 0;
        const by = block.y ?? 0;
        const bw = block.width ?? 40;
        const bh = block.height ?? 10;
        return `<div style="position:absolute;left:${bx}mm;top:${by}mm;width:${bw}mm;height:${bh}mm;overflow:hidden;box-sizing:border-box;">${renderBlock(block)}</div>`;
    }).join('\n');

    // Footer blocks: positioned relative to tfoot container (tfoot top = footerTopY on paper)
    const footerHtml = footerBlocks.map(block => {
        const bx = block.x ?? 0;
        const by = block.y ?? 0;
        const bw = block.width ?? 40;
        const bh = block.height ?? 10;
        const topInTfoot = by - footerTopY;
        return `<div style="position:absolute;left:${bx}mm;top:${topInTfoot}mm;width:${bw}mm;height:${bh}mm;overflow:hidden;box-sizing:border-box;">${renderBlock(block)}</div>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${noteTitle}</title>
    <style>
        /* margin:0 elimina los headers del navegador (fecha, URL, nº página) */
        @page { size: A4; margin: 0; }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { background: white; color: #1a1a1a; width: 210mm; margin: 0 auto; }

        /* Force-expand any collapsed details/sections when printing */
        details { display: block !important; }
        details > * { display: block !important; }

        /* Layout table: thead/tfoot guaranteed to repeat on every printed page */
        table.doc-layout { width: 210mm; border-collapse: collapse; table-layout: fixed; }
        table.doc-layout thead td,
        table.doc-layout tfoot td { padding: 0; }
        table.doc-layout tbody td { padding: 0 ${cuerpoRight}mm 0 ${cuerpoLeft}mm; vertical-align: top; }

        .doc-body { line-height: 1.65; ${cuerpoStyle}; }
        .doc-body h1 { font-size: 15pt; font-weight: bold; margin: 0.7em 0 0.3em; }
        .doc-body h2 { font-size: 12.5pt; font-weight: bold; margin: 0.6em 0 0.25em; }
        .doc-body h3 { font-size: 11pt; font-weight: bold; margin: 0.5em 0 0.2em; }
        .doc-body p { margin: 0 0 0.5em; orphans: 3; widows: 3; }
        .doc-body ul, .doc-body ol { margin: 0.4em 0 0.4em 1.4em; }
        .doc-body li { margin: 0.15em 0; }
        .doc-body table { width: 100%; border-collapse: collapse; margin: 0.6em 0; page-break-inside: avoid; break-inside: avoid; }
        .doc-body th, .doc-body td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; font-size: 9.5pt; }
        .doc-body th { background: #f0f0f0; font-weight: bold; }
        .doc-body img { max-width: 100%; height: auto; page-break-inside: avoid; break-inside: avoid; display: block; }
        .doc-body blockquote { border-left: 3px solid #888; padding-left: 1em; color: #444; margin: 0.5em 0; font-style: italic; }
        .doc-body pre, .doc-body code { font-family: 'Courier New', monospace; background: #f5f5f5; }
        .doc-body pre { padding: 0.5em; overflow: hidden; page-break-inside: avoid; break-inside: avoid; }
    </style>
</head>
<body>
    <table class="doc-layout">
        <thead>
            <tr><td style="height:${theadHeight}mm;position:relative;">${headerHtml}</td></tr>
        </thead>
        <tbody>
            <tr><td><div class="doc-body">${noteHtml}</div></td></tr>
        </tbody>
        ${tfootHeight > 0 ? `<tfoot><tr><td style="height:${tfootHeight}mm;position:relative;">${footerHtml}</td></tr></tfoot>` : ''}
    </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Simplified HTML for Word (.doc) export — no fixed positioning
// ---------------------------------------------------------------------------
function buildWordHtml(
    template: UniDocsTemplate,
    noteTitle: string,
    noteHtml: string,
    tenantLogoSrc: string | null,
    clientLogoSrc: string | null,
): string {
    const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    const blocks = template.blocks || [];
    const margins = template.pageMargins || { top: 20, right: 20, bottom: 20, left: 20 };

    // For Word: render blocks as flat HTML in a logical order (header → body → footer)
    const headerContent = blocks
        .filter(b => b.type !== 'cuerpo' && b.type !== 'pie')
        .sort((a, b) => (a.y ?? 0) - (b.y ?? 0))
        .map(block => {
            const cfg = block.config;
            switch (block.type) {
                case 'logo_empresa':
                    return tenantLogoSrc ? `<img src="${tenantLogoSrc}" style="max-height:20mm;max-width:60mm;object-fit:contain;" />` : '';
                case 'logo_cliente':
                    return clientLogoSrc ? `<img src="${clientLogoSrc}" style="max-height:20mm;max-width:60mm;object-fit:contain;" />` : '';
                case 'titulo':
                    return `<h1 style="font-size:${cfg.fontSize || 18}pt;font-weight:bold;">${noteTitle}</h1>`;
                case 'fecha':
                    return `<p style="font-size:${cfg.fontSize || 10}pt;color:#666;font-style:italic;">${today}</p>`;
                case 'separador':
                    return `<hr style="border-top:1px solid #ddd;margin:4pt 0;" />`;
                case 'texto_libre':
                    return `<p>${cfg.staticText || ''}</p>`;
                default:
                    return '';
            }
        }).join('\n');

    const bodyContent = blocks.find(b => b.type === 'cuerpo')
        ? `<div>${noteHtml}</div>`
        : `<div>${noteHtml}</div>`;

    const footerContent = blocks
        .filter(b => b.type === 'pie')
        .map(b => `<p style="font-size:${b.config.fontSize || 8}pt;color:#999;text-align:${b.config.textAlign || 'center'};">${b.config.staticText || ''}</p>`)
        .join('\n');

    return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" lang="es">
<head>
<meta charset="UTF-8">
<title>${noteTitle}</title>
<style>
    @page {
        size: A4;
        mso-page-orientation: portrait;
        margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
    }
    body { font-family: Garamond, Georgia, serif; font-size: 11pt; color: #1a1a1a; line-height: 1.65; }
    h1 { font-size: 15pt; } h2 { font-size: 12.5pt; } h3 { font-size: 11pt; }
    p { margin: 0 0 0.5em; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 4px 8px; font-size: 9.5pt; }
    th { background: #f0f0f0; font-weight: bold; }
    img { max-width: 100%; }
    .header { border-bottom: 1px solid #ddd; padding-bottom: 8pt; margin-bottom: 12pt; }
    .footer { border-top: 1px solid #ddd; padding-top: 6pt; margin-top: 24pt; }
</style>
</head>
<body>
<div class="header">${headerContent}</div>
${bodyContent}
${footerContent ? `<div class="footer">${footerContent}</div>` : ''}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Component
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

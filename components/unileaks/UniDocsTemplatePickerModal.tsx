"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { X, FileText, Loader2, Printer } from "lucide-react";
import { UniDocsTemplate, TemplateBlock } from "@/types/unidocs";

interface UniDocsTemplatePickerModalProps {
    noteTitle: string;
    noteHtml: string;
    projectId?: string;
    tenantId?: string;
    onClose: () => void;
}

export default function UniDocsTemplatePickerModal({ noteTitle, noteHtml, projectId, tenantId, onClose }: UniDocsTemplatePickerModalProps) {
    const { tenantId: authTenantId } = useAuth();
    const effectiveTenantId = tenantId || authTenantId;

    const [templates, setTemplates] = useState<UniDocsTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [printing, setPrinting] = useState<string | null>(null);
    const [tenantLogo, setTenantLogo] = useState<string | null>(null);
    const [clientLogo, setClientLogo] = useState<string | null>(null);

    useEffect(() => {
        const fetchTemplates = async () => {
            if (!effectiveTenantId) return;
            setLoading(true);
            setLoadError(null);
            try {
                const q = query(collection(db, "unidocs_templates"), where("tenantId", "==", effectiveTenantId));
                const snap = await getDocs(q);
                setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as UniDocsTemplate)));
            } catch (e) {
                console.error("[UniDocs] Error loading templates:", e);
                setLoadError("No se pudieron cargar las plantillas.");
            } finally {
                setLoading(false);
            }
        };

        let isMounted = true;
        const fetchTenantLogo = async () => {
            if (!effectiveTenantId || effectiveTenantId === "unknown" || effectiveTenantId === "__DENY__") return;
            try {
                const tenantDoc = await getDoc(doc(db, "tenants", effectiveTenantId));
                if (isMounted && tenantDoc.exists()) {
                    const data = tenantDoc.data();
                    // 1. Try new logos array (prefer label "Logo Principal", fallback to first logo)
                    if (data.logos && data.logos.length > 0) {
                        const principal = data.logos.find((l: any) => l.label?.toLowerCase().includes('principal'));
                        setTenantLogo(principal?.url || data.logos[0].url);
                    }
                    // 2. Fallback to legacy logoUrl
                    else if (data.logoUrl) {
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

                // 1. Try typeCode LOGO
                let logoDoc = docsSnap.docs.find(d => d.data().typeCode?.toUpperCase() === 'LOGO');
                // 2. Fallback by name
                if (!logoDoc) logoDoc = docsSnap.docs.find(d => d.data().name?.toUpperCase().includes('LOGO'));
                // 3. Fallback any image
                if (!logoDoc) logoDoc = docsSnap.docs.find(d => (d.data().type || '').toLowerCase().startsWith('image/') && d.data().url);

                if (logoDoc) {
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

    const buildHtml = (template: UniDocsTemplate): string => {
        const blocks = template.blocks || [];
        const margins = template.pageMargins || { top: 15, right: 15, bottom: 15, left: 15 };
        const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

        // Build CSS for each block
        const blockStyles = blocks.map(block => {
            if (block.type === 'cuerpo') {
                // The body text must flow with natural pagination.
                // It offsets its start based on visual Y, but does NOT constrain height or use absolute position.
                const topOffset = Math.max(0, block.y - margins.top);
                const leftOffset = Math.max(0, block.x - margins.left);
                return `
                #block-${block.id} {
                    margin-top: ${topOffset}mm;
                    margin-left: ${leftOffset}mm;
                    width: ${block.width}mm;
                    box-sizing: border-box;
                    padding-bottom: ${margins.bottom}mm;
                }`;
            } else {
                // Headers, footers, logos repeat on every page using fixed position.
                // In print media, fixed position coords are relative to the page area (inside the @page margins)!
                const fixedLeft = block.x - margins.left;
                const fixedTop = block.y - margins.top;
                return `
                #block-${block.id} { 
                    position: fixed;
                    left: ${fixedLeft}mm;
                    top: ${fixedTop}mm;
                    width: ${block.width}mm;
                    height: ${block.height}mm;
                    overflow: hidden;
                    box-sizing: border-box;
                    z-index: 50;
                }`;
            }
        }).join('\n');

        // Build block HTML
        const blockHtmls = blocks.map(block => {
            const cfg = block.config;
            const textStyle = [
                cfg.fontFamily ? `font-family: '${cfg.fontFamily}', serif` : '',
                cfg.fontSize ? `font-size: ${cfg.fontSize}pt` : '',
                cfg.fontWeight ? `font-weight: ${cfg.fontWeight}` : '',
                cfg.fontStyle ? `font-style: ${cfg.fontStyle}` : '',
                cfg.color ? `color: ${cfg.color}` : '',
                cfg.textAlign ? `text-align: ${cfg.textAlign}` : '',
            ].filter(Boolean).join('; ');

            let content = '';

            switch (block.type) {
                case 'logo_empresa':
                    content = tenantLogo
                        ? `<img src="${tenantLogo}" alt="Logo Empresa" style="max-width: 100%; max-height: 100%; object-fit: contain;" />`
                        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;border:1px dashed #ccc;font-size:8px;color:#999;">Logo Empresa</div>`;
                    break;
                case 'logo_cliente':
                    content = clientLogo
                        ? `<img src="${clientLogo}" alt="Logo Cliente" style="max-width: 100%; max-height: 100%; object-fit: contain;" />`
                        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;border:1px dashed #ccc;font-size:8px;color:#999;">Logo Cliente</div>`;
                    break;
                case 'titulo':
                    content = `<div style="${textStyle}">${noteTitle}</div>`;
                    break;
                case 'fecha':
                    content = `<div style="${textStyle}">${today}</div>`;
                    break;
                case 'cuerpo':
                    // THE MOST IMPORTANT BLOCK: always injects the actual content
                    content = `<div class="doc-body" style="${textStyle}">${noteHtml}</div>`;
                    break;
                case 'pie':
                    content = `<div style="${textStyle}">${cfg.staticText || ''}</div>`;
                    break;
                case 'texto_libre':
                    content = `<div style="${textStyle}">${cfg.staticText || ''}</div>`;
                    break;
                case 'separador':
                    content = `<hr style="border: none; border-top: 1px solid ${cfg.borderColor || '#ddd'}; margin: 0;" />`;
                    break;
            }

            return `<div id="block-${block.id}">${content}</div>`;
        }).join('\n');

        // Check if there's a 'cuerpo' block — if not, inject content directly in the body
        const hasCuerpo = blocks.some(b => b.type === 'cuerpo');
        const fallbackBody = !hasCuerpo
            ? `<div style="position: relative; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; font-family: 'Garamond', serif; font-size: 11pt; line-height: 1.6;">${noteHtml}</div>`
            : '';

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${noteTitle}</title>
    <style>
        @page {
            size: A4;
            margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
        }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: 'Inter', system-ui, sans-serif; }
        .doc-body { line-height: 1.6; }
        .doc-body h1, .doc-body h2, .doc-body h3 { margin-top: 0.8em; margin-bottom: 0.4em; }
        .doc-body p { margin: 0.4em 0; }
        .doc-body ul, .doc-body ol { margin: 0.5em 0; padding-left: 1.5em; }
        .doc-body li { margin: 0.2em 0; }
        .doc-body table { width: 100%; border-collapse: collapse; margin: 0.5em 0; }
        .doc-body th, .doc-body td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; font-size: 9pt; }
        .doc-body th { background: #f5f5f5; font-weight: bold; }
        .doc-body img { max-width: 100%; height: auto; page-break-inside: avoid; break-inside: avoid; }
        .doc-body blockquote { border-left: 3px solid #888; padding-left: 1rem; color: #555; margin: 0.5em 0; }
        @media print {
            body { background: none; }
            /* Hide URL, Date & Pagination headers/footers the browser generates if possible */
            @page {
                size: A4;
                margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
            }
        }
        ${blockStyles}
    </style>
</head>
<body>
    ${blockHtmls}
    ${fallbackBody}
</body>
</html>`;
    };

    const handlePrint = (template: UniDocsTemplate) => {
        setPrinting(template.id);
        const htmlContent = buildHtml(template);

        const printWindow = window.open("", "_blank", "width=900,height=700");
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                setPrinting(null);
            }, 1000);
        } else {
            alert("El navegador bloqueó la ventana emergente. Permite popups para este sitio.");
            setPrinting(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-background w-full max-w-2xl rounded-2xl flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/10">
                <div className="p-6 border-b flex items-center justify-between bg-card shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Imprimir con Plantilla</h2>
                            <p className="text-sm text-muted-foreground">Selecciona una plantilla para generar el documento</p>
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
                                    onClick={() => handlePrint(t)}
                                    disabled={printing === t.id}
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
                                    <div className="flex items-center gap-2">
                                        {printing === t.id ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                        ) : (
                                            <Printer className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        )}
                                    </div>
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

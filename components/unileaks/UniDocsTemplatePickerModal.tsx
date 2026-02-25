"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { X, FileText, Loader2, Printer, Sparkles } from "lucide-react";
import { UniDocsLayout } from "@/types/unidocs";
import { optimizeDocumentContent } from "@/app/actions/unidocs";

interface UniDocsTemplatePickerModalProps {
    noteTitle: string;
    noteHtml: string;
    projectId?: string;
    tenantId?: string;
    onClose: () => void;
}

interface Template {
    id: string;
    name: string;
    type: string;
    description?: string;
    layout?: UniDocsLayout;
    config?: any;
}

export default function UniDocsTemplatePickerModal({ noteTitle, noteHtml, projectId, tenantId, onClose }: UniDocsTemplatePickerModalProps) {
    const { tenantId: authTenantId } = useAuth();
    const effectiveTenantId = tenantId || authTenantId;

    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [printing, setPrinting] = useState<string | null>(null);
    const [projectLogo, setProjectLogo] = useState<string | null>(null);
    const [tenantLogo, setTenantLogo] = useState<string | null>(null);
    const [clientLogo, setClientLogo] = useState<string | null>(null);
    const [aiMapping, setAiMapping] = useState<Record<string, string>>({});
    const [optimizing, setOptimizing] = useState(false);

    useEffect(() => {
        const fetchTemplates = async () => {
            if (!effectiveTenantId) return;
            setLoading(true);
            setLoadError(null);
            try {
                const q = query(collection(db, "unidocs_templates"), where("tenantId", "==", effectiveTenantId));
                const snap = await getDocs(q);
                setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as Template)));
            } catch (e) {
                console.error("[UniDocsTemplatePicker] Error loading templates:", e);
                setLoadError("No se pudieron cargar las plantillas. Si tienes varias pestañas abiertas, cierra las demás.");
            } finally {
                setLoading(false);
            }
        };

        const fetchProjectLogo = async () => {
            if (!projectId) return;
            try {
                const projectDoc = await getDoc(doc(db, "projects", projectId));
                if (projectDoc.exists()) {
                    const data = projectDoc.data();
                    if (data.logo) setProjectLogo(data.logo);
                }
            } catch (err) {
                console.error("Error fetching project logo:", err);
            }
        };

        const fetchTenantLogo = async () => {
            if (!effectiveTenantId) return;
            try {
                const tenantDoc = await getDoc(doc(db, "tenants", effectiveTenantId));
                if (tenantDoc.exists()) {
                    const data = tenantDoc.data();
                    if (data.logoUrl) setTenantLogo(data.logoUrl);
                }
            } catch (err) {
                console.error("Error fetching tenant logo:", err);
            }
        };

        const fetchClientLogo = async () => {
            if (!projectId) return;
            try {
                // Fetch all documents for the project to handle variations in casing/naming
                const docsQ = query(collection(db, "projects", projectId, "documents"));
                const docsSnap = await getDocs(docsQ);

                console.log(`[UniDocs] Project ${projectId} has ${docsSnap.size} documents`);
                docsSnap.docs.forEach(d => {
                    const data = d.data();
                    console.log(`[UniDocs] Doc: name=${data.name}, typeCode=${data.typeCode}, url=${data.url ? 'YES' : 'NO'}, type=${data.type}`);
                });

                // 1. Try to find by typeCode (case-insensitive)
                let logoDoc = docsSnap.docs.find(d => {
                    const data = d.data();
                    return data.typeCode?.toUpperCase() === 'LOGO';
                });

                // 2. Fallback: Try to find by name containing 'LOGO'
                if (!logoDoc) {
                    logoDoc = docsSnap.docs.find(d => {
                        const data = d.data();
                        return data.name?.toUpperCase().includes('LOGO');
                    });
                }

                // 3. Fallback: Try to find image files (common logo formats)
                if (!logoDoc) {
                    logoDoc = docsSnap.docs.find(d => {
                        const data = d.data();
                        const mimeType = (data.type || '').toLowerCase();
                        return mimeType.startsWith('image/') && data.url;
                    });
                }

                if (logoDoc) {
                    const data = logoDoc.data();
                    // Check multiple possible URL fields
                    const logoUrl = data.url || data.fileUrl || data.downloadURL;
                    console.log(`[UniDocs] Found logo doc: name=${data.name}, url=${logoUrl ? 'YES' : 'NO'}`);
                    if (logoUrl) setClientLogo(logoUrl);
                } else {
                    console.log(`[UniDocs] No logo document found for project ${projectId}`);
                }
            } catch (err) {
                console.error("Error fetching client logo from project documents:", err);
            }
        };

        fetchTemplates();
        fetchProjectLogo();
        fetchTenantLogo();
        fetchClientLogo();
    }, [effectiveTenantId, projectId]);

    const buildHtml = (template: Template): string => {
        const l = template.layout;
        const vz = template.config?.visualZones as any[];
        const hasZones = vz && vz.length > 0;
        const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
        const now = new Date().toLocaleString('es-ES');

        // Styles
        let dynamicStyles = `
            body { font-family: 'Inter', sans-serif; line-height: 1.5; color: #1a1a1a; margin: 0; padding: 0; }
            * { box-sizing: border-box; }
            .page-break { page-break-after: always; break-after: page; }
        `;

        if (hasZones) {
            // === PHASE 1: Categorize zones into header, body, and footer ===
            const headerMarginMm = l?.headerMarginMm ?? 25;
            const footerMarginMm = l?.footerMarginMm ?? 20;

            const headerZones: any[] = [];
            const bodyZones: any[] = [];
            const footerZones: any[] = [];

            vz.forEach(zone => {
                const label = (zone.label || '').toLowerCase();
                // Logos and header items → fixed in margin-top area
                if (label.includes('logo') || label === 'título' || label === 'fecha' || label === 'referencia') {
                    headerZones.push(zone);
                }
                // Footer zone → fixed in margin-bottom area
                else if (label.includes('pie')) {
                    footerZones.push(zone);
                }
                // Everything else → flowing body content
                else {
                    bodyZones.push(zone);
                }
            });

            // === PHASE 2: Build CSS ===
            dynamicStyles += `
                @page {
                    size: A4;
                    margin-top: ${headerMarginMm}mm;
                    margin-bottom: ${footerMarginMm}mm;
                    margin-left: 15mm;
                    margin-right: 15mm;
                }

                /* Fixed zone: painted on every page at exact coordinates */
                .fixed-zone {
                    position: fixed;
                    z-index: 100;
                    overflow: hidden;
                }
                .fixed-zone img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    display: block;
                }

                .fallback-logo {
                    border: 1px dashed #ccc;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 8px;
                    color: #999;
                    background: #f9f9f9;
                }

                /* Body: flows naturally within @page margins */
                .doc-body {
                    font-size: 10pt;
                    color: #333;
                    line-height: 1.6;
                }
                .doc-body h1, .doc-body h2, .doc-body h3 { margin-top: 1em; }
                .doc-body table { width: 100%; border-collapse: collapse; margin: 0.5em 0; }
                .doc-body th, .doc-body td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; font-size: 9pt; }
                .doc-body th { background: #f5f5f5; font-weight: bold; }

                /* Text overlays */
                .text-overlay { position: fixed; z-index: 200; white-space: nowrap; }

                @media print {
                    body { background: none; margin: 0; padding: 0; }
                }
            `;

            // === PHASE 3: Build fixed header zones ===
            // Each zone renders as a position:fixed div at its ORIGINAL coordinates from the designer
            // In CSS print, position:fixed coords are relative to the page box (full A4)
            // Since @page margins define the content area, fixed elements in the top/bottom sit in the margins
            const fixedHeaderHtml = headerZones.map(zone => {
                let content = "";
                const label = (zone.label || '');

                if (label === 'Título') {
                    content = `<span style="font-size: 1.4rem; font-weight: 800; color: #000;">${aiMapping['Título'] || noteTitle}</span>`;
                } else if (label === 'Fecha') {
                    content = `<span style="font-size: 9pt; color: #666; font-style: italic;">${today}</span>`;
                } else if (label === 'Referencia') {
                    content = `<span style="font-size: 9pt; font-family: monospace; color: #555;">REF-${Math.random().toString(36).substr(2, 6).toUpperCase()}</span>`;
                } else if (label.toLowerCase().includes('logo')) {
                    const isCompanyLogo = label.toLowerCase().includes('empresa');
                    const isClientLogo = label.toLowerCase().includes('cliente');
                    let logoSrc = null;
                    if (isCompanyLogo) {
                        logoSrc = zone.staticValue || tenantLogo;
                    } else if (isClientLogo) {
                        logoSrc = clientLogo || projectLogo;
                    } else {
                        logoSrc = zone.sourceType === 'static' ? (zone.staticValue || tenantLogo) : (clientLogo || projectLogo);
                    }
                    content = logoSrc
                        ? `<img src="${logoSrc}" alt="${label}" />`
                        : `<div class="fallback-logo">${label || 'Logo'}</div>`;
                } else {
                    content = aiMapping[label] || label;
                }

                // Use original designer coordinates (0-1000 → 0-100%)
                return `<div class="fixed-zone" style="left: ${zone.xmin / 10}%; top: ${zone.ymin / 10}%; width: ${(zone.xmax - zone.xmin) / 10}%; height: ${(zone.ymax - zone.ymin) / 10}%;">${content}</div>`;
            }).join('');

            // === PHASE 4: Build fixed footer zones ===
            const fixedFooterHtml = footerZones.map(zone => {
                let content = "";
                const label = (zone.label || '');
                if (zone.staticValue) {
                    content = `<img src="${zone.staticValue}" alt="Pie de página" />`;
                } else if (label.toLowerCase().includes('pie')) {
                    content = aiMapping['Pie'] || aiMapping['Footer'] || l?.footerHtml || label;
                } else {
                    content = aiMapping[label] || label;
                }
                return `<div class="fixed-zone" style="left: ${zone.xmin / 10}%; top: ${zone.ymin / 10}%; width: ${(zone.xmax - zone.xmin) / 10}%; height: ${(zone.ymax - zone.ymin) / 10}%; font-size: 8pt; color: #777;">${content}</div>`;
            }).join('');

            // Add footerHtml from layout if set and no pie zone exists
            let layoutFooterHtml = '';
            if (l?.footerHtml && footerZones.length === 0) {
                layoutFooterHtml = `<div class="fixed-zone" style="position: fixed; bottom: 3mm; left: 15mm; right: 15mm; font-size: 8pt; color: #777; border-top: 0.5px solid #ddd; padding-top: 2px;">${l.footerHtml}</div>`;
            }

            // === PHASE 5: Build body HTML (flows naturally) ===
            let bodyContentHtml = '';
            bodyZones.forEach(zone => {
                const label = (zone.label || '');
                if (label === 'Párrafo' || label.toLowerCase().includes('párrafo')) {
                    bodyContentHtml += aiMapping['Párrafo'] || aiMapping['Body'] || aiMapping['Contenido'] || noteHtml;
                } else if (aiMapping[label]) {
                    bodyContentHtml += `<div style="margin-bottom: 1em;">${aiMapping[label]}</div>`;
                } else {
                    bodyContentHtml += `<div style="margin-bottom: 1em;">${label}</div>`;
                }
            });
            if (!bodyContentHtml) {
                bodyContentHtml = noteHtml;
            }

            // === PHASE 6: Build text overlays ===
            let overlaysHtml = '';
            if (l?.textOverlays && l.textOverlays.length > 0) {
                overlaysHtml = l.textOverlays
                    .filter(o => o.pageScope === 'all')
                    .map(o => {
                        const style = [
                            `position: fixed`,
                            `left: ${o.position.x}%`,
                            `top: ${o.position.y}%`,
                            `font-family: '${o.fontFamily}', sans-serif`,
                            `font-size: ${o.fontSize}pt`,
                            `font-weight: ${o.fontWeight}`,
                            `font-style: ${o.fontStyle}`,
                            `text-decoration: ${o.textDecoration}`,
                            `color: ${o.color}`,
                            `z-index: 200`,
                            `white-space: nowrap`,
                        ].join('; ');
                        return `<div class="text-overlay" style="${style}">${o.text}</div>`;
                    }).join('');
            }

            // === PHASE 7: Assemble final HTML ===
            return `<!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>${dynamicStyles}</style>
            </head>
            <body>
                <!-- Fixed header elements (logos, title, date) — painted inside @page margin-top -->
                ${fixedHeaderHtml}

                <!-- Fixed footer elements (Pie) — painted inside @page margin-bottom -->
                ${fixedFooterHtml}
                ${layoutFooterHtml}

                <!-- Text overlays -->
                ${overlaysHtml}

                <!-- Body content (flows in content area, auto-paginated) -->
                <div class="doc-body">
                    ${bodyContentHtml}
                </div>
            </body>
            </html>`;
        } else {
            // Non-zone templates: standard document styling
            dynamicStyles += `
                body { padding: 2rem; max-width: 820px; margin: auto; }
                .running-header { border-bottom: 2px solid #1a1a1a; padding-bottom: 0.5rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: flex-end; }
                .running-footer { margin-top: 2.5rem; padding-top: 0.6rem; border-top: 1px solid #ddd; font-size: 0.68rem; color: #999; display: flex; justify-content: space-between; }
                h1 { font-size: 1.6rem; font-weight: 700; margin: 0 0 0.5rem 0; }
                p { margin: 0.6rem 0; }
                table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
                th, td { border: 1px solid #ccc; padding: 7px 10px; text-align: left; }
                th { background: #f0f0f0; }
            `;
        }

        // --- Standard Logic (Old) ---
        const firstPageBlock = l?.firstPageEnabled ? `
        <div class="first-page-block">
            ${l.firstPageHeaderHtml ? `<div class="first-header">${l.firstPageHeaderHtml}</div>` : ''}
            <h1 class="doc-title">${noteTitle}</h1>
            <p class="doc-date">${today}</p>
            ${l.firstPageAssistants && l.firstPageAssistants.length > 0 ? `
            <div class="assistants-block">
                <h3>Asistentes</h3>
                <table class="assistants-table">
                    <thead><tr><th>Nombre</th><th>Firma</th></tr></thead>
                    <tbody>
                        ${l.firstPageAssistants.map(a => `<tr><td>${a}</td><td class="sig-cell"></td></tr>`).join('')}
                    </tbody>
                </table>
            </div>` : ''}
            ${l.firstPageExtraHtml ? `<div class="first-extra">${l.firstPageExtraHtml}</div>` : ''}
            <div class="page-break"></div>
        </div>` : '';

        const lastPageBlock = l?.lastPageEnabled && l.lastPageFooterHtml ? `
        <div class="last-page-block">
            <div class="page-break"></div>
            <div class="closing-block">${l.lastPageFooterHtml}</div>
        </div>` : '';

        const runningHeader = l?.headerHtml
            ? `<div class="running-header">${l.headerHtml}</div>`
            : `<div class="running-header default-header"><span class="brand">UniTask</span><span class="doc-meta">${template.name} · ${today}</span></div>`;

        const runningFooter = l?.footerHtml
            ? `<div class="running-footer">${l.footerHtml}</div>`
            : `<div class="running-footer default-footer"><span>Generado con UniTask · ${template.name}</span><span>${now}</span></div>`;

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${template.name} – ${noteTitle}</title>
    <style>${dynamicStyles}</style>
</head>
<body>
    ${firstPageBlock}
    ${runningHeader}
    ${!l?.firstPageEnabled ? `<h1>${noteTitle}</h1><hr>` : ''}
    ${noteHtml}
    ${lastPageBlock}
    ${runningFooter}
</body>
</html>`;
    };

    const handleSmartLayout = async () => {
        // Find a template with zones
        const templateWithZones = templates.find(t => t.config?.visualZones && t.config.visualZones.length > 0);
        if (!templateWithZones) {
            alert("No hay plantillas con zonas visuales disponibles para optimizar.");
            return;
        }

        setOptimizing(true);
        try {
            const result = await optimizeDocumentContent(noteHtml, templateWithZones.config.visualZones);
            if (result.mapping) {
                setAiMapping(result.mapping);
                // Optionally auto-print or just show feedback
            } else if (result.error) {
                alert("Error de IA: " + result.error);
            }
        } catch (err) {
            console.error("Smart Layout Error:", err);
        } finally {
            setOptimizing(false);
        }
    };

    const handlePrint = (template: Template) => {
        setPrinting(template.id);
        const htmlContent = buildHtml(template);

        const printWindow = window.open("", "_blank", "width=900,height=700");
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();

            // Wait for images to load
            setTimeout(() => {
                printWindow.print();
                setPrinting(null);
            }, 1000);
        } else {
            alert("El navegador bloqueó la ventana emergente. Por favor, permítelas e intenta de nuevo.");
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
                            <h2 className="text-xl font-bold">Imprimir Nota</h2>
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
                                Recargar Aplicación
                            </button>
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="text-center py-16 opacity-50">
                            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground">No hay plantillas disponibles para este tenant.</p>
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
                                            <p className="text-sm text-muted-foreground">{t.description || t.type}</p>
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
                    <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground">
                        Cancelar
                    </button>
                    <button onClick={onClose} className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-bold hover:bg-secondary/80 transition-all">
                        Cerrar
                    </button>
                    {templates.some(t => t.config?.visualZones?.length > 0) && (
                        <button
                            onClick={handleSmartLayout}
                            disabled={optimizing}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            {optimizing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4" />
                            )}
                            {Object.keys(aiMapping).length > 0 ? "Layout Optimizado" : "Distribución Inteligente (IA)"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

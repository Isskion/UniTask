// UniDocs Print Engine — V2.4
//
// Exports:
//   buildPrintHtml  — Full A4 print HTML (thead/tfoot table + optional cover page)
//   buildWordHtml   — Simplified Word-compatible HTML
//
// Architecture:
//   · Cover page: <div> 210×297mm with page-break-after: always (before the table)
//   · Body: <table> with <thead>/<tfoot>/<tbody> — browser guarantees header/footer
//     repeat on every printed page, body content cannot overlap them.
//   · @page { margin: 0 } removes browser date/URL/page-number chrome.
//   · Variable substitution applies only to cover template blocks.

import { UniDocsTemplate, MinutaContext } from '@/types/unidocs';
import type { TemplateBlock } from '@/types/unidocs';

const A4_HEIGHT_MM = 297;

// ---------------------------------------------------------------------------
// Variable substitution — applies @tokens in staticText for cover blocks
// ---------------------------------------------------------------------------
function substituteVars(text: string, ctx: MinutaContext): string {
    return text
        .replace(/@titulo/g, ctx.minutaTitle)
        .replace(/@fecha/g, ctx.meetingDate)
        .replace(/@proyecto/g, ctx.projectName)
        .replace(/@cliente/g, ctx.clientName)
        .replace(/@codigo/g, ctx.projectCode)
        .replace(/@email/g, ctx.projectEmail ?? '')
        .replace(/@telefono/g, ctx.projectPhone ?? '');
}

// ---------------------------------------------------------------------------
// Shared block renderer — used for both cover and body header/footer blocks
// ---------------------------------------------------------------------------
function renderBlock(
    block: TemplateBlock,
    noteTitle: string,
    today: string,
    tenantLogoSrc: string | null,
    clientLogoSrc: string | null,
    minutaContext?: MinutaContext,
): string {
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

    // Resolve static text (with optional variable substitution for cover)
    const rawText = cfg.staticText || '';
    const resolvedText = minutaContext ? substituteVars(rawText, minutaContext) : rawText;

    // Title text: if minutaContext is provided (cover), use minutaTitle; otherwise noteTitle
    const titleText = minutaContext ? minutaContext.minutaTitle : noteTitle;

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
            // In cover: use staticText (with var substitution) if set, otherwise minutaTitle
            return `<div style="${textStyle};line-height:1.2;">${resolvedText || titleText}</div>`;
        case 'fecha':
            return `<div style="${textStyle}">${minutaContext ? minutaContext.meetingDate : today}</div>`;
        case 'pie': {
            const align = cfg.textAlign === 'center' ? 'justify-content:center;'
                : cfg.textAlign === 'right' ? 'justify-content:flex-end;' : '';
            return `<div style="${textStyle};width:100%;height:100%;display:flex;align-items:center;${align}">${resolvedText}</div>`;
        }
        case 'texto_libre':
            return `<div style="${textStyle}">${resolvedText}</div>`;
        case 'separador':
            return `<hr style="border:none;border-top:1px solid ${cfg.borderColor || '#ddd'};margin:0;" />`;
        default:
            return '';
    }
}

// ---------------------------------------------------------------------------
// Cover page HTML — 210×297mm div with absolute-positioned blocks
// ---------------------------------------------------------------------------
function buildCoverPageHtml(
    coverTemplate: UniDocsTemplate,
    tenantLogoSrc: string | null,
    clientLogoSrc: string | null,
    minutaContext: MinutaContext,
): string {
    const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    const blocks = coverTemplate.blocks || [];

    // Logo blocks keep overflow:hidden (images must not escape their box).
    // Text blocks (titulo, texto_libre, fecha, separador, pie) use overflow:visible
    // + min-height so large font sizes (e.g. 50pt) are never clipped.
    const TEXT_BLOCK_TYPES = ['titulo', 'texto_libre', 'fecha', 'separador', 'pie'];
    const blocksHtml = blocks.map(block => {
        const bx = block.x ?? 0;
        const by = block.y ?? 0;
        const bw = block.width ?? 40;
        const bh = block.height ?? 10;
        const isTextBlock = TEXT_BLOCK_TYPES.includes(block.type);
        const sizeStyle = isTextBlock
            ? `min-height:${bh}mm;height:auto;overflow:visible;`
            : `height:${bh}mm;overflow:hidden;`;
        const inner = renderBlock(block, '', today, tenantLogoSrc, clientLogoSrc, minutaContext);
        return `<div style="position:absolute;left:${bx}mm;top:${by}mm;width:${bw}mm;${sizeStyle}box-sizing:border-box;">${inner}</div>`;
    }).join('\n');

    return `<div style="width:210mm;height:297mm;position:relative;page-break-after:always;overflow:hidden;">\n${blocksHtml}\n</div>`;
}

// ---------------------------------------------------------------------------
// Main print HTML — thead/tfoot table with optional cover page prepended
// ---------------------------------------------------------------------------
export function buildPrintHtml(
    template: UniDocsTemplate,
    noteTitle: string,
    noteHtml: string,
    tenantLogoSrc: string | null,
    clientLogoSrc: string | null,
    coverTemplate?: UniDocsTemplate,
    minutaContext?: MinutaContext,
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

    // Header blocks: absolutely positioned within thead (thead top = paper top = y:0)
    const headerHtml = headerBlocks.map(block => {
        const bx = block.x ?? 0;
        const by = block.y ?? 0;
        const bw = block.width ?? 40;
        const bh = block.height ?? 10;
        return `<div style="position:absolute;left:${bx}mm;top:${by}mm;width:${bw}mm;height:${bh}mm;overflow:hidden;box-sizing:border-box;">${renderBlock(block, noteTitle, today, tenantLogoSrc, clientLogoSrc)}</div>`;
    }).join('\n');

    // Footer blocks: positioned relative to tfoot container (tfoot top = footerTopY on paper)
    const footerHtml = footerBlocks.map(block => {
        const bx = block.x ?? 0;
        const by = block.y ?? 0;
        const bw = block.width ?? 40;
        const bh = block.height ?? 10;
        const topInTfoot = by - footerTopY;
        return `<div style="position:absolute;left:${bx}mm;top:${topInTfoot}mm;width:${bw}mm;height:${bh}mm;overflow:hidden;box-sizing:border-box;">${renderBlock(block, noteTitle, today, tenantLogoSrc, clientLogoSrc)}</div>`;
    }).join('\n');

    // Optional cover page
    const coverHtml = coverTemplate && minutaContext
        ? buildCoverPageHtml(coverTemplate, tenantLogoSrc, clientLogoSrc, minutaContext)
        : '';

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
        .doc-body table { width: 100%; border-collapse: collapse; margin: 0.6em 0; page-break-inside: avoid; break-inside: avoid; table-layout: fixed; }
        .doc-body th, .doc-body td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; font-size: 9.5pt; word-break: break-word; overflow-wrap: break-word; }
        .doc-body th { background: #f0f0f0; font-weight: bold; }
        .doc-body img { max-width: 100%; height: auto; page-break-inside: avoid; break-inside: avoid; display: block; }
        .doc-body blockquote { border-left: 3px solid #888; padding-left: 1em; color: #444; margin: 0.5em 0; font-style: italic; }
        .doc-body pre, .doc-body code { font-family: 'Courier New', monospace; background: #f5f5f5; }
        .doc-body pre { padding: 0.5em; overflow: hidden; page-break-inside: avoid; break-inside: avoid; }
        .doc-body section { page-break-inside: avoid; }
    </style>
</head>
<body>
    ${coverHtml}
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
// Word-compatible HTML export — no fixed positioning, flat linear structure
// Cover page rendered as centered block + mso page break before body
// ---------------------------------------------------------------------------
export function buildWordHtml(
    template: UniDocsTemplate,
    noteTitle: string,
    noteHtml: string,
    tenantLogoSrc: string | null,
    clientLogoSrc: string | null,
    coverTemplate?: UniDocsTemplate,
    minutaContext?: MinutaContext,
): string {
    const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    const blocks = template.blocks || [];
    const margins = template.pageMargins || { top: 20, right: 20, bottom: 20, left: 20 };

    // --- Cover page (Word flat rendering) ---
    // Blocks sorted by Y so they render top→bottom in logical reading order.
    // A centered div with 100% height simulates the full A4 cover page.
    let coverContent = '';
    if (coverTemplate && minutaContext) {
        const coverBlocks = [...(coverTemplate.blocks || [])].sort((a, b) => (a.y ?? 0) - (b.y ?? 0));
        const coverItems = coverBlocks.map(block => {
            const cfg = block.config;
            const fontSize = cfg.fontSize ? `font-size:${cfg.fontSize}pt;` : '';
            const fontWeight = cfg.fontWeight === 'bold' ? 'font-weight:bold;' : '';
            const fontStyle = cfg.fontStyle === 'italic' ? 'font-style:italic;' : '';
            const color = cfg.color ? `color:${cfg.color};` : '';
            const align = cfg.textAlign ? `text-align:${cfg.textAlign};` : 'text-align:center;';
            const fontFamily = cfg.fontFamily ? `font-family:'${cfg.fontFamily}',Georgia,serif;` : '';
            const textStyle = `${fontSize}${fontWeight}${fontStyle}${color}${align}${fontFamily}`;

            const resolvedText = (raw: string) => raw
                .replace(/@titulo/g, minutaContext.minutaTitle)
                .replace(/@fecha/g, minutaContext.meetingDate)
                .replace(/@proyecto/g, minutaContext.projectName)
                .replace(/@cliente/g, minutaContext.clientName)
                .replace(/@codigo/g, minutaContext.projectCode)
                .replace(/@email/g, minutaContext.projectEmail ?? '')
                .replace(/@telefono/g, minutaContext.projectPhone ?? '');

            switch (block.type) {
                case 'logo_empresa':
                    return tenantLogoSrc
                        ? `<p style="text-align:center;margin:0 0 12pt;"><img src="${tenantLogoSrc}" style="max-height:30mm;max-width:80mm;object-fit:contain;" /></p>`
                        : '';
                case 'logo_cliente':
                    return clientLogoSrc
                        ? `<p style="text-align:center;margin:0 0 12pt;"><img src="${clientLogoSrc}" style="max-height:30mm;max-width:80mm;object-fit:contain;" /></p>`
                        : '';
                case 'titulo':
                    return `<p style="${textStyle}margin:24pt 0 12pt;">${resolvedText(cfg.staticText || minutaContext.minutaTitle)}</p>`;
                case 'fecha':
                    return `<p style="${textStyle}margin:0 0 8pt;">${minutaContext.meetingDate || today}</p>`;
                case 'texto_libre':
                    return cfg.staticText
                        ? `<p style="${textStyle}margin:0 0 8pt;">${resolvedText(cfg.staticText)}</p>`
                        : '';
                case 'separador':
                    return `<hr style="border:none;border-top:1px solid ${cfg.borderColor || '#ddd'};margin:12pt 0;" />`;
                default:
                    return '';
            }
        }).filter(Boolean).join('\n');

        // mso-break-type:page forces a page break after the cover in Word
        coverContent = `
<div style="text-align:center;padding:60pt 40pt;">
${coverItems}
</div>
<br style="mso-special-character:line-break;page-break-after:always;" />`;
    }

    // --- Body header (repeating in Word via normal flow) ---
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

    const bodyContent = `<div>${noteHtml}</div>`;

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
    table { width: 100%; border-collapse: collapse; word-break: break-word; }
    th, td { border: 1px solid #ccc; padding: 4px 8px; font-size: 9.5pt; word-break: break-word; }
    th { background: #f0f0f0; font-weight: bold; }
    img { max-width: 100%; }
    .header { border-bottom: 1px solid #ddd; padding-bottom: 8pt; margin-bottom: 12pt; }
    .footer { border-top: 1px solid #ddd; padding-top: 6pt; margin-top: 24pt; }
</style>
</head>
<body>
${coverContent}
<div class="header">${headerContent}</div>
${bodyContent}
${footerContent ? `<div class="footer">${footerContent}</div>` : ''}
</body>
</html>`;
}

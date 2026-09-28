/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { buildXml, buildExampleXml, type BuildXmlContext } from '../../services/xmlBuilder';

/**
 * XML Preview — renders the actual SOAP XML that would be sent for the selected row
 * using the full buildXml engine.
 */
export default function XmlPreview() {
    const selectedRow = useAppStore((s) => s.selectedRow);
    const rows = useAppStore((s) => s.rows);
    const mapping = useAppStore((s) => s.mapping);
    const token = useAppStore((s) => s.token);
    const booleanOverrides = useAppStore((s) => s.booleanOverrides);
    
    const [copied, setCopied] = useState(false);

    const hasRow = selectedRow >= 0 && !!rows[selectedRow];

    // Sin fila seleccionada (o sin Excel cargado) se muestra el XML de EJEMPLO con todos los
    // campos del contrato, para poder copiarlo y probar el método a mano. Antes el panel
    // quedaba vacío ("Selecciona una fila...") y no había forma de ver la plantilla.
    const xml = useMemo(() => {
        if (!hasRow) return buildExampleXml(token || 'TOKEN');
        try {
            const ctx: BuildXmlContext = {
                mapping,
                booleanOverrides,
                token: token || '',
                dynFieldsConfig: {},
            };
            return buildXml(rows[selectedRow], ctx);
        } catch (err: any) {
            console.error('[VehicleXmlPreview] buildXml falló', { selectedRow, err });
            return `<!-- Error generando XML de la fila ${selectedRow + 1}: ${err.message} -->`;
        }
    }, [hasRow, selectedRow, rows, mapping, token, booleanOverrides]);

    const handleCopy = async () => {
        if (!xml) return;
        try {
            await navigator.clipboard.writeText(xml);
        } catch {
            // Fallback para contextos sin permiso de portapapeles
            const ta = document.createElement('textarea');
            ta.value = xml;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Pretty-print the XML
    const prettyXml = formatXml(xml);

    return (
        <div className="flex flex-col h-full bg-slate-950 border-t border-slate-700 text-slate-350">
            <div className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-750 shrink-0">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">📝 {hasRow ? `SOAP XML Request (Fila ${selectedRow + 1})` : 'XML de ejemplo (todos los campos)'}</span>
                <div className="flex items-center gap-2">
                    <button
                        className="px-2 py-0.5 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors cursor-pointer"
                        onClick={handleCopy}
                    >
                        {copied ? 'Copiado! ✓' : 'Copiar XML'}
                    </button>
                    <span className="text-[10px] text-indigo-400 font-mono bg-indigo-950 border border-indigo-900 px-1.5 py-0.2 rounded">
                        {prettyXml.length} chars
                    </span>
                </div>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-[11px] font-mono leading-normal bg-slate-950 text-emerald-400 selection:bg-emerald-500/20 whitespace-pre scrollbar-thin">
                {prettyXml}
            </pre>
        </div>
    );
}

/** Simple XML formatter — adds newlines and indentation */
function formatXml(xml: string): string {
    let formatted = '';
    let indent = 0;
    const parts = xml.replace(/>\s*</g, '>\n<').split('\n');
    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('</')) indent = Math.max(0, indent - 1);
        formatted += '  '.repeat(indent) + trimmed + '\n';
        if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.startsWith('<?') && !trimmed.endsWith('/>') && !/<\/[^>]+>$/.test(trimmed)) {
            indent++;
        }
    }
    return formatted.trim();
}

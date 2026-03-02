/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { buildXml, type BuildXmlContext } from '../../services/xmlBuilder';

/**
 * XML Preview — renders the actual SOAP XML that would be sent for the selected row
 * using the full buildXml engine (same as send flow).
 */
export default function XmlPreview() {
    const selectedRow = useAppStore((s) => s.selectedRow);
    const rows = useAppStore((s) => s.rows);
    const mapping = useAppStore((s) => s.mapping);
    const token = useAppStore((s) => s.token);
    const booleanOverrides = useAppStore((s) => s.booleanOverrides);
    const multiSheet = useAppStore((s) => s.multiSheet);

    const xml = useMemo(() => {
        if (selectedRow < 0 || !rows[selectedRow]) return '';
        try {
            const ctx: BuildXmlContext = {
                mapping,
                booleanOverrides,
                token: token || '',
                dynFieldsConfig: {},
                multiSheetEnabled: multiSheet.enabled,
                multiSheetConfig: multiSheet.config,
                getRelatedItems: (row: any, relation: any) => {
                    if (!multiSheet.enabled) return [];
                    const mainKey = multiSheet.config.mainKey;
                    const keyValue = row[mainKey];
                    const relatedRows = multiSheet.sheets[relation.sheet] || [];
                    return relatedRows.filter((r: any) => String(r[relation.key]) === String(keyValue));
                },
            };
            return buildXml(rows[selectedRow], ctx);
        } catch (err: any) {
            return `<!-- Error generando XML: ${err.message} -->`;
        }
    }, [selectedRow, rows, mapping, token, booleanOverrides, multiSheet]);

    if (selectedRow < 0 || !rows[selectedRow]) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-800 to-slate-700 shrink-0">
                    <span className="text-sm font-bold text-white">📝 XML Request</span>
                    <span className="text-xs text-slate-400 font-medium">Vista previa</span>
                </div>
                <div className="flex items-center justify-center flex-1 p-8">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-3xl mb-3 shadow-inner">
                            📝
                        </div>
                        <p className="text-sm text-slate-400 italic">Selecciona una fila para ver el XML generado...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Pretty-print the XML
    const prettyXml = formatXml(xml);

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-800 to-slate-700 shrink-0">
                <span className="text-sm font-bold text-white">📝 XML Request (Fila {selectedRow + 1})</span>
                <span className="text-xs text-emerald-300 font-mono bg-emerald-500/15 px-2 py-0.5 rounded-md">
                    {prettyXml.length} chars
                </span>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs font-mono leading-relaxed bg-slate-900 text-emerald-300 selection:bg-emerald-500/30 whitespace-pre-wrap break-all">
                {prettyXml}
            </pre>
        </div>
    );
}

/** Simple XML formatter — adds newlines and indentation */
function formatXml(xml: string): string {
    let formatted = '';
    let indent = 0;
    const parts = xml.replace(/>(\\s*)</g, '>\n<').split('\n');
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

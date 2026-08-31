/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { buildXml, type BuildXmlContext } from '../../services/xmlBuilder';

export default function XmlPreview() {
    const selectedRow = useAppStore((s) => s.selectedRow);
    const rows = useAppStore((s) => s.rows);
    const mapping = useAppStore((s) => s.mapping);
    const token = useAppStore((s) => s.token);
    const booleanOverrides = useAppStore((s) => s.booleanOverrides);
    const [copied, setCopied] = useState(false);

    const xml = useMemo(() => {
        if (selectedRow < 0 || !rows[selectedRow]) return '';
        try {
            const ctx: BuildXmlContext = {
                mapping, booleanOverrides, token: token || '', dynFieldsConfig: {},
            };
            return buildXml(rows[selectedRow], ctx);
        } catch (err: any) {
            return `<!-- Error generando XML: ${err.message} -->`;
        }
    }, [selectedRow, rows, mapping, token, booleanOverrides]);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(xml).then(() => {
            setCopied(true); setTimeout(() => setCopied(false), 2000);
        });
    }, [xml]);

    const handleDownload = useCallback(() => {
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const refCol = mapping['Root.ClienteDador.ReferenciaExterna'] || mapping['Root.ClienteDador.RazonSocial'];
        const ref = refCol && rows[selectedRow] ? rows[selectedRow][refCol] : `fila_${selectedRow + 1}`;
        a.href = url; a.download = `cliente_dador_${ref}.xml`; a.click();
        URL.revokeObjectURL(url);
    }, [xml, mapping, rows, selectedRow]);

    if (selectedRow < 0 || !rows[selectedRow]) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-800 to-slate-700 shrink-0">
                    <span className="text-sm font-bold text-white">📝 XML Request</span>
                    <span className="text-xs text-slate-400 font-medium">Vista previa</span>
                </div>
                <div className="flex items-center justify-center flex-1 p-8">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-3xl mb-3 shadow-inner">👤</div>
                        <p className="text-sm text-slate-400 italic">Selecciona una fila para ver el XML de CrearClientesDadores...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-800 to-slate-700 shrink-0">
                <span className="text-sm font-bold text-white">📝 XML Request (Fila {selectedRow + 1})</span>
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-emerald-300 font-mono bg-emerald-500/15 px-2 py-0.5 rounded-md">{xml.length} chars</span>
                    <button className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${copied ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/10 text-white/80 hover:bg-white/20'}`} onClick={handleCopy} title="Copiar XML">
                        {copied ? '✅ Copiado' : '📋 Copiar'}
                    </button>
                    <button className="px-2 py-1 text-[10px] font-bold bg-white/10 text-white/80 rounded-lg hover:bg-white/20 transition-all" onClick={handleDownload} title="Descargar XML">💾 .xml</button>
                </div>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs font-mono leading-relaxed bg-slate-900 selection:bg-emerald-500/30 whitespace-pre-wrap break-all">
                <SyntaxHighlightedXml xml={xml} />
            </pre>
        </div>
    );
}

function SyntaxHighlightedXml({ xml }: { xml: string }) {
    const formatted = useMemo(() => formatXml(xml), [xml]);
    const highlighted = useMemo(() => {
        return formatted.split('\n').map((line, i) => {
            const parts: React.JSX.Element[] = [];
            let remaining = line; let key = 0;
            while (remaining.length > 0) {
                let match = remaining.match(/^(<\?[^?]*\?>)/);
                if (match) { parts.push(<span key={key++} className="text-slate-500">{match[1]}</span>); remaining = remaining.slice(match[1].length); continue; }
                match = remaining.match(/^(<\/[a-zA-Z0-9_:]+>)/);
                if (match) { parts.push(<span key={key++} className="text-indigo-400">{match[1]}</span>); remaining = remaining.slice(match[1].length); continue; }
                match = remaining.match(/^(<[a-zA-Z0-9_:]+)(\s+[^>]*?)?(\/?>)/);
                if (match) {
                    parts.push(<span key={key++} className="text-indigo-400">{match[1]}</span>);
                    if (match[2]) {
                        const attrs = match[2].replace(/(\w+[:_]?\w*)=("([^"]*)")/g, (_m: string, name: string, val: string) => `\x01${name}\x02=\x03${val}\x04`);
                        const attrParts = attrs.split(/(\x01[^\x04]+\x04)/);
                        attrParts.forEach((ap) => {
                            const am = ap.match(/\x01([^\x02]+)\x02=\x03([^\x04]+)\x04/);
                            if (am) { parts.push(<span key={key++} className="text-amber-400"> {am[1]}</span>); parts.push(<span key={key++} className="text-slate-500">=</span>); parts.push(<span key={key++} className="text-emerald-400">{am[2]}</span>); }
                            else if (ap) { parts.push(<span key={key++} className="text-slate-500">{ap}</span>); }
                        });
                    }
                    parts.push(<span key={key++} className="text-indigo-400">{match[3]}</span>);
                    remaining = remaining.slice(match[0].length); continue;
                }
                match = remaining.match(/^(<!--[\s\S]*?-->)/);
                if (match) { parts.push(<span key={key++} className="text-slate-600 italic">{match[1]}</span>); remaining = remaining.slice(match[1].length); continue; }
                match = remaining.match(/^([^<]+)/);
                if (match) { parts.push(<span key={key++} className="text-emerald-300">{match[1]}</span>); remaining = remaining.slice(match[1].length); continue; }
                parts.push(<span key={key++} className="text-slate-400">{remaining[0]}</span>); remaining = remaining.slice(1);
            }
            return <div key={i}>{parts}</div>;
        });
    }, [formatted]);
    return <>{highlighted}</>;
}

function formatXml(xml: string): string {
    let formatted = ''; let indent = 0;
    const parts = xml.replace(/>(\\s*)</g, '>\n<').split('\n');
    for (const part of parts) {
        const trimmed = part.trim(); if (!trimmed) continue;
        if (trimmed.startsWith('</')) indent = Math.max(0, indent - 1);
        formatted += '  '.repeat(indent) + trimmed + '\n';
        if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.startsWith('<?') && !trimmed.endsWith('/>') && !/<\/[^>]+>$/.test(trimmed)) indent++;
    }
    return formatted.trim();
}
import { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useAppStore } from '../../store/appStore';
export interface ProgressLog {
    ref: string;
    status: 'success' | 'error' | 'warn' | 'info';
    msg: string;
    detail?: string;  // respuesta SOAP raw / contexto extra, expandible
    xml?: string;      // #36: XML that was sent (for failed downloads)
}

interface ProgressModalProps {
    isOpen: boolean;
    total: number;
    current: number;
    successCount: number;
    errorCount: number;
    isComplete: boolean;
    logs: ProgressLog[];
    onCancel: () => void;
    onClose: () => void;
}

// Helper tool to basically format XML/SOAP strings visually
function formatXml(xmlStr: string) {
    if (!xmlStr) return '';
    try {
        let formatted = '';
        let pad = 0;
        const reg = new RegExp('(>)(<)(\\\\/*)', 'g');
        const xml = xmlStr.replace(reg, '$1\n$2$3');
        xml.split('\n').forEach((node) => {
            let indent = 0;
            if (node.match(/.+<\/\w[^>]*>$/)) {
                indent = 0;
            } else if (node.match(/^<\/\w/)) {
                if (pad !== 0) pad -= 1;
            } else if (node.match(/^<\w([^>]*[^/])?>.*$/)) {
                indent = 1;
            } else {
                indent = 0;
            }
            formatted += '  '.repeat(pad) + node + '\n';
            pad += indent;
        });
        return formatted.trim();
    } catch {
        return xmlStr;
    }
}

function LogRow({ log }: { log: ProgressLog }) {
    const [open, setOpen] = useState(false);
    const colors = {
        success: { badge: 'bg-emerald-500/20 text-emerald-400', text: 'text-emerald-300' },
        error:   { badge: 'bg-red-500/20 text-red-400',         text: 'text-red-300'     },
        warn:    { badge: 'bg-amber-500/20 text-amber-400',      text: 'text-amber-300'   },
        info:    { badge: 'bg-slate-500/20 text-slate-400',      text: 'text-slate-400'   },
    }[log.status];

    const handleDownloadXml = () => {
        if (!log.xml) return;
        const blob = new Blob([log.xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `failed_${log.ref}.xml`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            <div className="flex items-start gap-2 text-xs font-mono">
                <span className={`shrink-0 px-1.5 py-0.5 rounded font-bold ${colors.badge}`}>
                    {log.ref}
                </span>
                <span className={`flex-1 ${colors.text}`}>{log.msg}</span>
                <div className="flex items-center gap-1 shrink-0">
                    {/* #36: Download failed XML */}
                    {log.status === 'error' && log.xml && (
                        <button
                            onClick={handleDownloadXml}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/50 text-red-300 hover:bg-red-800/50 transition-colors"
                            title="Descargar XML fallido"
                        >
                            💾 XML
                        </button>
                    )}
                    {log.detail && (
                        <button
                            onClick={() => setOpen(o => !o)}
                            className="text-[10px] px-1 py-0.5 rounded bg-slate-700 text-slate-400 hover:bg-slate-600"
                        >
                            {open ? '▲' : '▼'}
                        </button>
                    )}
                </div>
            </div>
            {open && log.detail && (
                <pre className="mt-1 ml-2 text-[10px] text-slate-400 bg-slate-800 rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap break-all border border-slate-700 shadow-inner">
                    {formatXml(log.detail)}
                </pre>
            )}
        </div>
    );
}

export default function ProgressModal({
    isOpen,
    total,
    current,
    successCount,
    errorCount,
    isComplete,
    logs,
    onCancel,
    onClose,
}: ProgressModalProps) {
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [elapsed, setElapsed] = useState(0);
    const [copiedReport, setCopiedReport] = useState(false);
    const startTimeRef = useRef(0);

    useEffect(() => {
        if (!isOpen) { setElapsed(0); return; }
        if (isComplete) return;
        startTimeRef.current = startTimeRef.current || Date.now();
        const t = setInterval(() => setElapsed((e) => e + 1), 1000);
        return () => clearInterval(t);
    }, [isOpen, isComplete]);

    // Autoscroll instantáneo, no 'smooth': con un envío grande esto se dispara varias veces
    // por fila (miles de veces en total) y una animación smooth en cada una se pisa a sí misma
    // y satura el hilo principal — visualmente indistinguible aquí, pero sin el costo.
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [logs]);

    // Techo de líneas realmente montadas en el DOM. `logs` completo (sin techo) se sigue
    // usando para "Copiar errores" y queda íntegro en memoria — aquí solo se limita el render.
    // Antes se montaban TODAS las líneas acumuladas sin virtualizar: en un envío de miles de
    // filas (varias líneas de log por fila) esto era miles de nodos DOM re-renderizados en
    // cada línea nueva — la causa más visible del freeze del navegador durante un envío grande.
    const MAX_VISIBLE_LOGS = 200;
    const visibleLogs = logs.length > MAX_VISIBLE_LOGS ? logs.slice(logs.length - MAX_VISIBLE_LOGS) : logs;
    const hiddenLogCount = logs.length - visibleLogs.length;

    // #41: Play sound on completion
    useEffect(() => {
        if (isComplete && isOpen) {
            try {
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 800;
                gain.gain.value = 0.1;
                osc.start();
                osc.stop(ctx.currentTime + 0.15);
                setTimeout(() => {
                    const osc2 = ctx.createOscillator();
                    const gain2 = ctx.createGain();
                    osc2.connect(gain2);
                    gain2.connect(ctx.destination);
                    osc2.frequency.value = 1200;
                    gain2.gain.value = 0.1;
                    osc2.start();
                    osc2.stop(ctx.currentTime + 0.2);
                }, 150);
            } catch { /* Audio not available */ }
        }
    }, [isComplete, isOpen]);

    // #38: Copy error report
    const handleCopyReport = useCallback(() => {
        const errorLogs = logs.filter(l => l.status === 'error');
        if (errorLogs.length === 0) return;

        const report = [
            `📋 REPORTE DE ERRORES — UniClienteDadorCreator`,
            `Fecha: ${new Date().toLocaleString()}`,
            `Total: ${total} | OK: ${successCount} | Errores: ${errorCount}`,
            `Tiempo: ${formatTime(elapsed)}`,
            `${'─'.repeat(50)}`,
            ...errorLogs.map((l, i) =>
                `${i + 1}. [${l.ref}] ${l.msg}${l.detail ? `\n   Detalle: ${l.detail.substring(0, 200)}` : ''}`
            ),
        ].join('\n');

        navigator.clipboard.writeText(report).then(() => {
            setCopiedReport(true);
            setTimeout(() => setCopiedReport(false), 2000);
        });
    }, [logs, total, successCount, errorCount, elapsed]);

    const appRows = useAppStore((s) => s.rows);

    // #4 & #80: Export results to Excel (.xlsx) taking full original rows
    const handleExportResults = useCallback(() => {
        // Collect all header names including the ones generated dynamically (like _status, _error, _UnigisId)
        const newRows = appRows.map((r, i) => {
            const copy = { ...r };
            
            // Clean internal un-needed keys
            delete copy._validationInfo;
            delete copy._items;
            delete copy._grouped;
            delete copy._itemCount;

            // Make error/status pretty
            copy['Status_Envio'] = r._status === 'success' ? 'OK' : r._status === 'error' ? 'ERROR' : r._status;
            copy['Detalle_Error'] = r._error || '';
            copy['Id_Recibido_UNIGIS'] = r._UnigisId || '';

            return copy;
        });

        const ws = XLSX.utils.json_to_sheet(newRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Resultados");

        XLSX.writeFile(wb, `UniTask_Resultados_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }, [appRows]);

    if (!isOpen) return null;

    const pct = total > 0 ? Math.round((current / total) * 100) : 0;

    // #26: Speed stats
    const speed = elapsed > 0 ? (current / elapsed * 60).toFixed(1) : '—';
    const eta = elapsed > 0 && current > 0 ? Math.round(((total - current) / (current / elapsed))) : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-100 overflow-hidden" style={{ animation: 'dashboardSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                {/* Header */}
                <div className={`px-6 py-4 ${isComplete ? 'bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-800' : 'bg-gradient-to-r from-[#0f172a] via-[#1e1b4b] to-[#0f172a]'}`}>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                        {isComplete ? '✅ Envío Completado' : '⏳ Enviando Pedidos'}
                    </h2>
                    {!isComplete && (
                        <p className="text-[11px] text-white/50 mt-0.5 font-medium">
                            {speed} pedidos/min · ETA: {formatTime(eta)}
                        </p>
                    )}
                </div>

                <div className="p-6 space-y-5">
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center shadow-sm">
                            <div className="text-xl font-black text-slate-700 tabular-nums">{total}</div>
                            <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Total</div>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center shadow-sm">
                            <div className="text-xl font-black text-emerald-600 tabular-nums">{successCount}</div>
                            <div className="text-[9px] text-emerald-500 font-semibold uppercase tracking-wider mt-0.5">✓ OK</div>
                        </div>
                        <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-center shadow-sm">
                            <div className="text-xl font-black text-red-600 tabular-nums">{errorCount}</div>
                            <div className="text-[9px] text-red-500 font-semibold uppercase tracking-wider mt-0.5">✗ Error</div>
                        </div>
                        <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-center shadow-sm">
                            <div className="text-base font-black text-indigo-600 font-mono">{formatTime(elapsed)}</div>
                            <div className="text-[9px] text-indigo-500 font-semibold uppercase tracking-wider mt-0.5">Tiempo</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                        <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ease-out ${isComplete
                                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                        : 'bg-gradient-to-r from-indigo-600 to-indigo-400'
                                    }`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <div className="text-center text-xs font-semibold text-slate-500 mt-1.5">
                            {current} / {total} ({pct}%)
                        </div>
                    </div>

                    {/* Logs */}
                    <div className="max-h-48 overflow-auto rounded-xl bg-slate-900 p-3 space-y-1 border border-slate-700">
                        {hiddenLogCount > 0 && (
                            <div className="text-[10px] text-slate-500 italic pb-1 text-center">
                                … {hiddenLogCount} líneas anteriores ocultas (se incluyen en &quot;Copiar errores&quot;)
                            </div>
                        )}
                        {visibleLogs.map((log, i) => (
                            <LogRow key={hiddenLogCount + i} log={log} />
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    {isComplete && (
                        <div className="flex items-center gap-1.5">
                            {errorCount > 0 && (
                                <button
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                        copiedReport
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                    }`}
                                    onClick={handleCopyReport}
                                >
                                    {copiedReport ? '✅ Copiado' : '📋 Copiar errores'}
                                </button>
                            )}
                            <button
                                className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all"
                                onClick={handleExportResults}
                            >
                                📊 Export Excel
                            </button>
                        </div>
                    )}
                    <div className="flex-1" />
                    {!isComplete ? (
                        <button
                            className="px-5 py-2 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-500 transition-colors shadow-lg shadow-red-500/25"
                            onClick={onCancel}
                        >
                            ⛔ Cancelar Envío
                        </button>
                    ) : (
                        <button
                            className="px-5 py-2 text-sm font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
                            onClick={onClose}
                        >
                            Cerrar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;


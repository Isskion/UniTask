/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useAppStore } from '../../store/appStore';
import { UNIGIS_ERROR_CODES } from '../../data/errorCodes';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResultsDashboardProps {
    isOpen: boolean;
    onClose: () => void;
    onRetryRow: (index: number) => void;
    onRetryAll: () => void;
}

type TabId = 'overview' | 'errors' | 'success';

// ─── Animated Donut Chart (Pure SVG) ──────────────────────────────────────────

function DonutChart({ success, errors, pending }: { success: number; errors: number; pending: number }) {
    const total = success + errors + pending;
    if (total === 0) return null;

    const size = 180;
    const strokeWidth = 24;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const successPct = success / total;
    const errorPct = errors / total;
    const pendingPct = pending / total;

    const successDash = successPct * circumference;
    const errorDash = errorPct * circumference;
    const pendingDash = pendingPct * circumference;

    const successOffset = 0;
    const errorOffset = -(successDash);
    const pendingOffset = -(successDash + errorDash);

    const [animated, setAnimated] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), 100);
        return () => clearTimeout(t);
    }, []);

    const rate = total > 0 ? Math.round((success / total) * 100) : 0;

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background track */}
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth}
                />
                {/* Success arc */}
                {success > 0 && (
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none" stroke="url(#successGrad)" strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={`${successDash} ${circumference - successDash}`}
                        strokeDashoffset={successOffset}
                        className="transition-all duration-1000 ease-out"
                        style={{ opacity: animated ? 1 : 0 }}
                    />
                )}
                {/* Error arc */}
                {errors > 0 && (
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none" stroke="url(#errorGrad)" strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={`${errorDash} ${circumference - errorDash}`}
                        strokeDashoffset={errorOffset}
                        className="transition-all duration-1000 ease-out delay-200"
                        style={{ opacity: animated ? 1 : 0 }}
                    />
                )}
                {/* Pending arc */}
                {pending > 0 && (
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none" stroke="#94a3b8" strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={`${pendingDash} ${circumference - pendingDash}`}
                        strokeDashoffset={pendingOffset}
                        className="transition-all duration-1000 ease-out delay-400"
                        style={{ opacity: animated ? 0.5 : 0 }}
                    />
                )}
                <defs>
                    <linearGradient id="successGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                    <linearGradient id="errorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#f87171" />
                    </linearGradient>
                </defs>
            </svg>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-800 tabular-nums tracking-tight">{rate}%</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Éxito</span>
            </div>
        </div>
    );
}

// ─── Error Row (expandable) ───────────────────────────────────────────────────

function ErrorRow({ row, index, onRetry }: { row: any; index: number; onRetry: (i: number) => void }) {
    const [expanded, setExpanded] = useState(false);
    const mapping = useAppStore((s) => s.mapping);
    const refCol = mapping['Root.Cliente.RefCliente'];
    const ref = row[refCol] || `Fila ${index + 1}`;

    const errorCode = row._errorCode || '';
    const errorDesc = errorCode ? (UNIGIS_ERROR_CODES[errorCode] || 'Error no catalogado') : '';
    const errorMsg = row._error || 'Error desconocido';

    return (
        <div className="group border border-red-100 rounded-xl bg-gradient-to-r from-red-50/80 to-white hover:from-red-50 hover:border-red-200 transition-all duration-200">
            <div className="flex items-center gap-3 px-4 py-3">
                {/* Status indicator */}
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse shrink-0" />
                
                {/* Ref */}
                <div className="min-w-[100px]">
                    <span className="text-xs font-bold text-slate-800 font-mono">{ref}</span>
                </div>
                
                {/* Error Code Badge */}
                {errorCode && (
                    <span className="shrink-0 px-2 py-0.5 text-[10px] font-black bg-red-100 text-red-700 rounded-full border border-red-200 tabular-nums">
                        {errorCode}
                    </span>
                )}

                {/* Error Description */}
                <div className="flex-1 min-w-0">
                    {errorDesc && (
                        <p className="text-xs font-semibold text-red-700 truncate">{errorDesc}</p>
                    )}
                    <p className="text-[11px] text-slate-500 truncate">{errorMsg}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onRetry(index)}
                        className="px-2.5 py-1 text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 hover:border-indigo-300 transition-all active:scale-95"
                        title="Reintentar este pedido"
                    >
                        🔄 Retry
                    </button>
                    {row._serverResponse && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="px-2 py-1 text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-200 transition-all"
                        >
                            {expanded ? '▲' : '▼'} SOAP
                        </button>
                    )}
                </div>
            </div>

            {/* Expanded SOAP response */}
            {expanded && row._serverResponse && (
                <div className="px-4 pb-3">
                    <pre className="text-[10px] text-slate-500 bg-slate-900 text-slate-300 rounded-lg p-3 overflow-auto max-h-32 whitespace-pre-wrap break-all border border-slate-700 font-mono leading-relaxed">
                        {row._serverResponse.substring(0, 2000)}
                    </pre>
                </div>
            )}
        </div>
    );
}

// ─── Success Row ──────────────────────────────────────────────────────────────

function SuccessRow({ row, index }: { row: any; index: number }) {
    const mapping = useAppStore((s) => s.mapping);
    const refCol = mapping['Root.Cliente.RefCliente'];
    const ref = row[refCol] || `Fila ${index + 1}`;
    const unigisId = row._UnigisId || '—';
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="group border border-emerald-100 rounded-xl bg-gradient-to-r from-emerald-50/50 to-white hover:from-emerald-50 transition-all">
            <div className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)] shrink-0" />
                <span className="text-xs font-bold text-slate-800 font-mono min-w-[100px]">{ref}</span>
                <span className="text-xs text-emerald-600 font-mono font-bold flex-1">ID: {unigisId}</span>
                {row._serverResponse && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="shrink-0 px-2 py-1 text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-200 transition-all opacity-0 group-hover:opacity-100"
                        title="Ver respuesta SOAP cruda de UNIGIS"
                    >
                        {expanded ? '▲' : '▼'} SOAP
                    </button>
                )}
            </div>
            {expanded && row._serverResponse && (
                <div className="px-4 pb-3">
                    <pre className="text-[10px] text-slate-500 bg-slate-900 text-slate-300 rounded-lg p-3 overflow-auto max-h-32 whitespace-pre-wrap break-all border border-slate-700 font-mono leading-relaxed">
                        {row._serverResponse.substring(0, 2000)}
                    </pre>
                </div>
            )}
        </div>
    );
}

// ─── Main Dashboard Component ─────────────────────────────────────────────────

export default function ResultsDashboard({ isOpen, onClose, onRetryRow, onRetryAll }: ResultsDashboardProps) {
    const rows = useAppStore((s) => s.rows);
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [errorFilter, setErrorFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedReport, setCopiedReport] = useState(false);

    // ─── Computed Data ────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const successRows = rows.filter(r => r._status === 'success');
        const errorRows = rows.filter(r => r._status === 'error');
        const pendingRows = rows.filter(r => !r._status || r._status === 'pending');
        const sendingRows = rows.filter(r => r._status === 'sending');
        const total = rows.length;
        const rate = total > 0 ? Math.round((successRows.length / total) * 100) : 0;

        // Error code frequency
        const errorCodes: Record<string, number> = {};
        errorRows.forEach(r => {
            const code = r._errorCode || 'unknown';
            errorCodes[code] = (errorCodes[code] || 0) + 1;
        });

        return {
            total,
            success: successRows.length,
            errors: errorRows.length,
            pending: pendingRows.length + sendingRows.length,
            rate,
            successRows,
            errorRows,
            pendingRows,
            errorCodes,
        };
    }, [rows]);

    // Fila → índice original, O(n) una sola vez por cambio de `rows` (ver misma corrección en
    // uniclientedadorcreator / uniordercreator).
    const rowIndexMap = useMemo(() => {
        const map = new Map<typeof rows[number], number>();
        rows.forEach((r, i) => map.set(r, i));
        return map;
    }, [rows]);

    const MAX_VISIBLE_RESULT_ROWS = 300;

    // ─── Filtered Error Rows ──────────────────────────────────────────────
    const filteredErrorRows = useMemo(() => {
        let filtered = stats.errorRows.map((row, _) => ({
            row,
            originalIndex: rowIndexMap.get(row) ?? -1,
        }));

        if (errorFilter) {
            filtered = filtered.filter(({ row }) => row._errorCode === errorFilter);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(({ row }) => {
                const mapping = useAppStore.getState().mapping;
                const refCol = mapping['Root.Cliente.RefCliente'];
                const ref = row[refCol] || '';
                return (
                    String(ref).toLowerCase().includes(q) ||
                    (row._error || '').toLowerCase().includes(q) ||
                    (row._errorCode || '').includes(q)
                );
            });
        }

        return filtered;
    }, [stats.errorRows, errorFilter, searchQuery, rowIndexMap]);

    // ─── Copy Error Report ────────────────────────────────────────────────
    const handleCopyReport = useCallback(() => {
        const mapping = useAppStore.getState().mapping;
        const refCol = mapping['Root.Cliente.RefCliente'];

        const lines = [
            `📋 REPORTE DE ERRORES — uniclientcreator`,
            `📅 ${new Date().toLocaleString()}`,
            `📦 Total: ${stats.total} | ✅ OK: ${stats.success} | ❌ Errores: ${stats.errors}`,
            `📈 Tasa de éxito: ${stats.rate}%`,
            `${'─'.repeat(60)}`,
            '',
        ];

        // Group by error code
        const grouped: Record<string, any[]> = {};
        stats.errorRows.forEach(r => {
            const code = r._errorCode || 'unknown';
            if (!grouped[code]) grouped[code] = [];
            grouped[code].push(r);
        });

        for (const [code, rowGroup] of Object.entries(grouped)) {
            const desc = UNIGIS_ERROR_CODES[code] || 'Error no catalogado';
            lines.push(`\n■ Código ${code}: ${desc} (${rowGroup.length} pedido${rowGroup.length > 1 ? 's' : ''})`);
            rowGroup.forEach((r, i) => {
                const ref = r[refCol] || '—';
                lines.push(`  ${i + 1}. [${ref}] ${r._error || ''}`);
            });
        }

        navigator.clipboard.writeText(lines.join('\n')).then(() => {
            setCopiedReport(true);
            setTimeout(() => setCopiedReport(false), 2500);
        });
    }, [stats]);

    // ─── Export to Excel ──────────────────────────────────────────────────
    const handleExportExcel = useCallback(() => {
        const mapping = useAppStore.getState().mapping;
        const refCol = mapping['Root.Cliente.RefCliente'];

        const data = stats.errorRows.map(r => ({
            Referencia: r[refCol] || '',
            Estado: 'ERROR',
            'Código Error': r._errorCode || '',
            'Descripción UNIGIS': r._errorCode ? (UNIGIS_ERROR_CODES[r._errorCode] || 'No catalogado') : '',
            'Detalle Error': r._error || '',
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Errores');
        XLSX.writeFile(wb, `UniTask_Errores_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }, [stats]);

    // ─── Render ───────────────────────────────────────────────────────────
    if (!isOpen) return null;

    const tabs: { id: TabId; label: string; icon: string; count?: number }[] = [
        { id: 'overview', label: 'Resumen', icon: '📊' },
        { id: 'errors', label: 'Errores', icon: '❌', count: stats.errors },
        { id: 'success', label: 'Exitosos', icon: '✅', count: stats.success },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md" onClick={onClose}>
            <div
                className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200/60 overflow-hidden flex flex-col animate-in"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: 'dashboardSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                                <span className="text-xl">📊</span>
                                Dashboard de Resultados
                            </h2>
                            <p className="text-[11px] text-white/50 mt-0.5 font-medium">
                                {stats.total} pedidos procesados · Tasa de éxito: {stats.rate}%
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all text-sm"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-4">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-xs font-bold transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-white text-slate-800 shadow-lg'
                                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                                }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                                        activeTab === tab.id
                                            ? tab.id === 'errors' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                                            : 'bg-white/15 text-white/70'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Content ────────────────────────────────────────────── */}
                <div className="flex-1 overflow-auto p-6">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* KPI Cards + Donut */}
                            <div className="flex gap-6 items-start">
                                {/* KPI Grid */}
                                <div className="flex-1 grid grid-cols-2 gap-3">
                                    <KpiCard
                                        label="Total Pedidos"
                                        value={stats.total}
                                        icon="📦"
                                        color="slate"
                                    />
                                    <KpiCard
                                        label="Exitosos"
                                        value={stats.success}
                                        icon="✅"
                                        color="emerald"
                                        subtitle={stats.success > 0 ? `${stats.rate}% del total` : undefined}
                                    />
                                    <KpiCard
                                        label="Fallidos"
                                        value={stats.errors}
                                        icon="❌"
                                        color="red"
                                        subtitle={stats.errors > 0 ? `${Object.keys(stats.errorCodes).length} código${Object.keys(stats.errorCodes).length !== 1 ? 's' : ''} distintos` : undefined}
                                    />
                                    <KpiCard
                                        label="Pendientes"
                                        value={stats.pending}
                                        icon="⏳"
                                        color="amber"
                                    />
                                </div>

                                {/* Donut Chart */}
                                <div className="shrink-0 flex flex-col items-center gap-3">
                                    <DonutChart
                                        success={stats.success}
                                        errors={stats.errors}
                                        pending={stats.pending}
                                    />
                                    <div className="flex gap-3 text-[10px] font-semibold">
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Éxito</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Error</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300" /> Pendiente</span>
                                    </div>
                                </div>
                            </div>

                            {/* Error Codes Breakdown */}
                            {stats.errors > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-red-500 rounded-full" />
                                        Desglose por Código de Error
                                    </h3>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                        {Object.entries(stats.errorCodes)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([code, count]) => (
                                            <div
                                                key={code}
                                                className="flex items-center gap-2.5 px-3 py-2.5 bg-red-50/80 border border-red-100 rounded-xl hover:bg-red-50 hover:border-red-200 transition-all cursor-pointer"
                                                onClick={() => { setActiveTab('errors'); setErrorFilter(code === 'unknown' ? '' : code); }}
                                            >
                                                <span className="text-xs font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200 tabular-nums">
                                                    {code === 'unknown' ? '?' : code}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-semibold text-red-800 truncate">
                                                        {UNIGIS_ERROR_CODES[code] || 'Error no catalogado'}
                                                    </p>
                                                </div>
                                                <span className="text-xs font-black text-red-500 tabular-nums">
                                                    ×{count}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Empty state */}
                            {stats.total === 0 && (
                                <div className="text-center py-12">
                                    <div className="text-5xl mb-3 opacity-30">📊</div>
                                    <p className="text-sm text-slate-400 font-semibold">No hay resultados aún</p>
                                    <p className="text-xs text-slate-300 mt-1">Envía pedidos para ver las estadísticas</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ERRORS TAB */}
                    {activeTab === 'errors' && (
                        <div className="space-y-3">
                            {/* Filters */}
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 pl-8 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 placeholder:text-slate-400"
                                        placeholder="Buscar por referencia o mensaje de error..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                                </div>
                                <select
                                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 font-semibold text-slate-600 cursor-pointer"
                                    value={errorFilter}
                                    onChange={(e) => setErrorFilter(e.target.value)}
                                >
                                    <option value="">Todos los códigos</option>
                                    {Object.entries(stats.errorCodes).map(([code, count]) => (
                                        <option key={code} value={code}>
                                            {code}: {UNIGIS_ERROR_CODES[code] || 'N/A'} ({count})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Error count */}
                            <div className="text-[11px] text-slate-400 font-semibold">
                                Mostrando {filteredErrorRows.length} de {stats.errors} errores
                            </div>

                            {/* Error List */}
                            <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
                                {filteredErrorRows.length > MAX_VISIBLE_RESULT_ROWS && (
                                    <div className="text-[11px] text-slate-400 italic text-center pb-1">
                                        Mostrando los primeros {MAX_VISIBLE_RESULT_ROWS} de {filteredErrorRows.length} — usa el buscador para acotar
                                    </div>
                                )}
                                {filteredErrorRows.slice(0, MAX_VISIBLE_RESULT_ROWS).map(({ row, originalIndex }) => (
                                    <ErrorRow
                                        key={originalIndex}
                                        row={row}
                                        index={originalIndex}
                                        onRetry={onRetryRow}
                                    />
                                ))}
                                {filteredErrorRows.length === 0 && (
                                    <div className="text-center py-8 text-slate-400">
                                        <div className="text-3xl mb-2 opacity-40">🎉</div>
                                        <p className="text-sm font-semibold">Sin errores{errorFilter ? ' con ese filtro' : ''}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SUCCESS TAB */}
                    {activeTab === 'success' && (
                        <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
                            {stats.successRows.length > MAX_VISIBLE_RESULT_ROWS && (
                                <div className="text-[11px] text-slate-400 italic text-center pb-1">
                                    Mostrando los primeros {MAX_VISIBLE_RESULT_ROWS} de {stats.successRows.length} — usa &quot;Export Excel&quot; para el listado completo
                                </div>
                            )}
                            {stats.successRows.slice(0, MAX_VISIBLE_RESULT_ROWS).map((row) => {
                                const originalIndex = rowIndexMap.get(row) ?? -1;
                                return <SuccessRow key={originalIndex} row={row} index={originalIndex} />;
                            })}
                            {stats.successRows.length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <div className="text-3xl mb-2 opacity-40">📭</div>
                                    <p className="text-sm font-semibold">No hay pedidos exitosos aún</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer Actions ─────────────────────────────────────── */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {stats.errors > 0 && (
                            <>
                                <button
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                                        copiedReport
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
                                    }`}
                                    onClick={handleCopyReport}
                                >
                                    {copiedReport ? '✅ Copiado' : '📋 Copiar Reporte'}
                                </button>
                                <button
                                    className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 rounded-lg transition-all"
                                    onClick={handleExportExcel}
                                >
                                    📊 Excel
                                </button>
                                <button
                                    className="px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all"
                                    onClick={onRetryAll}
                                >
                                    🔄 Reintentar Todos ({stats.errors})
                                </button>
                            </>
                        )}
                    </div>
                    <button
                        className="px-4 py-2 text-sm font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all shadow-md"
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color, subtitle }: {
    label: string;
    value: number;
    icon: string;
    color: 'slate' | 'emerald' | 'red' | 'amber';
    subtitle?: string;
}) {
    const colorMap = {
        slate:   { bg: 'bg-slate-50',   border: 'border-slate-200', text: 'text-slate-800',   subtext: 'text-slate-500',   iconBg: 'bg-slate-100' },
        emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', subtext: 'text-emerald-500', iconBg: 'bg-emerald-100' },
        red:     { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     subtext: 'text-red-500',     iconBg: 'bg-red-100' },
        amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   subtext: 'text-amber-500',   iconBg: 'bg-amber-100' },
    }[color];

    return (
        <div className={`${colorMap.bg} ${colorMap.border} border rounded-xl p-4 transition-all hover:shadow-md`}>
            <div className="flex items-center justify-between mb-2">
                <span className={`w-8 h-8 flex items-center justify-center rounded-lg ${colorMap.iconBg} text-base`}>{icon}</span>
            </div>
            <div className={`text-2xl font-black ${colorMap.text} tabular-nums`}>{value}</div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5">{label}</div>
            {subtitle && <div className={`text-[10px] ${colorMap.subtext} mt-1`}>{subtitle}</div>}
        </div>
    );
}


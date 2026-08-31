/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useAppStore } from '../../store/appStore';
import { UNIGIS_ERROR_CODES } from '../../data/errorCodes';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface ResultsDashboardProps {
    isOpen: boolean;
    onClose: () => void;
    onRetryRow: (index: number) => void;
    onRetryAll: () => void;
}

type TabId = 'overview' | 'errors' | 'success';

// ─── Animated Donut Chart (Pure SVG) ────────────────────────────────────────────

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
            <svg width={size} height={size} className="-rotate-90">
                {/* Background track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth={strokeWidth}
                />
                {/* Pending segment */}
                {pending > 0 && (
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke="#cbd5e1"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${animated ? pendingDash : 0} ${circumference}`}
                        strokeDashoffset={pendingOffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                )}
                {/* Error segment */}
                {errors > 0 && (
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke="#f43f5e"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${animated ? errorDash : 0} ${circumference}`}
                        strokeDashoffset={errorOffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                )}
                {/* Success segment */}
                {success > 0 && (
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke="#10b981"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${animated ? successDash : 0} ${circumference}`}
                        strokeDashoffset={successOffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black text-slate-800 tracking-tight tabular-nums">
                    {rate}%
                </span>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">
                    Éxito
                </span>
            </div>
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function ResultsDashboard({ isOpen, onClose, onRetryRow, onRetryAll }: ResultsDashboardProps) {
    const rows = useAppStore((s) => s.rows);
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [errorFilter, setErrorFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedReport, setCopiedReport] = useState(false);

    // ─── Computed Data ──────────────────────────────────────────────────────────────
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
            errorCodes,
        };
    }, [rows]);

    // Filtered error rows
    const filteredErrorRows = useMemo(() => {
        return stats.errorRows
            .map((r) => ({ row: r, originalIndex: rows.indexOf(r) }))
            .filter(({ row }) => {
                if (errorFilter !== 'all') {
                    if (errorFilter === 'unknown' && row._errorCode) return false;
                    if (errorFilter !== 'unknown' && row._errorCode !== errorFilter) return false;
                }
                if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    const matchRef = Object.values(row).some(v => String(v).toLowerCase().includes(q));
                    const matchErr = (row._error || '').toLowerCase().includes(q);
                    return matchRef || matchErr;
                }
                return true;
            });
    }, [stats.errorRows, rows, errorFilter, searchQuery]);

    // ─── Copy Full Diagnostic Report ────────────────────────────────────────────────
    const handleCopyReport = useCallback(() => {
        const mapping = useAppStore.getState().mapping;
        const refCol = mapping['Root.ClienteDador.ReferenciaExterna'] || mapping['Root.ClienteDador.RazonSocial'];

        const lines: string[] = [
            `==================================================`,
            `  REPORTE DE RESULTADOS - UNICLIENTEDADORCREATOR  `,
            `  ${new Date().toLocaleString()}                  `,
            `==================================================`,
            ``,
            `Total Clientes Dadores: ${stats.total}`,
            `✅ Éxitos:   ${stats.success} (${stats.rate}%)`,
            `❌ Errores:  ${stats.errors}`,
            `⏳ Pendientes: ${stats.pending}`,
            ``,
            `--- DESGLOSE DE ERRORES ---`,
        ];

        // Group errors by code
        const grouped: Record<string, typeof stats.errorRows> = {};
        stats.errorRows.forEach(r => {
            const code = r._errorCode || 'UNKNOWN';
            if (!grouped[code]) grouped[code] = [];
            grouped[code].push(r);
        });

        for (const [code, rowGroup] of Object.entries(grouped)) {
            const desc = UNIGIS_ERROR_CODES[code] || 'Error no catalogado';
            lines.push(`\n📌 Código ${code}: ${desc} (${rowGroup.length} cliente${rowGroup.length > 1 ? 's' : ''})`);
            rowGroup.forEach((r, i) => {
                const ref = (refCol && r[refCol]) || '—';
                lines.push(`  ${i + 1}. [${ref}] ${r._error || ''}`);
            });
        }

        navigator.clipboard.writeText(lines.join('\n')).then(() => {
            setCopiedReport(true);
            setTimeout(() => setCopiedReport(false), 2500);
        });
    }, [stats]);

    // ─── Export to Excel ────────────────────────────────────────────────────────────
    const handleExportExcel = useCallback(() => {
        const mapping = useAppStore.getState().mapping;
        const refCol = mapping['Root.ClienteDador.ReferenciaExterna'] || mapping['Root.ClienteDador.RazonSocial'];

        const data = stats.errorRows.map(r => ({
            Referencia: (refCol && r[refCol]) || '',
            Estado: 'ERROR',
            'Código Error': r._errorCode || '',
            'Descripción UNIGIS': r._errorCode ? (UNIGIS_ERROR_CODES[r._errorCode] || 'No catalogado') : '',
            'Detalle Error': r._error || '',
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Errores_ClienteDador');
        XLSX.writeFile(wb, `Errores_ClienteDador_${Date.now()}.xlsx`);
    }, [stats]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* ─── Header ──────────────────────────────────────────────────────── */}
                <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-lg">
                            📊
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white tracking-tight">Dashboard de Resultados</h2>
                            <p className="text-xs text-slate-400">Resultados de integración de Clientes Dadores en UNIGIS</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-sm font-bold"
                    >
                        ✕
                    </button>
                </div>

                {/* ─── Navigation Tabs ─────────────────────────────────────────────── */}
                <div className="px-6 pt-3 bg-slate-50 border-b border-slate-200 flex items-center gap-1">
                    {[
                        { id: 'overview' as TabId, label: 'Resumen General', icon: '📈' },
                        { id: 'errors' as TabId, label: `Errores (${stats.errors})`, icon: '❌', badge: stats.errors > 0 },
                        { id: 'success' as TabId, label: `Exitosos (${stats.success})`, icon: '✅' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-t border-x -mb-[1px] ${
                                activeTab === tab.id
                                    ? 'bg-white text-slate-900 border-slate-200 shadow-sm'
                                    : 'bg-transparent text-slate-500 border-transparent hover:text-slate-700'
                            }`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* ─── Tab Content ─────────────────────────────────────────────────── */}
                <div className="flex-1 overflow-auto p-6">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* KPI Grid */}
                            <div className="grid grid-cols-4 gap-4">
                                <KpiCard label="Total Clientes" value={stats.total} icon="📦" color="slate" />
                                <KpiCard label="Exitosos" value={stats.success} icon="✅" color="emerald" subtitle={`${stats.rate}% completado`} />
                                <KpiCard label="Con Errores" value={stats.errors} icon="❌" color="red" subtitle={stats.errors > 0 ? 'Requiere atención' : 'Sin errores'} />
                                <KpiCard label="Pendientes" value={stats.pending} icon="⏳" color="amber" subtitle="En espera o envío" />
                            </div>

                            {/* Chart + Error Breakdown */}
                            <div className="grid grid-cols-5 gap-6 items-start">
                                {/* Donut */}
                                <div className="col-span-2 bg-slate-50 rounded-2xl p-6 border border-slate-200/80 flex flex-col items-center justify-center">
                                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">Tasa de Éxito Global</h3>
                                    <DonutChart success={stats.success} errors={stats.errors} pending={stats.pending} />
                                    <div className="flex items-center gap-4 mt-6 text-[11px] font-semibold text-slate-600">
                                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Éxito ({stats.success})</div>
                                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Error ({stats.errors})</div>
                                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Pend. ({stats.pending})</div>
                                    </div>
                                </div>

                                {/* Top Errors */}
                                <div className="col-span-3 bg-slate-50 rounded-2xl p-6 border border-slate-200/80">
                                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Distribución de Errores</h3>
                                    {Object.keys(stats.errorCodes).length === 0 ? (
                                        <div className="text-center py-12 text-slate-400">
                                            <div className="text-3xl mb-1">🎉</div>
                                            <p className="text-xs font-semibold">No se han registrado errores</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {Object.entries(stats.errorCodes)
                                                .sort(([, a], [, b]) => b - a)
                                                .map(([code, count]) => {
                                                    const desc = UNIGIS_ERROR_CODES[code] || 'Error no catalogado / Respuesta general';
                                                    const pct = Math.round((count / stats.errors) * 100);
                                                    return (
                                                        <div
                                                            key={code}
                                                            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer"
                                                            onClick={() => { setErrorFilter(code); setActiveTab('errors'); }}
                                                        >
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-xs font-bold text-slate-800">
                                                                    Código {code} <span className="font-normal text-slate-500 text-[11px]">({count})</span>
                                                                </span>
                                                                <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                                                                    {pct}%
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-600 line-clamp-1">{desc}</p>
                                                            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                                                                <div className="bg-rose-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ERRORS TAB */}
                    {activeTab === 'errors' && (
                        <div className="space-y-4">
                            {/* Filter bar */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        placeholder="Buscar por referencia o mensaje de error..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                    <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
                                </div>
                                <select
                                    value={errorFilter}
                                    onChange={(e) => setErrorFilter(e.target.value)}
                                    className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                >
                                    <option value="all">Todos los códigos ({stats.errors})</option>
                                    {Object.entries(stats.errorCodes).map(([code, count]) => (
                                        <option key={code} value={code}>
                                            {code}: {UNIGIS_ERROR_CODES[code] || 'N/A'} ({count})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Error count */}
                            <div className="text-[11px] text-slate-600 font-semibold">
                                Mostrando {filteredErrorRows.length} de {stats.errors} errores
                            </div>

                            {/* Error List */}
                            <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
                                {filteredErrorRows.map(({ row, originalIndex }) => (
                                    <ErrorRow
                                        key={originalIndex}
                                        row={row}
                                        index={originalIndex}
                                        onRetry={onRetryRow}
                                    />
                                ))}
                                {filteredErrorRows.length === 0 && (
                                    <div className="text-center py-8 text-slate-400">
                                        <div className="text-3xl mb-2 opacity-40">✨</div>
                                        <p className="text-sm font-semibold">Sin errores{errorFilter !== 'all' ? ' con ese filtro' : ''}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SUCCESS TAB */}
                    {activeTab === 'success' && (
                        <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
                            {stats.successRows.map((row) => {
                                const originalIndex = rows.indexOf(row);
                                return <SuccessRow key={originalIndex} row={row} index={originalIndex} />;
                            })}
                            {stats.successRows.length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <div className="text-3xl mb-2 opacity-40">📦</div>
                                    <p className="text-sm font-semibold">No hay clientes dadores exitosos aún</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ─── Footer Actions ──────────────────────────────────────────────── */}
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
                                    📥 Excel
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

// ─── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color, subtitle }: {
    label: string;
    value: number;
    icon: string;
    color: 'slate' | 'emerald' | 'red' | 'amber';
    subtitle?: string;
}) {
    const colorMap = {
        slate:   { bg: 'bg-slate-50',   border: 'border-slate-200', text: 'text-slate-800',   subtext: 'text-slate-600',   iconBg: 'bg-slate-100' },
        emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', subtext: 'text-emerald-700', iconBg: 'bg-emerald-100' },
        red:     { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     subtext: 'text-red-700',     iconBg: 'bg-red-100' },
        amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   subtext: 'text-amber-700',   iconBg: 'bg-amber-100' },
    }[color];

    return (
        <div className={`${colorMap.bg} ${colorMap.border} border rounded-xl p-4 transition-all hover:shadow-md`}>
            <div className="flex items-center justify-between mb-2">
                <span className={`w-8 h-8 flex items-center justify-center rounded-lg ${colorMap.iconBg} text-base`}>{icon}</span>
            </div>
            <div className={`text-2xl font-black ${colorMap.text} tabular-nums`}>{value}</div>
            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide mt-0.5">{label}</div>
            {subtitle && <div className={`text-[10px] ${colorMap.subtext} mt-1`}>{subtitle}</div>}
        </div>
    );
}

// ─── Error Row ──────────────────────────────────────────────────────────────────

function ErrorRow({ row, index, onRetry }: { row: any; index: number; onRetry: (index: number) => void }) {
    const [expanded, setExpanded] = useState(false);
    const mapping = useAppStore((s) => s.mapping);
    const refCol = mapping['Root.ClienteDador.ReferenciaExterna'] || mapping['Root.ClienteDador.RazonSocial'];
    const ref = (refCol && row[refCol]) || `Fila ${index + 1}`;
    const code = row._errorCode;
    const desc = code ? UNIGIS_ERROR_CODES[code] : null;

    return (
        <div className="p-3 bg-red-50/50 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-black shrink-0">
                        {index + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800 truncate">[{ref}]</span>
                    {code && (
                        <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md shrink-0">
                            Error {code}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {row._serverResponse && (
                        <button
                            className="px-2 py-1 text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            onClick={() => setExpanded(!expanded)}
                        >
                            {expanded ? 'Ocultar XML' : 'Ver XML'}
                        </button>
                    )}
                    <button
                        className="px-2 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                        onClick={() => onRetry(index)}
                    >
                        Reintentar
                    </button>
                </div>
            </div>

            <div className="mt-1.5 pl-7">
                {desc && <p className="text-[11px] font-semibold text-red-800">{desc}</p>}
                <p className="text-[11px] text-red-700/80 font-mono break-all">{row._error || 'Error desconocido'}</p>
            </div>

            {expanded && row._serverResponse && (
                <div className="mt-2 pl-7">
                    <pre className="p-2 bg-slate-900 text-slate-200 text-[10px] font-mono rounded-lg overflow-auto max-h-32 whitespace-pre-wrap">
                        {row._serverResponse}
                    </pre>
                </div>
            )}
        </div>
    );
}

// ─── Success Row ────────────────────────────────────────────────────────────────

function SuccessRow({ row, index }: { row: any; index: number }) {
    const mapping = useAppStore((s) => s.mapping);
    const refCol = mapping['Root.ClienteDador.ReferenciaExterna'] || mapping['Root.ClienteDador.RazonSocial'];
    const ref = (refCol && row[refCol]) || `Fila ${index + 1}`;

    return (
        <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0">
                    {index + 1}
                </span>
                <span className="text-xs font-bold text-slate-800 truncate">[{ref}]</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md shrink-0">
                    Creado OK
                </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-600">
                {row._UnigisResult || 'true'}
            </span>
        </div>
    );
}

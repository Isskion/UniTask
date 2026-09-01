import { useMemo, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { FIELD_GROUPS, KNOWN_BOOLEAN_PATHS, REQUIRED_FIELDS } from '../../data/schema';
import { FIELD_DESCRIPTIONS } from '../../data/fieldDescriptions';

// Sentinel values for fixed boolean mapping
const BOOL_TRUE_SENTINEL = '__BOOL_TRUE__';
const BOOL_FALSE_SENTINEL = '__BOOL_FALSE__';

// #31: Mapping memory key
const MAPPING_MEMORY_KEY = 'ucdc_mapping_memory';

const TABS = [
    { id: 'pClienteDador', label: '🏭 Cliente Dador', group: 'ENT' },
    { id: 'Operaciones', label: '⚙️ Operaciones', group: 'OP' },
    { id: 'Dinamicos', label: '🔧 Dinámicos', group: 'DYN' },
];

// Pre-compute sets for O(1) lookups
const BOOLEAN_PATHS_SET = new Set(KNOWN_BOOLEAN_PATHS);
const REQUIRED_FIELDS_SET = new Set(REQUIRED_FIELDS);

export default function MapperPanel() {
    const headers = useAppStore((s) => s.headers);
    const rows = useAppStore((s) => s.rows);
    const dataVersion = useAppStore((s) => s.dataVersion);
    const mapping = useAppStore((s) => s.mapping);
    const booleanOverrides = useAppStore((s) => s.booleanOverrides);
    const currentTab = useAppStore((s) => s.currentTab);
    const searchQuery = useAppStore((s) => s.searchQuery);
    const selectedRow = useAppStore((s) => s.selectedRow);
    const setCurrentTab = useAppStore((s) => s.setCurrentTab);
    const setSearchQuery = useAppStore((s) => s.setSearchQuery);
    const updateMappingField = useAppStore((s) => s.updateMappingField);
    const setBooleanOverride = useAppStore((s) => s.setBooleanOverride);
    const highlightedField = useAppStore((s) => s.highlightedField);
    const gridRef = useRef<HTMLDivElement>(null);

    const fields = useMemo(() => {
        const tabFields = FIELD_GROUPS[currentTab] || [];
        if (!searchQuery) return tabFields;
        const q = searchQuery.toLowerCase();
        return tabFields.filter((f) => f.toLowerCase().includes(q));
    }, [currentTab, searchQuery]);

    useEffect(() => {
        if (!highlightedField || !gridRef.current) return;
        const el = gridRef.current.querySelector(`[data-field="${highlightedField}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [highlightedField]);

    // #35: Detect empty columns
    // Recalculado solo con `dataVersion` (carga de Excel / edición real de celda), NO con
    // `rows` directamente: durante un envío masivo, `rows` cambia de referencia por cada fila
    // (status "sending" → "success"/"error"), y este cálculo es O(headers × filas) — atado a
    // `rows` se recalculaba miles de veces por envío, congelando el navegador. Ver [[wizard-lento]].
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const emptyColumnSet = useMemo(() => {
        const currentRows = useAppStore.getState().rows;
        const empty = new Set<string>();
        if (currentRows.length === 0) return empty;
        for (const h of headers) {
            const filledCount = currentRows.filter(r => {
                const v = r[h];
                return v !== undefined && v !== null && String(v).trim() !== '';
            }).length;
            if (filledCount / currentRows.length < 0.05) { // <5% filled = effectively empty
                empty.add(h);
            }
        }
        return empty;
    }, [headers, dataVersion]);

    // #20: Preview values for the selected row
    const previewRow = useMemo(() => {
        if (selectedRow < 0 || !rows[selectedRow]) return null;
        return rows[selectedRow];
    }, [selectedRow, rows]);

    // #22: Coverage mini-map per tab
    const tabCoverage = useMemo(() => {
        const coverage: Record<string, { mapped: number; total: number; pct: number }> = {};
        for (const tab of TABS) {
            const tabFields = FIELD_GROUPS[tab.id] || [];
            const mapped = tabFields.filter(f => mapping[f]).length;
            const total = tabFields.length;
            coverage[tab.id] = { mapped, total, pct: total > 0 ? Math.round((mapped / total) * 100) : 0 };
        }
        return coverage;
    }, [mapping]);

    // Current tab stats
    const currentCoverage = tabCoverage[currentTab] || { mapped: 0, total: 0, pct: 0 };

    // #21: How many required fields are missing
    const missingRequired = useMemo(() => {
        return REQUIRED_FIELDS.filter(f => !mapping[f]);
    }, [mapping]);

    // #31: Save mapping memory on changes
    useEffect(() => {
        if (Object.keys(mapping).length === 0 || headers.length === 0) return;
        const timeout = setTimeout(() => {
            try {
                const memory: Record<string, string> = {};
                // Store header → field associations for learning
                for (const [field, col] of Object.entries(mapping)) {
                    if (!col || col === BOOL_TRUE_SENTINEL || col === BOOL_FALSE_SENTINEL) continue;
                    const key = String(col).trim().toLowerCase();
                    if (!memory[key]) memory[key] = field;
                }
                localStorage.setItem(MAPPING_MEMORY_KEY, JSON.stringify(memory));
            } catch { /* ignore */ }
        }, 3000);
        return () => clearTimeout(timeout);
    }, [mapping, headers]);

    const handleFieldChange = useCallback((field: string, value: string, isBoolField: boolean) => {
        if (isBoolField) {
            if (value === BOOL_TRUE_SENTINEL) {
                setBooleanOverride(field, true);
                updateMappingField(field, BOOL_TRUE_SENTINEL);
            } else if (value === BOOL_FALSE_SENTINEL) {
                setBooleanOverride(field, false);
                updateMappingField(field, BOOL_FALSE_SENTINEL);
            } else {
                const store = useAppStore.getState();
                if (store.booleanOverrides[field] !== undefined) {
                    const next = { ...store.booleanOverrides };
                    delete next[field];
                    useAppStore.setState({ booleanOverrides: next });
                }
                updateMappingField(field, value);
            }
        } else {
            updateMappingField(field, value);
        }
    }, [setBooleanOverride, updateMappingField]);

    const getSelectValue = useCallback((field: string, isBoolField: boolean): string => {
        if (isBoolField) {
            const override = booleanOverrides[field];
            if (override === true) return BOOL_TRUE_SENTINEL;
            if (override === false) return BOOL_FALSE_SENTINEL;
        }
        return mapping[field] || '';
    }, [mapping, booleanOverrides]);

    if (headers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <div className="text-2xl mb-1 opacity-20">🗺️</div>
                <p className="text-[10px] text-slate-400">Carga un Excel con cabeceras válidas</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-white">
            {/* Header bar */}
            <div className="flex items-center gap-2 px-2 py-1 bg-gradient-to-r from-slate-800 to-slate-700 shrink-0">
                <h3 className="text-[11px] font-bold text-white whitespace-nowrap">🗺️ Mapeador</h3>
                <input
                    type="text"
                    className="flex-1 max-w-[200px] px-2 py-0.5 text-[11px] bg-white/10 border border-white/20 rounded text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    placeholder="🔍 Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="flex items-center gap-1.5 ml-auto">
                    {/* #21: Required fields warning */}
                    {missingRequired.length > 0 && (
                        <span
                            className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500/20 text-red-300 rounded-md border border-red-500/30 animate-pulse cursor-help"
                            title={`Campos obligatorios sin mapear:\n${missingRequired.join('\n')}`}
                        >
                            ⚠️ {missingRequired.length} obligatorios
                        </span>
                    )}
                    <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                            style={{ width: `${currentCoverage.pct}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-300">{currentCoverage.mapped}/{currentCoverage.total}</span>
                </div>
            </div>

            {/* #22: Tab coverage mini-map */}
            <div className="flex items-center gap-px px-1 py-0.5 bg-slate-100 border-b border-slate-200 overflow-x-auto shrink-0">
                {TABS.map((tab) => {
                    const cov = tabCoverage[tab.id];
                    return (
                        <span key={tab.id} className="flex items-center shrink-0">
                            {tab.group && (
                                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mx-1 select-none">
                                    {tab.group}
                                </span>
                            )}
                            <button
                                className={`relative px-1.5 py-0.5 text-[10px] font-semibold rounded whitespace-nowrap transition-all ${currentTab === tab.id
                                    ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200/50'
                                    : 'text-slate-600 hover:bg-white/60'
                                    }`}
                                onClick={() => setCurrentTab(tab.id)}
                            >
                                {tab.label}
                                {/* Coverage dot indicator */}
                                {cov && cov.mapped > 0 && (
                                    <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                                        cov.pct >= 80 ? 'bg-emerald-400' : cov.pct >= 30 ? 'bg-amber-400' : 'bg-indigo-400'
                                    }`} />
                                )}
                            </button>
                        </span>
                    );
                })}
            </div>

            {/* Field grid */}
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 p-1.5 overflow-auto flex-1" ref={gridRef}>
                {fields.map((field) => {
                    const isBoolField = BOOLEAN_PATHS_SET.has(field);
                    const isRequired = REQUIRED_FIELDS_SET.has(field);
                    const selectValue = getSelectValue(field, isBoolField);
                    const isMapped = !!selectValue;
                    const isBoolMapped = isBoolField && (selectValue === BOOL_TRUE_SENTINEL || selectValue === BOOL_FALSE_SENTINEL);
                    const shortName = field.split('.').pop() || field;
                    const tooltip = FIELD_DESCRIPTIONS[field];

                    // #20: Preview value from selected row
                    const mappedCol = mapping[field];
                    const previewVal = previewRow && mappedCol && mappedCol !== BOOL_TRUE_SENTINEL && mappedCol !== BOOL_FALSE_SENTINEL
                        ? String(previewRow[mappedCol] ?? '')
                        : null;

                    return (
                        <div
                            key={field}
                            data-field={field}
                            className={`flex flex-col gap-0.5 p-1.5 rounded border transition-all ${
                                highlightedField === field
                                    ? 'bg-amber-50 border-amber-400 shadow-md ring-1 ring-amber-400/50 animate-pulse'
                                    : isRequired && !isMapped
                                        ? 'bg-red-50/60 border-red-300 animate-pulse-required'
                                        : isBoolMapped
                                            ? 'bg-violet-50/50 border-violet-200/80 hover:border-violet-300'
                                            : isMapped
                                                ? 'bg-emerald-50/50 border-emerald-200/80 hover:border-emerald-300'
                                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <div className="flex items-center gap-0.5">
                                {/* #21: Required indicator */}
                                {isRequired && (
                                    <span className={`text-[7px] font-bold px-0.5 rounded shrink-0 leading-tight ${
                                        isMapped ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                                    }`}>
                                        REQ
                                    </span>
                                )}
                                <span className={`text-[10px] font-bold truncate ${
                                    isRequired && !isMapped ? 'text-red-700' : isBoolMapped ? 'text-violet-700' : isMapped ? 'text-emerald-700' : 'text-slate-700'
                                }`}>
                                    {shortName}
                                </span>
                                {isBoolField && (
                                    <span className="text-[7px] font-bold bg-violet-600 text-white px-1 rounded shrink-0 leading-tight">
                                        BOOL
                                    </span>
                                )}
                                {isMapped && !isBoolField && <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />}
                                {tooltip && (
                                    <span className="text-slate-400 cursor-help ml-auto shrink-0 text-[8px]" title={tooltip}>ℹ️</span>
                                )}
                            </div>

                            <select
                                className={`w-full px-1 py-0.5 text-[10px] rounded border transition-colors focus:outline-none focus:ring-1 ${
                                    isRequired && !isMapped
                                        ? 'bg-red-50 border-red-300 text-red-800 focus:ring-red-500/30'
                                        : isBoolMapped
                                            ? 'bg-violet-100/50 border-violet-200 text-violet-800 focus:ring-violet-500/30'
                                            : isMapped
                                                ? 'bg-emerald-100/50 border-emerald-200 text-emerald-800 focus:ring-emerald-500/30'
                                                : 'bg-white border-slate-200 text-slate-600 focus:ring-indigo-500/30'
                                }`}
                                value={selectValue}
                                onChange={(e) => handleFieldChange(field, e.target.value, isBoolField)}
                            >
                                <option value="">{isRequired ? '⚠️ OBLIGATORIO' : '— Sin mapear —'}</option>
                                {isBoolField && (
                                    <optgroup label="⚡ Valor Fijo">
                                        <option value={BOOL_TRUE_SENTINEL}>✅ TRUE</option>
                                        <option value={BOOL_FALSE_SENTINEL}>❌ FALSE</option>
                                    </optgroup>
                                )}
                                <optgroup label={isBoolField ? '📊 Columna Excel' : '📊 Columnas'}>
                                    {headers.map((h) => (
                                        <option key={h} value={h}>
                                            {h}{emptyColumnSet.has(h) ? ' ⚠️ vacía' : ''}
                                        </option>
                                    ))}
                                </optgroup>
                            </select>

                            {/* #20: Inline preview of the mapped value */}
                            {previewVal !== null && previewVal.length > 0 && (
                                <div className="text-[9px] text-slate-400 truncate font-mono px-0.5" title={previewVal}>
                                    → {previewVal.length > 30 ? previewVal.slice(0, 30) + '…' : previewVal}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

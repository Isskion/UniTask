import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { FIELD_GROUPS, getDynamicFields, KNOWN_BOOLEAN_PATHS, REQUIRED_FIELDS } from '../../data/schema';
import MappingActions from './MappingActions';
import SavedMappings from './SavedMappings';

// Sentinel values for fixed boolean mapping
const BOOL_TRUE_SENTINEL = '__BOOL_TRUE__';
const BOOL_FALSE_SENTINEL = '__BOOL_FALSE__';

const TABS = [
    { id: 'pVehiculo', label: '🚛 Vehículo' },
    { id: 'pPropietario', label: '🧑‍💼 Propietario' },
    { id: 'pTransporte', label: '📤 Transporte' },
    { id: 'Dinamicos', label: '🧩 Dinámicos' },
    { id: 'Booleans', label: '🚥 Booleanos' }
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
    const dynamicFieldCounts = useAppStore((s) => s.dynamicFieldCounts);
    const currentTab = useAppStore((s) => s.currentTab);
    const searchQuery = useAppStore((s) => s.searchQuery);
    const selectedRow = useAppStore((s) => s.selectedRow);

    const setCurrentTab = useAppStore((s) => s.setCurrentTab);
    const setSearchQuery = useAppStore((s) => s.setSearchQuery);
    const updateMappingField = useAppStore((s) => s.updateMappingField);
    const setBooleanOverride = useAppStore((s) => s.setBooleanOverride);
    const highlightedField = useAppStore((s) => s.highlightedField);

    const gridRef = useRef<HTMLDivElement>(null);

    // Dialog states
    const [actionsOpen, setActionsOpen] = useState(false);
    const [savedOpen, setSavedOpen] = useState(false);

    // Resolve fields list for active tab
    const tabFields = useMemo(() => {
        if (currentTab === 'Dinamicos') {
            return getDynamicFields(dynamicFieldCounts);
        }
        return FIELD_GROUPS[currentTab] || [];
    }, [currentTab, dynamicFieldCounts]);

    const fields = useMemo(() => {
        if (!searchQuery) return tabFields;
        const q = searchQuery.toLowerCase();
        return tabFields.filter((f) => f.toLowerCase().includes(q));
    }, [tabFields, searchQuery]);

    useEffect(() => {
        if (!highlightedField || !gridRef.current) return;
        const el = gridRef.current.querySelector(`[data-field="${highlightedField}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [highlightedField]);

    // Detect empty columns
    // Recalculado solo con `dataVersion` (carga de Excel / edición real de celda), NO con
    // `rows` directamente: durante un envío masivo, `rows` cambia de referencia por cada fila.
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

    // Preview values for the selected row
    const previewRow = useMemo(() => {
        if (selectedRow < 0 || !rows[selectedRow]) return null;
        return rows[selectedRow];
    }, [selectedRow, rows]);

    // Tab coverage per tab
    const tabCoverage = useMemo(() => {
        const coverage: Record<string, { mapped: number; total: number; pct: number }> = {};
        for (const tab of TABS) {
            const tabFieldsList = tab.id === 'Dinamicos'
                ? getDynamicFields(dynamicFieldCounts)
                : (FIELD_GROUPS[tab.id] || []);
            const mapped = tabFieldsList.filter(f => mapping[f]).length;
            const total = tabFieldsList.length;
            coverage[tab.id] = { mapped, total, pct: total > 0 ? Math.round((mapped / total) * 100) : 0 };
        }
        return coverage;
    }, [mapping, dynamicFieldCounts]);

    // Current tab stats
    const currentCoverage = tabCoverage[currentTab] || { mapped: 0, total: 0, pct: 0 };

    // Required fields missing
    const missingRequired = useMemo(() => {
        return REQUIRED_FIELDS.filter(f => !mapping[f]);
    }, [mapping]);

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
            <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-900 border-t border-slate-800 text-slate-400">
                <div className="text-3xl mb-2 opacity-25">🗺️</div>
                <p className="text-xs">Carga un Excel con cabeceras válidas para comenzar el mapeo</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-900 border-t border-slate-800 text-slate-200">
            {/* Header bar */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-850 border-b border-slate-850 shrink-0">
                <h3 className="text-xs font-bold text-slate-200 whitespace-nowrap">🗺️ Mapeador</h3>
                <input
                    type="text"
                    className="flex-1 max-w-[220px] px-2 py-1 text-xs bg-slate-950 border border-slate-750 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    placeholder="🔍 Buscar campo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                <div className="flex items-center gap-2 ml-4">
                    {/* Required fields warning */}
                    {missingRequired.length > 0 && (
                        <span
                            className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500/20 text-red-400 rounded border border-red-500/30 animate-pulse cursor-help"
                            title={`Campos obligatorios sin mapear:\n${missingRequired.join('\n')}`}
                        >
                            ⚠️ {missingRequired.length} obligatorios
                        </span>
                    )}
                    <div className="w-16 h-1 rounded-full bg-slate-700 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                            style={{ width: `${currentCoverage.pct}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-400">{currentCoverage.mapped}/{currentCoverage.total}</span>
                </div>

                {/* Modals trigger */}
                <div className="flex items-center gap-1.5 ml-auto">
                    <button
                        className="px-2 py-1 text-[11px] font-semibold bg-slate-800 text-slate-200 rounded hover:bg-slate-750 border border-slate-700 transition-all cursor-pointer"
                        onClick={() => setActionsOpen(true)}
                    >
                        ⚙️ Acciones
                    </button>
                    <button
                        className="px-2 py-1 text-[11px] font-bold bg-indigo-600/80 text-white rounded hover:bg-indigo-600 border border-indigo-500/30 transition-all cursor-pointer"
                        onClick={() => setSavedOpen(true)}
                    >
                        ☁️ Plantillas
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-px px-2 py-1 bg-slate-850 border-b border-slate-800 overflow-x-auto shrink-0 scrollbar-none">
                {TABS.map((tab) => {
                    const cov = tabCoverage[tab.id];
                    return (
                        <button
                            key={tab.id}
                            className={`relative px-3 py-1 text-xs font-semibold rounded transition-all cursor-pointer whitespace-nowrap ${currentTab === tab.id
                                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-350 border border-transparent'
                                }`}
                            onClick={() => setCurrentTab(tab.id)}
                        >
                            {tab.label}
                            {/* Coverage dot indicator */}
                            {cov && cov.mapped > 0 && (
                                <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-850 ${
                                    cov.pct >= 80 ? 'bg-emerald-500' : cov.pct >= 30 ? 'bg-amber-500' : 'bg-indigo-500'
                                }`} />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Field grid */}
            {fields.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-6 text-xs text-slate-500 italic">
                    Ningún campo coincide con la búsqueda
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 p-3 overflow-auto flex-1 bg-slate-950/20" ref={gridRef}>
                    {fields.map((field) => {
                        const isBoolField = BOOLEAN_PATHS_SET.has(field);
                        const isRequired = REQUIRED_FIELDS_SET.has(field);
                        const selectValue = getSelectValue(field, isBoolField);
                        const isMapped = !!selectValue;
                        const isBoolMapped = isBoolField && (selectValue === BOOL_TRUE_SENTINEL || selectValue === BOOL_FALSE_SENTINEL);
                        const shortName = field.split('.').pop() || field;

                        // Preview value from selected row
                        const mappedCol = mapping[field];
                        const previewVal = previewRow && mappedCol && mappedCol !== BOOL_TRUE_SENTINEL && mappedCol !== BOOL_FALSE_SENTINEL
                            ? String(previewRow[mappedCol] ?? '')
                            : null;

                        const cardClass = highlightedField === field
                            ? 'bg-amber-950/30 border-amber-500 shadow-md ring-1 ring-amber-500/50 animate-pulse'
                            : isRequired && !isMapped
                                ? 'bg-red-950/15 border-red-900/60 hover:border-red-800/80 animate-pulse'
                                : isBoolMapped
                                    ? 'bg-violet-950/15 border-violet-900/50 hover:border-violet-800'
                                    : isMapped
                                        ? 'bg-emerald-950/15 border-emerald-900/50 hover:border-emerald-800'
                                        : 'bg-slate-800/40 border-slate-700/80 hover:border-slate-650';

                        const labelClass = isRequired && !isMapped
                            ? 'text-red-400'
                            : isBoolMapped
                                ? 'text-violet-400 font-bold'
                                : isMapped
                                    ? 'text-emerald-400 font-bold'
                                    : 'text-slate-350';

                        const selectClass = isRequired && !isMapped
                            ? 'bg-red-950/60 border-red-800/80 text-red-300 focus:ring-red-500/30'
                            : isBoolMapped
                                ? 'bg-violet-950/60 border-violet-800/80 text-violet-300 focus:ring-violet-500/30'
                                : isMapped
                                    ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300 focus:ring-emerald-500/30'
                                    : 'bg-slate-900 border-slate-700 text-slate-300 focus:ring-indigo-500/30';

                        return (
                            <div
                                key={field}
                                data-field={field}
                                className={`flex flex-col gap-1.5 p-2 rounded-lg border transition-all ${cardClass}`}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1 min-w-0">
                                        {isRequired && (
                                            <span className={`text-[7px] font-bold px-0.5 py-px rounded shrink-0 leading-tight ${
                                                isMapped ? 'bg-emerald-700 text-white' : 'bg-red-700 text-white'
                                            }`}>
                                                REQ
                                            </span>
                                        )}
                                        <span
                                            className={`text-[10px] truncate ${labelClass}`}
                                            title={field}
                                        >
                                            {shortName}
                                        </span>
                                        {isBoolField && (
                                            <span className="text-[7px] font-bold bg-violet-700 text-violet-100 px-1 rounded shrink-0 leading-tight">
                                                BOOL
                                            </span>
                                        )}
                                    </div>
                                    {isMapped && !isBoolField && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                                </div>

                                <div className="flex flex-col gap-1">
                                    <select
                                        className={`w-full px-1.5 py-1 text-[10px] rounded border transition-colors focus:outline-none focus:ring-1 ${selectClass}`}
                                        value={selectValue}
                                        onChange={(e) => handleFieldChange(field, e.target.value, isBoolField)}
                                    >
                                        <option value="">{isRequired ? '⚠️ OBLIGATORIO' : '— Sin mapear —'}</option>
                                        {isBoolField && (
                                            <optgroup label="⚡ Valor Fijo" className="bg-slate-900 text-slate-300">
                                                <option value={BOOL_TRUE_SENTINEL}>✅ TRUE</option>
                                                <option value={BOOL_FALSE_SENTINEL}>❌ FALSE</option>
                                            </optgroup>
                                        )}
                                        <optgroup label={isBoolField ? '📊 Columna Excel' : '📊 Columnas'} className="bg-slate-900 text-slate-300">
                                            {headers.map((h) => (
                                                <option key={h} value={h}>
                                                    {h}{emptyColumnSet.has(h) ? ' ⚠️ vacía' : ''}
                                                </option>
                                            ))}
                                        </optgroup>
                                    </select>

                                    {/* Inline preview of the mapped value */}
                                    {previewVal !== null && previewVal.length > 0 && (
                                        <div className="text-[9px] text-slate-400 truncate font-mono px-0.5 mt-0.5" title={previewVal}>
                                            → {previewVal.length > 25 ? previewVal.slice(0, 25) + '…' : previewVal}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Sub-modals */}
            <MappingActions isOpen={actionsOpen} onClose={() => setActionsOpen(false)} />
            <SavedMappings isOpen={savedOpen} onClose={() => setSavedOpen(false)} />
        </div>
    );
}

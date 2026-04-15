import { useMemo, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { FIELD_GROUPS, KNOWN_BOOLEAN_PATHS } from '../../data/schema';
import { FIELD_DESCRIPTIONS } from '../../data/fieldDescriptions';

// Sentinel values for fixed boolean mapping
const BOOL_TRUE_SENTINEL = '__BOOL_TRUE__';
const BOOL_FALSE_SENTINEL = '__BOOL_FALSE__';

const TABS = [
    { id: 'pOrdenPedido', label: '🏠 Orden', group: '' },
    { id: 'Cliente', label: '🧑‍💼 Cliente', group: 'ENT' },
    { id: 'ClienteDador', label: '🏭 Dador', group: '' },
    { id: 'Cliente2', label: '👥 Cli2', group: '' },
    { id: 'depositoSalida', label: '📤 Salida', group: '' },
    { id: 'depositoLlegada', label: '📥 Llegada', group: '' },
    { id: 'Items', label: '📦 Items', group: 'CRG' },
    { id: 'Producto', label: '📏 Dims', group: '' },
    { id: 'Contenedor', label: '🚛 Cont', group: '' },
    { id: 'TiposVehiculos', label: '🧱 Veh', group: '' },
    { id: 'TurnoPedido', label: '⏱️ Turno', group: 'DET' },
    { id: 'ServiciosAdicionales', label: '🛠️ Serv', group: '' },
    { id: 'Documentos', label: '📄 Docs', group: '' },
    { id: 'EstadosPedido', label: '🚥 Estado', group: '' },
    { id: 'Fiscal', label: '🏛️ Fisc', group: 'ADV' },
    { id: 'Recursos', label: '🧩 Rec', group: '' },
];

// Pre-compute a Set for O(1) lookups
const BOOLEAN_PATHS_SET = new Set(KNOWN_BOOLEAN_PATHS);

export default function MapperPanel() {
    const headers = useAppStore((s) => s.headers);
    const mapping = useAppStore((s) => s.mapping);
    const booleanOverrides = useAppStore((s) => s.booleanOverrides);
    const currentTab = useAppStore((s) => s.currentTab);
    const searchQuery = useAppStore((s) => s.searchQuery);
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

    const mappedCount = useMemo(() => {
        const allFields = FIELD_GROUPS[currentTab] || [];
        return allFields.filter((f) => mapping[f]).length;
    }, [currentTab, mapping]);

    const totalFields = (FIELD_GROUPS[currentTab] || []).length;
    const progress = totalFields > 0 ? Math.round((mappedCount / totalFields) * 100) : 0;

    /**
     * Handle field mapping change for boolean fields.
     * When user selects TRUE/FALSE sentinel, we set a booleanOverride and
     * mark the mapping with the sentinel so the field appears "mapped".
     * When user selects an Excel column, we clear the override.
     * When user selects "Sin mapear", we clear both.
     */
    const handleFieldChange = useCallback((field: string, value: string, isBoolField: boolean) => {
        if (isBoolField) {
            if (value === BOOL_TRUE_SENTINEL) {
                setBooleanOverride(field, true);
                updateMappingField(field, BOOL_TRUE_SENTINEL);
            } else if (value === BOOL_FALSE_SENTINEL) {
                setBooleanOverride(field, false);
                updateMappingField(field, BOOL_FALSE_SENTINEL);
            } else {
                // Excel column selected or cleared — remove boolean override
                // We need to remove the key from booleanOverrides
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

    /**
     * Compute the display value for a boolean field's select.
     * If there's a booleanOverride, show the corresponding sentinel.
     * Otherwise show the mapped Excel column (or empty).
     */
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
                    <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-300">{mappedCount}/{totalFields}</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-px px-1 py-0.5 bg-slate-100 border-b border-slate-200 overflow-x-auto shrink-0">
                {TABS.map((tab) => (
                    <span key={tab.id} className="flex items-center shrink-0">
                        {tab.group && (
                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mx-1 select-none">
                                {tab.group}
                            </span>
                        )}
                        <button
                            className={`px-1.5 py-0.5 text-[10px] font-semibold rounded whitespace-nowrap transition-all ${currentTab === tab.id
                                ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200/50'
                                : 'text-slate-600 hover:bg-white/60'
                                }`}
                            onClick={() => setCurrentTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    </span>
                ))}
            </div>

            {/* Field grid */}
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 p-1.5 overflow-auto flex-1" ref={gridRef}>
                {fields.map((field) => {
                    const isBoolField = BOOLEAN_PATHS_SET.has(field);
                    const selectValue = getSelectValue(field, isBoolField);
                    const isMapped = !!selectValue;
                    const isBoolMapped = isBoolField && (selectValue === BOOL_TRUE_SENTINEL || selectValue === BOOL_FALSE_SENTINEL);
                    const shortName = field.split('.').pop() || field;
                    const tooltip = FIELD_DESCRIPTIONS[field];

                    return (
                        <div
                            key={field}
                            data-field={field}
                            className={`flex flex-col gap-0.5 p-1.5 rounded border transition-all ${highlightedField === field
                                ? 'bg-amber-50 border-amber-400 shadow-md ring-1 ring-amber-400/50 animate-pulse'
                                : isBoolMapped
                                    ? 'bg-violet-50/50 border-violet-200/80 hover:border-violet-300'
                                    : isMapped
                                        ? 'bg-emerald-50/50 border-emerald-200/80 hover:border-emerald-300'
                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <div className="flex items-center gap-0.5">
                                <span className={`text-[10px] font-bold truncate ${isBoolMapped ? 'text-violet-700' : isMapped ? 'text-emerald-700' : 'text-slate-700'}`}>
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
                                className={`w-full px-1 py-0.5 text-[10px] rounded border transition-colors focus:outline-none focus:ring-1 ${isBoolMapped
                                    ? 'bg-violet-100/50 border-violet-200 text-violet-800 focus:ring-violet-500/30'
                                    : isMapped
                                        ? 'bg-emerald-100/50 border-emerald-200 text-emerald-800 focus:ring-emerald-500/30'
                                        : 'bg-white border-slate-200 text-slate-600 focus:ring-indigo-500/30'
                                    }`}
                                value={selectValue}
                                onChange={(e) => handleFieldChange(field, e.target.value, isBoolField)}
                            >
                                <option value="">— Sin mapear —</option>
                                {isBoolField && (
                                    <optgroup label="⚡ Valor Fijo">
                                        <option value={BOOL_TRUE_SENTINEL}>✅ TRUE</option>
                                        <option value={BOOL_FALSE_SENTINEL}>❌ FALSE</option>
                                    </optgroup>
                                )}
                                <optgroup label={isBoolField ? '📊 Columna Excel' : '📊 Columnas'}>
                                    {headers.map((h) => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

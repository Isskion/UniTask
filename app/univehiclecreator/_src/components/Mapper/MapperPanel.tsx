import { useMemo, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { FIELD_GROUPS, getDynamicFields, KNOWN_BOOLEAN_PATHS } from '../../data/schema';
import MappingActions from './MappingActions';
import SavedMappings from './SavedMappings';

const TABS = [
    { id: 'pVehiculo', label: '🚛 Vehículo' },
    { id: 'pPropietario', label: '🧑‍💼 Propietario' },
    { id: 'pTransporte', label: '📤 Transporte' },
    { id: 'Dinamicos', label: '🧩 Dinámicos' },
    { id: 'Booleans', label: '🚥 Booleanos' }
];

export default function MapperPanel() {
    const headers = useAppStore((s) => s.headers);
    const mapping = useAppStore((s) => s.mapping);
    const booleanOverrides = useAppStore((s) => s.booleanOverrides);
    const dynamicFieldCounts = useAppStore((s) => s.dynamicFieldCounts);
    const currentTab = useAppStore((s) => s.currentTab);
    const searchQuery = useAppStore((s) => s.searchQuery);
    
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

    const mappedCount = useMemo(() => {
        return tabFields.filter((f) => mapping[f]).length;
    }, [tabFields, mapping]);

    const totalFields = tabFields.length;
    const progress = totalFields > 0 ? Math.round((mappedCount / totalFields) * 100) : 0;

    if (headers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-900 border-t border-slate-700 text-slate-400">
                <div className="text-3xl mb-2 opacity-25">🗺️</div>
                <p className="text-xs">Carga un Excel con cabeceras válidas para comenzar el mapeo</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-900 border-t border-slate-700 text-slate-200">
            {/* Header bar */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border-b border-slate-700 shrink-0">
                <h3 className="text-xs font-bold text-slate-200 whitespace-nowrap">🗺️ Mapeador</h3>
                <input
                    type="text"
                    className="flex-1 max-w-[220px] px-2 py-1 text-xs bg-slate-950 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    placeholder="🔍 Buscar campo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                
                {/* Progress */}
                <div className="hidden sm:flex items-center gap-2 ml-4">
                    <div className="w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-400">{mappedCount}/{totalFields}</span>
                </div>

                {/* Modals trigger */}
                <div className="flex items-center gap-1.5 ml-auto">
                    <button
                        className="px-2 py-1 text-[11px] font-semibold bg-slate-750 text-slate-200 rounded hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
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
            <div className="flex items-center gap-px px-2 py-1 bg-slate-850 border-b border-slate-700 overflow-x-auto shrink-0 scrollbar-none">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        className={`px-3 py-1 text-xs font-semibold rounded transition-all cursor-pointer whitespace-nowrap ${currentTab === tab.id
                            ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300 border border-transparent'
                            }`}
                        onClick={() => setCurrentTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Field grid */}
            {fields.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-6 text-xs text-slate-500 italic">
                    Ningún campo coincide con la búsqueda
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 p-3 overflow-auto flex-1 bg-slate-950/20" ref={gridRef}>
                    {fields.map((field) => {
                        const mapped = mapping[field] || '';
                        const isMapped = !!mapped;
                        const shortName = field.split('.').pop() || field;
                        const isBooleanType = KNOWN_BOOLEAN_PATHS.includes(field);

                        return (
                            <div
                                key={field}
                                data-field={field}
                                className={`flex flex-col gap-1.5 p-2 rounded-lg border transition-all ${highlightedField === field
                                    ? 'bg-indigo-900/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/50 animate-pulse'
                                    : isMapped
                                        ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/35'
                                        : 'bg-slate-800/40 border-slate-700 hover:border-slate-650'
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <span 
                                        className={`text-[10px] font-bold truncate cursor-help ${isMapped ? 'text-emerald-400' : 'text-slate-300'}`}
                                        title={field}
                                    >
                                        {shortName}
                                    </span>
                                    {isMapped && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                                </div>

                                <div className="flex flex-col gap-1">
                                    <select
                                        className={`w-full px-1.5 py-1 text-[10px] rounded border transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500/30 ${isMapped
                                            ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                                            : 'bg-slate-900 border-slate-700 text-slate-300'
                                            }`}
                                        value={mapped}
                                        onChange={(e) => updateMappingField(field, e.target.value)}
                                    >
                                        <option value="">— Sin mapear —</option>
                                        {headers.map((h) => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>

                                    {/* Boolean toggle if it's boolean type */}
                                    {isBooleanType && (
                                        <div className="flex items-center justify-between mt-1 px-1 bg-slate-900/50 py-0.5 rounded border border-slate-750/50">
                                            <span className="text-[9px] text-slate-500 font-semibold uppercase">Fijo:</span>
                                            <input
                                                type="checkbox"
                                                className="w-3 h-3 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-500"
                                                checked={booleanOverrides[field] !== false}
                                                onChange={(e) => setBooleanOverride(field, e.target.checked)}
                                            />
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

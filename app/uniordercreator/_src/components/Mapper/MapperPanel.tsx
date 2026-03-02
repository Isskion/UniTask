import { useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { FIELD_GROUPS } from '../../data/schema';
import { FIELD_DESCRIPTIONS } from '../../data/fieldDescriptions';

const TABS = [
    { id: 'pOrdenPedido', label: '🏠 Orden Global', group: '' },
    { id: 'Cliente', label: '🧑‍💼 Cliente', group: 'ENTIDADES' },
    { id: 'ClienteDador', label: '🏭 Dador', group: '' },
    { id: 'Cliente2', label: '👥 Cliente 2', group: '' },
    { id: 'depositoSalida', label: '📤 Dep. Salida', group: '' },
    { id: 'depositoLlegada', label: '📥 Dep. Llegada', group: '' },
    { id: 'Items', label: '📦 Items', group: 'CARGA' },
    { id: 'Producto', label: '📏 Dimensiones', group: '' },
    { id: 'Contenedor', label: '🚛 Contenedor', group: '' },
    { id: 'TiposVehiculos', label: '🧱 Vehículos', group: '' },
    { id: 'TurnoPedido', label: '⏱️ Turno', group: 'DETALLES' },
    { id: 'ServiciosAdicionales', label: '🛠️ Servicios', group: '' },
    { id: 'Documentos', label: '📄 Documentos', group: '' },
    { id: 'EstadosPedido', label: '🚥 Estados', group: '' },
    { id: 'Fiscal', label: '🏛️ Fiscal', group: 'AVANZADO' },
    { id: 'Recursos', label: '🧩 Recursos', group: '' },
];

export default function MapperPanel() {
    const headers = useAppStore((s) => s.headers);
    const mapping = useAppStore((s) => s.mapping);
    const currentTab = useAppStore((s) => s.currentTab);
    const searchQuery = useAppStore((s) => s.searchQuery);
    const setCurrentTab = useAppStore((s) => s.setCurrentTab);
    const setSearchQuery = useAppStore((s) => s.setSearchQuery);
    const updateMappingField = useAppStore((s) => s.updateMappingField);
    const highlightedField = useAppStore((s) => s.highlightedField);
    const gridRef = useRef<HTMLDivElement>(null);

    const fields = useMemo(() => {
        const tabFields = FIELD_GROUPS[currentTab] || [];
        if (!searchQuery) return tabFields;
        const q = searchQuery.toLowerCase();
        return tabFields.filter((f) => f.toLowerCase().includes(q));
    }, [currentTab, searchQuery]);

    // Auto-scroll to highlighted field
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

    if (headers.length === 0) {
        return (
            <div className="flex items-center justify-center h-full p-8 text-sm text-slate-400 italic">
                Carga un Excel para ver los campos disponibles
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-white">
            {/* Header bar */}
            <div className="flex items-center gap-4 px-4 py-2.5 bg-gradient-to-r from-slate-800 to-slate-700 shrink-0">
                <h3 className="text-sm font-bold text-white whitespace-nowrap">🗺️ Mapeador</h3>
                <div className="relative flex-1 max-w-xs">
                    <input
                        type="text"
                        className="w-full px-3 py-1.5 pl-8 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white/15 transition-all"
                        placeholder="🔍 Buscar campo..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-xs font-semibold text-emerald-300 whitespace-nowrap">
                        {mappedCount}/{totalFields}
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-0.5 px-3 py-1.5 bg-slate-100 border-b border-slate-200 overflow-x-auto shrink-0">
                {TABS.map((tab) => (
                    <span key={tab.id} className="flex items-center shrink-0">
                        {tab.group && (
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mx-2 select-none">
                                {tab.group}
                            </span>
                        )}
                        <button
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all duration-200 ${currentTab === tab.id
                                    ? 'bg-white text-indigo-700 shadow-md shadow-indigo-100 border border-indigo-200/50'
                                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-800'
                                }`}
                            onClick={() => setCurrentTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    </span>
                ))}
            </div>

            {/* Field grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-3 overflow-auto flex-1" ref={gridRef}>
                {fields.map((field) => {
                    const mapped = mapping[field] || '';
                    const isMapped = !!mapped;
                    const shortName = field.split('.').pop() || field;
                    const tooltip = FIELD_DESCRIPTIONS[field];

                    return (
                        <div
                            key={field}
                            data-field={field}
                            className={`flex flex-col gap-1 p-2.5 rounded-xl border transition-all duration-300 ${highlightedField === field
                                    ? 'bg-amber-50 border-amber-400 shadow-lg shadow-amber-100 ring-2 ring-amber-400/50 animate-pulse'
                                    : isMapped
                                        ? 'bg-emerald-50/50 border-emerald-200/80 hover:border-emerald-300 hover:shadow-sm'
                                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                }`}
                        >
                            <div className="flex items-center gap-1">
                                <span className={`text-xs font-bold ${isMapped ? 'text-emerald-700' : 'text-slate-700'}`}>
                                    {shortName}
                                </span>
                                {isMapped && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                )}
                                {tooltip && (
                                    <span className="text-slate-400 cursor-help ml-auto shrink-0" title={tooltip}>
                                        ℹ️
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] text-slate-400 truncate">{field}</span>
                            <select
                                className={`w-full px-2 py-1 text-xs rounded-lg border transition-colors focus:outline-none focus:ring-2 ${isMapped
                                        ? 'bg-emerald-100/50 border-emerald-200 text-emerald-800 focus:ring-emerald-500/30'
                                        : 'bg-white border-slate-200 text-slate-600 focus:ring-indigo-500/30'
                                    }`}
                                value={mapped}
                                onChange={(e) => updateMappingField(field, e.target.value)}
                            >
                                <option value="">— Sin mapear —</option>
                                {headers.map((h) => (
                                    <option key={h} value={h}>
                                        {h}
                                    </option>
                                ))}
                            </select>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

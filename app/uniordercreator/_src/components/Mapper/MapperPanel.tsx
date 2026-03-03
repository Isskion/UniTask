import { useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { FIELD_GROUPS } from '../../data/schema';
import { FIELD_DESCRIPTIONS } from '../../data/fieldDescriptions';

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
                    const mapped = mapping[field] || '';
                    const isMapped = !!mapped;
                    const shortName = field.split('.').pop() || field;
                    const tooltip = FIELD_DESCRIPTIONS[field];

                    return (
                        <div
                            key={field}
                            data-field={field}
                            className={`flex flex-col gap-0.5 p-1.5 rounded border transition-all ${highlightedField === field
                                ? 'bg-amber-50 border-amber-400 shadow-md ring-1 ring-amber-400/50 animate-pulse'
                                : isMapped
                                    ? 'bg-emerald-50/50 border-emerald-200/80 hover:border-emerald-300'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <div className="flex items-center gap-0.5">
                                <span className={`text-[10px] font-bold truncate ${isMapped ? 'text-emerald-700' : 'text-slate-700'}`}>
                                    {shortName}
                                </span>
                                {isMapped && <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />}
                                {tooltip && (
                                    <span className="text-slate-400 cursor-help ml-auto shrink-0 text-[8px]" title={tooltip}>ℹ️</span>
                                )}
                            </div>
                            <select
                                className={`w-full px-1 py-0.5 text-[10px] rounded border transition-colors focus:outline-none focus:ring-1 ${isMapped
                                    ? 'bg-emerald-100/50 border-emerald-200 text-emerald-800 focus:ring-emerald-500/30'
                                    : 'bg-white border-slate-200 text-slate-600 focus:ring-indigo-500/30'
                                    }`}
                                value={mapped}
                                onChange={(e) => updateMappingField(field, e.target.value)}
                            >
                                <option value="">— Sin mapear —</option>
                                {headers.map((h) => (
                                    <option key={h} value={h}>{h}</option>
                                ))}
                            </select>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

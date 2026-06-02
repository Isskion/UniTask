import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { DYNAMIC_FIELD_SECTIONS } from '../../data/schema';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function DynamicFieldsWizard({ isOpen, onClose }: Props) {
    const headers = useAppStore((s) => s.headers);
    const dynamicFieldCounts = useAppStore((s) => s.dynamicFieldCounts);
    const setDynamicFieldCount = useAppStore((s) => s.setDynamicFieldCount);

    const [selectedScope, setSelectedScope] = useState('Vehiculo');

    if (!isOpen) return null;

    const sections = Object.entries(DYNAMIC_FIELD_SECTIONS);

    // Filter headers that look like dynamic fields (Dyn_ prefix)
    const dynHeaders = headers.filter((h) => h.toUpperCase().startsWith('DYN_'));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md" onClick={onClose}>
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-200" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 bg-slate-800 border-b border-slate-700">
                    <h2 className="text-base font-bold">🔧 Wizard Campos Dinámicos</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Configura la cantidad de campos dinámicos por sección UNIGIS</p>
                </div>

                <div className="flex p-6 gap-6 min-h-[300px]">
                    {/* Section List */}
                    <div className="w-48 shrink-0 space-y-1">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Secciones</h3>
                        {sections.map(([key, sec]) => (
                            <button
                                key={key}
                                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-all ${selectedScope === key
                                        ? 'bg-indigo-600/20 text-indigo-400 font-bold border border-indigo-500/30'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-350 border border-transparent'
                                    }`}
                                onClick={() => setSelectedScope(key)}
                            >
                                <span>{sec.label}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${(dynamicFieldCounts[key] || 0) > 0
                                        ? 'bg-indigo-650 text-indigo-300'
                                        : 'bg-slate-950 text-slate-650'
                                    }`}>
                                    {dynamicFieldCounts[key] || 0}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Config Panel */}
                    <div className="flex-1 space-y-4">
                        <h3 className="text-sm font-bold text-slate-200">
                            {DYNAMIC_FIELD_SECTIONS[selectedScope]?.label || selectedScope}
                        </h3>
                        <p className="text-[10px] text-slate-500">
                            Base: <code className="px-1.5 py-0.5 bg-slate-950 text-slate-400 rounded text-xs font-mono">{DYNAMIC_FIELD_SECTIONS[selectedScope]?.basePath}</code>
                        </p>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cantidad de campos dinámicos</label>
                            <input
                                type="number"
                                min="0"
                                max="20"
                                className="w-24 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-center text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                                value={dynamicFieldCounts[selectedScope] || 0}
                                onChange={(e) =>
                                    setDynamicFieldCount(selectedScope, Math.max(0, parseInt(e.target.value) || 0))
                                }
                            />
                        </div>

                        {dynHeaders.length > 0 && (
                            <div className="space-y-2 mt-4">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Columnas Dyn_ detectadas en Excel</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {dynHeaders.map((h) => (
                                        <span key={h} className="px-2.5 py-1 text-xs font-mono font-bold bg-amber-500/10 text-amber-350 border border-amber-500/20 rounded">
                                            {h}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-3 bg-slate-850 border-t border-slate-800 flex justify-end">
                    <button
                        className="px-5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl transition-colors cursor-pointer"
                        onClick={onClose}
                    >
                        Aceptar
                    </button>
                </div>
            </div>
        </div>
    );
}

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

    const [selectedScope, setSelectedScope] = useState('Orden');

    if (!isOpen) return null;

    const sections = Object.entries(DYNAMIC_FIELD_SECTIONS);

    // Filter headers that look like dynamic fields (Dyn_ prefix)
    const dynHeaders = headers.filter((h) => h.toUpperCase().startsWith('DYN_'));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md" onClick={onClose}>
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-violet-700 to-purple-600">
                    <h2 className="text-lg font-bold text-white">🔧 Wizard Campos Dinámicos</h2>
                    <p className="text-sm text-violet-200 mt-0.5">Configura la cantidad de campos dinámicos por sección UNIGIS</p>
                </div>

                <div className="flex p-6 gap-6 min-h-[300px]">
                    {/* Section List */}
                    <div className="w-48 shrink-0 space-y-1">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Secciones</h3>
                        {sections.map(([key, sec]) => (
                            <button
                                key={key}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all duration-200 ${selectedScope === key
                                        ? 'bg-violet-100 text-violet-700 font-bold border border-violet-200 shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                                    }`}
                                onClick={() => setSelectedScope(key)}
                            >
                                <span>{sec.label}</span>
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${(dynamicFieldCounts[key] || 0) > 0
                                        ? 'bg-violet-200 text-violet-700'
                                        : 'bg-slate-100 text-slate-400'
                                    }`}>
                                    {dynamicFieldCounts[key] || 0}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Config Panel */}
                    <div className="flex-1 space-y-4">
                        <h3 className="text-lg font-bold text-slate-800">
                            {DYNAMIC_FIELD_SECTIONS[selectedScope]?.label || selectedScope}
                        </h3>
                        <p className="text-xs text-slate-500">
                            Base: <code className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs font-mono">{DYNAMIC_FIELD_SECTIONS[selectedScope]?.basePath}</code>
                        </p>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cantidad de campos dinámicos</label>
                            <input
                                type="number"
                                min="0"
                                max="20"
                                className="w-24 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 transition-all"
                                value={dynamicFieldCounts[selectedScope] || 0}
                                onChange={(e) =>
                                    setDynamicFieldCount(selectedScope, Math.max(0, parseInt(e.target.value) || 0))
                                }
                            />
                        </div>

                        {dynHeaders.length > 0 && (
                            <div className="space-y-2 mt-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Columnas Dyn_ detectadas en Excel</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {dynHeaders.map((h) => (
                                        <span key={h} className="px-2.5 py-1 text-xs font-mono font-bold bg-amber-100 text-amber-700 rounded-lg border border-amber-200">
                                            {h}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button
                        className="px-5 py-2 text-sm font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
                        onClick={onClose}
                    >
                        Aceptar
                    </button>
                </div>
            </div>
        </div>
    );
}

import { useAppStore } from '../../store/appStore';
import { levenshtein } from '../../utils/levenshtein';
import { getAllFields } from '../../data/schema';
import { MAPPING_TEMPLATES, type MappingTemplate } from '../../data/mappingTemplates';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function MappingActions({ isOpen, onClose }: Props) {
    const mapping = useAppStore((s) => s.mapping);
    const setMapping = useAppStore((s) => s.setMapping);
    const headers = useAppStore((s) => s.headers);

    if (!isOpen) return null;

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(mapping, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mapping_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const text = await file.text();
            try {
                const imported = JSON.parse(text);
                if (typeof imported === 'object') setMapping(imported);
            } catch {
                alert('Archivo JSON inválido');
            }
        };
        input.click();
    };

    const handleAutoMap = () => {
        const allFields = getAllFields();
        const newMapping: Record<string, string> = {};
        for (const field of allFields) {
            const shortName = field.split('.').pop()?.toLowerCase() || '';
            let bestMatch = '';
            let bestDist = Infinity;
            for (const header of headers) {
                const dist = levenshtein(shortName, header.toLowerCase());
                if (dist < bestDist) {
                    bestDist = dist;
                    bestMatch = header;
                }
            }
            if (bestDist <= Math.max(2, Math.floor(shortName.length * 0.4))) {
                newMapping[field] = bestMatch;
            }
        }
        setMapping(newMapping);
    };

    const handleClearAll = () => {
        if (confirm('¿Limpiar todo el mapeo?')) setMapping({});
    };

    const handleApplyTemplate = (tpl: MappingTemplate) => {
        setMapping(tpl.mapping);
    };

    const mappedCount = Object.values(mapping).filter(Boolean).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-lg bg-white rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700">
                    <h2 className="text-lg font-bold text-white">🗺️ Acciones de Mapeo</h2>
                </div>

                <div className="p-6 space-y-5">
                    {/* Stats */}
                    <div className="flex gap-4">
                        <div className="flex-1 p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
                            <div className="text-2xl font-black text-indigo-600">{mappedCount}</div>
                            <div className="text-xs text-indigo-500 font-medium">Campos mapeados</div>
                        </div>
                        <div className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                            <div className="text-2xl font-black text-slate-600">{headers.length}</div>
                            <div className="text-xs text-slate-500 font-medium">Columnas Excel</div>
                        </div>
                    </div>

                    {/* Action Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-indigo-50 to-indigo-100/50 border border-indigo-200 rounded-xl hover:shadow-md hover:shadow-indigo-100 hover:border-indigo-300 transition-all duration-200 group"
                            onClick={handleAutoMap}
                        >
                            <span className="text-2xl group-hover:scale-110 transition-transform">🔄</span>
                            <span className="text-sm font-semibold text-indigo-700">Auto-Mapear</span>
                        </button>
                        <button
                            className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl hover:shadow-md hover:shadow-emerald-100 hover:border-emerald-300 transition-all duration-200 group"
                            onClick={handleExport}
                        >
                            <span className="text-2xl group-hover:scale-110 transition-transform">📥</span>
                            <span className="text-sm font-semibold text-emerald-700">Exportar JSON</span>
                        </button>
                        <button
                            className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-sky-50 to-sky-100/50 border border-sky-200 rounded-xl hover:shadow-md hover:shadow-sky-100 hover:border-sky-300 transition-all duration-200 group"
                            onClick={handleImport}
                        >
                            <span className="text-2xl group-hover:scale-110 transition-transform">📤</span>
                            <span className="text-sm font-semibold text-sky-700">Importar JSON</span>
                        </button>
                        <button
                            className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-red-50 to-red-100/50 border border-red-200 rounded-xl hover:shadow-md hover:shadow-red-100 hover:border-red-300 transition-all duration-200 group"
                            onClick={handleClearAll}
                        >
                            <span className="text-2xl group-hover:scale-110 transition-transform">🗑️</span>
                            <span className="text-sm font-semibold text-red-700">Limpiar Todo</span>
                        </button>
                    </div>

                    {/* Templates */}
                    {MAPPING_TEMPLATES.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Plantillas predefinidas</h3>
                            <div className="space-y-2">
                                {MAPPING_TEMPLATES.map((tpl, i) => (
                                    <button
                                        key={i}
                                        className="w-full flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-200 text-left"
                                        onClick={() => handleApplyTemplate(tpl)}
                                    >
                                        <span className="text-lg">📋</span>
                                        <div>
                                            <div className="text-sm font-bold text-slate-700">{tpl.name}</div>
                                            <div className="text-xs text-slate-500">{tpl.description}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button
                        className="px-5 py-2 text-sm font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

import { useAppStore } from '../../store/appStore';
import { levenshtein } from '../../utils/levenshtein';
import { getAllFields } from '../../data/schema';

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
        a.download = `vehicle_mapping_${new Date().toISOString().slice(0, 10)}.json`;
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
        const newMapping: Record<string, string> = { ...mapping };
        
        for (const field of allFields) {
            // Only auto-map if not already mapped
            if (newMapping[field]) continue;

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

            // Accept close match (distance <= 2 or up to 40% of shortName length)
            if (bestDist <= Math.max(2, Math.floor(shortName.length * 0.4))) {
                newMapping[field] = bestMatch;
            }
        }
        setMapping(newMapping);
    };

    const handleClearAll = () => {
        if (confirm('¿Limpiar todo el mapeo?')) setMapping({});
    };

    const mappedCount = Object.values(mapping).filter(Boolean).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-lg bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden text-slate-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 bg-slate-800 border-b border-slate-700">
                    <h2 className="text-lg font-bold">🗺️ Acciones de Mapeo</h2>
                </div>

                <div className="p-6 space-y-5">
                    {/* Stats */}
                    <div className="flex gap-4">
                        <div className="flex-1 p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/25 text-center">
                            <div className="text-2xl font-black text-indigo-400">{mappedCount}</div>
                            <div className="text-xs text-indigo-300 font-medium">Campos mapeados</div>
                        </div>
                        <div className="flex-1 p-3 bg-slate-800 rounded-xl border border-slate-700 text-center">
                            <div className="text-2xl font-black text-slate-300">{headers.length}</div>
                            <div className="text-xs text-slate-400 font-medium font-mono">Columnas Excel</div>
                        </div>
                    </div>

                    {/* Action Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            className="flex items-center gap-3 p-3.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl hover:bg-indigo-600/30 hover:border-indigo-500/50 transition-all duration-200 cursor-pointer group"
                            onClick={handleAutoMap}
                        >
                            <span className="text-2xl group-hover:scale-110 transition-transform">🔄</span>
                            <span className="text-sm font-semibold text-indigo-300">Auto-Mapear</span>
                        </button>
                        <button
                            className="flex items-center gap-3 p-3.5 bg-emerald-600/20 border border-emerald-500/30 rounded-xl hover:bg-emerald-600/30 hover:border-emerald-500/50 transition-all duration-200 cursor-pointer group"
                            onClick={handleExport}
                        >
                            <span className="text-2xl group-hover:scale-110 transition-transform">📥</span>
                            <span className="text-sm font-semibold text-emerald-300">Exportar JSON</span>
                        </button>
                        <button
                            className="flex items-center gap-3 p-3.5 bg-sky-600/20 border border-sky-500/30 rounded-xl hover:bg-sky-600/30 hover:border-sky-500/50 transition-all duration-200 cursor-pointer group"
                            onClick={handleImport}
                        >
                            <span className="text-2xl group-hover:scale-110 transition-transform">📤</span>
                            <span className="text-sm font-semibold text-sky-300">Importar JSON</span>
                        </button>
                        <button
                            className="flex items-center gap-3 p-3.5 bg-red-600/20 border border-red-500/30 rounded-xl hover:bg-red-600/30 hover:border-red-500/50 transition-all duration-200 cursor-pointer group"
                            onClick={handleClearAll}
                        >
                            <span className="text-2xl group-hover:scale-110 transition-transform">🗑️</span>
                            <span className="text-sm font-semibold text-red-300">Limpiar Todo</span>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-slate-800 border-t border-slate-700 flex justify-end">
                    <button
                        className="px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors cursor-pointer"
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

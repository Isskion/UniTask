import { useState } from 'react';
import { useAppStore } from '../../store/appStore';

interface MassEditModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function MassEditModal({ isOpen, onClose }: MassEditModalProps) {
    const headers = useAppStore((s) => s.headers);
    const rows = useAppStore((s) => s.rows);
    const selectedIndices = useAppStore((s) => s.selectedIndices);
    const applyBulkEdit = useAppStore((s) => s.applyBulkEdit);

    const [selectedColumn, setSelectedColumn] = useState('');
    const [newValue, setNewValue] = useState('');
    const [applied, setApplied] = useState(false);
    const [busy, setBusy] = useState(false);

    if (!isOpen) return null;

    const handleApply = () => {
        if (!selectedColumn) return;
        setBusy(true);
        requestAnimationFrame(() => {
            applyBulkEdit(Array.from(selectedIndices), selectedColumn, newValue);
            setBusy(false);
            setApplied(true);
            setTimeout(() => setApplied(false), 2000);
        });
    };

    const handleClear = () => {
        if (!selectedColumn) return;
        setBusy(true);
        requestAnimationFrame(() => {
            applyBulkEdit(Array.from(selectedIndices), selectedColumn, '');
            setBusy(false);
            setApplied(true);
            setTimeout(() => setApplied(false), 2000);
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md" onClick={onClose}>
            <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-200 relative" onClick={(e) => e.stopPropagation()}>
                {busy && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-slate-900/85 backdrop-blur-[1px]">
                        <div className="w-4 h-4 border-2 border-slate-700 border-t-indigo-400 rounded-full animate-spin" />
                        <span className="text-sm font-semibold text-slate-300">Aplicando cambios…</span>
                    </div>
                )}
                {/* Header */}
                <div className="px-6 py-4 bg-slate-800 border-b border-slate-700">
                    <h2 className="text-base font-bold">✏️ Edición Masiva</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Aplicar cambios a <strong className="text-indigo-400 font-bold">{selectedIndices.size}</strong> filas seleccionadas
                    </p>
                </div>

                <div className="p-6 space-y-4">
                    {/* Column selector */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Columna a modificar</label>
                        <select
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                            value={selectedColumn}
                            onChange={(e) => setSelectedColumn(e.target.value)}
                        >
                            <option value="">— Selecciona columna —</option>
                            {headers.map((h) => (
                                <option key={h} value={h}>{h}</option>
                            ))}
                        </select>
                    </div>

                    {/* Value input */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nuevo valor</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            placeholder="Valor a aplicar en todas las filas seleccionadas"
                            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                        />
                    </div>

                    {/* Preview Table */}
                    {selectedColumn && (
                        <div className="space-y-2">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vista previa (primeras 5)</h4>
                            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/40">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-slate-850 border-b border-slate-800 text-slate-400">
                                            <th className="p-2 text-left text-[10px] font-bold uppercase w-12">Fila</th>
                                            <th className="p-2 text-left text-[10px] font-bold uppercase">Actual</th>
                                            <th className="p-2 text-center text-slate-650 w-8">→</th>
                                            <th className="p-2 text-left text-[10px] font-bold uppercase text-indigo-400">Nuevo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from(selectedIndices).slice(0, 5).map((idx) => (
                                            <tr key={idx} className="border-b border-slate-800 last:border-0 text-slate-300">
                                                <td className="p-2 text-[10px] font-mono text-slate-500">{idx + 1}</td>
                                                <td className="p-2 truncate max-w-[120px] line-through opacity-50">{String(rows[idx]?.[selectedColumn] ?? '')}</td>
                                                <td className="p-2 text-center text-slate-500">→</td>
                                                <td className="p-2 font-bold text-indigo-300 truncate max-w-[120px]">{newValue || <span className="italic text-slate-600 font-normal">(vacío)</span>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {selectedIndices.size > 5 && (
                                <p className="text-[10px] text-slate-500 text-center italic">... y {selectedIndices.size - 5} filas más</p>
                            )}
                        </div>
                    )}

                    {/* Success feedback */}
                    {applied && (
                        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-bold text-center">
                            ✅ Cambios aplicados exitosamente
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-3 bg-slate-850 border-t border-slate-800 flex gap-2 justify-end">
                    <button
                        className="px-4 py-2 text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-350 rounded-xl hover:bg-slate-750 transition-colors cursor-pointer"
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                    <button
                        className="px-4 py-2 text-xs font-semibold bg-red-650 hover:bg-red-650 text-white rounded-xl transition-all disabled:opacity-40 cursor-pointer"
                        onClick={handleClear}
                        disabled={!selectedColumn}
                    >
                        🗑️ Limpiar
                    </button>
                    <button
                        className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition-all disabled:opacity-40 cursor-pointer"
                        onClick={handleApply}
                        disabled={!selectedColumn}
                    >
                        ✓ Aplicar
                    </button>
                </div>
            </div>
        </div>
    );
}

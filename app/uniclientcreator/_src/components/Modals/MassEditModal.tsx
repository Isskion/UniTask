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
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-100 overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
                {busy && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-white/80 backdrop-blur-[1px]">
                        <div className="w-4 h-4 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
                        <span className="text-sm font-semibold text-slate-600">Aplicando cambios…</span>
                    </div>
                )}
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 to-violet-600">
                    <h2 className="text-lg font-bold text-white">✏️ Edición Masiva</h2>
                    <p className="text-sm text-indigo-200 mt-0.5">
                        Aplicar cambios a <strong className="text-white">{selectedIndices.size}</strong> filas seleccionadas
                    </p>
                </div>

                <div className="p-6 space-y-4">
                    {/* Column selector */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Columna a modificar</label>
                        <select
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all"
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
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nuevo valor</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            placeholder="Valor a aplicar en todas las filas seleccionadas"
                            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                        />
                    </div>

                    {/* Preview Table */}
                    {selectedColumn && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vista previa (primeras 5)</h4>
                            <div className="rounded-xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="p-2 text-left text-xs font-bold text-slate-500">Fila</th>
                                            <th className="p-2 text-left text-xs font-bold text-slate-500">Actual</th>
                                            <th className="p-2 text-center text-xs text-slate-400 w-8">→</th>
                                            <th className="p-2 text-left text-xs font-bold text-indigo-600">Nuevo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from(selectedIndices).slice(0, 5).map((idx) => (
                                            <tr key={idx} className="border-t border-slate-100">
                                                <td className="p-2 text-xs font-mono text-slate-500">{idx + 1}</td>
                                                <td className="p-2 text-sm text-slate-700 line-through opacity-60">{String(rows[idx]?.[selectedColumn] ?? '')}</td>
                                                <td className="p-2 text-center text-slate-300">→</td>
                                                <td className="p-2 text-sm font-semibold text-indigo-700">{newValue || '(vacío)'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {selectedIndices.size > 5 && (
                                <p className="text-xs text-slate-400 text-center italic">... y {selectedIndices.size - 5} filas más</p>
                            )}
                        </div>
                    )}

                    {/* Success feedback */}
                    {applied && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-semibold text-center animate-in fade-in">
                            ✅ Cambios aplicados exitosamente
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex gap-3 justify-end">
                    <button
                        className="px-4 py-2 text-sm font-semibold bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-all"
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                    <button
                        className="px-4 py-2 text-sm font-semibold bg-red-50 text-red-700 border border-red-200 rounded-xl hover:bg-red-100 transition-all disabled:opacity-40"
                        onClick={handleClear}
                        disabled={!selectedColumn}
                    >
                        🗑️ Limpiar
                    </button>
                    <button
                        className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl hover:from-indigo-500 hover:to-indigo-400 shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-40 disabled:hover:shadow-lg"
                        onClick={handleApply}
                        disabled={!selectedColumn}
                    >
                        ✅ Aplicar a {selectedIndices.size} filas
                    </button>
                </div>
            </div>
        </div>
    );
}

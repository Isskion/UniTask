import React, { useMemo } from 'react';
import { useAppStore } from '../../store/appStore';

export default function DetailPanel() {
    const rows = useAppStore((s) => s.rows);
    const selectedRow = useAppStore((s) => s.selectedRow);
    const mapping = useAppStore((s) => s.mapping);
    const navigateToField = useAppStore((s) => s.navigateToField);
    const updateRowData = useAppStore((s) => s.updateRowData);

    const reverseMap = useMemo(() => {
        const map: Record<string, { short: string; full: string }[]> = {};
        for (const [field, col] of Object.entries(mapping)) {
            if (!col) continue;
            if (!map[col]) map[col] = [];
            const short = field.split('.').pop() || field;
            map[col].push({ short, full: field });
        }
        return map;
    }, [mapping]);

    if (selectedRow < 0 || !rows[selectedRow]) {
        return (
            <div className="flex items-center justify-center h-full p-4 text-xs text-slate-400 italic">
                Selecciona una fila para ver sus detalles
            </div>
        );
    }

    const row = rows[selectedRow];

    // Get list of all spreadsheet cells for this row
    const rowKeys = Object.keys(row).filter(k => !k.startsWith('_'));

    const handleEditValue = (key: string, currentValue: string) => {
        const newValue = prompt(`Editar valor para "${key}":`, currentValue);
        if (newValue !== null) {
            updateRowData(selectedRow, key, newValue);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700 text-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-700 bg-slate-800">
                <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase text-indigo-400">Detalles del Vehículo</span>
                    <span className="text-[10px] text-slate-400">Fila {selectedRow + 1}</span>
                </div>
                <div className="flex gap-1.5 items-center">
                    {row._status === 'success' && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                            Completado
                        </span>
                    )}
                    {row._status === 'error' && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 rounded">
                            Error
                        </span>
                    )}
                    {row._status === 'sending' && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded animate-pulse">
                            Enviando...
                        </span>
                    )}
                </div>
            </div>

            {/* Error detail */}
            {row._error && (
                <div className="p-3 bg-red-950/60 border-b border-red-900/50 text-xs text-red-300 font-mono break-all max-h-[120px] overflow-y-auto">
                    <div className="font-bold text-red-400 mb-0.5">Mensaje de error:</div>
                    {row._error}
                </div>
            )}
            
            {row._serverResponse && (
                <div className="p-3 bg-slate-800/80 border-b border-slate-700 text-xs font-mono break-all max-h-[150px] overflow-y-auto">
                    <div className="font-bold text-indigo-400 mb-0.5">Respuesta de Servidor:</div>
                    {row._serverResponse}
                </div>
            )}

            {/* Fields List */}
            <div className="flex-1 overflow-auto p-3 space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Celdas de la Fila ({rowKeys.length})
                </h4>

                <div className="divide-y divide-slate-800 border border-slate-800 rounded bg-slate-950/40">
                    {rowKeys.map((key) => {
                        const val = String(row[key] ?? '');
                        const mappedFields = reverseMap[key];
                        return (
                            <div key={key} className="p-2.5 hover:bg-slate-800/30 transition-colors flex flex-col gap-1.5">
                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-[11px] font-bold text-slate-300 truncate" title={key}>
                                        {key}
                                    </span>
                                    <button 
                                        className="text-[10px] text-slate-500 hover:text-indigo-400 px-1 py-0.5 rounded transition-colors"
                                        onClick={() => handleEditValue(key, val)}
                                        title="Editar valor de celda"
                                    >
                                        ✏️
                                    </button>
                                </div>
                                
                                <div className="text-xs font-mono text-slate-400 bg-slate-900/50 p-1.5 rounded border border-slate-800 break-words whitespace-pre-wrap">
                                    {val || <span className="text-slate-600 italic">&lt;vacío&gt;</span>}
                                </div>

                                {mappedFields && mappedFields.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {mappedFields.map((field) => (
                                            <button
                                                key={field.full}
                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded hover:bg-indigo-500/20 transition-all cursor-pointer"
                                                onClick={() => navigateToField(field.full)}
                                                title={`Mapeado a: ${field.full}. Haz clic para ir al mapeo.`}
                                            >
                                                <span>🔗 {field.short}</span>
                                                <span className="text-[7px] text-indigo-400/70">↗</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

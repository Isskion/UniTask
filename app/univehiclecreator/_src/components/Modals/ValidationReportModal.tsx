import { type ValidationReport } from '../../utils/validation';

interface Props {
    isOpen: boolean;
    report: ValidationReport | null;
    onClose: () => void;
}

export default function ValidationReportModal({ isOpen, report, onClose }: Props) {
    if (!isOpen || !report) return null;

    const allValid = report.invalidRows === 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
                {/* Header */}
                <div className={`px-6 py-4 border-b border-slate-800 ${allValid ? 'bg-emerald-950/65' : 'bg-amber-950/65'}`}>
                    <h2 className="text-base font-bold">
                        {allValid ? '✅ Validación Exitosa' : '⚠️ Errores de Validación'}
                    </h2>
                </div>

                <div className="p-6 space-y-5">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 text-center">
                            <div className="text-xl font-black text-slate-200">{report.totalRows}</div>
                            <div className="text-xs text-slate-500 font-medium">Total filas</div>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center">
                            <div className="text-xl font-black text-emerald-400">{report.validRows}</div>
                            <div className="text-xs text-emerald-500/70 font-medium">Válidas</div>
                        </div>
                        <div className={`p-3 rounded-xl border text-center ${report.invalidRows > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-850 border-slate-800'}`}>
                            <div className={`text-xl font-black ${report.invalidRows > 0 ? 'text-red-400' : 'text-slate-500'}`}>{report.invalidRows}</div>
                            <div className={`text-xs font-medium ${report.invalidRows > 0 ? 'text-red-400/80' : 'text-slate-550'}`}>Con errores</div>
                        </div>
                    </div>

                    {/* Error Details */}
                    {report.invalidRows > 0 ? (
                        <div className="space-y-3 max-h-64 overflow-auto scrollbar-thin pr-1">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Detalles de errores</h3>
                            {report.results
                                .filter((r) => !r.isValid)
                                .map((r) => (
                                    <div key={r.rowIndex} className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl">
                                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 rounded-md mb-2">
                                            Fila {r.rowIndex + 1}
                                        </span>
                                        <ul className="space-y-1">
                                            {r.issues.map((issue, i) => (
                                                <li key={i} className="flex items-start gap-2 text-xs text-red-300">
                                                    <span className="shrink-0 mt-0.5">❌</span>
                                                    <span>{issue.message}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-center text-xs font-medium">
                            🎉 ¡Todos los registros mapeados cumplen con las validaciones de campos requeridos!
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-3 bg-slate-850 border-t border-slate-800 flex justify-end">
                    <button
                        className="px-5 py-2 text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-350 rounded-xl hover:bg-slate-750 transition-colors cursor-pointer"
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

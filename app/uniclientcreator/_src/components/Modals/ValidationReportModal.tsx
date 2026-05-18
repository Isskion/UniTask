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
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-100 overflow-hidden">
                {/* Header */}
                <div className={`px-6 py-4 ${allValid ? 'bg-gradient-to-r from-emerald-700 to-emerald-600' : 'bg-gradient-to-r from-amber-600 to-orange-600'}`}>
                    <h2 className="text-lg font-bold text-white">
                        {allValid ? '✅ Validación Exitosa' : '⚠️ Reporte de Validación'}
                    </h2>
                </div>

                <div className="p-6 space-y-5">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                            <div className="text-2xl font-black text-slate-700">{report.totalRows}</div>
                            <div className="text-xs text-slate-500 font-medium">Total filas</div>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                            <div className="text-2xl font-black text-emerald-600">{report.validRows}</div>
                            <div className="text-xs text-emerald-500 font-medium">Válidas</div>
                        </div>
                        <div className={`p-3 rounded-xl border text-center ${report.invalidRows > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                            <div className={`text-2xl font-black ${report.invalidRows > 0 ? 'text-red-600' : 'text-slate-400'}`}>{report.invalidRows}</div>
                            <div className={`text-xs font-medium ${report.invalidRows > 0 ? 'text-red-500' : 'text-slate-400'}`}>Con errores</div>
                        </div>
                    </div>

                    {/* Error Details */}
                    {report.invalidRows > 0 && (
                        <div className="space-y-3 max-h-64 overflow-auto">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Detalles de errores</h3>
                            {report.results
                                .filter((r) => !r.isValid)
                                .map((r) => (
                                    <div key={r.rowIndex} className="p-3 bg-red-50/50 border border-red-100 rounded-xl">
                                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-md mb-2">
                                            Fila {r.rowIndex + 1}
                                        </span>
                                        <ul className="space-y-1">
                                            {r.issues.map((issue, i) => (
                                                <li key={i} className={`flex items-start gap-2 text-sm ${issue.severity === 'error' ? 'text-red-700' : 'text-amber-700'
                                                    }`}>
                                                    <span className="shrink-0 mt-0.5">{issue.severity === 'error' ? '❌' : '⚠️'}</span>
                                                    <span>{issue.message}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
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

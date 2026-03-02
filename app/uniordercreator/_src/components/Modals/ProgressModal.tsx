import { useState, useEffect, useRef } from 'react';

export interface ProgressLog {
    ref: string;
    status: 'success' | 'error' | 'warn' | 'info';
    msg: string;
}

interface ProgressModalProps {
    isOpen: boolean;
    total: number;
    current: number;
    successCount: number;
    errorCount: number;
    isComplete: boolean;
    logs: ProgressLog[];
    onCancel: () => void;
    onClose: () => void;
}

export default function ProgressModal({
    isOpen,
    total,
    current,
    successCount,
    errorCount,
    isComplete,
    logs,
    onCancel,
    onClose,
}: ProgressModalProps) {
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!isOpen || isComplete) return;
        const t = setInterval(() => setElapsed((e) => e + 1), 1000);
        return () => clearInterval(t);
    }, [isOpen, isComplete]);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    if (!isOpen) return null;

    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-100 overflow-hidden">
                {/* Header */}
                <div className={`px-6 py-4 ${isComplete ? 'bg-gradient-to-r from-emerald-700 to-emerald-600' : 'bg-gradient-to-r from-slate-800 to-indigo-900'}`}>
                    <h2 className="text-lg font-bold text-white">
                        {isComplete ? '✅ Envío Completado' : '⏳ Enviando Pedidos'}
                    </h2>
                </div>

                <div className="p-6 space-y-5">
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-3">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                            <div className="text-lg font-black text-slate-700">{total}</div>
                            <div className="text-[10px] text-slate-500 font-semibold uppercase">Total</div>
                        </div>
                        <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                            <div className="text-lg font-black text-emerald-600">✅ {successCount}</div>
                            <div className="text-[10px] text-emerald-500 font-semibold uppercase">OK</div>
                        </div>
                        <div className="p-2.5 bg-red-50 rounded-xl border border-red-100 text-center">
                            <div className="text-lg font-black text-red-600">❌ {errorCount}</div>
                            <div className="text-[10px] text-red-500 font-semibold uppercase">Error</div>
                        </div>
                        <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
                            <div className="text-lg font-black text-indigo-600">⏱️</div>
                            <div className="text-xs text-indigo-500 font-mono font-bold">{formatTime(elapsed)}</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                        <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ease-out ${isComplete
                                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                        : 'bg-gradient-to-r from-indigo-600 to-indigo-400'
                                    }`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <div className="text-center text-xs font-semibold text-slate-500 mt-1.5">
                            {current} / {total} ({pct}%)
                        </div>
                    </div>

                    {/* Logs */}
                    <div className="max-h-48 overflow-auto rounded-xl bg-slate-900 p-3 space-y-1 border border-slate-700">
                        {logs.map((log, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs font-mono">
                                <span className={`shrink-0 px-1.5 py-0.5 rounded font-bold ${log.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                                        log.status === 'error' ? 'bg-red-500/20 text-red-400' :
                                            log.status === 'warn' ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-slate-500/20 text-slate-400'
                                    }`}>
                                    {log.ref}
                                </span>
                                <span className={`${log.status === 'success' ? 'text-emerald-300' :
                                        log.status === 'error' ? 'text-red-300' :
                                            log.status === 'warn' ? 'text-amber-300' :
                                                'text-slate-400'
                                    }`}>
                                    {log.msg}
                                </span>
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                    {!isComplete ? (
                        <button
                            className="px-5 py-2 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-500 transition-colors shadow-lg shadow-red-500/25"
                            onClick={onCancel}
                        >
                            ⛔ Cancelar Envío
                        </button>
                    ) : (
                        <button
                            className="px-5 py-2 text-sm font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
                            onClick={onClose}
                        >
                            Cerrar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

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
            <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
                {/* Header */}
                <div className={`px-6 py-4 border-b border-slate-800 ${isComplete ? 'bg-emerald-950/65' : 'bg-slate-800'}`}>
                    <h2 className="text-base font-bold">
                        {isComplete ? '✅ Integración Finalizada' : '⏳ Creando Vehículos...'}
                    </h2>
                </div>

                <div className="p-6 space-y-5">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-3">
                        <div className="p-2.5 bg-slate-850 rounded-xl border border-slate-800 text-center">
                            <div className="text-lg font-black text-slate-200">{total}</div>
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Total</div>
                        </div>
                        <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center">
                            <div className="text-lg font-black text-emerald-400">✅ {successCount}</div>
                            <div className="text-[9px] text-emerald-500/70 font-bold uppercase tracking-wider">OK</div>
                        </div>
                        <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20 text-center">
                            <div className="text-lg font-black text-red-400">❌ {errorCount}</div>
                            <div className="text-[9px] text-red-500/70 font-bold uppercase tracking-wider">Error</div>
                        </div>
                        <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-center">
                            <div className="text-lg font-black text-indigo-400">⏱️</div>
                            <div className="text-xs text-indigo-300 font-mono font-bold">{formatTime(elapsed)}</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                        <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ease-out ${isComplete
                                        ? 'bg-emerald-500'
                                        : 'bg-indigo-500'
                                    }`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <div className="text-center text-xs font-semibold text-slate-450 mt-1.5 font-mono">
                            {current} / {total} ({pct}%)
                        </div>
                    </div>

                    {/* Logs console */}
                    <div className="max-h-48 overflow-auto rounded-xl bg-slate-950 p-3 space-y-1.5 border border-slate-800">
                        {logs.map((log, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] font-mono leading-relaxed">
                                <span className={`shrink-0 px-1 py-0.2 rounded font-bold text-[9px] ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                        log.status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                            log.status === 'warn' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                'bg-slate-800 text-slate-400'
                                    }`}>
                                    {log.ref}
                                </span>
                                <span className={`${log.status === 'success' ? 'text-emerald-300/90' :
                                        log.status === 'error' ? 'text-red-300/90' :
                                            log.status === 'warn' ? 'text-amber-300/90' :
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
                <div className="px-6 py-3 bg-slate-850 border-t border-slate-800 flex justify-end">
                    {!isComplete ? (
                        <button
                            className="px-5 py-2 text-xs font-bold bg-red-650 hover:bg-red-650 text-white rounded-xl shadow-lg transition-colors cursor-pointer"
                            onClick={onCancel}
                        >
                            ⛔ Cancelar Envío
                        </button>
                    ) : (
                        <button
                            className="px-5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl transition-colors cursor-pointer"
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

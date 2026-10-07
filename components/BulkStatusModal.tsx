"use client";
/**
 * Validación del cambio de estado masivo: qué tareas cambian (el cambio en rojo), cuáles se omiten
 * y por qué. Descartar / fuera de alcance piden motivo y escribir CONFIRMAR.
 */
import { useMemo, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";
import { DESTRUCTIVE, STATUS_LABEL, planBulkStatus, applyBulkStatus, type TaskStatus } from "@/lib/bulkTaskStatus";

interface Props {
    selected: Task[];
    allTasks: Task[];
    target: TaskStatus;
    projectName: (id?: string) => string;
    tenantId: string;
    user: { uid: string; email?: string | null; displayName?: string | null };
    onClose: () => void;
    onDone: (changed: number) => void;
}

const CONFIRM_WORD = "CONFIRMAR";

export function BulkStatusModal({ selected, allTasks, target, projectName, tenantId, user, onClose, onDone }: Props) {
    const plan = useMemo(() => planBulkStatus(selected, target, allTasks), [selected, target, allTasks]);
    const destructive = DESTRUCTIVE.has(target);
    const [reason, setReason] = useState("");
    const [typed, setTyped] = useState("");
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const fromCounts = useMemo(() => {
        const m = new Map<string, number>();
        for (const t of plan.apply) m.set(t.status, (m.get(t.status) ?? 0) + 1);
        return [...m.entries()];
    }, [plan]);
    const projectNames = useMemo(() => [...new Set(plan.apply.map((t) => projectName(t.projectId)))], [plan, projectName]);

    const canApply = plan.apply.length > 0 && !busy && (!destructive || (reason.trim().length >= 5 && typed.trim().toUpperCase() === CONFIRM_WORD));

    const handleApply = async () => {
        setBusy(true);
        setError(null);
        try {
            const n = await applyBulkStatus({ tasks: plan.apply, target, tenantId, user, reason: destructive ? reason : undefined, onProgress: (d) => setProgress(d) });
            onDone(n);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4" onClick={busy ? undefined : onClose}>
            <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl shadow-2xl bg-card border border-border" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-border flex items-start justify-between gap-2">
                    <div>
                        <h3 className="font-semibold text-lg">Revisa el cambio antes de aplicarlo</h3>
                        <p className="text-xs text-muted-foreground">Cambio de estado masivo · {plan.apply.length} tarea(s){projectNames.length ? ` · ${projectNames.join(", ")}` : ""}</p>
                    </div>
                    {!busy && <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary text-muted-foreground" aria-label="Cerrar"><X className="w-5 h-5" /></button>}
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-4 text-sm">
                    <div className="rounded-lg border-2 border-red-500/60 bg-red-500/5 p-3 space-y-1">
                        {fromCounts.map(([from, n]) => (
                            <div key={from} className="font-semibold">
                                {n} tarea(s): {STATUS_LABEL[from as TaskStatus] ?? from} → <span className="text-red-600 uppercase font-extrabold">{STATUS_LABEL[target]}</span>
                            </div>
                        ))}
                        {plan.apply.length === 0 && <div className="font-semibold">Ninguna tarea seleccionada puede cambiar a <span className="text-red-600 uppercase">{STATUS_LABEL[target]}</span>.</div>}
                        {destructive && (
                            <p className="text-xs text-red-600 flex gap-1.5 pt-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />Estas tareas dejan de contar como trabajo del proyecto. Comprueba la lista antes de confirmar.</p>
                        )}
                    </div>

                    {plan.apply.length > 0 && (
                        <div>
                            <div className="text-xs font-semibold mb-1">Se cambian ({plan.apply.length})</div>
                            <ul className="max-h-56 overflow-auto rounded-md border border-border divide-y divide-border text-xs">
                                {plan.apply.map((t) => (
                                    <li key={t.id} className="px-2 py-1.5 flex gap-2">
                                        <span className="font-mono text-muted-foreground shrink-0">{t.friendlyId}</span>
                                        <span className="min-w-0 flex-1 truncate" title={t.title}>{t.title}</span>
                                        <span className="shrink-0 text-muted-foreground">{STATUS_LABEL[t.status] ?? t.status} → <b className="text-red-600">{STATUS_LABEL[target]}</b></span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {plan.skipped.length > 0 && (
                        <div>
                            <div className="text-xs font-semibold mb-1 text-amber-600">Se omiten ({plan.skipped.length})</div>
                            <ul className="max-h-40 overflow-auto rounded-md border border-amber-500/30 divide-y divide-border text-xs">
                                {plan.skipped.map(({ task, reason: why }) => (
                                    <li key={task.id} className="px-2 py-1.5 flex gap-2">
                                        <span className="font-mono text-muted-foreground shrink-0">{task.friendlyId}</span>
                                        <span className="min-w-0 flex-1 truncate" title={task.title}>{task.title}</span>
                                        <span className="shrink-0 text-amber-600">{why}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {destructive && plan.apply.length > 0 && (
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold">Motivo (queda en el historial de cada tarea)
                                <input value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy}
                                    className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" placeholder="p. ej. Interfaz sustituida por la versión Maersk v2" />
                            </label>
                            <label className="block text-xs font-semibold">Escribe <span className="font-mono text-red-600">{CONFIRM_WORD}</span> para aplicar
                                <input value={typed} onChange={(e) => setTyped(e.target.value)} disabled={busy}
                                    className="mt-1 w-full rounded-md border border-red-500/50 bg-background px-2 py-1.5 text-sm font-mono" />
                            </label>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 text-xs flex gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" /><span>{error}</span>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-border flex flex-wrap items-center justify-end gap-2">
                    {busy && <span className="text-xs text-muted-foreground mr-auto">Aplicando… {progress} / {plan.apply.length}</span>}
                    <button onClick={onClose} disabled={busy} className="px-4 py-2 rounded-lg text-sm hover:bg-secondary disabled:opacity-50">Cancelar</button>
                    <button onClick={handleApply} disabled={!canApply}
                        className={cn("px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 inline-flex items-center gap-2", "bg-red-600 hover:bg-red-500")}>
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                        Cambiar {plan.apply.length} a {STATUS_LABEL[target]}
                    </button>
                </div>
            </div>
        </div>
    );
}

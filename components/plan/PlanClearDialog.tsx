"use client";
/**
 * [Plan] Diálogo "Vaciar plan" (lib/plan/planClear.ts): borra el árbol del plan del proyecto para
 * poder importar otro desde cero. Las tareas con actividad real se listan y el PM decide si se borran
 * o se quedan como tareas sueltas del proyecto. Confirmación escribiendo VACIAR.
 */
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";
import { planName } from "@/lib/plan/planTitle";
import { ACTIVITY_LABEL, analyzeClear, clearPlan, loadCommentedTaskIds, type ClearAnalysis, type ClearPlanResult } from "@/lib/plan/planClear";

const CONFIRM_WORD = "VACIAR";

interface Props {
    projectId: string;
    projectName: string;
    tenantId: string;
    userId: string;
    planTasks: Task[];  // incluidas las archivadas
    isLight: boolean;
    onClose: () => void;
}

export function PlanClearDialog({ projectId, projectName, tenantId, userId, planTasks, isLight, onClose }: Props) {
    const [analysis, setAnalysis] = useState<ClearAnalysis | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [alsoDelete, setAlsoDelete] = useState<Set<string>>(new Set());
    const [confirmText, setConfirmText] = useState("");
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ClearPlanResult | null>(null);

    // El análisis se hace una vez al abrir (no se recalcula con cada cambio en vivo del árbol)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const commented = await loadCommentedTaskIds(planTasks.map((t) => t.id), tenantId);
                if (!cancelled) setAnalysis(analyzeClear(planTasks, commented));
            } catch (err) {
                console.error("[PlanClear] Error revisando comentarios de las tareas del plan", projectId, err);
                if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const counts = useMemo(() => {
        if (!analysis) return null;
        const extra = analysis.withActivity.filter((a) => alsoDelete.has(a.task.id)).length;
        return { del: analysis.toDelete.length + extra, keep: analysis.withActivity.length - extra };
    }, [analysis, alsoDelete]);

    const toggle = (id: string) => setAlsoDelete((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const allChecked = !!analysis && analysis.withActivity.length > 0 && analysis.withActivity.every((a) => alsoDelete.has(a.task.id));

    const handleClear = async () => {
        if (!analysis) return;
        setBusy(true);
        setError(null);
        try {
            const r = await clearPlan({ projectId, tenantId, userId, analysis, alsoDelete, onProgress: (done, total) => setProgress({ done, total }) });
            setResult(r);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    };

    const panel = isLight ? "bg-white border border-zinc-200" : "bg-zinc-900 border border-white/10";
    const box = isLight ? "border-zinc-200" : "border-white/10";

    return (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={busy ? undefined : onClose}>
            <div className={cn("w-full max-w-xl max-h-[90vh] flex flex-col rounded-xl shadow-2xl", panel)} onClick={(e) => e.stopPropagation()}>
                <div className={cn("flex items-start justify-between gap-2 p-4 border-b", box)}>
                    <h3 className="font-semibold flex items-center gap-2"><Trash2 className="w-4 h-4 text-rose-500" /> Vaciar plan · {projectName}</h3>
                    <button onClick={onClose} disabled={busy} className="text-zinc-400" aria-label="Cerrar"><X className="w-4 h-4" /></button>
                </div>

                <div className="p-4 space-y-3 overflow-y-auto text-sm">
                    {result ? (
                        <>
                            <p>Plan vaciado: <b>{result.deleted}</b> tareas borradas{result.kept ? <>, <b>{result.kept}</b> conservadas como tareas sueltas del proyecto</> : null}.</p>
                            <p className="text-zinc-500">Ya puedes importar el plan correcto con <b>Importar plan (Excel)</b>.</p>
                        </>
                    ) : loadError ? (
                        <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 flex gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>No se pudo comprobar qué tareas tienen comentarios ({loadError}), así que no se vacía nada para no perder trabajo. Recarga la página y vuelve a intentarlo.</span>
                        </div>
                    ) : !analysis || !counts ? (
                        <div className="flex items-center gap-2 text-zinc-500"><Loader2 className="w-4 h-4 animate-spin" /> Revisando qué tareas tienen actividad…</div>
                    ) : (
                        <>
                            <p>
                                Se borrarán <b>{counts.del}</b> de las {planTasks.length} tareas del plan (agrupadores, hitos, padres y tareas sin actividad).
                                El borrado <b>no se puede deshacer</b> desde la aplicación.
                            </p>
                            {analysis.withActivity.length > 0 && (
                                <div className={cn("rounded-lg border", box)}>
                                    <div className={cn("flex items-center justify-between gap-2 px-3 py-2 border-b", box)}>
                                        <span className="font-semibold">{analysis.withActivity.length} tarea(s) con actividad</span>
                                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                            <input type="checkbox" checked={allChecked} disabled={busy}
                                                onChange={() => setAlsoDelete(allChecked ? new Set() : new Set(analysis.withActivity.map((a) => a.task.id)))} />
                                            Borrar todas
                                        </label>
                                    </div>
                                    <p className="px-3 pt-2 text-xs text-zinc-500">Marcadas → se borran. Sin marcar → se quedan en el proyecto como tareas sueltas, fuera del plan, con su historial.</p>
                                    <ul className="p-2 space-y-1 max-h-60 overflow-y-auto">
                                        {analysis.withActivity.map(({ task, reasons }) => (
                                            <li key={task.id}>
                                                <label className="flex items-start gap-2 px-1 py-0.5 rounded cursor-pointer hover:bg-zinc-500/10">
                                                    <input type="checkbox" className="mt-0.5" checked={alsoDelete.has(task.id)} disabled={busy} onChange={() => toggle(task.id)} />
                                                    <span className="min-w-0">
                                                        <span className="block truncate">{task.planCode ? <span className="text-zinc-500">{task.planCode} </span> : null}{planName(task)}</span>
                                                        <span className="block text-[11px] text-amber-600">{reasons.map((r) => ACTIVITY_LABEL[r]).join(" · ")}</span>
                                                    </span>
                                                </label>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <label className="block space-y-1">
                                <span className="text-xs text-zinc-500">Escribe <b>{CONFIRM_WORD}</b> para confirmar</span>
                                <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} disabled={busy} autoFocus
                                    className={cn("w-full rounded-md border px-2 py-1.5 outline-none", isLight ? "bg-white border-zinc-300" : "bg-zinc-800 border-white/10")} />
                            </label>
                            {progress && busy && <p className="text-xs text-zinc-500">Procesando {progress.done} / {progress.total}…</p>}
                            {error && (
                                <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 flex gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className={cn("flex justify-end gap-2 p-4 border-t", box)}>
                    {result || loadError ? (
                        <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500">Cerrar</button>
                    ) : (
                        <>
                            <button onClick={onClose} disabled={busy} className="px-3 py-1.5 rounded-lg text-sm hover:bg-zinc-500/10">Cancelar</button>
                            <button onClick={handleClear} disabled={busy || !analysis || confirmText.trim().toUpperCase() !== CONFIRM_WORD}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-500 disabled:opacity-50">
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Vaciar plan{counts ? ` (${counts.del} tareas)` : ""}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

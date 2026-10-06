"use client";
/**
 * [Plan] Alta de tarea desde el árbol del plan (docs/plan-import-design.md §6):
 * "+ Tarea aquí" (hija de hito/padre), "+ Subtarea" (convierte la hoja en padre) o "Tarea suelta".
 * Los campos llegan rellenos con la herencia del padre y son editables antes de guardar.
 */
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { X, Loader2, AlertTriangle, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useSafeFirestore } from "@/hooks/useSafeFirestore";
import type { Project, Task } from "@/types";
import { buildDraft, createPlanTask, isWorkable, type AddMode, type PlanTaskDraft } from "@/lib/plan/planTasks";

interface Props {
    mode: AddMode;
    parent: Task | null;
    planTasks: Task[];
    project: Project;
    tenantId: string;
    isLight: boolean;
    onClose: () => void;
    onCreated: (taskId: string) => void;
}

const TITLES: Record<AddMode, string> = {
    child: "Nueva tarea",
    subtask: "Nueva subtarea",
    loose: "Nueva tarea suelta del proyecto",
};

/** ISO (medianoche local) ⇄ valor de <input type="date"> en hora local. */
const isoToInput = (iso: string | null) => (iso ? format(new Date(iso), "yyyy-MM-dd") : "");
const inputToIso = (v: string) => {
    if (!v) return null;
    const [y, m, d] = v.split("-").map(Number);
    return new Date(y, m - 1, d).toISOString();
};

export function PlanTaskModal({ mode, parent, planTasks, project, tenantId, isLight, onClose, onCreated }: Props) {
    const { user } = useAuth();
    const { addDoc } = useSafeFirestore();
    const [draft, setDraft] = useState<PlanTaskDraft>(() => buildDraft(mode, parent, planTasks));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [depSearch, setDepSearch] = useState("");

    const set = <K extends keyof PlanTaskDraft>(k: K, v: PlanTaskDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

    const byId = useMemo(() => new Map(planTasks.map((t) => [t.id, t])), [planTasks]);
    const depCandidates = useMemo(() => {
        const q = depSearch.trim().toLowerCase();
        if (!q) return [];
        return planTasks
            .filter((t) => isWorkable(t) && t.id !== parent?.id && !draft.dependencies.includes(t.id))
            .filter((t) => t.title.toLowerCase().includes(q) || (t.planCode || "").toLowerCase().includes(q) || (t.friendlyId || "").toLowerCase().includes(q))
            .slice(0, 8);
    }, [planTasks, depSearch, draft.dependencies, parent?.id]);

    const parentActual = typeof parent?.actualEffort === "number" ? parent.actualEffort : 0;

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        setError(null);
        try {
            const id = await createPlanTask({ mode, parent, draft, project, tenantId, userId: user.uid, planTasks, addDoc: addDoc as any });
            onCreated(id);
        } catch (err) {
            console.error("[PlanTaskModal] Error creando tarea", { mode, parent: parent?.id, project: project.id }, err);
            setError(err instanceof Error ? err.message : String(err));
            setSaving(false);
        }
    };

    const input = cn("w-full text-sm rounded-md border px-2 py-1.5 outline-none", isLight ? "bg-white border-zinc-300" : "bg-zinc-800 border-white/10");
    const label = "text-[11px] font-semibold uppercase tracking-wide text-zinc-500";

    return (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={saving ? undefined : onClose}>
            <div className={cn("w-full max-w-xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]", isLight ? "bg-white border border-zinc-200" : "bg-zinc-900 border border-white/10")} onClick={(e) => e.stopPropagation()}>
                <div className={cn("p-4 border-b flex items-start justify-between", isLight ? "border-zinc-200" : "border-white/10")}>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-lg">{TITLES[mode]}</h3>
                        <p className="text-xs text-zinc-500 truncate">
                            {mode === "loose" ? `${project.name} · fuera del plan` : `Dentro de: ${parent?.planCode ? parent.planCode + " " : ""}${parent?.title}`}
                        </p>
                    </div>
                    <button onClick={onClose} disabled={saving} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400" aria-label="Cerrar"><X className="w-5 h-5" /></button>
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-3">
                    {mode === "subtask" && parent && (
                        <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs flex gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                            <span>
                                <b>{parent.title}</b> pasará a ser tarea padre: su estado se calculará de sus subtareas y ya no se cerrará a mano.
                                {parentActual > 0 && <> Su esfuerzo real ya registrado ({parentActual} d) se conserva en la tarea pero <b>dejará de sumar</b> en el avance; regístralo en una subtarea si quieres que cuente.</>}
                            </span>
                        </div>
                    )}
                    {error && (
                        <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 text-sm flex gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className={label}>Título *</label>
                        <input autoFocus className={input} value={draft.title} onChange={(e) => set("title", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <label className={label}>Descripción</label>
                        <textarea className={cn(input, "min-h-[80px]")} value={draft.description} onChange={(e) => set("description", e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className={label}>Inicio</label>
                            <input type="date" className={input} value={isoToInput(draft.startDate)} onChange={(e) => set("startDate", inputToIso(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                            <label className={label}>Fin (deadline)</label>
                            <input type="date" className={input} value={isoToInput(draft.endDate)} onChange={(e) => set("endDate", inputToIso(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                            <label className={label}>Esfuerzo estimado (días)</label>
                            <input type="number" min={0} step={0.5} className={input} value={draft.estimatedEffort ?? ""}
                                onChange={(e) => set("estimatedEffort", e.target.value === "" ? null : parseFloat(e.target.value))} />
                            {draft.effortHint && <p className="text-[10px] text-zinc-500">Sugerido: {draft.effortHint}</p>}
                        </div>
                        <div className="space-y-1">
                            <label className={label}>Prioridad</label>
                            <select className={input} value={draft.priority} onChange={(e) => set("priority", e.target.value as PlanTaskDraft["priority"])}>
                                <option value="high">Alta</option>
                                <option value="medium">Media</option>
                                <option value="low">Baja</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className={label}>Responsable</label>
                        <input className={input} value={draft.responsible} placeholder={`p. ej. Unigis, ${project.clientName || "cliente"}…`} onChange={(e) => set("responsible", e.target.value)} />
                    </div>

                    <div className="space-y-1">
                        <label className={label}>Predecesoras (opcional)</label>
                        {draft.dependencies.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {draft.dependencies.map((id) => (
                                    <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-indigo-500/15 text-indigo-500">
                                        {byId.get(id)?.planCode ? byId.get(id)!.planCode + " " : ""}{byId.get(id)?.title ?? id}
                                        <button onClick={() => set("dependencies", draft.dependencies.filter((d) => d !== id))} aria-label="Quitar"><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className={cn("flex items-center gap-2 rounded-md border px-2", isLight ? "border-zinc-300" : "border-white/10")}>
                            <Search className="w-3.5 h-3.5 text-zinc-400" />
                            <input className="bg-transparent outline-none text-sm py-1.5 flex-1" placeholder="Buscar tarea del plan…" value={depSearch} onChange={(e) => setDepSearch(e.target.value)} />
                        </div>
                        {depCandidates.length > 0 && (
                            <div className={cn("rounded-md border divide-y text-xs", isLight ? "border-zinc-200 divide-zinc-100" : "border-white/10 divide-white/5")}>
                                {depCandidates.map((t) => (
                                    <button key={t.id} className="w-full text-left px-2 py-1.5 hover:bg-indigo-500/10 truncate"
                                        onClick={() => { set("dependencies", [...draft.dependencies, t.id]); setDepSearch(""); }}>
                                        <span className="font-mono text-zinc-500 mr-1">{t.planCode || t.friendlyId}</span>{t.title}
                                    </button>
                                ))}
                            </div>
                        )}
                        <p className="text-[10px] text-zinc-500">Una tarea con predecesoras abiertas no se puede cerrar.</p>
                    </div>
                </div>

                <div className={cn("p-4 border-t flex justify-end gap-2", isLight ? "border-zinc-200" : "border-white/10")}>
                    <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-lg text-sm hover:bg-zinc-500/10">Cancelar</button>
                    <button onClick={handleSave} disabled={saving || !draft.title.trim()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Crear tarea
                    </button>
                </div>
            </div>
        </div>
    );
}

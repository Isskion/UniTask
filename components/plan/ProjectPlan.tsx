"use client";
/**
 * [Plan] Pestaña "Plan" del proyecto: árbol de tareas del plan en vivo (estados calculados por la
 * Cloud Function planRollup), alta de tareas desde el árbol (§6), "Descartar bloque" (§5) y acceso
 * al asistente de importación, exportación a Excel (§7) y "Vaciar plan" (§3). Importar, descartar y
 * vaciar: PM y superiores (D8).
 */
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Upload, Download, Loader2, Search, AlertTriangle, Plus, ExternalLink, Ban, X, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/context/ToastContext";
import { getRoleLevel, RoleLevel, type Project, type Task } from "@/types";
import { aggregateChildren } from "@/functions/src/planRollupCore";
import { discardBlock, isWorkable, toIso, type AddMode } from "@/lib/plan/planTasks";
import { planName } from "@/lib/plan/planTitle";
import { planSpanDays, daysToHours } from "@/lib/plan/planSchedule";
import { buildPlanExport, planExportFileName } from "@/lib/plan/planExport";
import { downloadBlob, writePlanWorkbook } from "./writePlanFile";
import { PlanTree, type PlanTreeRow } from "./PlanTree";
import { PlanImportWizard } from "./PlanImportWizard";
import { PlanReimportWizard } from "./PlanReimportWizard";
import { PlanTaskModal } from "./PlanTaskModal";
import { PlanClearDialog } from "./PlanClearDialog";

const CLOSED = new Set(["completed", "discarded", "out_of_scope"]);
const LOOSE_KEY = "__loose__";

export function ProjectPlan({ project }: { project: Project }) {
    const { user, userRole, identity, tenantId: authTenantId } = useAuth();
    const { theme } = useTheme();
    const { showToast } = useToast();
    const isLight = theme === "light";
    const tenantId = project.tenantId || authTenantId || "1";
    const roleLevel = Number(identity?.realRole ?? getRoleLevel(userRole));
    const isPM = roleLevel >= RoleLevel.PM;

    const [allTasks, setAllTasks] = useState<Task[] | null>(null); // incluye archivadas (solo para exportar)
    const [exporting, setExporting] = useState(false);
    const [exportArchived, setExportArchived] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showWizard, setShowWizard] = useState(false);
    const [showReimport, setShowReimport] = useState(false);
    const [showClear, setShowClear] = useState(false);
    const [search, setSearch] = useState("");
    const [onlyOverdue, setOnlyOverdue] = useState(false);
    const [adding, setAdding] = useState<{ mode: AddMode; parent: Task | null } | null>(null);
    const [discarding, setDiscarding] = useState<{ node: Task; count: number } | null>(null);
    const [discardReason, setDiscardReason] = useState("");
    const [discardBusy, setDiscardBusy] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "tasks"), where("projectId", "==", project.id), where("tenantId", "==", tenantId));
        return onSnapshot(q,
            (snap) => { setAllTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task)).filter((t) => !!t.planRole)); setLoadError(null); },
            (err) => { console.error("[ProjectPlan] Error cargando tareas del plan", project.id, err); setLoadError(err.message); setAllTasks([]); },
        );
    }, [project.id, tenantId]);

    const tasks = useMemo(() => (allTasks ? allTasks.filter((t) => t.planStatus !== "archived") : null), [allTasks]);
    const archivedCount = (allTasks?.length ?? 0) - (tasks?.length ?? 0);

    const handleExport = async () => {
        if (!allTasks) return;
        setExporting(true);
        try {
            const result = buildPlanExport(allTasks, { includeArchived: exportArchived });
            const blob = await writePlanWorkbook(result, { projectName: project.name, exportedBy: user?.displayName || user?.email || "" });
            downloadBlob(blob, planExportFileName(project.name));
            const extra = [
                result.counts.unitask ? `${result.counts.unitask} creadas en UniTask (en amarillo)` : "",
                result.counts.skippedDependencies ? `${result.counts.skippedDependencies} predecesora(s) fuera del plan omitidas` : "",
            ].filter(Boolean).join("; ");
            showToast("Plan", `Exportadas ${result.counts.total} filas${extra ? ` — ${extra}` : ""}.`, "success");
        } catch (err) {
            console.error("[ProjectPlan] Error exportando el plan", project.id, err);
            showToast("Plan", `No se pudo exportar el plan: ${err instanceof Error ? err.message : String(err)}`, "error");
        } finally {
            setExporting(false);
        }
    };

    const byId = useMemo(() => new Map((tasks || []).map((t) => [t.id, t])), [tasks]);

    /** Tareas trabajables abiertas bajo un nodo (lo que "Descartar bloque" cerraría). */
    const openWorkUnder = (nodeId: string) => (tasks || []).filter((t) => (t.ancestorIds || []).includes(nodeId) && isWorkable(t) && !CLOSED.has(t.status)).length;

    // Filas en preorden a partir de parentId + order. Las tareas sueltas creadas en UniTask van en "Fuera de plan".
    const rows: PlanTreeRow[] = useMemo(() => {
        if (!tasks) return [];
        const byParent = new Map<string, Task[]>();
        const ids = new Set(tasks.map((t) => t.id));
        for (const t of tasks) {
            const p = t.parentId && ids.has(t.parentId) ? t.parentId : (t.planOrigin === "unitask" ? LOOSE_KEY : "__root__");
            byParent.set(p, [...(byParent.get(p) || []), t]);
        }
        for (const list of byParent.values()) list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const out: PlanTreeRow[] = [];
        const walk = (parent: string, level: number, parentKey: string | null) => {
            for (const t of byParent.get(parent) || []) {
                const kids = byParent.get(t.id) || [];
                out.push({
                    key: t.id,
                    parentKey,
                    level,
                    code: t.planCode || null,
                    title: planName(t),
                    role: t.planRole!,
                    status: t.status,
                    progress: kids.length ? (t.computed?.progress ?? 0) : null,
                    end: toIso(kids.length ? t.computed?.endDate ?? t.endDate : t.endDate),
                    durationDays: planSpanDays(kids.length ? t.computed?.startDate ?? t.startDate : t.startDate, kids.length ? t.computed?.endDate ?? t.endDate : t.endDate),
                    effortHours: daysToHours(kids.length ? t.computed?.estimatedEffort : t.estimatedEffort),
                    responsible: t.raci?.responsible?.[0] ?? null,
                    childCount: kids.length,
                });
                walk(t.id, level + 1, t.id);
            }
        };
        walk("__root__", 0, null);
        const loose = byParent.get(LOOSE_KEY) || [];
        if (loose.length) {
            out.push({ key: LOOSE_KEY, parentKey: null, level: 0, code: null, title: "Fuera de plan", role: "group", childCount: loose.length });
            walk(LOOSE_KEY, 1, LOOSE_KEY);
        }
        return out;
    }, [tasks]);

    const summary = useMemo(() => {
        if (!tasks || tasks.length === 0) return null;
        const roots = tasks.filter((t) => !t.parentId);
        const agg = aggregateChildren(roots);
        const work = tasks.filter(isWorkable);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const overdue = work.filter((t) => !CLOSED.has(t.status) && toIso(t.endDate) && Date.parse(toIso(t.endDate)!) < today.getTime()).length;
        // Plazo del plan: del comienzo más temprano al fin más tardío (no suma de duraciones)
        const span = planSpanDays(agg?.startDate ?? null, agg?.endDate ?? null);
        const hours = daysToHours(work.filter((t) => !CLOSED.has(t.status) || t.status === "completed")
            .reduce((s, t) => s + (typeof t.estimatedEffort === "number" ? t.estimatedEffort : 0), 0));
        return { progress: agg?.progress ?? 0, work: work.length, closed: work.filter((t) => CLOSED.has(t.status)).length, overdue, span, hours };
    }, [tasks]);

    const filter = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q && !onlyOverdue) return undefined;
        const todayMs = new Date().setHours(0, 0, 0, 0);
        return (r: PlanTreeRow) =>
            (!q || r.title.toLowerCase().includes(q) || (r.code || "").toLowerCase().includes(q)) &&
            (!onlyOverdue || (r.childCount === 0 && !CLOSED.has(r.status || "") && !!r.end && Date.parse(r.end) < todayMs));
    }, [search, onlyOverdue]);

    const iconBtn = cn("p-1 rounded", isLight ? "hover:bg-zinc-200 text-zinc-500" : "hover:bg-white/10 text-zinc-400");

    const renderActions = (r: PlanTreeRow) => {
        const t = byId.get(r.key);
        if (!t) return null;
        const canAddChild = t.planRole === "milestone" || t.planRole === "parent";
        const canSubtask = t.planRole === "leaf";
        const openCount = canAddChild && isPM && r.childCount > 0 ? openWorkUnder(t.id) : 0;
        return (
            <>
                {canAddChild && (
                    <button className={iconBtn} title="Añadir tarea aquí" onClick={() => setAdding({ mode: "child", parent: t })}><Plus className="w-3.5 h-3.5" /></button>
                )}
                {canSubtask && (
                    <button className={cn(iconBtn, "text-[10px] font-semibold flex items-center gap-0.5")} title="Añadir subtarea (esta tarea pasará a ser padre)" onClick={() => setAdding({ mode: "subtask", parent: t })}>
                        <Plus className="w-3 h-3" />Sub
                    </button>
                )}
                {openCount > 0 && (
                    <button className={iconBtn} title={`Descartar bloque (${openCount} tareas abiertas)`} onClick={() => { setDiscardReason(""); setDiscarding({ node: t, count: openCount }); }}>
                        <Ban className="w-3.5 h-3.5" />
                    </button>
                )}
                <a className={iconBtn} title="Abrir en el gestor de tareas" href={`/tasks?id=${t.id}`} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
            </>
        );
    };

    const handleDiscard = async () => {
        if (!discarding || !user) return;
        setDiscardBusy(true);
        try {
            const n = await discardBlock({ node: discarding.node, planTasks: tasks || [], reason: discardReason, tenantId, user });
            showToast("Plan", `${n} tarea(s) marcadas fuera de alcance; "${discarding.node.title}" se cerrará solo.`, "success");
            setDiscarding(null);
        } catch (err) {
            console.error("[ProjectPlan] Error descartando bloque", discarding.node.id, err);
            showToast("Plan", `No se pudo descartar el bloque: ${err instanceof Error ? err.message : String(err)}`, "error");
        } finally {
            setDiscardBusy(false);
        }
    };

    if (tasks === null) {
        return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;
    }

    return (
        <div className="p-4 space-y-4">
            {loadError && (
                <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 text-sm flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>No se pudo cargar el plan ({loadError}). Si acabas de cambiar de rol, recarga la página.</span>
                </div>
            )}

            {tasks.length === 0 ? (
                <div className={cn("rounded-xl border-2 border-dashed p-10 text-center space-y-3", isLight ? "border-zinc-300" : "border-white/15")}>
                    <p className="font-semibold">Este proyecto no tiene plan importado.</p>
                    <p className="text-sm text-zinc-500">Importa el Excel de MS Project: se crearán hitos, tareas padre y tareas del proyecto. Los hitos se cierran solos al cerrar sus tareas.</p>
                    {isPM && archivedCount > 0 ? (
                        <div className="space-y-2">
                            <p className="text-sm text-amber-600">Quedan {archivedCount} tarea(s) archivadas del plan anterior: vacíalo antes de importar uno nuevo.</p>
                            <button onClick={() => setShowClear(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-500">
                                <Trash2 className="w-4 h-4" /> Vaciar plan
                            </button>
                        </div>
                    ) : isPM ? (
                        <button onClick={() => setShowWizard(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500">
                            <Upload className="w-4 h-4" /> Importar plan (Excel)
                        </button>
                    ) : (
                        <p className="text-xs text-zinc-500">Solo un PM o superior puede importar el plan.</p>
                    )}
                </div>
            ) : (
                <>
                    {summary && (
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2 min-w-[200px]">
                                <span className="text-sm font-semibold">Avance</span>
                                <span className={cn("h-2 flex-1 rounded-full overflow-hidden w-32", isLight ? "bg-zinc-200" : "bg-white/10")}>
                                    <span className="block h-full bg-emerald-500" style={{ width: `${summary.progress}%` }} />
                                </span>
                                <span className="text-sm tabular-nums">{summary.progress}%</span>
                            </div>
                            <span className="text-xs text-zinc-500">{summary.closed} / {summary.work} tareas cerradas</span>
                            {summary.span != null && (
                                <span className="text-xs text-zinc-500" title="Plazo: días laborables (sin fines de semana ni festivos de Madrid) del comienzo más temprano al fin más tardío. Esfuerzo: horas de trabajo (8 h = 1 día), con las tareas en paralelo compartiendo esfuerzo.">
                                    Plazo <b>{summary.span} d</b>{summary.hours ? <> · Esfuerzo <b>{summary.hours.toLocaleString("es-ES")} h</b></> : null}
                                </span>
                            )}
                            {summary.overdue > 0 && <span className="text-xs text-rose-500 font-semibold">{summary.overdue} vencidas</span>}
                            <div className="flex-1" />
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                <input type="checkbox" checked={onlyOverdue} onChange={(e) => setOnlyOverdue(e.target.checked)} /> Solo vencidas
                            </label>
                            <div className={cn("flex items-center gap-2 px-2 py-1 rounded-md border", isLight ? "border-zinc-200" : "border-white/10")}>
                                <Search className="w-3.5 h-3.5 text-zinc-400" />
                                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar en el plan…" className="bg-transparent outline-none text-xs w-40" />
                            </div>
                            <button onClick={() => setAdding({ mode: "loose", parent: null })}
                                className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border", isLight ? "border-zinc-300 hover:bg-zinc-100" : "border-white/15 hover:bg-white/5")}>
                                <Plus className="w-3.5 h-3.5" /> Tarea suelta
                            </button>
                            {archivedCount > 0 && (
                                <label className="flex items-center gap-1.5 text-xs cursor-pointer" title="Incluir en la exportación las tareas archivadas (en gris)">
                                    <input type="checkbox" checked={exportArchived} onChange={(e) => setExportArchived(e.target.checked)} /> Exportar archivadas ({archivedCount})
                                </label>
                            )}
                            <button onClick={handleExport} disabled={exporting}
                                className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border disabled:opacity-50", isLight ? "border-zinc-300 hover:bg-zinc-100" : "border-white/15 hover:bg-white/5")}
                                title="Excel con el formato de MS Project: % por estado, tareas creadas en UniTask resaltadas. Se puede reimportar.">
                                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Exportar Excel
                            </button>
                            {isPM && (
                                <button onClick={() => setShowReimport(true)}
                                    className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border", isLight ? "border-zinc-300 hover:bg-zinc-100" : "border-white/15 hover:bg-white/5")}
                                    title="Subir la versión nueva del Excel y revisar los cambios antes de aplicarlos">
                                    <Upload className="w-3.5 h-3.5" /> Reimportar Excel
                                </button>
                            )}
                            {isPM && (
                                <button onClick={() => setShowClear(true)}
                                    className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border text-rose-600", isLight ? "border-rose-300 hover:bg-rose-50" : "border-rose-500/30 hover:bg-rose-500/10")}
                                    title="Borrar todo el plan del proyecto para importar otro desde cero (p. ej. si se importó un Excel equivocado)">
                                    <Trash2 className="w-3.5 h-3.5" /> Vaciar plan
                                </button>
                            )}
                        </div>
                    )}
                    <p className="text-[11px] text-zinc-500">
                        Avance por estado de cada tarea (Aprobación Final 100 %, Revisión 75 %, En curso 50 %, Pendiente 0 %), ponderado por esfuerzo. Hitos, padres y agrupadores no se cierran a mano: pasa el ratón por una fila para añadir tareas o abrirla.
                    </p>
                    <PlanTree rows={rows} isLight={isLight} showStatus initialExpandLevel={5} filter={filter} renderActions={renderActions} />
                </>
            )}

            {showWizard && user && (
                <PlanImportWizard project={project} tenantId={tenantId} userId={user.uid} isLight={isLight}
                    onClose={() => setShowWizard(false)} onImported={() => { /* el onSnapshot refresca el árbol */ }} />
            )}

            {showReimport && user && (
                <PlanReimportWizard project={project} tenantId={tenantId} userId={user.uid} isLight={isLight}
                    onClose={() => setShowReimport(false)} />
            )}

            {showClear && user && allTasks && (
                <PlanClearDialog projectId={project.id} projectName={project.name} tenantId={tenantId} userId={user.uid}
                    planTasks={allTasks} isLight={isLight} onClose={() => setShowClear(false)} />
            )}

            {adding && (
                <PlanTaskModal
                    mode={adding.mode}
                    parent={adding.parent}
                    planTasks={tasks}
                    project={project}
                    tenantId={tenantId}
                    isLight={isLight}
                    onClose={() => setAdding(null)}
                    onCreated={() => { setAdding(null); showToast("Plan", "Tarea creada.", "success"); }}
                />
            )}

            {discarding && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={discardBusy ? undefined : () => setDiscarding(null)}>
                    <div className={cn("w-full max-w-md rounded-xl shadow-2xl p-4 space-y-3", isLight ? "bg-white border border-zinc-200" : "bg-zinc-900 border border-white/10")} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold">Descartar bloque</h3>
                            <button onClick={() => setDiscarding(null)} disabled={discardBusy} className="text-zinc-400" aria-label="Cerrar"><X className="w-4 h-4" /></button>
                        </div>
                        <p className="text-sm">
                            Se marcarán <b>{discarding.count}</b> tarea(s) abiertas de <b>{discarding.node.title}</b> como
                            <b> fuera de alcance</b>. El bloque se cerrará solo. Las tareas ya cerradas no cambian.
                        </p>
                        <textarea autoFocus value={discardReason} onChange={(e) => setDiscardReason(e.target.value)} placeholder="Motivo (obligatorio, queda en el historial de cada tarea)"
                            className={cn("w-full text-sm rounded-md border px-2 py-1.5 min-h-[70px] outline-none", isLight ? "bg-white border-zinc-300" : "bg-zinc-800 border-white/10")} />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setDiscarding(null)} disabled={discardBusy} className="px-3 py-1.5 rounded-lg text-sm hover:bg-zinc-500/10">Cancelar</button>
                            <button onClick={handleDiscard} disabled={discardBusy || !discardReason.trim()}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-500 disabled:opacity-50">
                                {discardBusy && <Loader2 className="w-4 h-4 animate-spin" />} Descartar {discarding.count} tarea(s)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

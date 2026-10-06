"use client";
/**
 * [Plan] Pestaña "Plan" del proyecto: árbol de tareas del plan en vivo (estados calculados por la
 * Cloud Function planRollup) y acceso al asistente de importación (PM y superiores, D8).
 */
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Upload, Loader2, Search, AlertTriangle } from "lucide-react";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { getRoleLevel, RoleLevel, type Project, type Task } from "@/types";
import { aggregateChildren } from "@/functions/src/planRollupCore";
import { PlanTree, type PlanTreeRow } from "./PlanTree";
import { PlanImportWizard } from "./PlanImportWizard";

const CLOSED = new Set(["completed", "discarded", "out_of_scope"]);

/** Fechas de tarea pueden ser ISO o Timestamp de Firestore. */
const toIso = (v: unknown): string | null => {
    if (!v) return null;
    if (typeof v === "string") return v;
    const t = v as { toDate?: () => Date };
    return typeof t.toDate === "function" ? t.toDate().toISOString() : null;
};

export function ProjectPlan({ project }: { project: Project }) {
    const { user, userRole, identity, tenantId: authTenantId } = useAuth();
    const { theme } = useTheme();
    const isLight = theme === "light";
    const tenantId = project.tenantId || authTenantId || "1";
    const roleLevel = Number(identity?.realRole ?? getRoleLevel(userRole));
    const canImport = roleLevel >= RoleLevel.PM;

    const [tasks, setTasks] = useState<Task[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showWizard, setShowWizard] = useState(false);
    const [search, setSearch] = useState("");
    const [onlyOverdue, setOnlyOverdue] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "tasks"), where("projectId", "==", project.id), where("tenantId", "==", tenantId));
        return onSnapshot(q,
            (snap) => { setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task)).filter((t) => !!t.planRole && t.planStatus !== "archived")); setLoadError(null); },
            (err) => { console.error("[ProjectPlan] Error cargando tareas del plan", project.id, err); setLoadError(err.message); setTasks([]); },
        );
    }, [project.id, tenantId]);

    // Filas en preorden a partir de parentId + order
    const rows: PlanTreeRow[] = useMemo(() => {
        if (!tasks) return [];
        const byParent = new Map<string, Task[]>();
        const ids = new Set(tasks.map((t) => t.id));
        for (const t of tasks) {
            const p = t.parentId && ids.has(t.parentId) ? t.parentId : "__root__";
            byParent.set(p, [...(byParent.get(p) || []), t]);
        }
        for (const list of byParent.values()) list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const out: PlanTreeRow[] = [];
        const walk = (parent: string, level: number) => {
            for (const t of byParent.get(parent) || []) {
                const kids = byParent.get(t.id) || [];
                out.push({
                    key: t.id,
                    parentKey: parent === "__root__" ? null : parent,
                    level,
                    code: t.planCode || null,
                    title: t.title,
                    role: t.planRole!,
                    status: t.status,
                    progress: kids.length ? (t.computed?.progress ?? 0) : null,
                    end: toIso(kids.length ? t.computed?.endDate ?? t.endDate : t.endDate),
                    effortDays: kids.length ? t.computed?.estimatedEffort ?? null : (typeof t.estimatedEffort === "number" ? t.estimatedEffort : null),
                    responsible: t.raci?.responsible?.[0] ?? null,
                    childCount: kids.length,
                });
                walk(t.id, level + 1);
            }
        };
        walk("__root__", 0);
        return out;
    }, [tasks]);

    const summary = useMemo(() => {
        if (!tasks || tasks.length === 0) return null;
        const roots = tasks.filter((t) => !t.parentId);
        const agg = aggregateChildren(roots.map((t) => ({ ...t, startDate: t.startDate, endDate: t.endDate })));
        const work = tasks.filter((t) => t.planRole === "leaf" || (t.planRole === "milestone" && !(t.planChildCount ?? 0)));
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const overdue = work.filter((t) => !CLOSED.has(t.status) && toIso(t.endDate) && Date.parse(toIso(t.endDate)!) < today.getTime()).length;
        return { progress: agg?.progress ?? 0, work: work.length, closed: work.filter((t) => CLOSED.has(t.status)).length, overdue };
    }, [tasks]);

    const filter = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q && !onlyOverdue) return undefined;
        const todayMs = new Date().setHours(0, 0, 0, 0);
        return (r: PlanTreeRow) =>
            (!q || r.title.toLowerCase().includes(q) || (r.code || "").toLowerCase().includes(q)) &&
            (!onlyOverdue || (r.childCount === 0 && !CLOSED.has(r.status || "") && !!r.end && Date.parse(r.end) < todayMs));
    }, [search, onlyOverdue]);

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
                    {canImport ? (
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
                            {summary.overdue > 0 && <span className="text-xs text-rose-500 font-semibold">{summary.overdue} vencidas</span>}
                            <div className="flex-1" />
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                <input type="checkbox" checked={onlyOverdue} onChange={(e) => setOnlyOverdue(e.target.checked)} /> Solo vencidas
                            </label>
                            <div className={cn("flex items-center gap-2 px-2 py-1 rounded-md border", isLight ? "border-zinc-200" : "border-white/10")}>
                                <Search className="w-3.5 h-3.5 text-zinc-400" />
                                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar en el plan…" className="bg-transparent outline-none text-xs w-40" />
                            </div>
                        </div>
                    )}
                    <p className="text-[11px] text-zinc-500">
                        El avance cuenta solo tareas cerradas (0/100), ponderadas por esfuerzo. Hitos, padres y agrupadores no se cierran a mano.
                    </p>
                    <PlanTree rows={rows} isLight={isLight} showStatus initialExpandLevel={5} filter={filter} />
                </>
            )}

            {showWizard && user && (
                <PlanImportWizard
                    project={project}
                    tenantId={tenantId}
                    userId={user.uid}
                    isLight={isLight}
                    onClose={() => setShowWizard(false)}
                    onImported={() => { /* el onSnapshot refresca el árbol */ }}
                />
            )}
        </div>
    );
}

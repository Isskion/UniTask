"use client";
/**
 * [Seguimiento] Dashboard de un proyecto (docs/project-dashboard-design.md): tareas creadas, activas,
 * cerradas por día/semana/mes, burndown / burn-up en días de esfuerzo contra la fecha fin comprometida,
 * avance frente a las fechas de cada tarea y previsión al ritmo actual.
 */
import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from "recharts";
import { AlertTriangle, CalendarClock, CheckCircle2, Gauge, Info, Loader2, Pencil, TrendingDown, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/context/ToastContext";
import { getRoleLevel, RoleLevel, type Project, type Task } from "@/types";
import { dayKey } from "@/functions/src/projectProgressCore";
import { buildProjectDashboard, closureCounts, closuresBy, type ClosureScope, type StoredSnapshot } from "@/lib/projectDashboard";

const STORAGE_KEY = "project_dashboard_project";
// Paleta categórica validada (dataviz): azul, naranja, aqua + neutro; pasos propios para oscuro.
const PALETTE = {
    light: { real: "#2a78d6", forecast: "#eb6834", plan: "#1baf7a", ideal: "#8a8984", grid: "#e4e4e0", axis: "#6b6a66", today: "#52514e", target: "#e34948" },
    dark: { real: "#3987e5", forecast: "#d95926", plan: "#199e70", ideal: "#8a8984", grid: "#2e2e2c", axis: "#a3a29b", today: "#c3c2b7", target: "#e66767" },
};

const fmtDate = (d: string | null | undefined) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "—");
const fmtNum = (n: number, dec = 1) => n.toLocaleString("es-ES", { maximumFractionDigits: dec });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const asDay = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : dayKey(v) ?? "");

export default function ProjectDashboard({ globalProjects = [] }: { globalProjects?: Project[] }) {
    const { user, userRole, userProfile, identity, tenantId: authTenantId } = useAuth();
    const { theme } = useTheme();
    const { showToast } = useToast();
    const isLight = theme === "light";
    const colors = isLight ? PALETTE.light : PALETTE.dark;
    const roleLevel = Number(identity?.realRole ?? getRoleLevel(userRole));
    const isPM = roleLevel >= RoleLevel.PM;

    const projects = useMemo(() => {
        const allowed = isPM ? null : (userProfile?.assignedProjectIds || []);
        return globalProjects
            .filter((p) => p.isActive !== false && p.status !== "archived")
            .filter((p) => !allowed || allowed.includes(p.id))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [globalProjects, isPM, userProfile]);

    const [projectId, setProjectId] = useState<string>(() => {
        try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
    });
    useEffect(() => {
        if (projects.length && !projects.some((p) => p.id === projectId)) setProjectId(projects[0].id);
    }, [projects, projectId]);
    useEffect(() => { try { if (projectId) localStorage.setItem(STORAGE_KEY, projectId); } catch { /* sin almacenamiento */ } }, [projectId]);

    const [dateOverrides, setDateOverrides] = useState<Record<string, Partial<Project>>>({});
    const project = useMemo(() => {
        const p = projects.find((x) => x.id === projectId);
        return p ? { ...p, ...(dateOverrides[p.id] || {}) } as Project : null;
    }, [projects, projectId, dateOverrides]);
    const tenantId = project?.tenantId || authTenantId || "1";

    const [tasks, setTasks] = useState<Task[] | null>(null);
    const [snapshots, setSnapshots] = useState<StoredSnapshot[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [mode, setMode] = useState<"burndown" | "burnup">("burndown");
    const [closureScope, setClosureScope] = useState<ClosureScope>("week");
    const [editingDates, setEditingDates] = useState(false);

    useEffect(() => {
        if (!projectId || !user) return;
        setTasks(null);
        setLoadError(null);
        const q = query(collection(db, "tasks"), where("projectId", "==", projectId), where("tenantId", "==", tenantId));
        const unsub = onSnapshot(q,
            (snap) => setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task))),
            (err) => { console.error("[ProjectDashboard] Error cargando tareas", projectId, err); setLoadError(err.message); setTasks([]); });
        getDocs(query(collection(db, "project_snapshots"), where("projectId", "==", projectId), where("tenantId", "==", tenantId)))
            .then((snap) => setSnapshots(snap.docs.map((d) => d.data() as StoredSnapshot)))
            .catch((err) => { console.warn("[ProjectDashboard] Sin fotos diarias (se reconstruye la curva desde las tareas):", err); setSnapshots([]); });
        return unsub;
    }, [projectId, tenantId, user]);

    const today = useMemo(() => dayKey(Date.now())!, []);
    const dates = project ? { startDate: asDay(project.startDate) || null, endDate: asDay(project.endDate) || null, committedEndDate: project.committedEndDate || null } : {};
    const model = useMemo(() => (tasks ? buildProjectDashboard(tasks, dates, snapshots, today) : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [tasks, snapshots, today, dates.startDate, dates.endDate, dates.committedEndDate]);
    const closures = useMemo(() => (tasks ? closuresBy(tasks, closureScope, today) : []), [tasks, closureScope, today]);
    const closedCounts = useMemo(() => (tasks ? closureCounts(tasks, today) : { day: 0, week: 0, month: 0 }), [tasks, today]);

    const saveDates = async (next: { startDate: string; endDate: string; committedEndDate: string }) => {
        if (!project) return;
        try {
            await updateDoc(doc(db, "projects", project.id), next);
            setDateOverrides((prev) => ({ ...prev, [project.id]: next }));
            setEditingDates(false);
            showToast("Seguimiento", "Fechas del proyecto guardadas.", "success");
        } catch (err) {
            console.error("[ProjectDashboard] Error guardando fechas", project.id, err);
            showToast("Seguimiento", `No se pudieron guardar las fechas: ${err instanceof Error ? err.message : String(err)}. Puedes fijarlas en Proyectos → Ajustes → Presupuesto de horas.`, "error");
        }
    };

    const card = "rounded-xl border border-border bg-card p-4";
    const label = "text-[10px] font-bold uppercase tracking-wider text-muted-foreground";

    if (!projects.length) {
        return <div className="p-10 text-center text-muted-foreground">No tienes proyectos activos asignados.</div>;
    }

    return (
        <div className="space-y-4 max-w-[1400px] mx-auto">
            {/* Cabecera: proyecto y fechas */}
            <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold flex items-center gap-2"><TrendingDown className="w-6 h-6 text-primary" /> Dashboard de proyecto</h2>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                    className="ml-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold outline-none">
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="flex-1" />
                {project && (
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                        <span><span className={label}>Inicio</span> <b className="ml-1">{fmtDate(model?.start ?? dates.startDate)}</b>{!dates.startDate && <span className="text-muted-foreground"> (1ª tarea)</span>}</span>
                        <span><span className={label}>Fin prevista</span> <b className="ml-1">{fmtDate(dates.endDate)}</b></span>
                        <span><span className={label}>Fin comprometida</span> <b className="ml-1">{fmtDate(dates.committedEndDate)}</b></span>
                        {isPM && (
                            <button onClick={() => setEditingDates(true)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-accent">
                                <Pencil className="w-3 h-3" /> Fechas
                            </button>
                        )}
                    </div>
                )}
            </div>

            {loadError && (
                <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 text-sm flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>No se pudieron cargar las tareas del proyecto ({loadError}). Comprueba que tienes el proyecto asignado; si acabas de cambiar de rol, recarga la página.</span>
                </div>
            )}

            {!model ? (
                <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : model.now.counts.created === 0 ? (
                <div className={cn(card, "text-center text-muted-foreground py-10")}>Este proyecto todavía no tiene tareas.</div>
            ) : (
                <>
                    {!model.target && (
                        <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-sm flex gap-2">
                            <CalendarClock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                            <span>Falta la <b>fecha fin</b> del proyecto: sin ella no hay línea ideal ni desviación. {isPM ? "Fíjala con el botón «Fechas»." : "Pídesela a un PM."}</span>
                        </div>
                    )}

                    {/* KPIs: lo que pidió el usuario (1-3) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Kpi label="Tareas creadas" value={fmtNum(model.now.counts.created, 0)} hint={`${fmtNum(model.now.scope)} días de esfuerzo en alcance${model.now.counts.dropped ? ` · ${model.now.counts.dropped} descartadas` : ""}`} />
                        <Kpi label="Tareas activas" value={fmtNum(model.now.counts.active, 0)}
                            hint={`Pendientes ${model.now.counts.pending} · En curso ${model.now.counts.inProgress} · Revisión ${model.now.counts.review}`} />
                        <Kpi label="Cerradas" value={`${closedCounts.day} · ${closedCounts.week} · ${closedCounts.month}`} hint="hoy · esta semana · este mes (Aprobación Final)" />
                        <Kpi label="Pendiente" value={`${fmtNum(model.now.remaining)} d`} hint={`${model.now.counts.completed} cerradas · ritmo ${fmtNum(model.velocityPerWeek)} d/semana (4 últimas)`} />
                    </div>

                    {/* KPIs de plazo (4) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Kpi label="Avance" value={`${fmtNum(model.progressPct)} %`} hint="por estado: 100 / 75 / 50 / 0, ponderado por esfuerzo" />
                        <Kpi label="Planificado a hoy"
                            value={model.plannedPct === null ? "—" : `${fmtNum(model.plannedPct)} %`}
                            hint={model.plannedPct === null ? "Las tareas no tienen fechas" : `hecho de esas tareas: ${fmtNum(model.earnedDatedPct ?? 0)} %`} />
                        <Kpi label="Desviación (fechas de tareas)"
                            value={model.scheduleDelay === null ? "—" : delayText(model.scheduleDelay)}
                            tone={toneOf(model.scheduleDelay)}
                            hint={model.scheduleReachedOn ? `vas donde el plan decía el ${fmtDate(model.scheduleReachedOn)}` : "sin tareas con fechas"} />
                        <Kpi label="Fin previsto al ritmo actual"
                            value={model.forecast ? fmtDate(model.forecast) : "—"}
                            tone={toneOf(model.forecastDelay)}
                            hint={!model.forecast ? "sin cierres en las 4 últimas semanas"
                                : model.forecastDelay === null ? "sin fecha fin para comparar"
                                : `${delayText(model.forecastDelay)} vs fin ${model.targetKind === "committed" ? "comprometida" : "prevista"}${model.workdaysLeft !== null ? ` · quedan ${plural(model.workdaysLeft, "día lab.", "días lab.")}` : ""}`} />
                    </div>

                    {/* Burndown / burn-up */}
                    <div className={card}>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <h3 className="font-semibold">{mode === "burndown" ? "Burndown: días de esfuerzo pendientes" : "Burn-up: alcance y hecho (días de esfuerzo)"}</h3>
                            <div className="flex-1" />
                            <Segmented value={mode} onChange={setMode} options={[["burndown", "Burndown"], ["burnup", "Burn-up"]]} />
                        </div>
                        <div className="h-[340px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={model.series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                                    <CartesianGrid stroke={colors.grid} vertical={false} />
                                    <XAxis dataKey="day" tickFormatter={(d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`} tick={{ fontSize: 11, fill: colors.axis }} minTickGap={40} stroke={colors.grid} />
                                    <YAxis tick={{ fontSize: 11, fill: colors.axis }} stroke={colors.grid} width={48} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <ReferenceLine x={model.today} stroke={colors.today} strokeDasharray="2 3" label={{ value: "Hoy", position: "insideTopLeft", fontSize: 11, fill: colors.axis }} />
                                    {model.target && <ReferenceLine x={model.target} stroke={colors.target} strokeDasharray="4 3" label={{ value: model.targetKind === "committed" ? "Fin comprometida" : "Fin prevista", position: "insideTopRight", fontSize: 11, fill: colors.axis }} />}
                                    {dates.committedEndDate && dates.endDate && dates.endDate !== dates.committedEndDate && (
                                        <ReferenceLine x={dates.endDate} stroke={colors.ideal} strokeDasharray="4 3" label={{ value: "Fin prevista", position: "insideTopRight", fontSize: 11, fill: colors.axis }} />
                                    )}
                                    {mode === "burndown" ? (
                                        <>
                                            <Line dataKey="ideal" name="Ideal (hasta la fecha fin)" stroke={colors.ideal} strokeDasharray="6 4" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                                            <Line dataKey="planRemaining" name="Según fechas de las tareas" stroke={colors.plan} strokeWidth={2} dot={false} isAnimationActive={false} />
                                            <Line dataKey="remaining" name="Pendiente real" stroke={colors.real} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                                            <Line dataKey="forecast" name="Previsión al ritmo actual" stroke={colors.forecast} strokeDasharray="6 4" strokeWidth={2} dot={false} isAnimationActive={false} />
                                        </>
                                    ) : (
                                        <>
                                            <Line dataKey="scope" name="Alcance" stroke={colors.ideal} strokeWidth={2} dot={false} isAnimationActive={false} />
                                            <Line dataKey="planned" name="Planificado (fechas de las tareas)" stroke={colors.plan} strokeWidth={2} dot={false} isAnimationActive={false} />
                                            <Line dataKey="done" name="Hecho (Aprobación Final)" stroke={colors.real} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                                        </>
                                    )}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Cerradas por periodo */}
                        <div className={cn(card, "lg:col-span-2")}>
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <h3 className="font-semibold">Tareas cerradas por {closureScope === "day" ? "día" : closureScope === "week" ? "semana" : "mes"}</h3>
                                <div className="flex-1" />
                                <Segmented value={closureScope} onChange={setClosureScope} options={[["day", "Día"], ["week", "Semana"], ["month", "Mes"]]} />
                            </div>
                            <div className="h-[240px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={closures} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid stroke={colors.grid} vertical={false} />
                                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: colors.axis }} stroke={colors.grid} minTickGap={8} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: colors.axis }} stroke={colors.grid} width={36} />
                                        <Tooltip cursor={{ fill: colors.grid, opacity: 0.4 }} content={<ClosureTooltip />} />
                                        <Bar dataKey="tasks" name="Tareas cerradas" fill={colors.real} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Fiabilidad de los datos */}
                        <div className={cn(card, "space-y-2 text-xs")}>
                            <h3 className="font-semibold text-sm flex items-center gap-1.5"><Gauge className="w-4 h-4" /> Fiabilidad de los datos</h3>
                            <p className="text-muted-foreground">De dónde salen los días de esfuerzo de las {model.now.counts.created} tareas:</p>
                            <ul className="space-y-1">
                                <SourceRow label="Estimación de la tarea" n={model.now.effortSources.estimate} total={model.now.counts.created} />
                                <SourceRow label="Duración en el Excel del plan" n={model.now.effortSources.plan} total={model.now.counts.created} />
                                <SourceRow label="Talla XS–XL" n={model.now.effortSources.size} total={model.now.counts.created} />
                                <SourceRow label="Días lab. entre sus fechas" n={model.now.effortSources.dates} total={model.now.counts.created} />
                                <SourceRow label="Sin datos (cuenta 1 día)" n={model.now.effortSources.default} total={model.now.counts.created} warn />
                            </ul>
                            <div className="h-px bg-border my-2" />
                            {model.now.counts.withoutDates > 0 && <p className="flex gap-1.5"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />{plural(model.now.counts.withoutDates, "tarea abierta o cerrada sin fecha fin no entra", "tareas sin fecha fin no entran")} en «Planificado a hoy».</p>}
                            {model.now.counts.approxClosed > 0 && <p className="flex gap-1.5"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />{plural(model.now.counts.approxClosed, "cerrada sin fecha de cierre: se usa su última edición", "cerradas sin fecha de cierre: se usa su última edición")}.</p>}
                            <p className="flex gap-1.5 text-muted-foreground">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                {model.exactDays > 0
                                    ? `${plural(model.exactDays, "día de la curva viene", "días de la curva vienen")} de la foto diaria (exactos); el resto se reconstruye desde las tareas.`
                                    : "La curva pasada se reconstruye desde las tareas (no ve reaperturas). Desde esta noche se guarda una foto diaria exacta."}
                            </p>
                        </div>
                    </div>
                </>
            )}

            {editingDates && project && (
                <DatesModal project={project} start={dates.startDate || ""} end={dates.endDate || ""} committed={dates.committedEndDate || ""}
                    onClose={() => setEditingDates(false)} onSave={saveDates} />
            )}
        </div>
    );
}

// ─── Piezas ─────────────────────────────────────────────────────────────────

type Tone = "good" | "warn" | "bad" | undefined;
const delayText = (d: number) => (d === 0 ? "en plazo" : d > 0 ? `${plural(d, "día lab.", "días lab.")} de retraso` : `${plural(-d, "día lab.", "días lab.")} de adelanto`);
const toneOf = (d: number | null): Tone => (d === null ? undefined : d <= 0 ? "good" : d <= 5 ? "warn" : "bad");

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: Tone }) {
    const icon = tone === "bad" ? <AlertTriangle className="w-4 h-4 text-rose-500" /> : tone === "warn" ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : tone === "good" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : null;
    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
                {icon}
            </div>
            <div className="text-2xl font-extrabold tracking-tight mt-1 tabular-nums text-foreground">{value}</div>
            {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
        </div>
    );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
    return (
        <div className="inline-flex rounded-lg border border-border p-0.5 text-xs">
            {options.map(([v, l]) => (
                <button key={v} onClick={() => onChange(v)} className={cn("px-2.5 py-1 rounded-md font-semibold", value === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{l}</button>
            ))}
        </div>
    );
}

function SourceRow({ label, n, total, warn }: { label: string; n: number; total: number; warn?: boolean }) {
    const pct = total > 0 ? Math.round((n / total) * 100) : 0;
    return (
        <li className="flex items-center gap-2">
            <span className="flex-1">{label}</span>
            <span className={cn("tabular-nums font-semibold", warn && n > 0 && "text-amber-600")}>{n}</span>
            <span className="tabular-nums text-muted-foreground w-10 text-right">{pct} %</span>
        </li>
    );
}

type TooltipProps = { active?: boolean; label?: string; payload?: { name: string; value: number; color: string; payload: Record<string, unknown> }[] };

function ChartTooltip({ active, label, payload }: TooltipProps) {
    if (!active || !payload?.length) return null;
    const exact = payload[0]?.payload?.exact;
    return (
        <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs space-y-0.5">
            <div className="font-semibold">{fmtDate(label)}{exact ? " · foto diaria" : ""}</div>
            {payload.filter((p) => p.value != null).map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-0.5 rounded" style={{ background: p.color }} />
                    <span className="flex-1">{p.name}</span>
                    <b className="tabular-nums">{fmtNum(p.value)} d</b>
                </div>
            ))}
        </div>
    );
}

function ClosureTooltip({ active, payload }: TooltipProps) {
    if (!active || !payload?.length) return null;
    const b = payload[0].payload as { label: string; tasks: number; effort: number };
    return (
        <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs">
            <div className="font-semibold">{b.label}</div>
            <div>{plural(b.tasks, "tarea cerrada", "tareas cerradas")} · {fmtNum(b.effort)} días de esfuerzo</div>
        </div>
    );
}

function DatesModal({ project, start, end, committed, onClose, onSave }: {
    project: Project; start: string; end: string; committed: string;
    onClose: () => void; onSave: (d: { startDate: string; endDate: string; committedEndDate: string }) => Promise<void>;
}) {
    const [s, setS] = useState(start);
    const [e, setE] = useState(end);
    const [c, setC] = useState(committed);
    const [busy, setBusy] = useState(false);
    const invalid = (s && e && e < s) || (s && c && c < s);
    const input = "w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm";
    return (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={busy ? undefined : onClose}>
            <div className="w-full max-w-md rounded-xl shadow-2xl p-4 space-y-3 bg-card border border-border" onClick={(ev) => ev.stopPropagation()}>
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">Fechas de {project.name}</h3>
                    <button onClick={onClose} disabled={busy} className="text-muted-foreground" aria-label="Cerrar"><X className="w-4 h-4" /></button>
                </div>
                <label className="block text-xs space-y-1"><span className="font-semibold">Inicio</span><input type="date" className={input} value={s} onChange={(ev) => setS(ev.target.value)} /></label>
                <label className="block text-xs space-y-1"><span className="font-semibold">Fin comprometida</span> <span className="text-muted-foreground">— la firmada con el cliente; la desviación se mide contra ella</span><input type="date" className={input} value={c} onChange={(ev) => setC(ev.target.value)} /></label>
                <label className="block text-xs space-y-1"><span className="font-semibold">Fin prevista</span> <span className="text-muted-foreground">— la de trabajo, si se replanifica</span><input type="date" className={input} value={e} onChange={(ev) => setE(ev.target.value)} /></label>
                {invalid && <p className="text-xs text-rose-500">Las fechas fin no pueden ser anteriores al inicio.</p>}
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} disabled={busy} className="px-3 py-1.5 rounded-lg text-sm hover:bg-accent">Cancelar</button>
                    <button disabled={busy || !!invalid} onClick={async () => { setBusy(true); try { await onSave({ startDate: s, endDate: e, committedEndDate: c }); } finally { setBusy(false); } }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
                    </button>
                </div>
            </div>
        </div>
    );
}

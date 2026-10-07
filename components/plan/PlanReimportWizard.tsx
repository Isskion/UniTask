"use client";
/**
 * [Plan] Asistente de reimportación (docs/plan-import-design.md §4):
 * fichero → comparación con el plan de UniTask (a confirmar, conflictos, cambios, cierres, altas,
 * archivados) → aplicar → resultado. Manda UniTask: nada se aplica sin pasar por esta vista previa.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { X, Upload, Loader2, AlertTriangle, CheckCircle2, FileSpreadsheet, ChevronDown, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project, Task } from "@/types";
import { parsePlanRows, type ParsedPlan, type PlanNode } from "@/lib/plan/planParser";
import {
    computeReimportDiff, emptyDecisions, choiceOf, archiveChosen, newChosen, FIELD_LABEL,
    type ReimportDecisions, type FieldDiff, type MatchedItem,
} from "@/lib/plan/planReimport";
import { loadReimportContext, applyReimport, type ReimportContext } from "@/lib/plan/planReimportApply";
import { readPlanFile } from "./readPlanFile";

interface Props {
    project: Project;
    tenantId: string;
    userId: string;
    isLight: boolean;
    onClose: () => void;
}

type Step = "file" | "review" | "applying" | "done";

const fmt = (field: FieldDiff["field"], v: unknown): string => {
    if (v == null || v === "") return "—";
    if (field === "startDate" || field === "endDate") {
        const d = new Date(typeof v === "string" ? v : (v as { toDate?: () => Date }).toDate?.() ?? (v as Date));
        return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
    }
    if (field === "estimatedEffort") return `${Math.round(Number(v) * 100) / 100} d`;
    return String(v);
};

export function PlanReimportWizard({ project, tenantId, userId, isLight, onClose }: Props) {
    const [step, setStep] = useState<Step>("file");
    const [context, setContext] = useState<ReimportContext | null>(null);
    const [fileName, setFileName] = useState("");
    const [rows, setRows] = useState<unknown[][] | null>(null);
    const [boldRows, setBoldRows] = useState<Set<number>>(new Set());
    const [rejected, setRejected] = useState<Set<string>>(new Set());
    const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
    const [decisions, setDecisions] = useState<ReimportDecisions>(emptyDecisions);
    const [error, setError] = useState<string | null>(null);
    const [reading, setReading] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [result, setResult] = useState<{ importId: string; stats: Record<string, number> } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadReimportContext(project.id, tenantId)
            .then(setContext)
            .catch((err) => {
                console.error("[PlanReimport] Error cargando el plan actual", project.id, err);
                setError(`No se pudo cargar el plan actual del proyecto (${err instanceof Error ? err.message : String(err)}). Recarga la página; si persiste, revisa que tu rol sea PM o superior.`);
            });
    }, [project.id, tenantId]);

    const parsed: ParsedPlan | null = useMemo(() => {
        if (!rows || !context) return null;
        try {
            return parsePlanRows(rows, { boldRows, milestoneLevel: context.milestoneLevel ?? undefined });
        } catch {
            return null;
        }
    }, [rows, boldRows, context]);

    const diff = useMemo(() => (parsed && context ? computeReimportDiff(parsed, context.planTasks, { rejected }) : null), [parsed, context, rejected]);

    const taskById = useMemo(() => new Map((context?.planTasks ?? []).map((t) => [t.id, t])), [context]);
    const taskPath = (t: Task) => (t.ancestorIds || []).map((id) => taskById.get(id)?.title).filter(Boolean).slice(-2).join(" › ");
    const nodeByKey = useMemo(() => new Map((parsed?.nodes ?? []).map((n) => [n.key, n])), [parsed]);
    const nodePath = (n: PlanNode) => {
        const chain: string[] = [];
        let p = n.parentKey ? nodeByKey.get(n.parentKey) : undefined;
        while (p && chain.length < 2) { chain.unshift(p.name); p = p.parentKey ? nodeByKey.get(p.parentKey) : undefined; }
        return chain.join(" › ");
    };

    const groups = useMemo(() => {
        if (!diff) return null;
        const toConfirm = diff.matched.filter((m) => m.needsConfirm);
        const conflicts = diff.matched.filter((m) => m.fields.some((f) => f.kind !== "excel"));
        const changes = diff.matched.filter((m) => m.fields.some((f) => f.kind === "excel") || (m.move && !m.needsConfirm) || m.unarchive);
        const closes = diff.matched.filter((m) => m.close);
        return { toConfirm, conflicts, changes, closes, created: diff.created, archived: diff.archived };
    }, [diff]);

    const pendingConfirm = groups ? groups.toConfirm.filter((m) => !confirmed.has(m.node.key)).length : 0;

    const handleFile = async (file: File) => {
        setError(null);
        setReading(true);
        try {
            const { rows: data, boldRows: bold } = await readPlanFile(file);
            setBoldRows(bold);
            setRows(data);
            setFileName(file.name);
            setRejected(new Set());
            setConfirmed(new Set());
            setDecisions(emptyDecisions());
            setStep("review");
        } catch (err) {
            console.error("[PlanReimport] Error leyendo el Excel:", file.name, err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setReading(false);
        }
    };

    const setField = (taskId: string, f: FieldDiff, choice: "excel" | "unitask") =>
        setDecisions((d) => ({ ...d, fields: new Map(d.fields).set(`${taskId}:${f.field}`, choice) }));
    const toggleOff = (key: string) => setDecisions((d) => {
        const off = new Set(d.off);
        if (off.has(key)) off.delete(key); else off.add(key);
        return { ...d, off };
    });
    const toggleArchiveOn = (taskId: string) => setDecisions((d) => {
        const archiveOn = new Set(d.archiveOn);
        if (archiveOn.has(taskId)) archiveOn.delete(taskId); else archiveOn.add(taskId);
        return { ...d, archiveOn };
    });
    const allFields = (items: MatchedItem[], kinds: FieldDiff["kind"][], choice: "excel" | "unitask") => setDecisions((d) => {
        const fields = new Map(d.fields);
        for (const m of items) for (const f of m.fields) if (kinds.includes(f.kind)) fields.set(`${m.task.id}:${f.field}`, choice);
        return { ...d, fields };
    });

    const handleApply = async () => {
        if (!parsed || !context || !diff) return;
        setStep("applying");
        setError(null);
        try {
            const res = await applyReimport({
                project, tenantId, userId, fileName, plan: parsed, context, diff, decisions,
                onProgress: (done, total) => setProgress({ done, total }),
            });
            setResult(res);
            setStep("done");
        } catch (err) {
            console.error("[PlanReimport] Error aplicando la reimportación:", err);
            setError(err instanceof Error ? err.message : String(err));
            setStep("review");
        }
    };

    const card = isLight ? "bg-white border border-zinc-200" : "bg-zinc-900 border border-white/10";
    const rowCls = cn("rounded-md border p-2 text-xs space-y-1", isLight ? "border-zinc-200" : "border-white/10");
    const btn = (active: boolean) => cn("px-2 py-1 rounded-md border text-left min-w-0", active
        ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-semibold"
        : isLight ? "border-zinc-200 hover:bg-zinc-50" : "border-white/10 hover:bg-white/5");
    const smallBtn = cn("px-2 py-0.5 rounded border text-[11px]", isLight ? "border-zinc-300 hover:bg-zinc-100" : "border-white/15 hover:bg-white/5");
    const taskLabel = (t: Task) => <><span className="font-mono text-zinc-500">{t.friendlyId}</span> {t.title}</>;
    const nodeLabel = (n: PlanNode) => <><span className="font-mono text-zinc-500">{n.code ?? ""}</span> {n.name}</>;

    const summary = groups && diff ? [
        { label: "Sin cambios", n: diff.unchanged, cls: "bg-zinc-500/10" },
        { label: "A confirmar", n: groups.toConfirm.length, cls: "bg-amber-500/15 text-amber-600" },
        { label: "Conflictos", n: groups.conflicts.length, cls: "bg-rose-500/15 text-rose-600" },
        { label: "Cambios del Excel", n: groups.changes.length, cls: "bg-sky-500/15 text-sky-600" },
        { label: "A Aprobación Final", n: groups.closes.length, cls: "bg-blue-500/15 text-blue-600" },
        { label: "Nuevas", n: groups.created.length, cls: "bg-emerald-500/15 text-emerald-600" },
        { label: "A archivar", n: groups.archived.length, cls: "bg-zinc-500/15" },
    ] : [];

    return (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={step === "applying" ? undefined : onClose}>
            <div className={cn("w-full max-w-5xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]", card)} onClick={(e) => e.stopPropagation()}>
                <div className={cn("p-4 border-b flex items-center justify-between shrink-0", isLight ? "border-zinc-200" : "border-white/10")}>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-lg">Reimportar plan</h3>
                        <p className="text-sm text-zinc-500 truncate">{project.name}{fileName ? ` · ${fileName}` : ""}</p>
                    </div>
                    {step !== "applying" && (
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400" aria-label="Cerrar"><X className="w-5 h-5" /></button>
                    )}
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 text-sm flex gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
                        </div>
                    )}

                    {step === "file" && (
                        <div className={cn("rounded-xl border-2 border-dashed p-10 text-center space-y-3", isLight ? "border-zinc-300" : "border-white/15")}>
                            <FileSpreadsheet className="w-10 h-10 mx-auto text-zinc-400" />
                            <p className="text-sm">Sube la versión nueva del Excel del plan. Verás qué cambia antes de aplicar nada.</p>
                            <p className="text-xs text-zinc-500">Lo editado en UniTask no se pisa: si el Excel y UniTask cambiaron el mismo dato, eliges tú. Las filas que ya no están se proponen archivar, nunca se borran.</p>
                            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
                            <button onClick={() => fileRef.current?.click()} disabled={reading || !context}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50">
                                {reading || !context ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {!context ? "Cargando plan actual…" : reading ? "Leyendo…" : "Seleccionar Excel"}
                            </button>
                        </div>
                    )}

                    {step === "review" && groups && diff && parsed && (
                        <>
                            <div className="flex flex-wrap gap-2">
                                {summary.map((s) => (
                                    <span key={s.label} className={cn("px-2 py-1 rounded-md text-xs font-semibold", s.cls)}>{s.label}: {s.n}</span>
                                ))}
                            </div>
                            <p className="text-[11px] text-zinc-500">
                                Nivel de hito {parsed.milestoneLevel}{context?.milestoneLevel != null ? " (el del último lote)" : ""}. El % parcial del Excel no se importa; las tareas al 100 % pasan a Aprobación Final.
                            </p>

                            {groups.toConfirm.length > 0 && (
                                <Section title="A confirmar" count={groups.toConfirm.length} isLight={isLight}
                                    hint="Emparejadas por nombre parecido o porque cambiaron de sitio. Confirma que son la misma tarea; si no, la fila del Excel entra como nueva."
                                    actions={<button className={smallBtn} onClick={() => setConfirmed(new Set(groups.toConfirm.map((m) => m.node.key)))}>Confirmar todas</button>}>
                                    {groups.toConfirm.map((m) => (
                                        <div key={m.node.key} className={rowCls}>
                                            <div className="grid sm:grid-cols-2 gap-2">
                                                <div className="min-w-0"><span className="text-zinc-500">Excel:</span> {nodeLabel(m.node)}<div className="text-[10px] text-zinc-500 truncate">{nodePath(m.node)}</div></div>
                                                <div className="min-w-0"><span className="text-zinc-500">UniTask:</span> {taskLabel(m.task)}<div className="text-[10px] text-zinc-500 truncate">{taskPath(m.task)}</div></div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-[10px] text-amber-600">{m.via === "similar" ? `Nombre parecido (${Math.round((m.score ?? 0) * 100)} %)` : "Mismo nombre en otro sitio del plan: se moverá"}</span>
                                                <div className="flex-1" />
                                                <button className={btn(confirmed.has(m.node.key))} onClick={() => setConfirmed((s) => new Set(s).add(m.node.key))}>Es la misma</button>
                                                <button className={btn(false)} onClick={() => setRejected((s) => new Set(s).add(m.node.key))}>Es otra</button>
                                            </div>
                                        </div>
                                    ))}
                                </Section>
                            )}

                            {groups.conflicts.length > 0 && (
                                <Section title="Conflictos" count={groups.conflicts.length} isLight={isLight}
                                    hint="El dato cambió en el Excel y también en UniTask, o la tarea viene de una importación anterior sin foto del Excel (“sin referencia”). Elige qué valor se queda."
                                    actions={<>
                                        <button className={smallBtn} onClick={() => allFields(groups.conflicts, ["conflict", "no_baseline"], "excel")}>Todo Excel</button>
                                        <button className={smallBtn} onClick={() => allFields(groups.conflicts, ["conflict", "no_baseline"], "unitask")}>Todo UniTask</button>
                                    </>}>
                                    {groups.conflicts.map((m) => (
                                        <div key={m.task.id} className={rowCls}>
                                            <div className="font-medium truncate">{taskLabel(m.task)}</div>
                                            {m.fields.filter((f) => f.kind !== "excel").map((f) => {
                                                const c = choiceOf(decisions, m.task.id, f);
                                                return (
                                                    <div key={f.field} className="grid grid-cols-[6rem_1fr_1fr] gap-2 items-center">
                                                        <span className="text-zinc-500">{FIELD_LABEL[f.field]}{f.kind === "no_baseline" && <span className="block text-[9px]">sin referencia</span>}</span>
                                                        <button className={btn(c === "excel")} onClick={() => setField(m.task.id, f, "excel")}><span className="text-zinc-500">Excel:</span> {fmt(f.field, f.excel)}</button>
                                                        <button className={btn(c === "unitask")} onClick={() => setField(m.task.id, f, "unitask")}><span className="text-zinc-500">UniTask:</span> {fmt(f.field, f.uniTask)}</button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </Section>
                            )}

                            {groups.changes.length > 0 && (
                                <Section title="Cambios del Excel" count={groups.changes.length} isLight={isLight}
                                    hint="Solo cambió el Excel: se aplican salvo que los desmarques.">
                                    {groups.changes.map((m) => (
                                        <div key={m.task.id} className={rowCls}>
                                            <div className="font-medium truncate">{taskLabel(m.task)}</div>
                                            {m.fields.filter((f) => f.kind === "excel").map((f) => (
                                                <Check key={f.field} checked={choiceOf(decisions, m.task.id, f) === "excel"}
                                                    onChange={(on) => setField(m.task.id, f, on ? "excel" : "unitask")}>
                                                    {FIELD_LABEL[f.field]}: <s className="text-zinc-500">{fmt(f.field, f.uniTask)}</s> → <b>{fmt(f.field, f.excel)}</b>
                                                </Check>
                                            ))}
                                            {m.move && !m.needsConfirm && (
                                                <Check checked={!decisions.off.has(`move:${m.task.id}`)} onChange={() => toggleOff(`move:${m.task.id}`)}>
                                                    Mover bajo <b>{nodePath(m.node) || "la raíz"}</b>
                                                </Check>
                                            )}
                                            {m.unarchive && (
                                                <Check checked={!decisions.off.has(`unarchive:${m.task.id}`)} onChange={() => toggleOff(`unarchive:${m.task.id}`)}>
                                                    Reactivar (estaba archivada y vuelve a estar en el Excel)
                                                </Check>
                                            )}
                                        </div>
                                    ))}
                                </Section>
                            )}

                            {groups.closes.length > 0 && (
                                <Section title="Pasan a Aprobación Final" count={groups.closes.length} isLight={isLight}
                                    hint="Al 100 % en el Excel y abiertas en UniTask. Se cierran con la fecha de Fin del Excel.">
                                    {groups.closes.map((m) => (
                                        <div key={m.task.id} className={rowCls}>
                                            <Check checked={!decisions.off.has(`close:${m.task.id}`)} onChange={() => toggleOff(`close:${m.task.id}`)}>
                                                {taskLabel(m.task)} <span className="text-zinc-500">({m.task.status === "pending" ? "pendiente" : m.task.status === "review" ? "revisión" : "en curso"})</span>
                                            </Check>
                                        </div>
                                    ))}
                                </Section>
                            )}

                            {groups.created.length > 0 && (
                                <Section title="Nuevas" count={groups.created.length} isLight={isLight}
                                    hint="Filas del Excel que no están en UniTask. Si desmarcas una fila con hijas, tampoco se crean sus hijas.">
                                    {groups.created.map((c) => {
                                        const parentNew = c.parent && "nodeKey" in c.parent;
                                        const enabled = !parentNew || newChosen(diff, decisions, c.parent && "nodeKey" in c.parent ? c.parent.nodeKey : "");
                                        return (
                                            <div key={c.node.key} className={cn(rowCls, !enabled && "opacity-50")}>
                                                <Check checked={enabled && !decisions.off.has(`new:${c.node.key}`)} disabled={!enabled} onChange={() => toggleOff(`new:${c.node.key}`)}>
                                                    {nodeLabel(c.node)}{c.completed && <span className="text-blue-500"> · Aprobación Final</span>}
                                                    <span className="block text-[10px] text-zinc-500">bajo {nodePath(c.node) || "la raíz"}</span>
                                                </Check>
                                            </div>
                                        );
                                    })}
                                </Section>
                            )}

                            {groups.archived.length > 0 && (
                                <Section title="Ya no están en el Excel" count={groups.archived.length} isLight={isLight}
                                    hint="Se archivan (no se borran: se pueden reactivar en otra reimportación). Las que tienen actividad o tareas debajo vienen desmarcadas.">
                                    {groups.archived.map((a) => (
                                        <div key={a.task.id} className={rowCls}>
                                            <Check checked={archiveChosen(decisions, a)} onChange={() => (a.defaultOn ? toggleOff(`archive:${a.task.id}`) : toggleArchiveOn(a.task.id))}>
                                                Archivar {taskLabel(a.task)}
                                                <span className="block text-[10px] text-zinc-500">
                                                    {taskPath(a.task)}
                                                    {a.hasActivity && <span className="text-amber-600"> · tiene actividad</span>}
                                                    {a.keptDescendants > 0 && <span className="text-amber-600"> · {a.keptDescendants} tarea(s) debajo siguen en el plan</span>}
                                                </span>
                                            </Check>
                                        </div>
                                    ))}
                                </Section>
                            )}

                            {diff.unchanged === diff.matched.length && !diff.created.length && !diff.archived.length && (
                                <div className="py-8 text-center text-sm text-zinc-500 flex items-center justify-center gap-2">
                                    <Info className="w-4 h-4" /> El Excel no trae cambios respecto al plan de UniTask.
                                </div>
                            )}
                        </>
                    )}

                    {step === "applying" && (
                        <div className="py-16 text-center space-y-3">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                            <p className="text-sm">Aplicando cambios… {progress.done} / {progress.total || "…"}</p>
                            <p className="text-xs text-zinc-500">No cierres esta ventana.</p>
                        </div>
                    )}

                    {step === "done" && result && (
                        <div className="py-12 text-center space-y-2">
                            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
                            <p className="font-semibold">Plan actualizado.</p>
                            <p className="text-sm text-zinc-500">
                                {result.stats.created} nuevas · {result.stats.fieldsFromExcel} datos del Excel aplicados · {result.stats.keptUniTask} se quedan como en UniTask · {result.stats.closed} a Aprobación Final · {result.stats.moved} movidas · {result.stats.archived} archivadas{result.stats.unarchived ? ` · ${result.stats.unarchived} reactivadas` : ""}
                            </p>
                            <p className="text-xs text-zinc-500">Lote {result.importId}. Hitos y padres se recalculan solos en unos segundos.</p>
                        </div>
                    )}
                </div>

                <div className={cn("p-4 border-t flex flex-wrap items-center justify-end gap-2 shrink-0", isLight ? "border-zinc-200" : "border-white/10")}>
                    {step === "review" && (
                        <>
                            {pendingConfirm > 0 && <span className="text-xs text-amber-600 mr-auto">Falta confirmar {pendingConfirm} emparejamiento(s).</span>}
                            <button onClick={() => { setStep("file"); setRows(null); setError(null); }} className="px-4 py-2 rounded-lg text-sm hover:bg-zinc-500/10">Cambiar fichero</button>
                            <button onClick={handleApply} disabled={pendingConfirm > 0}
                                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50">
                                Aplicar cambios
                            </button>
                        </>
                    )}
                    {step === "done" && (
                        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500">Ver el plan</button>
                    )}
                </div>
            </div>
        </div>
    );
}

function Section({ title, count, hint, actions, isLight, children }: { title: string; count: number; hint: string; actions?: ReactNode; isLight: boolean; children: ReactNode }) {
    const [open, setOpen] = useState(true);
    return (
        <section className={cn("rounded-lg border", isLight ? "border-zinc-200" : "border-white/10")}>
            <div className="flex flex-wrap items-center gap-2 p-2">
                <button onClick={() => setOpen(!open)} className="flex items-center gap-1 font-semibold text-sm">
                    {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}{title} <span className="text-zinc-500 font-normal">({count})</span>
                </button>
                <div className="flex-1" />
                {actions}
            </div>
            {open && (
                <div className="px-2 pb-2 space-y-1.5">
                    <p className="text-[11px] text-zinc-500">{hint}</p>
                    {children}
                </div>
            )}
        </section>
    );
}

function Check({ checked, onChange, disabled, children }: { checked: boolean; onChange: (on: boolean) => void; disabled?: boolean; children: ReactNode }) {
    return (
        <label className={cn("flex items-start gap-2", disabled ? "cursor-not-allowed" : "cursor-pointer")}>
            <input type="checkbox" className="mt-0.5" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
            <span className="min-w-0">{children}</span>
        </label>
    );
}

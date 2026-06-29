"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getActiveProjects } from "@/lib/projects";
import { Project } from "@/types";
import { formatHours } from "@/lib/agenda-utils";
import {
    PeriodKind, PeriodRange, buildPeriodRange, customRange,
    getAgendaEntriesRange, getConsultantTasksRange, ConsultantTaskLite,
    aggregateProjectHours, portfolioTotals, ProjectHours, HoursHealth,
} from "@/lib/project-hours";
import { AgendaEntry } from "@/types/agenda";
import { AlertTriangle, ChevronDown, ChevronRight, Loader2 } from "lucide-react";

interface Props {
    tenantId: string;
    /** Lunes ISO de la semana navegada — ancla por defecto para 'semana' y 'mes'. */
    anchorIso: string;
}

const HEALTH_STYLE: Record<HoursHealth, { bar: string; text: string }> = {
    none:    { bar: 'bg-zinc-500',    text: 'text-zinc-400' },
    healthy: { bar: 'bg-emerald-500', text: 'text-emerald-400' },
    warn:    { bar: 'bg-amber-500',   text: 'text-amber-400' },
    over:    { bar: 'bg-red-500',     text: 'text-red-400' },
};

/** Muestra horas en duro (formatHours devuelve '' para 0). */
function fmt(h: number): string {
    if (!h || h <= 0) return '0h';
    return formatHours(h);
}

export function ProjectHoursSummary({ tenantId, anchorIso }: Props) {
    const [period, setPeriod]   = useState<PeriodKind>('month');
    const [dayIso, setDayIso]   = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
    const [fromIso, setFromIso] = useState<string>(anchorIso);
    const [toIso, setToIso]     = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));

    const [projects, setProjects] = useState<Project[]>([]);
    const [entries, setEntries]   = useState<AgendaEntry[]>([]);
    const [tasks, setTasks]       = useState<ConsultantTaskLite[]>([]);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    // Rango temporal efectivo (hora local — nunca UTC).
    const range: PeriodRange = useMemo(() => {
        switch (period) {
            case 'day':   return buildPeriodRange('day',   new Date(dayIso + 'T00:00:00'));
            case 'month': return buildPeriodRange('month', new Date(anchorIso + 'T00:00:00'));
            case 'range': return customRange(fromIso, toIso);
            case 'week':
            default:      return buildPeriodRange('week',  new Date(anchorIso + 'T00:00:00'));
        }
    }, [period, dayIso, anchorIso, fromIso, toIso]);

    // Proyectos del tenant (una vez por tenant).
    useEffect(() => {
        if (!tenantId) return;
        getActiveProjects(tenantId)
            .then(setProjects)
            .catch(err => {
                console.error('[ProjectHoursSummary] error cargando proyectos:', err);
                setError('No se pudieron cargar los proyectos. Revisa tu conexión o los permisos del tenant.');
            });
    }, [tenantId]);

    // Datos por rango (planificado + real).
    useEffect(() => {
        if (!tenantId) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        Promise.all([
            getAgendaEntriesRange(tenantId, range),
            getConsultantTasksRange(tenantId, range),
        ]).then(([ag, ts]) => {
            if (cancelled) return;
            setEntries(ag);
            setTasks(ts);
        }).catch(err => {
            if (cancelled) return;
            console.error('[ProjectHoursSummary] error consultando horas por rango:', err);
            setError('No se pudieron cargar las horas del periodo. Reintenta; si persiste, puede faltar un índice de Firestore (revisa la consola).');
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [tenantId, range]);

    const rows = useMemo(() => aggregateProjectHours(projects, entries, tasks), [projects, entries, tasks]);
    const totals = useMemo(() => portfolioTotals(rows), [rows]);
    const withBudget = rows.filter(r => r.hasBudget);

    const toggle = (id: string) => setExpanded(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const periodBtns: { key: PeriodKind; label: string }[] = [
        { key: 'day',   label: 'Día' },
        { key: 'week',  label: 'Semana' },
        { key: 'month', label: 'Mes' },
        { key: 'range', label: 'Horquilla' },
    ];

    return (
        <section className="space-y-4">
            {/* Cabecera: título + selector de periodo */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em] flex items-center gap-2">
                    Proyectos: presupuesto vs consumido
                    {loading && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
                </h3>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center bg-secondary/40 border border-border rounded-lg p-0.5">
                        {periodBtns.map(b => (
                            <button
                                key={b.key}
                                onClick={() => setPeriod(b.key)}
                                className={cn(
                                    "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                                    period === b.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {b.label}
                            </button>
                        ))}
                    </div>

                    {period === 'day' && (
                        <input type="date" value={dayIso} onChange={e => setDayIso(e.target.value)}
                            className="bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs text-foreground outline-none focus:border-primary" />
                    )}
                    {period === 'range' && (
                        <div className="flex items-center gap-1.5">
                            <input type="date" value={fromIso} onChange={e => setFromIso(e.target.value)}
                                className="bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs text-foreground outline-none focus:border-primary" />
                            <span className="text-zinc-500 text-xs">→</span>
                            <input type="date" value={toIso} onChange={e => setToIso(e.target.value)}
                                className="bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs text-foreground outline-none focus:border-primary" />
                        </div>
                    )}
                    <span className="text-[10px] text-zinc-500 hidden md:block">
                        {format(range.from, 'dd/MM/yyyy')} – {format(range.to, 'dd/MM/yyyy')}
                    </span>
                </div>
            </div>

            {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {/* KPIs de cartera */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Kpi label="Horas reales" value={fmt(totals.real)} accent="indigo" />
                <Kpi label="Horas planificadas" value={fmt(totals.planned)} accent="zinc" />
                <Kpi label="Presupuesto" value={totals.budget > 0 ? fmt(totals.budget) : '—'} accent="zinc" />
                <Kpi label="% presupuesto usado" value={totals.budget > 0 ? `${Math.round(totals.pctBudget)}%` : '—'} accent="zinc" />
            </div>

            {/* Lista de proyectos */}
            {rows.length === 0 ? (
                <div className="text-center text-zinc-600 text-sm py-10">
                    {loading
                        ? 'Cargando horas…'
                        : 'No hay horas registradas en este periodo. Cambia el rango o registra tiempo con el temporizador.'}
                </div>
            ) : (
                <>
                    {withBudget.length === 0 && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-xs">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>
                                Ningún proyecto con horas en este periodo tiene presupuesto configurado. Defínelo en
                                Gestión de Proyectos → pestaña Ajustes → «Presupuesto de horas» para ver el avance.
                            </span>
                        </div>
                    )}
                    <div className="space-y-2">
                        {rows.map(row => (
                            <ProjectRow key={row.projectId} row={row} expanded={expanded.has(row.projectId)} onToggle={() => toggle(row.projectId)} />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}

// ── Fila de proyecto ─────────────────────────────────────────────────────────

function ProjectRow({ row, expanded, onToggle }: { row: ProjectHours; expanded: boolean; onToggle: () => void }) {
    const style = HEALTH_STYLE[row.health];
    const pct = row.budget > 0 ? Math.min((row.real / row.budget) * 100, 100) : 0;
    const plannedPct = row.budget > 0 ? Math.min((row.planned / row.budget) * 100, 100) : 0;
    const hasPhases = row.byPhase.length > 0 || row.unphased.planned > 0 || row.unphased.real > 0;

    return (
        <div className="rounded-xl bg-white/3 border border-white/5 overflow-hidden">
            <div className="flex items-center gap-3 p-3">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                <span className="text-[10px] font-mono text-zinc-500 w-12 shrink-0">{row.code}</span>
                <button onClick={onToggle} className="flex-1 min-w-0 text-left flex items-center gap-1.5">
                    {hasPhases && (expanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />)}
                    <span className="text-sm text-zinc-200 truncate">{row.name}</span>
                </button>

                {/* Cifras (desktop) */}
                <div className="hidden sm:flex items-center gap-4 text-xs shrink-0">
                    <Stat label="Plan." value={fmt(row.planned)} cls="text-zinc-400" />
                    <Stat label="Real" value={fmt(row.real)} cls="text-zinc-100 font-semibold" />
                    <Stat label="Pres." value={row.budget > 0 ? fmt(row.budget) : '—'} cls="text-zinc-400" />
                </div>

                {/* Semáforo + % */}
                {row.hasBudget ? (
                    <div className="flex items-center gap-2 shrink-0 w-32">
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden relative">
                            <div className={cn("h-full rounded-full", style.bar)} style={{ width: `${pct}%` }} />
                            {row.planned > 0 && (
                                <div className="absolute top-0 bottom-0 w-0.5 bg-white/60" style={{ left: `${plannedPct}%` }} title={`Planificado: ${fmt(row.planned)}`} />
                            )}
                        </div>
                        <span className={cn("text-xs font-bold w-9 text-right", style.text)}>{Math.round((row.real / row.budget) * 100)}%</span>
                    </div>
                ) : (
                    <span className="text-[10px] text-zinc-600 italic w-32 text-right shrink-0">sin presupuesto</span>
                )}
            </div>

            {/* Cifras (móvil) */}
            <div className="sm:hidden flex items-center gap-4 text-xs px-3 pb-3 -mt-1">
                <Stat label="Plan." value={fmt(row.planned)} cls="text-zinc-400" />
                <Stat label="Real" value={fmt(row.real)} cls="text-zinc-100 font-semibold" />
                <Stat label="Pres." value={row.budget > 0 ? fmt(row.budget) : '—'} cls="text-zinc-400" />
            </div>

            {/* Drill-down de fases */}
            {expanded && hasPhases && (
                <div className="border-t border-white/5 bg-black/10 px-3 py-2">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-zinc-500">
                                <th className="text-left font-semibold py-1.5">Fase</th>
                                <th className="text-right font-semibold py-1.5 w-20">Pres.</th>
                                <th className="text-right font-semibold py-1.5 w-20">Plan.</th>
                                <th className="text-right font-semibold py-1.5 w-20">Real</th>
                                <th className="text-right font-semibold py-1.5 w-12">%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {row.byPhase.map(ph => {
                                const p = ph.budget > 0 ? Math.round((ph.real / ph.budget) * 100) : 0;
                                return (
                                    <tr key={ph.phaseId} className="border-t border-white/5">
                                        <td className="py-1.5 text-zinc-300">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ph.color || '#888' }} />
                                                {ph.name || '(fase)'}
                                            </span>
                                        </td>
                                        <td className="py-1.5 text-right text-zinc-400">{ph.budget > 0 ? fmt(ph.budget) : '—'}</td>
                                        <td className="py-1.5 text-right text-zinc-400">{fmt(ph.planned)}</td>
                                        <td className="py-1.5 text-right text-zinc-200 font-medium">{fmt(ph.real)}</td>
                                        <td className={cn("py-1.5 text-right font-semibold", ph.budget > 0 && p > 100 ? "text-red-400" : "text-zinc-400")}>
                                            {ph.budget > 0 ? `${p}%` : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                            {(row.unphased.planned > 0 || row.unphased.real > 0) && (
                                <tr className="border-t border-white/5 opacity-70">
                                    <td className="py-1.5 text-zinc-500 italic">Sin fase</td>
                                    <td className="py-1.5 text-right text-zinc-600">—</td>
                                    <td className="py-1.5 text-right text-zinc-400">{fmt(row.unphased.planned)}</td>
                                    <td className="py-1.5 text-right text-zinc-200">{fmt(row.unphased.real)}</td>
                                    <td className="py-1.5 text-right text-zinc-600">—</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    {row.byPhase.length === 0 && (
                        <p className="text-[10px] text-zinc-600 italic pt-1">
                            Sin fases definidas. Configúralas en el proyecto para desglosar el presupuesto.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

function Stat({ label, value, cls }: { label: string; value: string; cls?: string }) {
    return (
        <div className="flex flex-col items-end leading-tight">
            <span className="text-[9px] text-zinc-600 uppercase">{label}</span>
            <span className={cn("tabular-nums", cls)}>{value}</span>
        </div>
    );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: 'indigo' | 'zinc' }) {
    return (
        <div className={cn(
            "p-4 rounded-xl border",
            accent === 'indigo' ? "bg-indigo-600/10 border-indigo-500/20" : "bg-white/3 border-white/5"
        )}>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
            <p className={cn("text-2xl font-black", accent === 'indigo' ? "text-indigo-300" : "text-white")}>{value}</p>
        </div>
    );
}

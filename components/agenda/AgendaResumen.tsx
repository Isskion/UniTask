"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
    AgendaEntry, AgendaConsultant, AgendaFilters,
    ActivityType, ACTIVITY_CONFIG, RESULT_CONFIG, ResultStatus,
    ACTIVITY_TKEYS, RESULT_TKEYS,
} from "@/types/agenda";
import { formatHours } from "@/lib/agenda-utils";
import { SAMRegion } from "@/lib/agenda";
import { getActiveProjects } from "@/lib/projects";
import { useLanguage } from "@/context/LanguageContext";
import { Timestamp } from "firebase/firestore";
import { ProjectHoursSummary } from "./ProjectHoursSummary";

interface Props {
    entries:          AgendaEntry[];
    consultants:      AgendaConsultant[];
    filters:          AgendaFilters;
    weekLabel:        string;
    samRegions:       SAMRegion[];
    tenantId?:        string;
    weekStartIso?:    string;
    activeFilterCount?: number;
    onClearFilters?:    () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDate(ts: any): Date {
    if (!ts) return new Date(0);
    if (typeof ts.toDate === 'function') return ts.toDate();
    if (typeof ts.seconds === 'number')  return new Date(ts.seconds * 1000);
    return new Date(ts);
}

function regionMatches(value: string, filterRegion: string, samRegions: SAMRegion[]): boolean {
    const samR = samRegions.find(r => r.name === filterRegion);
    return samR
        ? (value === samR.name || value === samR.id)
        : (value === filterRegion);
}

function filterEntries(entries: AgendaEntry[], filters: AgendaFilters, samRegions: SAMRegion[]): AgendaEntry[] {
    return entries.filter(e => {
        if (e.isActive === false) return false;
        if (filters.region !== 'ALL' && !regionMatches(e.region, filters.region, samRegions)) return false;
        if (filters.consultantIds.length  && !filters.consultantIds.includes(e.consultantId))    return false;
        if (filters.activityTypes.length  && !filters.activityTypes.includes(e.activityType))    return false;
        if (filters.results.length        && !filters.results.includes(e.result))                return false;
        return true;
    });
}

export function AgendaResumen({ entries, consultants, filters, weekLabel, samRegions, tenantId, weekStartIso, activeFilterCount = 0, onClearFilters }: Props) {
    const { t } = useLanguage();
    const visible = useMemo(() => filterEntries(entries, filters, samRegions), [entries, filters, samRegions]);

    // Proyectos inactivos (ej. dados de baja) no deben aparecer en "Por proyecto" — algunas entradas
    // llevan projectId denormalizado de un proyecto ya desactivado, así que hay que comprobar contra
    // la lista de proyectos activos, no basta con que la entrada tenga projectId.
    const [activeProjectIds, setActiveProjectIds] = useState<Set<string>>(new Set());
    useEffect(() => {
        if (!tenantId) return;
        let cancelled = false;
        getActiveProjects(tenantId)
            .then(list => { if (!cancelled) setActiveProjectIds(new Set(list.map(p => p.id))); })
            .catch(err => console.error('[AgendaResumen] error cargando proyectos activos:', err));
        return () => { cancelled = true; };
    }, [tenantId]);

    // ── 1. Por consultor ──────────────────────────────────────────────────────
    const byConsultant = useMemo(() => {
        const map = new Map<string, { consultant: AgendaConsultant; hours: number; byActivity: Partial<Record<ActivityType, number>> }>();
        consultants.forEach(c => map.set(c.userId, { consultant: c, hours: 0, byActivity: {} }));
        visible.forEach(e => {
            if (!map.has(e.consultantId)) return;
            const row = map.get(e.consultantId)!;
            row.hours += e.scheduledHours || 0;
            row.byActivity[e.activityType] = (row.byActivity[e.activityType] || 0) + (e.scheduledHours || 0);
        });
        return [...map.values()]
            .filter(r => r.hours > 0 || filters.consultantIds.includes(r.consultant.userId))
            .sort((a, b) => a.consultant.sortOrder - b.consultant.sortOrder);
    }, [visible, consultants, filters]);

    // ── 2. Por proyecto ───────────────────────────────────────────────────────
    const byProject = useMemo(() => {
        const map = new Map<string, { id: string; name: string; code: string; color: string; hours: number; consultants: Set<string> }>();
        visible.filter(e => e.projectId && activeProjectIds.has(e.projectId)).forEach(e => {
            const key = e.projectId!;
            if (!map.has(key)) {
                map.set(key, { id: key, name: e.projectName || key, code: e.projectCode || '', color: e.projectColor || '#6b7280', hours: 0, consultants: new Set() });
            }
            const row = map.get(key)!;
            row.hours += e.scheduledHours || 0;
            row.consultants.add(e.consultantName);
        });
        return [...map.values()].sort((a, b) => b.hours - a.hours);
    }, [visible, activeProjectIds]);

    // ── 3. Por actividad ──────────────────────────────────────────────────────
    const byActivity = useMemo(() => {
        const map = new Map<ActivityType, number>();
        visible.forEach(e => {
            map.set(e.activityType, (map.get(e.activityType) || 0) + (e.scheduledHours || 0));
        });
        return [...map.entries()].filter(([, h]) => h > 0).sort(([, a], [, b]) => b - a);
    }, [visible]);

    // ── 4. Por estado ─────────────────────────────────────────────────────────
    const byResult = useMemo(() => {
        const map = new Map<ResultStatus, number>();
        visible.forEach(e => {
            map.set(e.result, (map.get(e.result) || 0) + 1);
        });
        return [...map.entries()];
    }, [visible]);

    const totalHours   = useMemo(() => visible.reduce((s, e) => s + (e.scheduledHours || 0), 0), [visible]);
    const totalEntries = visible.length;

    const usedActivityTypes = useMemo(() =>
        Object.values(ActivityType).filter(actType => byConsultant.some(r => (r.byActivity[actType] || 0) > 0)),
    [byConsultant]);

    return (
        <div className="flex-1 overflow-auto custom-scrollbar p-5 space-y-6">

            {/* ── Proyectos: presupuesto vs planificado vs real (rango temporal) ── */}
            {tenantId && weekStartIso && (
                <ProjectHoursSummary tenantId={tenantId} anchorIso={weekStartIso} />
            )}

            {visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-zinc-600 text-sm py-16 gap-3">
                    <p>{activeFilterCount > 0 ? t('agenda.noDataFiltered') : t('agenda.noDataWeek')}</p>
                    {activeFilterCount > 0 && onClearFilters && (
                        <button
                            onClick={onClearFilters}
                            className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
                        >
                            {t('agenda.clearFilters')} ({activeFilterCount})
                        </button>
                    )}
                </div>
            ) : (
            <>
            {/* ── KPIs ─────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Kpi label={t('agenda.hoursPlanned')} value={formatHours(totalHours)} accent="indigo" />
                <Kpi label={t('agenda.totalEntries')} value={String(totalEntries)} accent="zinc" />
                <Kpi label={t('agenda.activeCount')} value={String(byConsultant.length)} accent="zinc" />
                <Kpi label={t('agenda.projectsCount')} value={String(byProject.length)} accent="zinc" />
            </div>

            {/* ── Tabla consultores × actividad ─────────────────────────────── */}
            <section>
                <SectionTitle>{t('agenda.hoursByConsultant')}</SectionTitle>
                <div className="overflow-x-auto rounded-xl border border-white/5">
                    <table className="w-full text-xs border-collapse" style={{ minWidth: '600px' }}>
                        <thead>
                            <tr className="bg-white/3 border-b border-white/5">
                                <th className="text-left px-4 py-2.5 text-zinc-400 font-semibold w-40">{t('agenda.consultantCol')}</th>
                                {usedActivityTypes.map(actType => (
                                    <th key={actType} className="px-3 py-2.5 text-center">
                                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold", ACTIVITY_CONFIG[actType].bgClass, ACTIVITY_CONFIG[actType].textClass)}>
                                            {t(ACTIVITY_TKEYS[actType]) || ACTIVITY_CONFIG[actType].label}
                                        </span>
                                    </th>
                                ))}
                                <th className="px-4 py-2.5 text-right text-zinc-400 font-semibold">{t('agenda.totalCol')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {byConsultant.map(({ consultant, hours, byActivity }) => (
                                <tr key={consultant.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-foreground/70")}>
                                                {consultant.region.slice(0, 3).toUpperCase()}
                                            </span>
                                            <span className="text-zinc-200 font-medium truncate">{consultant.name}</span>
                                        </div>
                                    </td>
                                    {usedActivityTypes.map(actType => (
                                        <td key={actType} className="px-3 py-2.5 text-center">
                                            {(byActivity[actType] || 0) > 0
                                                ? <span className={cn("font-semibold", ACTIVITY_CONFIG[actType].textClass)}>{formatHours(byActivity[actType]!)}</span>
                                                : <span className="text-zinc-700">—</span>
                                            }
                                        </td>
                                    ))}
                                    <td className="px-4 py-2.5 text-right font-bold text-white">{formatHours(hours)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-white/3 border-t border-white/10">
                                <td className="px-4 py-2.5 text-zinc-400 font-semibold text-xs uppercase tracking-wider">{t('agenda.totalCol')}</td>
                                {usedActivityTypes.map(actType => {
                                    const total = byConsultant.reduce((s, r) => s + (r.byActivity[actType] || 0), 0);
                                    return (
                                        <td key={actType} className="px-3 py-2.5 text-center">
                                            {total > 0 ? <span className="text-zinc-300 font-semibold">{formatHours(total)}</span> : <span className="text-zinc-700">—</span>}
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-2.5 text-right font-bold text-white text-sm">{formatHours(totalHours)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </section>

            {/* ── Proyectos ─────────────────────────────────────────────────── */}
            {byProject.length > 0 && (
                <section>
                    <SectionTitle>{t('agenda.byProject')}</SectionTitle>
                    <div className="space-y-2">
                        {byProject.map(p => {
                            const pct = totalHours > 0 ? (p.hours / totalHours) * 100 : 0;
                            return (
                                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                                    <span className="text-[10px] font-mono text-zinc-500 w-12 shrink-0">{p.code}</span>
                                    <span className="text-sm text-zinc-200 flex-1 truncate">{p.name}</span>
                                    <span className="text-[10px] text-zinc-500 shrink-0 hidden sm:block">
                                        {[...p.consultants].join(', ')}
                                    </span>
                                    <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden shrink-0">
                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-sm font-semibold text-zinc-200 w-16 text-right shrink-0">{formatHours(p.hours)}</span>
                                </div>
                            );
                        })}
                        {/* Sin proyecto */}
                        {(() => {
                            const sinProyecto = visible.filter(e => !e.projectId).reduce((s, e) => s + (e.scheduledHours || 0), 0);
                            if (sinProyecto <= 0) return null;
                            const pct = totalHours > 0 ? (sinProyecto / totalHours) * 100 : 0;
                            return (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5 opacity-60">
                                    <span className="w-3 h-3 rounded-full bg-zinc-700 shrink-0" />
                                    <span className="text-[10px] font-mono text-zinc-600 w-12 shrink-0">—</span>
                                    <span className="text-sm text-zinc-500 flex-1">{t('agenda.noProjectAssigned')}</span>
                                    <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden shrink-0">
                                        <div className="h-full bg-zinc-600 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-sm font-semibold text-zinc-500 w-16 text-right shrink-0">{formatHours(sinProyecto)}</span>
                                </div>
                            );
                        })()}
                    </div>
                </section>
            )}

            {/* ── Actividad + Estado (fila) ─────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                {/* Actividad */}
                <section>
                    <SectionTitle>{t('agenda.byActivity')}</SectionTitle>
                    <div className="space-y-1.5">
                        {byActivity.map(([type, hours]) => {
                            const cfg = ACTIVITY_CONFIG[type];
                            const pct = totalHours > 0 ? (hours / totalHours) * 100 : 0;
                            return (
                                <div key={type} className="flex items-center gap-3">
                                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded w-36 truncate text-center", cfg.bgClass, cfg.textClass)}>
                                        {t(ACTIVITY_TKEYS[type]) || cfg.label}
                                    </span>
                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                                    </div>
                                    <span className="text-sm font-semibold text-zinc-300 w-14 text-right shrink-0">{formatHours(hours)}</span>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Estado */}
                <section>
                    <SectionTitle>{t('agenda.byStatus')}</SectionTitle>
                    <div className="space-y-1.5">
                        {byResult.map(([status, count]) => {
                            const cfg = RESULT_CONFIG[status];
                            const pct = totalEntries > 0 ? (count / totalEntries) * 100 : 0;
                            return (
                                <div key={status} className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 w-36 shrink-0">
                                        <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dotClass)} />
                                        <span className="text-xs text-zinc-300 truncate">{t(RESULT_TKEYS[status]) || cfg.label}</span>
                                    </div>
                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className={cn("h-full rounded-full", cfg.dotClass)} style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-sm font-semibold text-zinc-300 w-14 text-right shrink-0">{count} <span className="text-zinc-600 font-normal text-[10px]">({Math.round(pct)}%)</span></span>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
            </>
            )}
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em] mb-3">{children}</h3>;
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: 'indigo' | 'zinc' }) {
    return (
        <div className={cn(
            "p-4 rounded-xl border",
            accent === 'indigo'
                ? "bg-indigo-600/10 border-indigo-500/20"
                : "bg-white/3 border-white/5"
        )}>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
            <p className={cn("text-2xl font-black", accent === 'indigo' ? "text-indigo-300" : "text-white")}>{value}</p>
        </div>
    );
}

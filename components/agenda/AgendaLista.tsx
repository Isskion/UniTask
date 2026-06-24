"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, List, Download, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    AgendaEntry, AgendaConsultant, AgendaFilters,
    ActivityType, ResultStatus,
    ACTIVITY_CONFIG, RESULT_CONFIG, ACTIVITY_TKEYS, RESULT_TKEYS,
} from "@/types/agenda";
import { useLanguage } from "@/context/LanguageContext";
import { formatHours } from "@/lib/agenda-utils";
import { AgendaExportModal } from "./AgendaExportModal";

type SortField = 'date' | 'consultant' | 'activityType' | 'client' | 'schedule' | 'scheduledHours' | 'result' | 'projectName';
type SortDir   = 'asc' | 'desc';

interface AgendaListaProps {
    entries:              AgendaEntry[];
    consultants:          AgendaConsultant[];
    filters:              AgendaFilters;
    weekLabel:            string;
    weekDays:             Date[];
    availableRegions:     string[];
    availableDivisions:   string[];
    onToggleConsultant:   (id: string) => void;
    onToggleActivity:     (act: ActivityType) => void;
    onToggleResult:       (r: ResultStatus) => void;
    onToggleDivision:     (div: string) => void;
    onSetRegion:          (r: string) => void;
    onClearGlobalFilters: () => void;
}

function toIso(date: Date): string { return format(date, 'yyyy-MM-dd'); }
function entryIso(e: AgendaEntry): string {
    const d = e.date instanceof Timestamp ? e.date.toDate() : new Date(e.date as unknown as string);
    return toIso(d);
}

export function AgendaLista({
    entries, consultants, filters, weekLabel, weekDays,
    availableRegions, availableDivisions,
    onToggleConsultant, onToggleActivity, onToggleResult,
    onToggleDivision, onSetRegion, onClearGlobalFilters,
}: AgendaListaProps) {
    const { t } = useLanguage();

    // ── Local filter state (lista-only) ───────────────────────────────────────
    const [search,           setSearch]           = useState('');
    const [selectedDays,     setSelectedDays]     = useState<string[]>([]);
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const [sortField,        setSortField]        = useState<SortField>('date');
    const [sortDir,          setSortDir]          = useState<SortDir>('asc');
    const [showExport,       setShowExport]       = useState(false);

    // ── 1. Global filters (from AgendaView) ───────────────────────────────────
    const baseFiltered = useMemo(() => entries.filter(e => {
        if (filters.consultantIds.length > 0 && !filters.consultantIds.includes(e.consultantId)) return false;
        if (filters.activityTypes.length > 0 && !filters.activityTypes.includes(e.activityType)) return false;
        if (filters.results.length > 0       && !filters.results.includes(e.result))             return false;
        if (filters.divisions?.length > 0    && !filters.divisions.includes(e.divisionName))     return false;
        return true;
    }), [entries, filters]);

    // ── 2. Day filter ─────────────────────────────────────────────────────────
    const dayFiltered = useMemo(() =>
        selectedDays.length === 0 ? baseFiltered
            : baseFiltered.filter(e => selectedDays.includes(entryIso(e)))
    , [baseFiltered, selectedDays]);

    // ── 3. Project filter ─────────────────────────────────────────────────────
    const availableProjects = useMemo(() => {
        const map = new Map<string, { id: string; code: string; name: string; color: string }>();
        baseFiltered.forEach(e => {
            if (e.projectId && !map.has(e.projectId))
                map.set(e.projectId, {
                    id: e.projectId, code: e.projectCode || e.projectId,
                    name: e.projectName || '', color: e.projectColor || '#6b7280',
                });
        });
        return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
    }, [baseFiltered]);

    const projectFiltered = useMemo(() =>
        selectedProjects.length === 0 ? dayFiltered
            : dayFiltered.filter(e => e.projectId && selectedProjects.includes(e.projectId))
    , [dayFiltered, selectedProjects]);

    // ── 4. Text search ────────────────────────────────────────────────────────
    const searched = useMemo(() => {
        if (!search.trim()) return projectFiltered;
        const q = search.toLowerCase();
        return projectFiltered.filter(e =>
            e.consultantName.toLowerCase().includes(q)     ||
            e.client.toLowerCase().includes(q)             ||
            e.description.toLowerCase().includes(q)        ||
            (e.projectName || '').toLowerCase().includes(q)||
            e.activityType.toLowerCase().includes(q)
        );
    }, [projectFiltered, search]);

    // ── 5. Sort ───────────────────────────────────────────────────────────────
    // Tareas sin horario (scheduleStart vacío) van detrás de las que sí tienen hora.
    // Con la misma hora de inicio, gana (va primero) la que termina antes.
    function compareSchedule(a: AgendaEntry, b: AgendaEntry): number {
        const sa = a.scheduleStart || '99:99';
        const sb = b.scheduleStart || '99:99';
        if (sa !== sb) return sa < sb ? -1 : 1;
        const ea = a.scheduleEnd || '99:99';
        const eb = b.scheduleEnd || '99:99';
        return ea < eb ? -1 : ea > eb ? 1 : 0;
    }

    const sorted = useMemo(() => [...searched].sort((a, b) => {
        let cmp: number;
        switch (sortField) {
            case 'date': {
                const da = (a.date as Timestamp).seconds ?? 0;
                const db = (b.date as Timestamp).seconds ?? 0;
                cmp = da !== db ? da - db : compareSchedule(a, b);
                break;
            }
            case 'schedule':      cmp = compareSchedule(a, b); break;
            case 'consultant':    cmp = a.consultantName.localeCompare(b.consultantName); break;
            case 'activityType':  cmp = a.activityType.localeCompare(b.activityType);     break;
            case 'client':        cmp = a.client.localeCompare(b.client);                 break;
            case 'scheduledHours':cmp = a.scheduledHours - b.scheduledHours;              break;
            case 'result':        cmp = a.result.localeCompare(b.result);                 break;
            case 'projectName':   cmp = (a.projectName || '').localeCompare(b.projectName || ''); break;
            default: cmp = 0;
        }
        return sortDir === 'asc' ? cmp : -cmp;
    }), [searched, sortField, sortDir]);

    const totalHours = sorted.reduce((acc, e) => acc + (e.scheduledHours || 0), 0);

    // ── Helpers ───────────────────────────────────────────────────────────────
    function handleSort(field: SortField) {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    }
    const toggleDay     = (iso: string) => setSelectedDays(p => p.includes(iso) ? p.filter(d => d !== iso) : [...p, iso]);
    const toggleProject = (id: string)  => setSelectedProjects(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

    const localActive  = selectedDays.length > 0 || selectedProjects.length > 0 || search.trim().length > 0;
    const globalActive = filters.consultantIds.length > 0 || filters.activityTypes.length > 0 ||
                         filters.results.length > 0 || filters.region !== 'ALL' || (filters.divisions?.length ?? 0) > 0;

    function clearAll() {
        setSelectedDays([]);
        setSelectedProjects([]);
        setSearch('');
        onClearGlobalFilters();
    }

    function SortIcon({ field }: { field: SortField }) {
        if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
        return sortDir === 'asc'
            ? <ChevronUp   className="w-3 h-3 text-indigo-400" />
            : <ChevronDown className="w-3 h-3 text-indigo-400" />;
    }

    type ColDef = { field: SortField | null; label: string };
    const columns: ColDef[] = [
        { field: 'date',           label: 'Fecha'                    },
        { field: 'consultant',     label: t('agenda.consultantCol')  },
        { field: 'activityType',   label: t('agenda.activityFilter') },
        { field: 'client',         label: t('agenda.clientLabel')    },
        { field: null,             label: t('agenda.descLabel')      },
        { field: 'schedule',       label: t('agenda.schedule')       },
        { field: 'scheduledHours', label: t('agenda.plannedAbbr')   },
        { field: 'result',         label: t('agenda.statusLabel')    },
        { field: 'projectName',    label: t('agenda.project')       },
    ];

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <div className="flex flex-col flex-1 overflow-hidden">

                {/* ── Toolbar ───────────────────────────────────────────────── */}
                <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card/30 shrink-0 flex-wrap">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        <input
                            type="text"
                            placeholder={t('agenda.listSearch')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-8 pr-3 py-1.5 w-52 text-xs bg-secondary/40 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                        />
                    </div>

                    <span className="text-xs text-muted-foreground ml-auto">
                        {sorted.length} {t('agenda.nEntries')} · <span className="font-semibold text-foreground">{formatHours(totalHours)}</span> {t('agenda.plannedAbbr')}
                    </span>

                    {(localActive || globalActive) && (
                        <button
                            onClick={clearAll}
                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-3 h-3" />
                            {t('agenda.clearFilters')}
                        </button>
                    )}

                    <button
                        onClick={() => setShowExport(true)}
                        disabled={sorted.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/10 border border-indigo-600/30 text-indigo-500 hover:bg-indigo-600/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Download className="w-3.5 h-3.5" />
                        {t('agenda.exportBtn')}
                    </button>
                </div>

                {/* ── Filter strip ──────────────────────────────────────────── */}
                <div className="flex flex-col gap-2 px-4 py-2.5 border-b border-border bg-card/20 shrink-0">

                    {/* Row 1: Days */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-16 shrink-0">Días</span>
                        <div className="flex gap-1">
                            {weekDays.map(day => {
                                const iso      = toIso(day);
                                const active   = selectedDays.includes(iso);
                                const abbr     = format(day, 'EEE', { locale: es }).slice(0, 2).toUpperCase();
                                const num      = format(day, 'd');
                                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                return (
                                    <button key={iso} onClick={() => toggleDay(iso)}
                                        className={cn(
                                            "flex flex-col items-center px-1.5 py-0.5 rounded text-[10px] font-medium border transition-all min-w-[28px]",
                                            active    ? "bg-indigo-600 border-indigo-600 text-white"
                                            : isWeekend ? "bg-secondary/20 border-border text-muted-foreground/40"
                                            : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                                        )}
                                    >
                                        <span className="font-bold leading-none">{abbr}</span>
                                        <span className="opacity-70 leading-none mt-0.5">{num}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Row 2: Projects (only if any exist in data) */}
                    {availableProjects.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-16 shrink-0">{t('agenda.project')}</span>
                            <div className="flex flex-wrap gap-1">
                                {availableProjects.map(p => {
                                    const active = selectedProjects.includes(p.id);
                                    return (
                                        <button key={p.id} onClick={() => toggleProject(p.id)}
                                            className={cn(
                                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all",
                                                active ? "bg-secondary border-border text-foreground font-semibold"
                                                       : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                                            )}
                                        >
                                            <span
                                                className={cn("w-1.5 h-1.5 rounded-sm shrink-0", !active && "bg-muted-foreground/40")}
                                                style={active ? { backgroundColor: p.color } : undefined}
                                            />
                                            {p.code}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Row 3: Activity types */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-16 shrink-0">{t('agenda.activityFilter')}</span>
                        <div className="flex flex-wrap gap-1">
                            {Object.values(ActivityType).map(act => {
                                const cfg      = ACTIVITY_CONFIG[act];
                                const selected = filters.activityTypes.includes(act);
                                return (
                                    <button key={act} onClick={() => onToggleActivity(act)}
                                        className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all",
                                            selected ? `${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass}`
                                                     : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                                        )}
                                    >
                                        {t(ACTIVITY_TKEYS[act]) || cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Row 4: Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-16 shrink-0">{t('agenda.statusFilter')}</span>
                        <div className="flex flex-wrap gap-1">
                            {Object.values(ResultStatus).map(r => {
                                const cfg      = RESULT_CONFIG[r];
                                const selected = filters.results.includes(r);
                                return (
                                    <button key={r} onClick={() => onToggleResult(r)}
                                        className={cn(
                                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all",
                                            selected ? "bg-secondary border-border text-foreground font-semibold"
                                                     : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                                        )}
                                    >
                                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dotClass)} />
                                        {t(RESULT_TKEYS[r]) || cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Row 5: Region (only if >1 available) */}
                    {availableRegions.length > 1 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-16 shrink-0">{t('agenda.region')}</span>
                            <div className="flex flex-wrap gap-1">
                                {(['ALL', ...availableRegions]).map(r => (
                                    <button key={r} onClick={() => onSetRegion(r)}
                                        className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all",
                                            filters.region === r
                                                ? "bg-indigo-600 border-indigo-600 text-white"
                                                : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                                        )}
                                    >
                                        {r === 'ALL' ? t('agenda.allRegions') : r}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Row 6: Division (only if >1 available) */}
                    {availableDivisions.length > 1 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-16 shrink-0">{t('agenda.divisionFilter')}</span>
                            <div className="flex flex-wrap gap-1">
                                {availableDivisions.map(div => (
                                    <button key={div} onClick={() => onToggleDivision(div)}
                                        className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all",
                                            filters.divisions?.includes(div)
                                                ? "bg-violet-600 border-violet-600 text-white"
                                                : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                                        )}
                                    >
                                        {div}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Row 7: Consultants */}
                    {consultants.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-16 shrink-0">{t('agenda.manageBtn')}</span>
                            <div className="flex flex-wrap gap-1">
                                {consultants.map(c => (
                                    <button key={c.id} onClick={() => onToggleConsultant(c.userId)}
                                        className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all",
                                            filters.consultantIds.includes(c.userId)
                                                ? "bg-indigo-600 border-indigo-600 text-white"
                                                : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                                        )}
                                    >
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Table ─────────────────────────────────────────────────── */}
                <div className="flex-1 overflow-auto">
                    {sorted.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                            <List className="w-10 h-10 opacity-20" />
                            <p className="text-sm">{t('agenda.noData')}</p>
                        </div>
                    ) : (
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-card border-b border-border shadow-sm">
                                <tr>
                                    {columns.map(({ field, label }, i) => (
                                        <th key={i} onClick={() => field && handleSort(field)}
                                            className={cn(
                                                "px-3 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap",
                                                field && "cursor-pointer hover:text-foreground select-none"
                                            )}
                                        >
                                            <span className="flex items-center gap-1">
                                                {label}
                                                {field && <SortIcon field={field} />}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {sorted.map((e, idx) => {
                                    const date   = e.date instanceof Timestamp ? e.date.toDate() : new Date(e.date as unknown as string);
                                    const actCfg = ACTIVITY_CONFIG[e.activityType];
                                    const resCfg = RESULT_CONFIG[e.result];
                                    return (
                                        <tr key={e.id} className={cn(
                                            "border-b border-border/40 transition-colors hover:bg-accent/40",
                                            idx % 2 !== 0 && "bg-secondary/10"
                                        )}>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="font-medium text-foreground">{format(date, 'dd/MM/yyyy')}</div>
                                                <div className="text-[10px] text-muted-foreground capitalize">{format(date, 'EEE', { locale: es })}</div>
                                                {e.needsDateReview && (
                                                    <div
                                                        className="flex items-center gap-1 text-[9px] font-semibold text-amber-400 mt-0.5"
                                                        title="Fecha estimada al importar — revisa el día real o reimporta cuando el Excel tenga la fecha correcta"
                                                    >
                                                        <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                                        Revisar fecha
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-foreground">{e.consultantName}</td>
                                            <td className="px-3 py-2">
                                                <span className={cn(
                                                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap",
                                                    actCfg.bgClass, actCfg.textClass, actCfg.borderClass
                                                )}>
                                                    {t(ACTIVITY_TKEYS[e.activityType]) || e.activityType}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{e.client || '—'}</td>
                                            <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate" title={e.description}>
                                                {e.description || '—'}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground whitespace-nowrap tabular-nums">
                                                {e.scheduleStart && e.scheduleEnd ? (
                                                    <>
                                                        {e.scheduleStart} - {e.scheduleEnd}
                                                        {e.scheduledHours > 0 && (
                                                            <span className="ml-1.5 text-foreground font-medium">{formatHours(e.scheduledHours)}</span>
                                                        )}
                                                    </>
                                                ) : (
                                                    e.scheduleRaw || '—'
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-right font-semibold text-foreground tabular-nums whitespace-nowrap">
                                                {formatHours(e.scheduledHours)}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className="flex items-center gap-1.5 whitespace-nowrap">
                                                    <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", resCfg.dotClass)} />
                                                    <span className={cn("text-[10px] font-medium", resCfg.textClass)}>
                                                        {t(RESULT_TKEYS[e.result]) || e.result}
                                                    </span>
                                                </span>
                                            </td>
                                            <td className="px-3 py-2">
                                                {e.projectCode ? (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        {e.projectColor && (
                                                            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: e.projectColor }} />
                                                        )}
                                                        <span className="font-medium text-foreground">{e.projectCode}</span>
                                                        {e.projectName && (
                                                            <span className="text-muted-foreground">· {e.projectName}</span>
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground/40">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>

                            <tfoot className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t-2 border-indigo-500/30">
                                <tr>
                                    <td colSpan={6} className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        {t('agenda.weekTotal')}
                                    </td>
                                    <td className="px-3 py-2 text-right text-sm font-bold text-foreground tabular-nums">
                                        {formatHours(totalHours)}
                                    </td>
                                    <td colSpan={2} />
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
            </div>

            {showExport && (
                <AgendaExportModal
                    entries={sorted}
                    totalHours={totalHours}
                    weekLabel={weekLabel}
                    onClose={() => setShowExport(false)}
                />
            )}
        </>
    );
}

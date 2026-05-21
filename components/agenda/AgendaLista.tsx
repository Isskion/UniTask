"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, List, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    AgendaEntry, AgendaConsultant, AgendaFilters,
    ACTIVITY_CONFIG, RESULT_CONFIG, ACTIVITY_TKEYS, RESULT_TKEYS,
} from "@/types/agenda";
import { useLanguage } from "@/context/LanguageContext";
import { formatHours } from "@/lib/agenda-utils";
import { AgendaExportModal } from "./AgendaExportModal";

type SortField = 'date' | 'consultant' | 'activityType' | 'client' | 'scheduledHours' | 'result' | 'projectName';
type SortDir   = 'asc' | 'desc';

interface AgendaListaProps {
    entries:     AgendaEntry[];
    consultants: AgendaConsultant[];
    filters:     AgendaFilters;
    weekLabel:   string;
    weekDays:    Date[];
}

function toIso(date: Date): string {
    return format(date, 'yyyy-MM-dd');
}

function entryIso(e: AgendaEntry): string {
    const d = e.date instanceof Timestamp ? e.date.toDate() : new Date(e.date as unknown as string);
    return toIso(d);
}

export function AgendaLista({ entries, filters, weekLabel, weekDays }: AgendaListaProps) {
    const { t } = useLanguage();

    // ── Local filter state ────────────────────────────────────────────────────
    const [search,          setSearch]         = useState('');
    const [selectedDays,    setSelectedDays]   = useState<string[]>([]);   // ISO dates
    const [selectedProjects,setSelectedProjects] = useState<string[]>([]);  // projectIds
    const [sortField,       setSortField]      = useState<SortField>('date');
    const [sortDir,         setSortDir]        = useState<SortDir>('asc');
    const [showExport,      setShowExport]     = useState(false);

    // ── 1. Global filters (from AgendaView panel) ─────────────────────────────
    const baseFiltered = useMemo(() => entries.filter(e => {
        if (filters.consultantIds.length > 0 && !filters.consultantIds.includes(e.consultantId)) return false;
        if (filters.activityTypes.length > 0 && !filters.activityTypes.includes(e.activityType)) return false;
        if (filters.results.length > 0       && !filters.results.includes(e.result))             return false;
        if (filters.divisions?.length > 0    && !filters.divisions.includes(e.divisionName))     return false;
        return true;
    }), [entries, filters]);

    // ── 2. Day filter ─────────────────────────────────────────────────────────
    const dayFiltered = useMemo(() => {
        if (selectedDays.length === 0) return baseFiltered;
        return baseFiltered.filter(e => selectedDays.includes(entryIso(e)));
    }, [baseFiltered, selectedDays]);

    // ── 3. Project filter ─────────────────────────────────────────────────────
    const availableProjects = useMemo(() => {
        const map = new Map<string, { id: string; code: string; name: string; color: string }>();
        baseFiltered.forEach(e => {
            if (e.projectId && !map.has(e.projectId)) {
                map.set(e.projectId, {
                    id:    e.projectId,
                    code:  e.projectCode  || e.projectId,
                    name:  e.projectName  || '',
                    color: e.projectColor || '#6b7280',
                });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
    }, [baseFiltered]);

    const projectFiltered = useMemo(() => {
        if (selectedProjects.length === 0) return dayFiltered;
        return dayFiltered.filter(e => e.projectId && selectedProjects.includes(e.projectId));
    }, [dayFiltered, selectedProjects]);

    // ── 4. Text search ────────────────────────────────────────────────────────
    const searched = useMemo(() => {
        if (!search.trim()) return projectFiltered;
        const q = search.toLowerCase();
        return projectFiltered.filter(e =>
            e.consultantName.toLowerCase().includes(q)       ||
            e.client.toLowerCase().includes(q)               ||
            e.description.toLowerCase().includes(q)          ||
            (e.projectName || '').toLowerCase().includes(q)  ||
            e.activityType.toLowerCase().includes(q)
        );
    }, [projectFiltered, search]);

    // ── 5. Sort ───────────────────────────────────────────────────────────────
    const sorted = useMemo(() => [...searched].sort((a, b) => {
        let va: string | number;
        let vb: string | number;
        switch (sortField) {
            case 'date':
                va = (a.date as Timestamp).seconds ?? 0;
                vb = (b.date as Timestamp).seconds ?? 0;
                break;
            case 'consultant':    va = a.consultantName;    vb = b.consultantName;    break;
            case 'activityType':  va = a.activityType;      vb = b.activityType;      break;
            case 'client':        va = a.client;            vb = b.client;            break;
            case 'scheduledHours':va = a.scheduledHours;    vb = b.scheduledHours;    break;
            case 'result':        va = a.result;            vb = b.result;            break;
            case 'projectName':   va = a.projectName || ''; vb = b.projectName || ''; break;
            default: return 0;
        }
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
    }), [searched, sortField, sortDir]);

    const totalHours = sorted.reduce((acc, e) => acc + (e.scheduledHours || 0), 0);

    // ── Helpers ───────────────────────────────────────────────────────────────
    function handleSort(field: SortField) {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    }

    function toggleDay(iso: string) {
        setSelectedDays(prev =>
            prev.includes(iso) ? prev.filter(d => d !== iso) : [...prev, iso]
        );
    }

    function toggleProject(id: string) {
        setSelectedProjects(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    }

    const hasLocalFilters = selectedDays.length > 0 || selectedProjects.length > 0 || search.trim().length > 0;

    function clearLocalFilters() {
        setSelectedDays([]);
        setSelectedProjects([]);
        setSearch('');
    }

    function SortIcon({ field }: { field: SortField }) {
        if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
        return sortDir === 'asc'
            ? <ChevronUp   className="w-3 h-3 text-indigo-400" />
            : <ChevronDown className="w-3 h-3 text-indigo-400" />;
    }

    type ColDef = { field: SortField | null; label: string };
    const columns: ColDef[] = [
        { field: 'date',          label: 'Fecha'                    },
        { field: 'consultant',    label: t('agenda.consultantCol')  },
        { field: 'activityType',  label: t('agenda.activityFilter') },
        { field: 'client',        label: t('agenda.clientLabel')    },
        { field: null,            label: t('agenda.descLabel')      },
        { field: null,            label: t('agenda.schedule')       },
        { field: 'scheduledHours',label: t('agenda.plannedAbbr')   },
        { field: 'result',        label: t('agenda.statusLabel')    },
        { field: 'projectName',   label: t('agenda.project')       },
    ];

    return (
        <>
            <div className="flex flex-col flex-1 overflow-hidden">

                {/* ── Sub-toolbar ───────────────────────────────────────────── */}
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

                    {hasLocalFilters && (
                        <button
                            onClick={clearLocalFilters}
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
                <div className="flex flex-wrap gap-x-6 gap-y-2 px-4 py-2 border-b border-border bg-card/20 shrink-0">

                    {/* Day filter */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Días</span>
                        <div className="flex gap-1">
                            {weekDays.map(day => {
                                const iso      = toIso(day);
                                const active   = selectedDays.includes(iso);
                                const abbr     = format(day, 'EEE', { locale: es }).slice(0, 2).toUpperCase();
                                const num      = format(day, 'd');
                                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                return (
                                    <button
                                        key={iso}
                                        onClick={() => toggleDay(iso)}
                                        className={cn(
                                            "flex flex-col items-center px-1.5 py-0.5 rounded text-[10px] font-medium border transition-all leading-tight min-w-[28px]",
                                            active
                                                ? "bg-indigo-600 border-indigo-600 text-white"
                                                : isWeekend
                                                    ? "bg-secondary/20 border-border text-muted-foreground/50"
                                                    : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                                        )}
                                    >
                                        <span className="font-bold">{abbr}</span>
                                        <span className="opacity-70">{num}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Project filter — only when there are projects in the current data */}
                    {availableProjects.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">{t('agenda.project')}</span>
                            <div className="flex flex-wrap gap-1">
                                {availableProjects.map(p => {
                                    const active = selectedProjects.includes(p.id);
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => toggleProject(p.id)}
                                            className={cn(
                                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all",
                                                active
                                                    ? "bg-secondary border-border text-foreground font-semibold"
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
                                        <th
                                            key={i}
                                            onClick={() => field && handleSort(field)}
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
                                        <tr
                                            key={e.id}
                                            className={cn(
                                                "border-b border-border/40 transition-colors hover:bg-accent/40",
                                                idx % 2 !== 0 && "bg-secondary/10"
                                            )}
                                        >
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="font-medium text-foreground">{format(date, 'dd/MM/yyyy')}</div>
                                                <div className="text-[10px] text-muted-foreground capitalize">{format(date, 'EEE', { locale: es })}</div>
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
                                            <td className="px-3 py-2 text-muted-foreground whitespace-nowrap tabular-nums">{e.scheduleRaw}</td>
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
                                                            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: e.projectColor }} />
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

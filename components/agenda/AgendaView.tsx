"use client";

import { useState, useEffect, useMemo } from "react";
import {
    ChevronLeft, ChevronRight, CalendarDays, Download, Filter,
    Users, RefreshCw, FileSpreadsheet, Settings2, UserPlus, RotateCcw,
    LayoutGrid, BarChart3, List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import {
    AgendaEntry, AgendaConsultant, AgendaFilters, DEFAULT_FILTERS,
    ActivityType, ResultStatus, ConsultantRegion, ACTIVITY_CONFIG, RESULT_CONFIG,
} from "@/types/agenda";
import {
    getCurrentWeekStart, getWeekDays, getWeekMark, getWeekNumber,
    getYearMonth, getWeekMonth, getWeekLabel,
} from "@/lib/agenda-utils";
import { subscribeToWeekEntries, subscribeToConsultants, exportJira, exportMSProject, loadSAMRegions, SAMRegion } from "@/lib/agenda";
import { clearIndexedDbPersistence, terminate } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AgendaGrid } from "./AgendaGrid";
import { AgendaLista } from "./AgendaLista";
import { AgendaResumen } from "./AgendaResumen";
import { AgendaConsultantsManager } from "./AgendaConsultantsManager";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { ACTIVITY_TKEYS, RESULT_TKEYS } from "@/types/agenda";
import { useAuth } from "@/context/AuthContext";
import { useAccessScopes } from "@/hooks/useAccessScopes";

export function AgendaView() {
    const { tenantId } = useAuth();
    const { t } = useLanguage();
    const tid = tenantId || "";
    const accessScopes = useAccessScopes();
    useTheme();

    // ── Week navigation ────────────────────────────────────────────────────────
    const [weekStartIso, setWeekStartIso] = useState<string>(getCurrentWeekStart);
    const weekDays = getWeekDays(weekStartIso);
    const monday   = weekDays[0];

    const weekNumber  = getWeekNumber(monday);
    const weekYear    = monday.getFullYear();
    const weekMark    = getWeekMark(weekNumber, weekYear);
    const weekLabel   = `${getWeekLabel(monday)} · ${format(monday, 'MMMM yyyy', { locale: es })}`;
    const isCurrentWeek = weekMark === 'Semana Actual';

    function goBack()    { setWeekStartIso(format(subWeeks(new Date(weekStartIso), 1), 'yyyy-MM-dd')); }
    function goForward() { setWeekStartIso(format(addWeeks(new Date(weekStartIso), 1), 'yyyy-MM-dd')); }
    function goToday()   { setWeekStartIso(getCurrentWeekStart()); }

    // ── Data subscriptions ────────────────────────────────────────────────────
    const [entries,     setEntries]     = useState<AgendaEntry[]>([]);
    const [consultants, setConsultants] = useState<AgendaConsultant[]>([]);
    const [loading,     setLoading]     = useState(true);

    useEffect(() => {
        if (!tid) return;
        setLoading(true);
        const unsub = subscribeToConsultants(tid, list => {
            setConsultants(list);
        });
        return unsub;
    }, [tid]);

    useEffect(() => {
        if (!tid) return;
        setLoading(true);
        const unsub = subscribeToWeekEntries(tid, weekStartIso, list => {
            setEntries(list);
            setLoading(false);
        });
        return unsub;
    }, [tid, weekStartIso]);

    // ── SAM regions (source of truth for filter buttons) ─────────────────────
    const [samRegions, setSamRegions] = useState<SAMRegion[]>([]);
    useEffect(() => {
        if (!tid) return;
        loadSAMRegions(tid).then(setSamRegions);
    }, [tid]);
    // ── Access-scoped regions: solo las regiones que el usuario puede ver ────────
    const availableRegions = useMemo(() => {
        const allNames = samRegions.map(r => r.name);
        if (!accessScopes || accessScopes.regionIds.includes('*')) return allNames;
        return samRegions.filter(r => accessScopes.regionIds.includes(r.id)).map(r => r.name);
    }, [samRegions, accessScopes]);

    // ── Access-scoped consultants: solo los de las regiones permitidas ─────────
    const accessibleConsultants = useMemo(() => {
        // Filter out inactive ones
        const activeOnly = consultants.filter(c => c.isActive !== false);

        // Filter by accessScopes
        const scoped = !accessScopes || accessScopes.regionIds.includes('*')
            ? activeOnly
            : activeOnly.filter(c => {
                const samR = samRegions.find(r => r.id === c.region || r.name === c.region);
                const regionId = samR?.id ?? c.region;
                return accessScopes.regionIds.includes(regionId);
            });

        // Deduplicate by userId AND normalized name
        const seenIds = new Set<string>();
        const seenNames = new Set<string>();
        const deduped: AgendaConsultant[] = [];
        const sorted = [...scoped].sort((a, b) => {
            const aReg = !!(a.region || '').trim();
            const bReg = !!(b.region || '').trim();
            if (aReg !== bReg) return aReg ? -1 : 1;
            return a.sortOrder - b.sortOrder;
        });

        for (const c of sorted) {
            const normName = (c.name || '').trim().toLowerCase();
            if (!seenIds.has(c.userId) && !seenNames.has(normName)) {
                seenIds.add(c.userId);
                seenNames.add(normName);
                deduped.push(c);
            }
        }

        return deduped.sort((a, b) => a.sortOrder - b.sortOrder);
    }, [consultants, accessScopes, samRegions]);

    // ── Filters ───────────────────────────────────────────────────────────────
    const [filters, setFilters] = useState<AgendaFilters>(DEFAULT_FILTERS);
    const [showFilters, setShowFilters] = useState(false);

    // ── Region filter aplicado aquí (donde samRegions es estado, sin timing) ────
    const filteredConsultants = useMemo(() => {
        if (filters.region === 'ALL') return accessibleConsultants;
        const samR = samRegions.find(r => r.name === filters.region);
        return accessibleConsultants.filter(c =>
            samR ? (c.region === samR.name || c.region === samR.id)
                 : c.region === filters.region
        );
    }, [accessibleConsultants, filters.region, samRegions]);

    // Available divisions derived from current week's entries
    const availableDivisions = useMemo(() => {
        const seen = new Set<string>();
        entries.forEach(e => { if (e.divisionName) seen.add(e.divisionName); });
        return Array.from(seen).sort();
    }, [entries]);

    function toggleDivision(div: string) {
        setFilters(f => ({
            ...f,
            divisions: f.divisions.includes(div)
                ? f.divisions.filter(x => x !== div)
                : [...f.divisions, div],
        }));
    }

    const activeFilterCount = [
        filters.consultantIds.length > 0,
        filters.activityTypes.length > 0,
        filters.results.length > 0,
        filters.region !== 'ALL',
        filters.divisions.length > 0,
    ].filter(Boolean).length;

    function clearFilters() { setFilters(DEFAULT_FILTERS); }

    function toggleConsultant(id: string) {
        setFilters(f => ({
            ...f,
            consultantIds: f.consultantIds.includes(id)
                ? f.consultantIds.filter(x => x !== id)
                : [...f.consultantIds, id],
        }));
    }
    function toggleActivity(act: ActivityType) {
        setFilters(f => ({
            ...f,
            activityTypes: f.activityTypes.includes(act)
                ? f.activityTypes.filter(x => x !== act)
                : [...f.activityTypes, act],
        }));
    }
    function toggleResult(r: ResultStatus) {
        setFilters(f => ({
            ...f,
            results: f.results.includes(r)
                ? f.results.filter(x => x !== r)
                : [...f.results, r],
        }));
    }

    // ── View mode ─────────────────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState<'grid' | 'lista' | 'resumen'>('grid');

    // ── Consultants manager ───────────────────────────────────────────────────
    const [showConsultantsManager, setShowConsultantsManager] = useState(false);

    // ── Firestore cache reset (fixes corrupted SDK state) ──────────────────────
    async function handleResetCache() {
        try {
            await terminate(db);
            await clearIndexedDbPersistence(db);
        } catch {
            // ignore — errors expected when db is already terminated
        }
        window.location.reload();
    }

    // ── Export ────────────────────────────────────────────────────────────────
    function handleExportJira()      { exportJira(entries); }
    function handleExportMSProject() { exportMSProject(entries); }

    return (
        <div className="flex flex-col h-full bg-background text-foreground">

            {/* ── Toolbar ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 gap-3 flex-wrap bg-card/50">

                {/* Left: Week navigation */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={goBack}
                        className="w-8 h-8 rounded-lg bg-secondary/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="text-center">
                        <div className="text-sm font-semibold text-foreground capitalize">{weekLabel}</div>
                        <div className={cn(
                            "text-[10px] font-medium uppercase tracking-wider mt-0.5",
                            isCurrentWeek ? "text-indigo-500" :
                            weekMark === 'Futuro' ? "text-amber-500" : "text-muted-foreground"
                        )}>
                            {isCurrentWeek ? t('agenda.currentWeek') : weekMark === 'Futuro' ? t('agenda.future') : t('agenda.previousWeek')} · {t('agenda.week')} {weekNumber}
                        </div>
                    </div>

                    <button
                        onClick={goForward}
                        className="w-8 h-8 rounded-lg bg-secondary/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    {!isCurrentWeek && (
                        <button
                            onClick={goToday}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 border border-indigo-600 text-white hover:bg-indigo-700 transition-all"
                        >
                            {t('agenda.today')}
                        </button>
                    )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {loading && (
                        <RefreshCw className="w-4 h-4 text-zinc-500 animate-spin" />
                    )}

                    {/* View toggle */}
                    <div className="flex items-center bg-secondary/40 border border-border rounded-lg p-0.5">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                                viewMode === 'grid'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            {t('agenda.grid')}
                        </button>
                        <button
                            onClick={() => setViewMode('lista')}
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                                viewMode === 'lista'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <List className="w-3.5 h-3.5" />
                            {t('agenda.lista')}
                        </button>
                        <button
                            onClick={() => setViewMode('resumen')}
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                                viewMode === 'resumen'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            {t('agenda.resumen')}
                        </button>
                    </div>

                    {/* Reset Firestore cache — use when writes fail with permission errors */}
                    <button
                        onClick={handleResetCache}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                        title="Limpiar caché Firestore y recargar (usar si hay errores de permisos persistentes)"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    {/* Filters toggle */}
                    <button
                        onClick={() => setShowFilters(v => !v)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                            showFilters || activeFilterCount > 0
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        {t('agenda.filters')}
                        {activeFilterCount > 0 && (
                            <span className="bg-indigo-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {/* Export Jira */}
                    <button
                        onClick={handleExportJira}
                        disabled={entries.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary/50 border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Exportar CSV para Jira"
                    >
                        <Download className="w-3.5 h-3.5" />
                        {t('agenda.jiraCsv')}
                    </button>

                    {/* Export MS Project */}
                    <button
                        onClick={handleExportMSProject}
                        disabled={entries.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary/50 border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Exportar CSV para MS Project"
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        {t('agenda.msProject')}
                    </button>

                    {/* Manage consultants */}
                    <button
                        onClick={() => setShowConsultantsManager(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary/50 border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                        title="Gestionar consultores de la agenda"
                    >
                        <Settings2 className="w-3.5 h-3.5" />
                        {t('agenda.manageBtn')}
                    </button>

                    {/* Theme selector */}
                    <div className="pl-1 border-l border-border">
                        <ThemeSelector />
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-border text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {filteredConsultants.length} {t('agenda.nConsultants')}
                        </span>
                        <span className="flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {entries.length} {t('agenda.nEntries')}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Filter panel ─────────────────────────────────────────────── */}
            {showFilters && (
                <div className="border-b border-border bg-card px-4 py-3 flex flex-wrap gap-6 shrink-0 animate-in slide-in-from-top-2 duration-150">

                    {/* Region */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{t('agenda.region')}</p>
                        <div className="flex gap-1.5">
                            {(['ALL', ...availableRegions]).map(r => (
                                <button
                                    key={r}
                                    onClick={() => setFilters(f => ({ ...f, region: r }))}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
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

                    {/* Consultants */}
                    {filteredConsultants.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{t('agenda.manageBtn')}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {filteredConsultants.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => toggleConsultant(c.userId)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
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

                    {/* Activities */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{t('agenda.activityFilter')}</p>
                        <div className="flex flex-wrap gap-1.5">
                            {Object.values(ActivityType).map(act => {
                                const cfg = ACTIVITY_CONFIG[act];
                                const selected = filters.activityTypes.includes(act);
                                return (
                                    <button
                                        key={act}
                                        onClick={() => toggleActivity(act)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                                            selected
                                                ? `${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass}`
                                                : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                                        )}
                                    >
                                        {t(ACTIVITY_TKEYS[act]) || cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Results */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{t('agenda.statusFilter')}</p>
                        <div className="flex flex-wrap gap-1.5">
                            {Object.values(ResultStatus).map(r => {
                                const cfg = RESULT_CONFIG[r];
                                const selected = filters.results.includes(r);
                                return (
                                    <button
                                        key={r}
                                        onClick={() => toggleResult(r)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                                            selected
                                                ? "bg-secondary border-border text-foreground font-semibold"
                                                : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                                        )}
                                    >
                                        <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dotClass)} />
                                        {t(RESULT_TKEYS[r]) || cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Divisions */}
                    {availableDivisions.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{t('agenda.divisionFilter')}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {availableDivisions.map(div => (
                                    <button
                                        key={div}
                                        onClick={() => toggleDivision(div)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                                            filters.divisions.includes(div)
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

                    {/* Clear */}
                    {activeFilterCount > 0 && (
                        <div className="flex items-end">
                            <button
                                onClick={clearFilters}
                                className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border transition-all"
                            >
                                {t('agenda.clearFilters')}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Grid ─────────────────────────────────────────────────────── */}
            {accessibleConsultants.length === 0 && !loading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-600 gap-4 py-24">
                    <Users className="w-10 h-10 opacity-20" />
                    <div>
                        <p className="text-sm text-zinc-400">{t('agenda.noConsultants')}</p>
                        <p className="text-xs text-zinc-600 mt-1">{t('agenda.noConsultantsHint')}</p>
                    </div>
                    <button
                        onClick={() => setShowConsultantsManager(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
                    >
                        <UserPlus className="w-4 h-4" />
                        {t('agenda.configureBtn')}
                    </button>
                </div>
            ) : viewMode === 'resumen' ? (
                <AgendaResumen
                    entries={entries}
                    consultants={filteredConsultants}
                    filters={filters}
                    weekLabel={weekLabel}
                    samRegions={samRegions}
                />
            ) : viewMode === 'lista' ? (
                <AgendaLista
                    entries={entries}
                    consultants={filteredConsultants}
                    filters={filters}
                    weekLabel={weekLabel}
                />
            ) : (
                <AgendaGrid
                    weekDays={weekDays}
                    consultants={filteredConsultants}
                    entries={entries}
                    filters={filters}
                    tenantId={tid}
                />
            )}

            {showConsultantsManager && (
                <AgendaConsultantsManager
                    consultants={consultants}
                    tenantId={tid}
                    samRegions={samRegions}
                    onClose={() => setShowConsultantsManager(false)}
                />
            )}
        </div>
    );
}

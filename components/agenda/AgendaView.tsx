"use client";

import { useState, useEffect } from "react";
import {
    ChevronLeft, ChevronRight, CalendarDays, Download, Filter,
    Users, RefreshCw, FileSpreadsheet, Settings2, UserPlus, RotateCcw,
    LayoutGrid, BarChart3,
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
import { subscribeToWeekEntries, subscribeToConsultants, exportJira, exportMSProject } from "@/lib/agenda";
import { clearIndexedDbPersistence, terminate } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AgendaGrid } from "./AgendaGrid";
import { AgendaResumen } from "./AgendaResumen";
import { AgendaConsultantsManager } from "./AgendaConsultantsManager";
import { useAuth } from "@/context/AuthContext";

export function AgendaView() {
    const { tenantId } = useAuth();
    const tid = tenantId || "";

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

    // ── Filters ───────────────────────────────────────────────────────────────
    const [filters, setFilters] = useState<AgendaFilters>(DEFAULT_FILTERS);
    const [showFilters, setShowFilters] = useState(false);

    const activeFilterCount = [
        filters.consultantIds.length > 0,
        filters.activityTypes.length > 0,
        filters.results.length > 0,
        filters.region !== 'ALL',
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
    function toggleActivity(t: ActivityType) {
        setFilters(f => ({
            ...f,
            activityTypes: f.activityTypes.includes(t)
                ? f.activityTypes.filter(x => x !== t)
                : [...f.activityTypes, t],
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
    const [viewMode, setViewMode] = useState<'grid' | 'resumen'>('grid');

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
        <div className="flex flex-col h-full bg-[#0a0a0c] text-white">

            {/* ── Toolbar ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0 gap-3 flex-wrap">

                {/* Left: Week navigation */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={goBack}
                        className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="text-center">
                        <div className="text-sm font-semibold text-white capitalize">{weekLabel}</div>
                        <div className={cn(
                            "text-[10px] font-medium uppercase tracking-wider mt-0.5",
                            isCurrentWeek ? "text-indigo-400" :
                            weekMark === 'Futuro' ? "text-amber-400/70" : "text-zinc-500"
                        )}>
                            {weekMark} · Semana {weekNumber}
                        </div>
                    </div>

                    <button
                        onClick={goForward}
                        className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    {!isCurrentWeek && (
                        <button
                            onClick={goToday}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 transition-all"
                        >
                            Hoy
                        </button>
                    )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {loading && (
                        <RefreshCw className="w-4 h-4 text-zinc-500 animate-spin" />
                    )}

                    {/* View toggle */}
                    <div className="flex items-center bg-white/5 border border-white/8 rounded-lg p-0.5">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                                viewMode === 'grid'
                                    ? "bg-white/10 text-white"
                                    : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            Grilla
                        </button>
                        <button
                            onClick={() => setViewMode('resumen')}
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                                viewMode === 'resumen'
                                    ? "bg-white/10 text-white"
                                    : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            Resumen
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
                                ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300"
                                : "bg-white/5 border-white/8 text-zinc-400 hover:text-white hover:bg-white/10"
                        )}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        Filtros
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
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/8 text-zinc-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Exportar CSV para Jira"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Jira CSV
                    </button>

                    {/* Export MS Project */}
                    <button
                        onClick={handleExportMSProject}
                        disabled={entries.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/8 text-zinc-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Exportar CSV para MS Project"
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        MS Project
                    </button>

                    {/* Manage consultants */}
                    <button
                        onClick={() => setShowConsultantsManager(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/8 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                        title="Gestionar consultores de la agenda"
                    >
                        <Settings2 className="w-3.5 h-3.5" />
                        Consultores
                    </button>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-white/8 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {consultants.length} consultores
                        </span>
                        <span className="flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {entries.length} entradas
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Filter panel ─────────────────────────────────────────────── */}
            {showFilters && (
                <div className="border-b border-white/8 bg-[#0f0f12] px-4 py-3 flex flex-wrap gap-6 shrink-0 animate-in slide-in-from-top-2 duration-150">

                    {/* Region */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Región</p>
                        <div className="flex gap-1.5">
                            {(['ALL', 'IBERIA', 'LATAM'] as const).map(r => (
                                <button
                                    key={r}
                                    onClick={() => setFilters(f => ({ ...f, region: r }))}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                                        filters.region === r
                                            ? "bg-indigo-600/30 border-indigo-500/40 text-indigo-200"
                                            : "bg-white/3 border-white/8 text-zinc-500 hover:text-zinc-300"
                                    )}
                                >
                                    {r === 'ALL' ? 'Todas' : r}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Consultants */}
                    {consultants.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Consultores</p>
                            <div className="flex flex-wrap gap-1.5">
                                {consultants.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => toggleConsultant(c.userId)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                                            filters.consultantIds.includes(c.userId)
                                                ? "bg-indigo-600/30 border-indigo-500/40 text-indigo-200"
                                                : "bg-white/3 border-white/8 text-zinc-500 hover:text-zinc-300"
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
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Actividad</p>
                        <div className="flex flex-wrap gap-1.5">
                            {Object.values(ActivityType).map(t => {
                                const cfg = ACTIVITY_CONFIG[t];
                                const selected = filters.activityTypes.includes(t);
                                return (
                                    <button
                                        key={t}
                                        onClick={() => toggleActivity(t)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                                            selected
                                                ? `${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass}`
                                                : "bg-white/3 border-white/8 text-zinc-500 hover:text-zinc-300"
                                        )}
                                    >
                                        {cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Results */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Estado</p>
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
                                                ? "bg-white/10 border-white/20 text-white"
                                                : "bg-white/3 border-white/8 text-zinc-500 hover:text-zinc-300"
                                        )}
                                    >
                                        <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dotClass)} />
                                        {cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Clear */}
                    {activeFilterCount > 0 && (
                        <div className="flex items-end">
                            <button
                                onClick={clearFilters}
                                className="px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/8 transition-all"
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Grid ─────────────────────────────────────────────────────── */}
            {consultants.length === 0 && !loading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-600 gap-4 py-24">
                    <Users className="w-10 h-10 opacity-20" />
                    <div>
                        <p className="text-sm text-zinc-400">No hay consultores configurados para este tenant.</p>
                        <p className="text-xs text-zinc-600 mt-1">
                            Añade los usuarios que aparecerán en la agenda semanal.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowConsultantsManager(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
                    >
                        <UserPlus className="w-4 h-4" />
                        Configurar consultores
                    </button>
                </div>
            ) : viewMode === 'resumen' ? (
                <AgendaResumen
                    entries={entries}
                    consultants={consultants}
                    filters={filters}
                    weekLabel={weekLabel}
                />
            ) : (
                <AgendaGrid
                    weekDays={weekDays}
                    consultants={consultants}
                    entries={entries}
                    filters={filters}
                    tenantId={tid}
                />
            )}

            {showConsultantsManager && (
                <AgendaConsultantsManager
                    consultants={consultants}
                    tenantId={tid}
                    onClose={() => setShowConsultantsManager(false)}
                />
            )}
        </div>
    );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Clock, Tag, AlignLeft, CheckCircle2, Loader2, Trash2, ExternalLink, Sun, FolderGit2, Search, ChevronDown, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    ActivityType, ResultStatus, AgendaEntry, AgendaConsultant,
    ACTIVITY_CONFIG, RESULT_CONFIG,
} from "@/types/agenda";
import {
    parseComment, parseHours, buildJiraRecord, formatHours, normalizeSchedule,
} from "@/lib/agenda-utils";
import { createAgendaEntry, updateAgendaEntry, deleteAgendaEntry, CreateEntryInput } from "@/lib/agenda";
import { useAuth } from "@/context/AuthContext";
import { auth, db } from "@/lib/firebase";
import { useLanguage } from "@/context/LanguageContext";
import { ACTIVITY_TKEYS, RESULT_TKEYS } from "@/types/agenda";
import { collection, query, where, getDocs } from "firebase/firestore";
import { filterBySAMScope, getActiveProjects } from "@/lib/projects";
import { useAccessScopes } from "@/hooks/useAccessScopes";
import { Project, getRoleLevel } from "@/types";
import { SAMDivision } from "@/lib/agenda";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    consultant: AgendaConsultant;
    allConsultants?: AgendaConsultant[];
    date: Date;
    entry?: AgendaEntry | null;
    tenantId: string;
    samDivisions?: SAMDivision[];
}

// ── Time options: 06:00 → 22:00 in 30-min steps ──────────────────────────────
const TIME_OPTIONS: string[] = (() => {
    const options: string[] = [];
    for (let h = 6; h <= 22; h++) {
        options.push(`${String(h).padStart(2, '0')}:00`);
        if (h < 22) options.push(`${String(h).padStart(2, '0')}:30`);
    }
    return options;
})();

const FULL_DAY_START = '09:00';
const FULL_DAY_END   = '18:00';

const DEFAULT_DIVISION = 'Consultoría';

interface FormState {
    activityType:  ActivityType;
    comment:       string;
    timeStart:     string;
    timeEnd:       string;
    result:        ResultStatus;
    divisionId:    string;
    divisionName:  string;
    projectId:     string;
    projectName:   string;
    projectCode:   string;
    projectColor:  string;
}

const EMPTY_FORM: FormState = {
    activityType:  ActivityType.REUNION_CLIENTE,
    comment:       '',
    timeStart:     '',
    timeEnd:       '',
    result:        ResultStatus.POR_HACER,
    divisionId:    DEFAULT_DIVISION,
    divisionName:  DEFAULT_DIVISION,
    projectId:     '',
    projectName:   '',
    projectCode:   '',
    projectColor:  '',
};

/** Parse 'HH:MM A HH:MM' → { timeStart, timeEnd } */
function parseScheduleToTimes(raw: string): { timeStart: string; timeEnd: string } {
    const { scheduleStart, scheduleEnd } = normalizeSchedule(raw);
    if (scheduleStart && scheduleEnd) {
        // Snap to nearest option in TIME_OPTIONS
        const snap = (t: string) => TIME_OPTIONS.includes(t) ? t : TIME_OPTIONS.find(o => o >= t) || '';
        return { timeStart: snap(scheduleStart), timeEnd: snap(scheduleEnd) };
    }
    return { timeStart: '', timeEnd: '' };
}

export function AgendaEntryModal({ isOpen, onClose, consultant, allConsultants = [], date, entry, tenantId, samDivisions = [] }: Props) {
    const { user, userRole } = useAuth();
    const { t } = useLanguage();
    const accessScopes = useAccessScopes(); // SAM scope — null = sin restricción
    const isEdit = !!entry;

    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [saving,   setSaving]   = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Clone state
    const [showClone, setShowClone] = useState(false);
    const [cloneDate, setCloneDate] = useState<string>(format(date, 'yyyy-MM-dd'));
    const [cloneConsultantId, setCloneConsultantId] = useState<string>(consultant.userId);
    const [cloneSuccess, setCloneSuccess] = useState('');

    // ── Projects ──────────────────────────────────────────────────────────────
    const [projects,      setProjects]      = useState<Project[]>([]);
    const [projectSearch, setProjectSearch] = useState('');
    const [projectOpen,   setProjectOpen]   = useState(false);

    useEffect(() => {
        if (!isOpen || !tenantId) return;
        getActiveProjects(tenantId, user?.uid, getRoleLevel(userRole))
            .then(all => {
                // Apply SAM scope: null = sin restricción (hoy), accessScopes cuando se active
                setProjects(filterBySAMScope(all, accessScopes));
            })
            .catch(console.error);
    }, [isOpen, tenantId, accessScopes, user, userRole]);

    const filteredProjects = useMemo(() => {
        if (!projectSearch.trim()) return projects;
        const q = projectSearch.toLowerCase();
        return projects.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.code || '').toLowerCase().includes(q) ||
            (p.clientName || '').toLowerCase().includes(q)
        );
    }, [projects, projectSearch]);

    function selectProject(p: Project | null) {
        setForm(f => ({
            ...f,
            projectId:    p?.id    || '',
            projectName:  p?.name  || '',
            projectCode:  p?.code  || '',
            projectColor: p?.color || '',
        }));
        setProjectSearch('');
        setProjectOpen(false);
    }

    // ── Sync form on open ─────────────────────────────────────────────────────
    // Consultant's divisions, resolved to names:
    // 1. If divisions field has values → use them (names stored by ConsultantsManager post-fix)
    // 2. If empty and SAM catalog available → show all catalog divisions (user assigns)
    // 3. Absolute fallback → ['Consultoría']
    const consultantDivisions = useMemo(() => {
        if (consultant.divisions?.length) {
            // Might be IDs (stored before name-resolution fix) — resolve via catalog if possible
            return consultant.divisions.map(d => {
                const match = samDivisions.find(s => s.id === d || s.name === d);
                return match ? match.name : d;
            });
        }
        if (samDivisions.length > 0) return samDivisions.map(d => d.name);
        return [DEFAULT_DIVISION];
    }, [consultant.divisions, samDivisions]);

    useEffect(() => {
        if (!isOpen) return;
        setSaveError(null);
        setProjectSearch('');
        setProjectOpen(false);
        if (entry) {
            const { timeStart, timeEnd } = parseScheduleToTimes(entry.scheduleRaw);
            setForm({
                activityType: entry.activityType,
                comment:      entry.comment,
                timeStart,
                timeEnd,
                result:        entry.result,
                divisionId:    entry.divisionId   || consultantDivisions[0],
                divisionName:  entry.divisionName || consultantDivisions[0],
                projectId:     entry.projectId    || '',
                projectName:   entry.projectName  || '',
                projectCode:   entry.projectCode  || '',
                projectColor:  entry.projectColor || '',
            });
        } else {
            // Auto-fill with consultant's first (or only) division
            setForm({ ...EMPTY_FORM, divisionId: consultantDivisions[0], divisionName: consultantDivisions[0] });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, entry]);

    // ── Derived values ────────────────────────────────────────────────────────
    const scheduleRaw = form.timeStart && form.timeEnd ? `${form.timeStart} A ${form.timeEnd}` : '';
    const hours       = parseHours(scheduleRaw);
    const { client, description } = parseComment(form.comment);
    const jiraPreview = buildJiraRecord(form.activityType, client, description);
    const isFullDay   = form.timeStart === FULL_DAY_START && form.timeEnd === FULL_DAY_END;

    // End-time options: only times strictly after the selected start
    const endOptions = useMemo(() =>
        form.timeStart
            ? TIME_OPTIONS.filter(t => t > form.timeStart)
            : TIME_OPTIONS,
    [form.timeStart]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    function setFullDay() {
        setForm(f => ({ ...f, timeStart: FULL_DAY_START, timeEnd: FULL_DAY_END }));
    }

    function handleStartChange(val: string) {
        setForm(f => {
            // If end is now <= start, clear it
            const newEnd = f.timeEnd && f.timeEnd > val ? f.timeEnd : '';
            return { ...f, timeStart: val, timeEnd: newEnd };
        });
    }

    async function handleSave() {
        if (!user) return;
        setSaving(true);
        setSaveError(null);
        try {
            await auth.currentUser?.getIdToken(true);

            if (isEdit && entry) {
                await updateAgendaEntry(entry.id, {
                    activityType: form.activityType,
                    comment:      form.comment,
                    scheduleRaw,
                    result:       form.result,
                    divisionId:   form.divisionId,
                    divisionName: form.divisionName,
                    projectId:    form.projectId    || null,
                    projectName:  form.projectName  || null,
                    projectCode:  form.projectCode  || null,
                    projectColor: form.projectColor || null,
                });
            } else {
                const input: CreateEntryInput = {
                    tenantId,
                    consultantId:    consultant.userId,
                    consultantName:  consultant.name,
                    consultantOrder: consultant.sortOrder,
                    region:          consultant.region,
                    divisionId:      form.divisionId,
                    divisionName:    form.divisionName,
                    date,
                    activityType:    form.activityType,
                    comment:         form.comment,
                    scheduleRaw,
                    result:          form.result,
                    projectId:       form.projectId    || undefined,
                    projectName:     form.projectName  || undefined,
                    projectCode:     form.projectCode  || undefined,
                    projectColor:    form.projectColor || undefined,
                    createdBy:       user.uid,
                };
                await createAgendaEntry(input);
            }
            onClose();
        } catch (e: any) {
            console.error("[agenda] save error:", e);
            const isPermission = e?.code === 'permission-denied' || String(e).includes('permissions');
            setSaveError(isPermission
                ? t('agenda.permissionError')
                : t('agenda.saveError')
            );
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!entry) return;
        if (!confirm(t('agenda.deleteConfirm'))) return;
        setDeleting(true);
        try {
            await deleteAgendaEntry(entry.id);
            onClose();
        } catch (e) {
            console.error("[agenda] delete error:", e);
        } finally {
            setDeleting(false);
        }
    }

    async function handleClone() {
        if (!user || !cloneConsultantId || !cloneDate) return;
        const targetC = allConsultants.find(c => c.userId === cloneConsultantId);
        if (!targetC) return;

        setSaving(true);
        setSaveError(null);
        try {
            await auth.currentUser?.getIdToken(true);
            const [y, m, d] = cloneDate.split('-').map(Number);
            const targetDateObj = new Date(y, m - 1, d);

            const targetDivisions = targetC.divisions?.length ? targetC.divisions : [DEFAULT_DIVISION];
            const input: CreateEntryInput = {
                tenantId,
                consultantId:    targetC.userId,
                consultantName:  targetC.name,
                consultantOrder: targetC.sortOrder,
                region:          targetC.region,
                divisionId:      form.divisionId   || targetDivisions[0],
                divisionName:    form.divisionName || targetDivisions[0],
                date:            targetDateObj,
                activityType:    form.activityType,
                comment:         form.comment,
                scheduleRaw,
                result:          form.result,
                projectId:       form.projectId    || undefined,
                projectName:     form.projectName  || undefined,
                projectCode:     form.projectCode  || undefined,
                projectColor:    form.projectColor || undefined,
                createdBy:       user.uid,
            };
            await createAgendaEntry(input);
            setShowClone(false);
            setCloneSuccess(`¡Tarea duplicada a ${targetC.name} para el ${cloneDate}!`);
            setTimeout(() => setCloneSuccess(''), 4000);
        } catch (e: any) {
            console.error("[agenda] clone error:", e);
            setSaveError(t('agenda.saveError'));
        } finally {
            setSaving(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">

                {/* ── Header ─────────────────────────────────────────────────── */}
                <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
                    <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
                            {isEdit ? t('agenda.editEntry') : t('agenda.newEntry')}
                        </p>
                        <h2 className="text-foreground font-semibold text-base leading-tight">{consultant.name}</h2>
                        <p className="text-muted-foreground text-sm mt-0.5 capitalize">
                            {format(date, "EEEE d 'de' MMMM yyyy", { locale: es })}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Body ───────────────────────────────────────────────────── */}
                <div className="overflow-y-auto flex-1 p-5 space-y-5 custom-scrollbar">

                    {/* Activity type */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5" />
                            {t('agenda.activityType')}
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {Object.values(ActivityType).map(type => {
                                const cfg = ACTIVITY_CONFIG[type];
                                const selected = form.activityType === type;
                                return (
                                    <button
                                        key={type}
                                        onClick={() => setForm(f => ({ ...f, activityType: type }))}
                                        className={cn(
                                            "px-2 py-1.5 rounded-lg text-xs font-medium border transition-all text-left",
                                            selected
                                                ? `${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass}`
                                                : "bg-white/3 text-zinc-500 border-white/5 hover:bg-white/6 hover:text-zinc-300"
                                        )}
                                    >
                                        {t(ACTIVITY_TKEYS[type]) || cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Comment */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <AlignLeft className="w-3.5 h-3.5" />
                            {t('agenda.comment')}
                            <span className="text-zinc-600 font-normal normal-case">{t('agenda.commentHint')}</span>
                        </label>
                        <input
                            type="text"
                            value={form.comment}
                            onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                            placeholder="LUIS SIMOES / Sesión de diseño de solución"
                            className="w-full px-3 py-2.5 bg-secondary/40 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500/60 transition-all"
                        />
                        {(client || description) && (
                            <div className="flex gap-3 text-xs">
                                <span className="text-zinc-500">{t('agenda.clientLabel')}: <span className="text-zinc-300 font-mono">{client || '—'}</span></span>
                                <span className="text-zinc-500">{t('agenda.descLabel')}: <span className="text-zinc-300 font-mono">{description || '—'}</span></span>
                            </div>
                        )}
                    </div>

                    {/* ── Proyecto ───────────────────────────────────────────── */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <FolderGit2 className="w-3.5 h-3.5" />
                            {t('agenda.project')}
                            <span className="text-zinc-600 font-normal normal-case">{t('agenda.optional')}</span>
                        </label>

                        {/* Selected project chip */}
                        {form.projectId ? (
                            <div className="flex items-center gap-2">
                                <div
                                    className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg border border-white/10 bg-white/5 cursor-pointer hover:bg-white/8 transition-all"
                                    onClick={() => setProjectOpen(v => !v)}
                                >
                                    <span
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: form.projectColor || '#6b7280' }}
                                    />
                                    <span className="text-xs font-mono text-zinc-400">{form.projectCode}</span>
                                    <span className="text-sm text-zinc-200 flex-1 truncate">{form.projectName}</span>
                                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                </div>
                                <button
                                    onClick={() => selectProject(null)}
                                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                    title="Quitar proyecto"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setProjectOpen(v => !v)}
                                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-accent transition-all text-sm"
                            >
                                <Search className="w-3.5 h-3.5" />
                                {t('agenda.selectProject')}
                            </button>
                        )}

                        {/* Dropdown */}
                        {projectOpen && (
                            <div className="rounded-xl border border-border bg-popover shadow-2xl overflow-hidden">
                                {/* Search */}
                                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8">
                                    <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                    <input
                                        autoFocus
                                        type="text"
                                        value={projectSearch}
                                        onChange={e => setProjectSearch(e.target.value)}
                                        placeholder={t('agenda.searchProjectPh')}
                                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                                    />
                                </div>

                                {/* List */}
                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                    {/* Sin proyecto */}
                                    {form.projectId && (
                                        <button
                                            onClick={() => selectProject(null)}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-500 hover:bg-white/5 transition-colors"
                                        >
                                            <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                                            {t('agenda.noProject')}
                                        </button>
                                    )}

                                    {filteredProjects.length === 0 ? (
                                        <p className="px-3 py-4 text-xs text-zinc-600 text-center">
                                            {projectSearch ? 'Sin resultados' : 'No hay proyectos activos'}
                                        </p>
                                    ) : filteredProjects.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => selectProject(p)}
                                            className={cn(
                                                "w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors",
                                                form.projectId === p.id
                                                    ? "bg-indigo-600/15"
                                                    : "hover:bg-white/5"
                                            )}
                                        >
                                            <span
                                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                                style={{ backgroundColor: p.color || '#6b7280' }}
                                            />
                                            <span className="text-[10px] font-mono text-zinc-500 w-12 shrink-0">{p.code}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-zinc-200 truncate">{p.name}</p>
                                                {p.clientName && (
                                                    <p className="text-[10px] text-zinc-500 truncate">{p.clientName}</p>
                                                )}
                                            </div>
                                            {form.projectId === p.id && (
                                                <span className="text-[9px] text-indigo-400 font-semibold shrink-0">✓</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Horario ────────────────────────────────────────────── */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {t('agenda.schedule')}
                            </label>
                            {/* Full day button */}
                            <button
                                onClick={setFullDay}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                                    isFullDay
                                        ? "bg-amber-500/20 border-amber-400/40 text-amber-300"
                                        : "bg-white/5 border-white/10 text-zinc-400 hover:text-amber-300 hover:bg-amber-500/10 hover:border-amber-400/30"
                                )}
                                title="09:00 a 18:00 — 8h trabajo + 1h comida"
                            >
                                <Sun className="w-3.5 h-3.5" />
                                {t('agenda.fullDay')}
                            </button>
                        </div>

                        {/* Two time selectors */}
                        <div className="flex items-center gap-3">
                            {/* Start */}
                            <div className="flex-1 relative">
                                <select
                                    value={form.timeStart}
                                    onChange={e => handleStartChange(e.target.value)}
                                    className={cn(
                                        "w-full px-3 py-2.5 bg-secondary/40 border border-border rounded-lg text-sm text-foreground",
                                        "focus:outline-none focus:border-indigo-500/60 transition-all appearance-none cursor-pointer",
                                        "font-mono",
                                        !form.timeStart && "text-muted-foreground"
                                    )}
                                >
                                    <option value="" disabled className="bg-zinc-900">{t('agenda.timeStartPh')}</option>
                                    {TIME_OPTIONS.map(t => (
                                        <option key={t} value={t} className="bg-zinc-900">{t}</option>
                                    ))}
                                </select>
                                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                            </div>

                            <span className="text-zinc-600 font-semibold text-sm shrink-0">→</span>

                            {/* End */}
                            <div className="flex-1 relative">
                                <select
                                    value={form.timeEnd}
                                    onChange={e => setForm(f => ({ ...f, timeEnd: e.target.value }))}
                                    disabled={!form.timeStart}
                                    className={cn(
                                        "w-full px-3 py-2.5 bg-secondary/40 border border-border rounded-lg text-sm text-foreground",
                                        "focus:outline-none focus:border-indigo-500/60 transition-all appearance-none cursor-pointer",
                                        "font-mono disabled:opacity-40 disabled:cursor-not-allowed",
                                        !form.timeEnd && "text-muted-foreground"
                                    )}
                                >
                                    <option value="" disabled className="bg-zinc-900">{t('agenda.timeEndPh')}</option>
                                    {endOptions.map(t => (
                                        <option key={t} value={t} className="bg-zinc-900">{t}</option>
                                    ))}
                                </select>
                                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                            </div>

                            {/* Hours badge */}
                            {hours > 0 && (
                                <div className="shrink-0 text-center bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2 min-w-[60px]">
                                    <p className="text-indigo-300 font-bold text-sm leading-none">{formatHours(hours)}</p>
                                    <p className="text-indigo-500 text-[9px] mt-0.5">{t('agenda.plannedAbbr')}</p>
                                </div>
                            )}
                        </div>

                        {/* Quick presets */}
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { label: '1h',                      start: '10:00', end: '11:00' },
                                { label: '1h 30m',                  start: '10:00', end: '11:30' },
                                { label: '2h',                      start: '10:00', end: '12:00' },
                                { label: t('agenda.presetMorning'), start: '09:00', end: '13:00' },
                                { label: t('agenda.presetAfternoon'), start: '14:00', end: '18:00' },
                            ].map(p => (
                                <button
                                    key={p.label}
                                    onClick={() => setForm(f => ({ ...f, timeStart: p.start, timeEnd: p.end }))}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-[10px] font-medium border transition-all",
                                        form.timeStart === p.start && form.timeEnd === p.end
                                            ? "bg-indigo-600/30 border-indigo-500/40 text-indigo-200"
                                            : "bg-white/3 border-white/8 text-zinc-500 hover:text-zinc-300 hover:bg-white/6"
                                    )}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Division — shown as read-only badge when 1 division, picker when 2+ */}
                    {consultantDivisions.length > 1 ? (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5" />
                                {t('agenda.division')}
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {consultantDivisions.map(div => (
                                    <button
                                        key={div}
                                        onClick={() => setForm(f => ({ ...f, divisionId: div, divisionName: div }))}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                                            form.divisionId === div
                                                ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
                                                : "bg-white/3 border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/6"
                                        )}
                                    >
                                        {div}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 text-zinc-600" />
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{t('agenda.division')}:</span>
                            <span className="text-xs font-medium text-violet-400 bg-violet-600/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                                {form.divisionName || consultantDivisions[0]}
                            </span>
                        </div>
                    )}

                    {/* Result */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t('agenda.statusLabel')}
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {Object.values(ResultStatus).map(status => {
                                const cfg = RESULT_CONFIG[status];
                                const selected = form.result === status;
                                return (
                                    <button
                                        key={status}
                                        onClick={() => setForm(f => ({ ...f, result: status }))}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                                            selected
                                                ? "bg-white/10 border-white/20 text-white"
                                                : "bg-white/3 border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/6"
                                        )}
                                    >
                                        <span className={cn("w-2 h-2 rounded-full", cfg.dotClass)} />
                                        {t(RESULT_TKEYS[status]) || cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Save error */}
                    {saveError && (
                        <div className="rounded-lg bg-red-950/40 border border-red-500/30 p-3">
                            <p className="text-xs text-red-300">{saveError}</p>
                        </div>
                    )}

                    {/* Jira preview */}
                    {jiraPreview && (
                        <div className="rounded-lg bg-zinc-900 border border-white/5 p-3">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" />
                                {t('agenda.jiraRecordLabel')}
                            </p>
                            <p className="text-xs text-zinc-300 font-mono break-all leading-relaxed">
                                {jiraPreview}
                            </p>
                        </div>
                    )}

                    {/* Clone success message */}
                    {cloneSuccess && (
                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 mt-2 animate-in fade-in slide-in-from-bottom-2">
                            <p className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                {cloneSuccess}
                            </p>
                        </div>
                    )}

                    {/* Clone UI */}
                    {showClone && isEdit && (
                        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 mt-2 animate-in fade-in slide-in-from-top-2">
                            <h4 className="text-sm font-semibold text-indigo-300 mb-3 flex items-center gap-2">
                                <Copy className="w-4 h-4" />
                                Duplicar tarea
                            </h4>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs text-zinc-400 font-medium">Recurso destino</label>
                                    <select
                                        value={cloneConsultantId}
                                        onChange={e => setCloneConsultantId(e.target.value)}
                                        className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-indigo-500 transition-colors"
                                    >
                                        {allConsultants.map(c => (
                                            <option key={c.userId} value={c.userId}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs text-zinc-400 font-medium">Fecha destino</label>
                                    <input
                                        type="date"
                                        value={cloneDate}
                                        onChange={e => setCloneDate(e.target.value)}
                                        className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleClone}
                                disabled={saving || !cloneDate || !cloneConsultantId}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                                Confirmar copia
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Footer ─────────────────────────────────────────────────── */}
                <div className="p-5 border-t border-border shrink-0 flex items-center justify-between gap-3">
                    {isEdit ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleDelete}
                                disabled={deleting || saving}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all disabled:opacity-50"
                            >
                                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                {t('agenda.delete')}
                            </button>
                            <button
                                onClick={() => setShowClone(!showClone)}
                                disabled={deleting || saving}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all disabled:opacity-50",
                                    showClone ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "text-indigo-400 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20"
                                )}
                            >
                                <Copy className="w-4 h-4" />
                                Duplicar
                            </button>
                        </div>
                    ) : <span />}

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                        >
                            {t('agenda.cancel')}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isEdit ? t('agenda.saveChanges') : t('agenda.addEntry')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

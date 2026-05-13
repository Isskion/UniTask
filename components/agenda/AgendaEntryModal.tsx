"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Clock, Tag, AlignLeft, CheckCircle2, Loader2, Trash2, ExternalLink, Sun, FolderGit2, Search, ChevronDown } from "lucide-react";
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
import { collection, query, where, getDocs } from "firebase/firestore";
import { filterBySAMScope } from "@/lib/projects";
import { useAccessScopes } from "@/hooks/useAccessScopes";
import { Project } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    consultant: AgendaConsultant;
    date: Date;
    entry?: AgendaEntry | null;
    tenantId: string;
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

interface FormState {
    activityType:  ActivityType;
    comment:       string;
    timeStart:     string;
    timeEnd:       string;
    result:        ResultStatus;
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

export function AgendaEntryModal({ isOpen, onClose, consultant, date, entry, tenantId }: Props) {
    const { user } = useAuth();
    const accessScopes = useAccessScopes(); // SAM scope — null = sin restricción
    const isEdit = !!entry;

    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [saving,   setSaving]   = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // ── Projects ──────────────────────────────────────────────────────────────
    const [projects,      setProjects]      = useState<Project[]>([]);
    const [projectSearch, setProjectSearch] = useState('');
    const [projectOpen,   setProjectOpen]   = useState(false);

    useEffect(() => {
        if (!isOpen || !tenantId) return;
        getDocs(query(
            collection(db, 'projects'),
            where('tenantId', '==', tenantId),
            where('isActive', '==', true)
        )).then(snap => {
            const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
            // Apply SAM scope: null = sin restricción (hoy), accessScopes cuando se active
            setProjects(filterBySAMScope(all, accessScopes));
        }).catch(console.error);
    }, [isOpen, tenantId, accessScopes]);

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
                projectId:     entry.projectId    || '',
                projectName:   entry.projectName  || '',
                projectCode:   entry.projectCode  || '',
                projectColor:  entry.projectColor || '',
            });
        } else {
            setForm(EMPTY_FORM);
        }
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
                ? 'Error de permisos. Pulsa ↺ en la barra de la agenda para limpiar caché y recargar.'
                : 'Error al guardar. Inténtalo de nuevo.'
            );
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!entry) return;
        if (!confirm('¿Eliminar esta entrada?')) return;
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">

                {/* ── Header ─────────────────────────────────────────────────── */}
                <div className="flex items-start justify-between p-5 border-b border-white/8 shrink-0">
                    <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
                            {isEdit ? 'Editar entrada' : 'Nueva entrada'}
                        </p>
                        <h2 className="text-white font-semibold text-base leading-tight">{consultant.name}</h2>
                        <p className="text-zinc-400 text-sm mt-0.5 capitalize">
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
                            Tipo de actividad
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
                                        {cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Comment */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <AlignLeft className="w-3.5 h-3.5" />
                            Comentario
                            <span className="text-zinc-600 font-normal normal-case">CLIENTE / DESCRIPCION</span>
                        </label>
                        <input
                            type="text"
                            value={form.comment}
                            onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                            placeholder="LUIS SIMOES / Sesión de diseño de solución"
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/7 transition-all"
                        />
                        {(client || description) && (
                            <div className="flex gap-3 text-xs">
                                <span className="text-zinc-500">Cliente: <span className="text-zinc-300 font-mono">{client || '—'}</span></span>
                                <span className="text-zinc-500">Desc: <span className="text-zinc-300 font-mono">{description || '—'}</span></span>
                            </div>
                        )}
                    </div>

                    {/* ── Proyecto ───────────────────────────────────────────── */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <FolderGit2 className="w-3.5 h-3.5" />
                            Proyecto
                            <span className="text-zinc-600 font-normal normal-case">(opcional)</span>
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
                                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/8 transition-all text-sm"
                            >
                                <Search className="w-3.5 h-3.5" />
                                Seleccionar proyecto...
                            </button>
                        )}

                        {/* Dropdown */}
                        {projectOpen && (
                            <div className="rounded-xl border border-white/10 bg-[#111113] shadow-2xl overflow-hidden">
                                {/* Search */}
                                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8">
                                    <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                    <input
                                        autoFocus
                                        type="text"
                                        value={projectSearch}
                                        onChange={e => setProjectSearch(e.target.value)}
                                        placeholder="Buscar por nombre, código o cliente..."
                                        className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
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
                                            Sin proyecto
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
                                Horario
                            </label>
                            {/* Día completo */}
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
                                Día completo
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
                                        "w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white",
                                        "focus:outline-none focus:border-indigo-500/60 transition-all appearance-none cursor-pointer",
                                        "font-mono",
                                        !form.timeStart && "text-zinc-500"
                                    )}
                                >
                                    <option value="" disabled className="bg-zinc-900">Inicio</option>
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
                                        "w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white",
                                        "focus:outline-none focus:border-indigo-500/60 transition-all appearance-none cursor-pointer",
                                        "font-mono disabled:opacity-40 disabled:cursor-not-allowed",
                                        !form.timeEnd && "text-zinc-500"
                                    )}
                                >
                                    <option value="" disabled className="bg-zinc-900">Fin</option>
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
                                    <p className="text-indigo-500 text-[9px] mt-0.5">planif.</p>
                                </div>
                            )}
                        </div>

                        {/* Quick presets */}
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { label: '1h',    start: '10:00', end: '11:00' },
                                { label: '1h 30m', start: '10:00', end: '11:30' },
                                { label: '2h',    start: '10:00', end: '12:00' },
                                { label: 'Mañana', start: '09:00', end: '13:00' },
                                { label: 'Tarde',  start: '14:00', end: '18:00' },
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

                    {/* Result */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Estado
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
                                        {cfg.label}
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
                                Registro Jira generado
                            </p>
                            <p className="text-xs text-zinc-300 font-mono break-all leading-relaxed">
                                {jiraPreview}
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Footer ─────────────────────────────────────────────────── */}
                <div className="p-5 border-t border-white/8 shrink-0 flex items-center justify-between gap-3">
                    {isEdit ? (
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all disabled:opacity-50"
                        >
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Eliminar
                        </button>
                    ) : <span />}

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isEdit ? 'Guardar cambios' : 'Añadir entrada'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

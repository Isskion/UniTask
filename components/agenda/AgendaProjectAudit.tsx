"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import { X, CheckCircle2, Loader2, Pencil, AlertTriangle } from "lucide-react";
import { AgendaEntry, AgendaConsultant, ACTIVITY_TKEYS } from "@/types/agenda";
import { Project, getRoleLevel } from "@/types";
import { getActiveProjects, filterBySAMScope, updateProject } from "@/lib/projects";
import { updateAgendaEntry, SAMDivision } from "@/lib/agenda";
import { PROJECT_ELIGIBLE_ACTIVITIES, buildKnownProjectNames } from "@/lib/agenda-import";
import { ProjectResolver, NameResolution } from "./AgendaImportModal";
import { AgendaEntryModal } from "./AgendaEntryModal";
import { useAuth } from "@/context/AuthContext";
import { useAccessScopes } from "@/hooks/useAccessScopes";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
    entries:      AgendaEntry[];
    consultants:  AgendaConsultant[];
    tenantId:     string;
    samDivisions: SAMDivision[];
    onClose:      () => void;
}

interface ModalState {
    open:       boolean;
    consultant: AgendaConsultant | null;
    date:       Date | null;
    entry:      AgendaEntry | null;
}

const CLOSED_MODAL: ModalState = { open: false, consultant: null, date: null, entry: null };

function entryDate(e: AgendaEntry): Date {
    return e.date instanceof Timestamp ? e.date.toDate() : new Date(e.date as unknown as string);
}

export function AgendaProjectAudit({ entries, consultants, tenantId, samDivisions, onClose }: Props) {
    const { t } = useLanguage();
    const { user, userRole } = useAuth();
    const accessScopes = useAccessScopes();

    const [projects, setProjects] = useState<Project[]>([]);
    useEffect(() => {
        if (!tenantId) return;
        getActiveProjects(tenantId, user?.uid, getRoleLevel(userRole))
            .then(all => setProjects(filterBySAMScope(all, accessScopes)))
            .catch(console.error);
    }, [tenantId, user, userRole, accessScopes]);

    const known = useMemo(() => buildKnownProjectNames(projects), [projects]);

    // ── Candidatas: actividades "de proyecto" sin projectId ──────────────────
    const candidates = useMemo(() =>
        entries.filter(e => PROJECT_ELIGIBLE_ACTIVITIES.has(e.activityType) && !e.projectId)
    , [entries]);

    const exactMatches = useMemo(() =>
        candidates.filter(e => e.client && known.has(e.client))
    , [candidates, known]);

    const needsReview = useMemo(() =>
        candidates.filter(e => e.client && !known.has(e.client))
    , [candidates, known]);

    const noClientText = useMemo(() =>
        candidates.filter(e => !e.client)
    , [candidates]);

    const reviewGroups = useMemo(() => {
        const map = new Map<string, AgendaEntry[]>();
        needsReview.forEach(e => {
            if (!map.has(e.client)) map.set(e.client, []);
            map.get(e.client)!.push(e);
        });
        return [...map.entries()].map(([text, groupEntries]) => ({ text, entries: groupEntries }));
    }, [needsReview]);

    const exactMatchSummary = useMemo(() => {
        const map = new Map<string, Project>();
        exactMatches.forEach(e => { if (!map.has(e.client)) map.set(e.client, known.get(e.client)!); });
        return [...map.entries()];
    }, [exactMatches, known]);

    const [resolutions, setResolutions] = useState<Record<string, NameResolution>>({});
    const [applying,    setApplying]    = useState(false);
    const [done,        setDone]        = useState<{ autoAssigned: number; resolved: number } | null>(null);
    const [modal,       setModal]       = useState<ModalState>(CLOSED_MODAL);

    function openEdit(e: AgendaEntry) {
        const consultant = consultants.find(c => c.userId === e.consultantId) || null;
        setModal({ open: true, consultant, date: entryDate(e), entry: e });
    }

    async function handleApply() {
        setApplying(true);
        try {
            await Promise.all(exactMatches.map(e => {
                const p = known.get(e.client)!;
                return updateAgendaEntry(e.id, {
                    projectId: p.id, projectName: p.name, projectCode: p.code, projectColor: p.color || null,
                });
            }));

            let resolvedCount = 0;
            for (const group of reviewGroups) {
                const r = resolutions[group.text];
                if (!r?.choice || r.choice === 'NONE') continue;
                const project = projects.find(p => p.id === r.choice);
                if (!project) continue;

                await Promise.all(group.entries.map(e => updateAgendaEntry(e.id, {
                    projectId: project.id, projectName: project.name, projectCode: project.code, projectColor: project.color || null,
                })));
                resolvedCount += group.entries.length;

                if (r.remember) {
                    const existingAliases = project.aliases ?? [];
                    if (!existingAliases.includes(group.text)) {
                        await updateProject(project.id, { aliases: [...existingAliases, group.text] });
                    }
                }
            }

            setDone({ autoAssigned: exactMatches.length, resolved: resolvedCount });
        } catch (err) {
            console.error('[agenda] project audit apply error:', err);
        } finally {
            setApplying(false);
        }
    }

    const hasNothingToDo   = candidates.length === 0;
    const hasNothingPending = exactMatches.length === 0 && reviewGroups.every(g => !resolutions[g.text]?.choice);

    return (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">

                {/* ── Header ─────────────────────────────────────────────────── */}
                <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
                    <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Herramienta PM</p>
                        <h2 className="text-foreground font-semibold text-base leading-tight">Auditoría de proyectos</h2>
                        <p className="text-muted-foreground text-sm mt-0.5">Tareas de esta semana sin proyecto asignado</p>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Body ───────────────────────────────────────────────────── */}
                <div className="overflow-y-auto flex-1 p-5 space-y-5 custom-scrollbar">
                    {done ? (
                        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            <p className="text-sm text-emerald-300">
                                {done.autoAssigned + done.resolved === 0
                                    ? 'No se aplicó ningún cambio.'
                                    : `Asignadas ${done.autoAssigned} tarea(s) por coincidencia exacta y ${done.resolved} por resolución manual.`}
                            </p>
                        </div>
                    ) : hasNothingToDo ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500/60" />
                            <p className="text-sm text-muted-foreground">Todas las tareas de esta semana ya tienen proyecto asignado.</p>
                        </div>
                    ) : (
                        <>
                            {exactMatchSummary.length > 0 && (
                                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 space-y-2">
                                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                        {exactMatches.length} tarea(s) con coincidencia exacta — se asignarán automáticamente
                                    </div>
                                    <ul className="text-xs text-muted-foreground space-y-1">
                                        {exactMatchSummary.map(([text, p]) => (
                                            <li key={text}>"{text}" → <span className="text-foreground font-medium">{p.name}</span></li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {reviewGroups.length > 0 && (
                                <ProjectResolver
                                    texts={reviewGroups.map(g => g.text)}
                                    projects={projects}
                                    resolutions={resolutions}
                                    onChange={(text, choice) => setResolutions(prev => ({
                                        ...prev,
                                        [text]: { choice, remember: prev[text]?.remember ?? true },
                                    }))}
                                    onToggleRemember={text => setResolutions(prev => ({
                                        ...prev,
                                        [text]: { choice: prev[text]?.choice ?? '', remember: !(prev[text]?.remember ?? true) },
                                    }))}
                                />
                            )}

                            {noClientText.length > 0 && (
                                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 space-y-2">
                                    <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        {noClientText.length} tarea(s) sin texto para analizar — requieren revisión manual
                                    </div>
                                    <div className="space-y-1.5">
                                        {noClientText.map(e => (
                                            <div key={e.id} className="flex items-center justify-between gap-2 p-2 bg-background/40 border border-amber-500/10 rounded-lg text-xs">
                                                <span className="text-foreground">
                                                    {e.consultantName} · {format(entryDate(e), 'dd/MM', { locale: es })} · {t(ACTIVITY_TKEYS[e.activityType]) || e.activityType}
                                                </span>
                                                <button
                                                    onClick={() => openEdit(e)}
                                                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium shrink-0"
                                                >
                                                    <Pencil className="w-3 h-3" /> Editar
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── Footer ─────────────────────────────────────────────────── */}
                <div className="p-5 border-t border-border shrink-0 flex items-center justify-end gap-3">
                    {done || hasNothingToDo ? (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
                        >
                            Cerrar
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleApply}
                                disabled={applying || hasNothingPending}
                                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {applying && <Loader2 className="w-4 h-4 animate-spin" />}
                                Aplicar cambios
                            </button>
                        </>
                    )}
                </div>
            </div>

            {modal.open && (
                <AgendaEntryModal
                    isOpen={modal.open}
                    onClose={() => setModal(CLOSED_MODAL)}
                    consultant={modal.consultant}
                    allConsultants={consultants}
                    date={modal.date}
                    entry={modal.entry}
                    tenantId={tenantId}
                    samDivisions={samDivisions}
                />
            )}
        </div>
    );
}

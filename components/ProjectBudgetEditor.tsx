"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Project, ProjectPhase } from "@/types";
import { ActivityType, ACTIVITY_CONFIG } from "@/types/agenda";
import { useLanguage } from "@/context/LanguageContext";
import { Clock, Plus, Trash2, ChevronDown, ChevronRight, Link2 } from "lucide-react";

interface TaskTypeLite { id: string; name: string; color?: string; }

interface Props {
    formData: Partial<Project>;
    setFormData: (updater: Partial<Project>) => void;
    isLight: boolean;
    canEdit: boolean;
    tenantId?: string;
}

const PHASE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#ec4899", "#84cc16"];

/** Editor de presupuesto de horas por fase + mapeo de actividades/tipos de tarea a fase.
 *  Escribe directamente en formData (budgetPhases, budgetHours, startDate, endDate, phaseMapping),
 *  que el handleSave del padre persiste tal cual. Todo opcional: sin fases, el proyecto no tiene presupuesto. */
export default function ProjectBudgetEditor({ formData, setFormData, isLight, canEdit, tenantId }: Props) {
    const { t } = useLanguage();
    const phases = formData.budgetPhases ?? [];
    const [open, setOpen] = useState(phases.length > 0);
    const [mappingOpen, setMappingOpen] = useState(false);
    const [taskTypes, setTaskTypes] = useState<TaskTypeLite[]>([]);

    const tid = formData.tenantId || tenantId;

    useEffect(() => {
        if (!tid) { setTaskTypes([]); return; }
        getDocs(query(collection(db, "taskTypes"), where("tenantId", "==", tid)))
            .then(snap => setTaskTypes(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as TaskTypeLite))))
            .catch(err => console.error("[ProjectBudgetEditor] error cargando taskTypes:", err));
    }, [tid]);

    const totalBudget = useMemo(() => phases.reduce((s, p) => s + (Number(p.hours) || 0), 0), [phases]);

    // Mantiene budgetHours sincronizado con la suma de las fases.
    const commitPhases = (next: ProjectPhase[]) => {
        const total = next.reduce((s, p) => s + (Number(p.hours) || 0), 0);
        setFormData({ ...formData, budgetPhases: next, budgetHours: total });
    };

    const addPhase = () => {
        const color = PHASE_COLORS[phases.length % PHASE_COLORS.length];
        commitPhases([...phases, { id: crypto.randomUUID(), name: "", hours: 0, color }]);
        setOpen(true);
    };
    const updatePhase = (id: string, patch: Partial<ProjectPhase>) =>
        commitPhases(phases.map(p => p.id === id ? { ...p, ...patch } : p));
    const removePhase = (id: string) => {
        const next = phases.filter(p => p.id !== id);
        // Limpia el mapeo que apuntaba a la fase borrada, sin dejar claves undefined
        // (Firestore rechaza valores undefined en updateDoc).
        const m = formData.phaseMapping;
        const total = next.reduce((s, p) => s + (Number(p.hours) || 0), 0);
        const patch: Partial<Project> = { ...formData, budgetPhases: next, budgetHours: total };
        if (m) {
            const clean = (rec?: Record<string, string>) =>
                Object.fromEntries(Object.entries(rec ?? {}).filter(([, v]) => v !== id));
            patch.phaseMapping = { activityToPhase: clean(m.activityToPhase), taskTypeToPhase: clean(m.taskTypeToPhase) };
        }
        setFormData(patch);
    };

    const setActivityPhase = (activity: string, phaseId: string) => {
        const m = formData.phaseMapping ?? {};
        const activityToPhase = { ...(m.activityToPhase ?? {}) };
        if (phaseId) activityToPhase[activity] = phaseId; else delete activityToPhase[activity];
        setFormData({ ...formData, phaseMapping: { ...m, activityToPhase } });
    };
    const setTaskTypePhase = (taskTypeId: string, phaseId: string) => {
        const m = formData.phaseMapping ?? {};
        const taskTypeToPhase = { ...(m.taskTypeToPhase ?? {}) };
        if (phaseId) taskTypeToPhase[taskTypeId] = phaseId; else delete taskTypeToPhase[taskTypeId];
        setFormData({ ...formData, phaseMapping: { ...m, taskTypeToPhase } });
    };

    const inputCls = cn("border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none disabled:opacity-50",
        isLight ? "bg-white border-zinc-300 text-zinc-900" : "bg-black/50 border-white/10 text-zinc-200");
    const labelCls = cn("text-[10px] uppercase font-bold", isLight ? "text-zinc-700" : "text-foreground");
    const selectCls = cn("border rounded-md px-2 py-1.5 text-xs focus:border-primary outline-none appearance-none disabled:opacity-50",
        isLight ? "bg-white border-zinc-300 text-zinc-900" : "bg-black/50 border-white/10 text-zinc-200");

    return (
        <div className={cn("rounded-xl border", isLight ? "bg-zinc-50/60 border-zinc-200" : "bg-white/[0.03] border-white/10")}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3"
            >
                <span className={cn("text-sm font-bold flex items-center gap-2", isLight ? "text-zinc-900" : "text-foreground")}>
                    <Clock className="w-4 h-4 text-primary" />
                    Presupuesto de horas
                </span>
                <span className="flex items-center gap-3">
                    {totalBudget > 0 && (
                        <span className="text-xs font-mono text-primary font-bold">{totalBudget} h</span>
                    )}
                    {open ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                </span>
            </button>

            {open && (
                <div className={cn("px-4 pb-4 space-y-5 border-t", isLight ? "border-zinc-200" : "border-white/5")}>

                    {/* Fechas opcionales */}
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="space-y-1.5">
                            <label className={labelCls}>Fecha inicio</label>
                            <input
                                type="date"
                                disabled={!canEdit}
                                className={cn(inputCls, "w-full")}
                                value={formData.startDate || ""}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>Fecha fin</label>
                            <input
                                type="date"
                                disabled={!canEdit}
                                className={cn(inputCls, "w-full")}
                                value={formData.endDate || ""}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Fases */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className={labelCls}>Fases / actividades</label>
                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={addPhase}
                                    className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Añadir fase
                                </button>
                            )}
                        </div>

                        {phases.length === 0 && (
                            <p className="text-xs text-zinc-500 italic py-2">
                                Sin fases. Añade fases para definir el presupuesto de horas del proyecto.
                            </p>
                        )}

                        {phases.map(ph => (
                            <div key={ph.id} className="flex items-center gap-2">
                                <input
                                    type="color"
                                    disabled={!canEdit}
                                    value={ph.color || "#6366f1"}
                                    onChange={e => updatePhase(ph.id, { color: e.target.value })}
                                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 shrink-0 disabled:opacity-50"
                                    title={t('common.color')}
                                />
                                <input
                                    disabled={!canEdit}
                                    className={cn(inputCls, "flex-1")}
                                    value={ph.name}
                                    onChange={e => updatePhase(ph.id, { name: e.target.value })}
                                    placeholder="Nombre de la fase (ej: Análisis)"
                                />
                                <input
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    disabled={!canEdit}
                                    className={cn(inputCls, "w-24 text-right")}
                                    value={ph.hours || ""}
                                    onChange={e => updatePhase(ph.id, { hours: Number(e.target.value) || 0 })}
                                    placeholder="h"
                                />
                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={() => removePhase(ph.id)}
                                        className="p-1.5 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-500/10 shrink-0"
                                        title={t('common.delete')}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}

                        {phases.length > 0 && (
                            <div className={cn("flex items-center justify-between pt-2 mt-1 border-t text-sm", isLight ? "border-zinc-200" : "border-white/5")}>
                                <span className={cn("font-semibold", isLight ? "text-zinc-700" : "text-zinc-300")}>Total presupuestado</span>
                                <span className="font-mono font-bold text-primary">{totalBudget} h</span>
                            </div>
                        )}
                    </div>

                    {/* Mapeo a fases (atribución de horas consumidas) */}
                    {phases.length > 0 && (
                        <div className={cn("rounded-lg border", isLight ? "border-zinc-200" : "border-white/10")}>
                            <button
                                type="button"
                                onClick={() => setMappingOpen(o => !o)}
                                className="w-full flex items-center justify-between px-3 py-2.5"
                            >
                                <span className={cn("text-xs font-bold flex items-center gap-2", isLight ? "text-zinc-700" : "text-zinc-300")}>
                                    <Link2 className="w-3.5 h-3.5" />
                                    Atribución a fases
                                </span>
                                {mappingOpen ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                            </button>

                            {mappingOpen && (
                                <div className={cn("px-3 pb-3 space-y-4 border-t", isLight ? "border-zinc-200" : "border-white/5")}>
                                    <p className="text-[11px] text-zinc-500 pt-3">
                                        Asigna cada actividad de agenda (planificado) y tipo de tarea del temporizador (real) a una fase. Lo no asignado se contabiliza como «Sin fase».
                                    </p>

                                    {/* Actividades de agenda → fase (planificado) */}
                                    <div className="space-y-1.5">
                                        <label className={labelCls}>Planificado (agenda)</label>
                                        {Object.values(ActivityType).map(act => (
                                            <div key={act} className="flex items-center justify-between gap-2">
                                                <span className={cn("text-[11px] font-semibold px-1.5 py-0.5 rounded", ACTIVITY_CONFIG[act].bgClass, ACTIVITY_CONFIG[act].textClass)}>
                                                    {ACTIVITY_CONFIG[act].label}
                                                </span>
                                                <select
                                                    disabled={!canEdit}
                                                    className={selectCls}
                                                    value={formData.phaseMapping?.activityToPhase?.[act] || ""}
                                                    onChange={e => setActivityPhase(act, e.target.value)}
                                                >
                                                    <option value="">— Sin fase —</option>
                                                    {phases.map(p => <option key={p.id} value={p.id}>{p.name || '(fase)'}</option>)}
                                                </select>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Tipos de tarea del temporizador → fase (real) */}
                                    {taskTypes.length > 0 && (
                                        <div className="space-y-1.5">
                                            <label className={labelCls}>Real (temporizador)</label>
                                            {taskTypes.map(tt => (
                                                <div key={tt.id} className="flex items-center justify-between gap-2">
                                                    <span className="text-[11px] font-medium text-zinc-400 truncate flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tt.color || '#888' }} />
                                                        {tt.name}
                                                    </span>
                                                    <select
                                                        disabled={!canEdit}
                                                        className={selectCls}
                                                        value={formData.phaseMapping?.taskTypeToPhase?.[tt.id] || ""}
                                                        onChange={e => setTaskTypePhase(tt.id, e.target.value)}
                                                    >
                                                        <option value="">— Sin fase —</option>
                                                        {phases.map(p => <option key={p.id} value={p.id}>{p.name || '(fase)'}</option>)}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

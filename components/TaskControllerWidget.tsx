"use client";

import React, { useState, useEffect, useRef } from "react";
import * as Lucide from "lucide-react";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    getDocs,
    increment,
    updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { DynamicLucideIcon } from "./admin/TaskControlPanel";

interface TaskType {
    id: string;
    name: string;
    icon: string;
    color: string;
    active: boolean;
    usageCount: number;
}

interface Project {
    id: string;
    name: string;
    code?: string;
    status: string;
}

interface ConsultantTask {
    id: string;
    projectName: string;
    projectId: string;
    taskTypeName: string;
    taskTypeId: string;
    details: string;
    durationMinutes: number;
    createdAt: any;
}

export default function TaskControllerWidget({ embedded = false }: { embedded?: boolean }) {
    const { user, userRole, tenantId, loading: authLoading } = useAuth();
    const { showToast } = useToast();
    const { theme } = useTheme();

    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"now" | "retro" | "today">("now");

    // Dynamic Lists
    const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [todayTasks, setTodayTasks] = useState<ConsultantTask[]>([]);

    // Form states - "Ahora mismo"
    const [timerActive, setTimerActive] = useState(false);
    const [secondsElapsed, setSecondsElapsed] = useState(0);
    const [nowProject, setNowProject] = useState("");
    const [nowCategory, setNowCategory] = useState<TaskType | null>(null);
    const [nowDetails, setNowDetails] = useState("");

    // Form states - "Retroactivo"
    const [retroProject, setRetroProject] = useState("");
    const [retroCategory, setRetroCategory] = useState<TaskType | null>(null);
    const [retroDetails, setRetroDetails] = useState("");
    const [retroDuration, setRetroDuration] = useState(15); // Default 15 minutes

    // Inline success feedback
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const currentTenantId = tenantId || "";

    // 1. Fetch Categories & Projects & Today's tasks
    useEffect(() => {
        if (!user || !currentTenantId || currentTenantId === "unknown" || currentTenantId === "__DENY__") return;

        // Fetch categories (active only)
        const qCategories = query(
            collection(db, "taskTypes"),
            where("tenantId", "==", currentTenantId),
            where("active", "==", true)
        );
        const unsubCategories = onSnapshot(qCategories, (snap) => {
            const list: TaskType[] = [];
            snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as TaskType));
            setTaskTypes(list);
            if (list.length > 0 && !nowCategory) setNowCategory(list[0]);
        });

        // Fetch Projects (active only)
        const qProjects = query(
            collection(db, "projects"),
            where("tenantId", "==", currentTenantId)
        );
        const unsubProjects = onSnapshot(qProjects, (snap) => {
            const list: Project[] = [];
            snap.forEach((doc) => {
                const data = doc.data();
                if (data.status === "active") {
                    list.push({ id: doc.id, name: data.name, code: data.code, status: data.status });
                }
            });
            setProjects(list);
            if (list.length > 0) {
                setNowProject(list[0].id);
                setRetroProject(list[0].id);
            }
        });

        // Fetch Today's Tasks
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const qTasks = query(
            collection(db, "consultantTasks"),
            where("userId", "==", user.uid),
            where("tenantId", "==", currentTenantId),
            orderBy("createdAt", "desc")
        );
        const unsubTasks = onSnapshot(qTasks, (snap) => {
            const list: ConsultantTask[] = [];
            snap.forEach((doc) => {
                const data = doc.data();
                const ts = data.createdAt?.toDate();
                if (ts && ts >= todayStart) {
                    list.push({ id: doc.id, ...data } as ConsultantTask);
                }
            });
            setTodayTasks(list);
        });

        return () => {
            unsubCategories();
            unsubProjects();
            unsubTasks();
        };
    }, [user, currentTenantId]);

    // 2. Timer effect (Reliable implementation resistant to background tab throttling)
    useEffect(() => {
        let id: NodeJS.Timeout | null = null;

        if (timerActive) {
            // Recalculate origin timestamp relative to the absolute current time less any previously gathered durations.
            // This allows pauses and resumes to maintain atomic accuracy via clock comparison rather than cycle accumulation.
            const originTimestamp = Date.now() - (secondsElapsed * 1000);

            id = setInterval(() => {
                const currentDelta = Math.floor((Date.now() - originTimestamp) / 1000);
                // Enforce strictly increasing non-regressive clock value to prevent render jitter
                setSecondsElapsed(prev => Math.max(prev, currentDelta));
            }, 1000);
            timerRef.current = id;
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        return () => {
            if (id) clearInterval(id);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timerActive]);

    if (!user) return null;

    // Helper: format duration to MM:SS
    const formatTimer = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    // Actions: Timer start/pause
    const handleStartTimer = () => {
        setTimerActive(true);
        showToast("Widget de Tareas", "Temporizador iniciado", "success");
    };

    const handlePauseTimer = () => {
        setTimerActive(false);
    };

    // Action: Save real-time Task
    const handleSaveNowTask = async () => {
        if (isSaving) return;

        if (secondsElapsed < 10) {
            showToast("Widget de Tareas", "La tarea debe durar al menos 10 segundos para guardarse", "warning");
            return;
        }

        const selectedProjectObj = projects.find((p) => p.id === nowProject);
        if (!selectedProjectObj) {
            showToast("Error", "Selecciona un proyecto válido", "error");
            return;
        }

        if (!nowCategory) {
            showToast("Error", "Selecciona un tipo de tarea", "error");
            return;
        }

        try {
            setIsSaving(true);
            const durationMinutes = Math.max(Math.round(secondsElapsed / 60), 1);

            // Add task
            await addDoc(collection(db, "consultantTasks"), {
                userId: user.uid,
                userName: user.displayName || "Consultor",
                tenantId: currentTenantId,
                projectId: nowProject,
                projectName: selectedProjectObj.name,
                taskTypeId: nowCategory.id,
                taskTypeName: nowCategory.name,
                details: nowDetails,
                durationMinutes,
                type: "live",
                createdAt: serverTimestamp()
            });

            // Increment usage count on taskType
            await updateDoc(doc(db, "taskTypes", nowCategory.id), {
                usageCount: increment(1)
            });

            // Trigger premium inline success feedback
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);

            // Reset
            setTimerActive(false);
            setSecondsElapsed(0);
            setNowDetails("");
        } catch (err) {
            console.error(err);
            showToast("Error", "No se pudo registrar la tarea", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Action: Save Retroactive task
    const handleSaveRetroTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;

        const selectedProjectObj = projects.find((p) => p.id === retroProject);
        if (!selectedProjectObj) {
            showToast("Error", "Selecciona un proyecto válido", "error");
            return;
        }

        if (!retroCategory) {
            showToast("Error", "Selecciona un tipo de tarea", "error");
            return;
        }

        try {
            setIsSaving(true);
            await addDoc(collection(db, "consultantTasks"), {
                userId: user.uid,
                userName: user.displayName || "Consultor",
                tenantId: currentTenantId,
                projectId: retroProject,
                projectName: selectedProjectObj.name,
                taskTypeId: retroCategory.id,
                taskTypeName: retroCategory.name,
                details: retroDetails,
                durationMinutes: Number(retroDuration),
                type: "retroactive",
                createdAt: serverTimestamp()
            });

            // Increment usage count
            await updateDoc(doc(db, "taskTypes", retroCategory.id), {
                usageCount: increment(1)
            });

            // Success feedback
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);

            // Reset
            setRetroDetails("");
            setRetroDuration(15);
        } catch (err) {
            console.error(err);
            showToast("Error", "No se pudo registrar la tarea retroactiva", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Action: Undo/Delete Today's Task
    const handleUndoTask = async (id: string, taskTypeId: string) => {
        try {
            await deleteDoc(doc(db, "consultantTasks", id));
            // Decrement usage count
            await updateDoc(doc(db, "taskTypes", taskTypeId), {
                usageCount: increment(-1)
            });
            showToast("Widget de Tareas", "Registro eliminado", "info");
        } catch (err) {
            console.error(err);
            showToast("Error", "No se pudo deshacer la tarea", "error");
        }
    };

    // Action: Copy Today's Tasks in Markdown Format for Jira
    const handleCopyToClipboardMD = () => {
        if (todayTasks.length === 0) return;
        
        const dateStr = new Date().toLocaleDateString();
        let md = `### 📋 Actividades Imputadas - ${dateStr}\n\n`;
        todayTasks.forEach((task) => {
            md += `* **[${task.projectName}]** _${task.taskTypeName}_ (${task.durationMinutes} min) - ${task.details || 'Sin detalles'}\n`;
        });
        
        navigator.clipboard.writeText(md).then(() => {
            showToast("Copiado", "Actividades copiadas al portapapeles en formato Markdown para Jira", "success");
        }).catch((err) => {
            console.error("Error copying to clipboard:", err);
            showToast("Error", "No se pudo copiar la información", "error");
        });
    };

    // Custom Triteme style settings for glass-panel
    const glassStyleClass = embedded
        ? cn(
            "w-full rounded-2xl border overflow-hidden flex flex-col mb-6 shadow-md transition-all duration-300",
            theme === "light"
                ? "bg-white border-zinc-200 text-zinc-900"
                : theme === "red"
                ? "bg-[#6A251A]/40 border-[#A33D2D]/20 text-white"
                : "bg-card border-border text-white"
          )
        : cn(
            "fixed bottom-24 right-6 w-96 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 transform origin-bottom-right z-[100] overflow-hidden",
            isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-75 opacity-0 translate-y-10 pointer-events-none",
            theme === "light"
                ? "bg-white/80 border-black/10 shadow-black/20 text-zinc-900"
                : theme === "red"
                ? "bg-[#6A251A]/90 border-[#A33D2D]/30 shadow-black/40 text-white"
                : "bg-zinc-900/80 border-white/10 shadow-black/50 text-white"
          );

    return (
        <>
            {/* The Floating Panel Glass card */}
            <div className={glassStyleClass}>
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-2">
                        <Lucide.Timer className="w-5 h-5 text-primary animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-wider">Control de Tareas</span>
                    </div>
                    {timerActive && (
                        <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-mono font-black text-emerald-500">{formatTimer(secondsElapsed)}</span>
                        </div>
                    )}
                </div>

                {/* Tab Selector */}
                <div className="flex border-b border-white/5 text-center text-xs font-bold bg-white/2">
                    <button
                        onClick={() => setActiveTab("now")}
                        className={cn(
                            "flex-1 py-2.5 transition-all relative border-b-2",
                            activeTab === "now" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Ahora mismo
                    </button>
                    <button
                        onClick={() => setActiveTab("retro")}
                        className={cn(
                            "flex-1 py-2.5 transition-all relative border-b-2",
                            activeTab === "retro" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Bloque anterior
                    </button>
                    <button
                        onClick={() => setActiveTab("today")}
                        className={cn(
                            "flex-1 py-2.5 transition-all relative border-b-2",
                            activeTab === "today" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Hoy ({todayTasks.length})
                    </button>
                </div>

                {/* Dynamic Inline Success Notification */}
                {saveSuccess && (
                    <div className="bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 p-3 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in slide-in-from-top-2 duration-300">
                        <Lucide.CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ¡Tarea registrada con éxito!
                    </div>
                )}

                {/* Content Box */}
                <div className="p-4 max-h-96 overflow-y-auto custom-scrollbar">
                    {/* 1. NOW TAB */}
                    {activeTab === "now" && (
                        <div className="space-y-4">
                            {/* Project Dropdown */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Proyecto</label>
                                <select
                                    value={nowProject}
                                    onChange={(e) => setNowProject(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-primary"
                                >
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id} className="bg-zinc-900 text-white">
                                            {p.name}
                                        </option>
                                    ))}
                                    {projects.length === 0 && (
                                        <option value="" className="bg-zinc-900 text-zinc-500">No hay proyectos activos</option>
                                    )}
                                </select>
                            </div>

                            {/* Task Categories pills */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Actividad</label>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                                    {taskTypes.map((type) => {
                                        const isSelected = nowCategory?.id === type.id;
                                        return (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => setNowCategory(type)}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all",
                                                    isSelected
                                                        ? "text-white scale-105 border-white/20"
                                                        : "bg-black/20 text-muted-foreground border-white/5 hover:border-white/10 hover:text-foreground"
                                                )}
                                                style={{ backgroundColor: isSelected ? type.color : "" }}
                                            >
                                                <DynamicLucideIcon name={type.icon} className="w-3 h-3" />
                                                {type.name}
                                            </button>
                                        );
                                    })}
                                    {taskTypes.length === 0 && (
                                        <p className="text-[10px] text-zinc-500 italic">No hay categorías configuradas por el admin</p>
                                    )}
                                </div>
                            </div>

                            {/* Memo Text area */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">¿Qué estás haciendo?</label>
                                <textarea
                                    value={nowDetails}
                                    onChange={(e) => setNowDetails(e.target.value)}
                                    placeholder="Describe brevemente tu labor actual..."
                                    rows={3}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary resize-none leading-relaxed"
                                />
                            </div>

                            {/* Timer actions */}
                            <div className="flex gap-2.5 pt-2">
                                {!timerActive ? (
                                    <button
                                        onClick={handleStartTimer}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg"
                                    >
                                        <Lucide.Play className="w-3.5 h-3.5" />
                                        Iniciar
                                    </button>
                                ) : (
                                    <button
                                        onClick={handlePauseTimer}
                                        className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg"
                                    >
                                        <Lucide.Pause className="w-3.5 h-3.5" />
                                        Pausar
                                    </button>
                                )}

                                <button
                                    onClick={handleSaveNowTask}
                                    disabled={secondsElapsed === 0}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Lucide.Save className="w-3.5 h-3.5" />
                                    Guardar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 2. RETRO TAB */}
                    {activeTab === "retro" && (
                        <form onSubmit={handleSaveRetroTask} className="space-y-4">
                            {/* Project Dropdown */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Proyecto</label>
                                <select
                                    value={retroProject}
                                    onChange={(e) => setRetroProject(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-primary"
                                >
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id} className="bg-zinc-900 text-white">
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Task Categories pills */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Actividad</label>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                                    {taskTypes.map((type) => {
                                        const isSelected = retroCategory?.id === type.id;
                                        return (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => setRetroCategory(type)}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all",
                                                    isSelected
                                                        ? "text-white scale-105 border-white/20"
                                                        : "bg-black/20 text-muted-foreground border-white/5 hover:border-white/10 hover:text-foreground"
                                                )}
                                                style={{ backgroundColor: isSelected ? type.color : "" }}
                                            >
                                                <DynamicLucideIcon name={type.icon} className="w-3 h-3" />
                                                {type.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Duration slider */}
                            <div className="space-y-1 bg-white/2 border border-white/5 p-2 rounded-xl">
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="font-black text-muted-foreground uppercase tracking-wider">Duración (minutos)</span>
                                    <span className="font-mono font-bold text-primary">{retroDuration} min</span>
                                </div>
                                <input
                                    type="range"
                                    min="5"
                                    max="240"
                                    step="5"
                                    value={retroDuration}
                                    onChange={(e) => setRetroDuration(Number(e.target.value))}
                                    className="w-full accent-primary mt-2"
                                />
                            </div>

                            {/* Memo Text area */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Detalle</label>
                                <textarea
                                    value={retroDetails}
                                    onChange={(e) => setRetroDetails(e.target.value)}
                                    placeholder="¿Qué lograste hacer en este bloque de tiempo?..."
                                    rows={3}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary resize-none leading-relaxed"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg mt-2"
                            >
                                <Lucide.Plus className="w-3.5 h-3.5" />
                                Registrar Bloque
                            </button>
                        </form>
                    )}

                    {/* 3. TODAY TAB */}
                    {activeTab === "today" && (
                        <div className="space-y-3">
                            {todayTasks.length > 0 && (
                                <button
                                    onClick={handleCopyToClipboardMD}
                                    className="w-full mb-3 flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 hover:border-primary/45 rounded-xl py-2 px-4 text-[10px] font-black uppercase tracking-wider transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-sm"
                                >
                                    <Lucide.Copy className="w-3.5 h-3.5" />
                                    Copiar para Jira (Markdown)
                                </button>
                            )}

                            {todayTasks.length === 0 ? (
                                <div className="text-center py-10 text-zinc-500 text-xs italic">
                                    No has registrado tareas en el día de hoy
                                </div>
                            ) : (
                                todayTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="p-3 bg-white/2 border border-white/5 rounded-xl flex items-start justify-between gap-3 group/row hover:border-white/10 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-black max-w-[125px] truncate">
                                                    {task.projectName}
                                                </span>
                                                <span className="text-[10px] bg-zinc-800 text-zinc-200 border border-white/10 px-2 py-0.5 rounded-full font-bold">
                                                    {task.taskTypeName}
                                                </span>
                                                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-300 font-bold ml-auto shrink-0">
                                                    {task.durationMinutes} min
                                                </span>
                                            </div>
                                            <p className="text-xs leading-relaxed mt-1.5 text-zinc-700 dark:text-zinc-200 font-medium break-words line-clamp-2">
                                                {task.details || <span className="text-zinc-500 dark:text-zinc-600 italic">Sin detalle técnico</span>}
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => handleUndoTask(task.id, task.taskTypeId)}
                                            className="opacity-0 group-hover/row:opacity-100 p-1.5 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 rounded transition-all shrink-0"
                                            title="Deshacer / Borrar"
                                        >
                                            <Lucide.Undo2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* The Floating Action Button (FAB) */}
            {!embedded && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl hover:scale-110 active:scale-95 group z-[110] border border-white/10",
                        isOpen
                            ? "bg-zinc-800 text-white rotate-45"
                            : theme === "red"
                            ? "bg-[#9E4839] text-white hover:bg-[#B15343] hover:shadow-[#9E4839]/30"
                            : "bg-primary text-white hover:bg-primary/95 hover:shadow-primary/30"
                    )}
                >
                    <Lucide.Plus className="w-7 h-7 group-hover:scale-110 transition-transform" />
                </button>
            )}
        </>
    );
}

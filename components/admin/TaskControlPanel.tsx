"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import * as Lucide from "lucide-react";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    addDoc,
    setDoc,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    getDocs
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface TaskType {
    id: string;
    name: string;
    icon: string;
    color: string;
    active: boolean;
    usageCount: number;
    createdAt?: any;
}

const AVAILABLE_ICONS = [
    { name: "Briefcase", label: "Trabajo General" },
    { name: "Users", label: "Reunión / Daily" },
    { name: "Wrench", label: "Configuración" },
    { name: "FileCode", label: "Desarrollo / Codificación" },
    { name: "BarChart3", label: "Análisis / Métricas" },
    { name: "LifeBuoy", label: "Soporte Técnico" },
    { name: "FileText", label: "Documentación" },
    { name: "Database", label: "Base de Datos" },
    { name: "Settings", label: "Administración" },
    { name: "Flame", label: "Urgente / Incidencia" },
    { name: "Sparkles", label: "Innovación / IA" },
    { name: "ClipboardList", label: "Planificación" }
];

const PRESET_COLORS = [
    "#8B5CF6", // Violet
    "#3B82F6", // Blue
    "#10B981", // Emerald
    "#F59E0B", // Amber
    "#EF4444", // Red
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#F97316", // Orange
    "#14B8A6", // Teal
    "#6366F1", // Indigo
    "#A855F7", // Purple
    "#E11D48"  // Crimson
];

export function DynamicLucideIcon({ name, className }: { name: string; className?: string }) {
    const IconComponent = (Lucide as any)[name] || Lucide.HelpCircle;
    return <IconComponent className={className} />;
}

export default function TaskControlPanel() {
    const { user, userRole, tenantId, loading: authLoading } = useAuth();
    const { showToast } = useToast();
    const { theme } = useTheme();

    const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<TaskType | null>(null);

    // Form States
    const [categoryName, setCategoryName] = useState("");
    const [selectedIcon, setSelectedIcon] = useState("Briefcase");
    const [selectedColor, setSelectedColor] = useState("#8B5CF6");

    // Debounce state for toggles
    const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

    const currentTenantId = tenantId || "";

    // Fetch Task Types
    useEffect(() => {
        if (!currentTenantId || currentTenantId === "unknown" || currentTenantId === "__DENY__") {
            setLoading(false);
            return;
        }

        setLoading(true);
        const q = query(
            collection(db, "taskTypes"),
            where("tenantId", "==", currentTenantId),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const types: TaskType[] = [];
            snapshot.forEach((doc) => {
                types.push({ id: doc.id, ...doc.data() } as TaskType);
            });
            setTaskTypes(types);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching task types:", error);
            showToast("Error", "No se pudieron cargar las categorías de tareas", "error");
            setLoading(false);
        });

        return () => {
            unsubscribe();
            // Clear any active timers on unmount
            Object.values(debounceTimers.current).forEach(clearTimeout);
        };
    }, [currentTenantId]);

    // Pre-seed default categories if empty
    const handlePreseedDefaults = async () => {
        const defaults = [
            { name: "Reunión / Daily", icon: "Users", color: "#8B5CF6", active: true, usageCount: 0 },
            { name: "Configuración", icon: "Wrench", color: "#F59E0B", active: true, usageCount: 0 },
            { name: "Desarrollo", icon: "FileCode", color: "#3B82F6", active: true, usageCount: 0 },
            { name: "Análisis / QA", icon: "BarChart3", color: "#10B981", active: true, usageCount: 0 },
            { name: "Soporte Técnico", icon: "LifeBuoy", color: "#E11D48", active: true, usageCount: 0 },
            { name: "Documentación", icon: "FileText", color: "#06B6D4", active: true, usageCount: 0 }
        ];

        try {
            showToast("UniTask", "Generando categorías iniciales...", "info");
            for (const item of defaults) {
                await addDoc(collection(db, "taskTypes"), {
                    ...item,
                    tenantId: currentTenantId,
                    createdAt: serverTimestamp()
                });
            }
            showToast("UniTask", "Categorías por defecto cargadas con éxito", "success");
        } catch (e) {
            console.error(e);
            showToast("Error", "No se pudieron precargar las categorías", "error");
        }
    };

    // Total monthly usage stats calculation
    const totalUses = useMemo(() => {
        return taskTypes.reduce((acc, curr) => acc + (curr.usageCount || 0), 0);
    }, [taskTypes]);

    const activeCount = useMemo(() => {
        return taskTypes.filter((t) => t.active).length;
    }, [taskTypes]);

    // Handle Toggle switch with 300ms debounce
    const handleToggleActive = (id: string, currentActive: boolean) => {
        // 1. Instantly update UI State
        setTaskTypes(prev => prev.map(t => t.id === id ? { ...t, active: !currentActive } : t));

        // 2. Clear previous active timer for this ID
        if (debounceTimers.current[id]) {
            clearTimeout(debounceTimers.current[id]);
        }

        // 3. Set a new timer
        debounceTimers.current[id] = setTimeout(async () => {
            try {
                const docRef = doc(db, "taskTypes", id);
                await updateDoc(docRef, {
                    active: !currentActive,
                    updatedAt: serverTimestamp()
                });
                showToast(
                    "Control de Tareas",
                    `Categoría ${!currentActive ? "activada" : "desactivada"} con éxito`,
                    "success"
                );
            } catch (err) {
                console.error("Error updating toggle state in Firestore:", err);
                showToast("Error", "Fallo al guardar estado en base de datos", "error");
                // Rollback UI state if write fails
                setTaskTypes(prev => prev.map(t => t.id === id ? { ...t, active: currentActive } : t));
            } finally {
                delete debounceTimers.current[id];
            }
        }, 300);
    };

    // Save Category (New or Edit)
    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryName.trim()) {
            showToast("Error", "El nombre es obligatorio", "error");
            return;
        }

        try {
            if (editingCategory) {
                const docRef = doc(db, "taskTypes", editingCategory.id);
                await updateDoc(docRef, {
                    name: categoryName,
                    icon: selectedIcon,
                    color: selectedColor,
                    updatedAt: serverTimestamp()
                });
                showToast("Control de Tareas", "Categoría actualizada con éxito", "success");
            } else {
                await addDoc(collection(db, "taskTypes"), {
                    name: categoryName,
                    icon: selectedIcon,
                    color: selectedColor,
                    active: true,
                    usageCount: 0,
                    tenantId: currentTenantId,
                    createdAt: serverTimestamp()
                });
                showToast("Control de Tareas", "Nueva categoría creada con éxito", "success");
            }

            // Reset and close
            handleCloseModal();
        } catch (err) {
            console.error("Error saving category:", err);
            showToast("Error", "No se pudo guardar la categoría", "error");
        }
    };

    const handleOpenEdit = (category: TaskType) => {
        setEditingCategory(category);
        setCategoryName(category.name);
        setSelectedIcon(category.icon);
        setSelectedColor(category.color);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
        setCategoryName("");
        setSelectedIcon("Briefcase");
        setSelectedColor("#8B5CF6");
    };

    const handleDeleteCategory = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar la categoría "${name}"?`)) return;

        try {
            await deleteDoc(doc(db, "taskTypes", id));
            showToast("Control de Tareas", "Categoría eliminada", "info");
        } catch (err) {
            console.error("Error deleting category:", err);
            showToast("Error", "No se pudo eliminar la categoría", "error");
        }
    };

    if (authLoading || !currentTenantId || currentTenantId === "unknown" || currentTenantId === "__DENY__") {
        return (
            <div className="flex flex-col space-y-8 w-full animate-in fade-in duration-300">
                <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-8 w-full animate-in fade-in duration-300">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-card/60 border border-border py-10 px-8 rounded-3xl shadow-2xl backdrop-blur-md relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-foreground flex items-center gap-3 tracking-tighter">
                        <Lucide.ClipboardCheck className="w-8 h-8 text-primary animate-pulse" />
                        CONTROL DE TAREAS
                    </h1>
                    <p className="text-muted-foreground mt-1 text-xs md:text-sm font-medium tracking-wide">
                        Administración de categorías de actividades del consultor
                    </p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-5 rounded-xl text-xs uppercase tracking-wider transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-primary/20"
                >
                    <Lucide.Plus className="w-4 h-4" />
                    Nueva Categoría
                </button>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Metric 1 */}
                <div className="bg-card border border-border p-6 rounded-2xl shadow-md flex items-center justify-between group hover:border-primary/20 transition-all duration-300">
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tipos Totales</p>
                        <h3 className="text-3xl font-black text-foreground tracking-tighter mt-1 group-hover:scale-105 transition-transform origin-left">
                            {taskTypes.length}
                        </h3>
                    </div>
                    <div className="p-3.5 bg-violet-500/10 text-violet-500 border border-violet-500/10 rounded-2xl shadow-inner">
                        <Lucide.Grid className="w-5 h-5" />
                    </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-card border border-border p-6 rounded-2xl shadow-md flex items-center justify-between group hover:border-primary/20 transition-all duration-300">
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Activos</p>
                        <h3 className="text-3xl font-black text-foreground tracking-tighter mt-1 group-hover:scale-105 transition-transform origin-left">
                            {activeCount}
                        </h3>
                    </div>
                    <div className="p-3.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 rounded-2xl shadow-inner">
                        <Lucide.CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>

                {/* Metric 3 */}
                <div className="bg-card border border-border p-6 rounded-2xl shadow-md flex items-center justify-between group hover:border-primary/20 transition-all duration-300">
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Usos Totales</p>
                        <h3 className="text-3xl font-black text-foreground tracking-tighter mt-1 group-hover:scale-105 transition-transform origin-left">
                            {totalUses}
                        </h3>
                    </div>
                    <div className="p-3.5 bg-rose-500/10 text-rose-500 border border-rose-500/10 rounded-2xl shadow-inner">
                        <Lucide.Activity className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Preseed Banner if Empty */}
            {!loading && taskTypes.length === 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-4">
                    <Lucide.Boxes className="w-12 h-12 text-primary mx-auto opacity-40" />
                    <h3 className="text-lg font-bold text-foreground">¿Sin categorías todavía?</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        No hay ninguna categoría de tareas definida para tu Tenant actual. Puedes crear una nueva categoría con el botón de la cabecera o cargar nuestro pack de categorías por defecto.
                    </p>
                    <button
                        onClick={handlePreseedDefaults}
                        className="bg-secondary hover:bg-secondary/80 text-foreground border border-border font-bold py-2 px-6 rounded-xl text-xs uppercase tracking-wider transition-all"
                    >
                        Cargar Pack por Defecto
                    </button>
                </div>
            )}

            {/* List Table Area */}
            {taskTypes.length > 0 && (
                <div className="bg-card/40 border border-border rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-md relative">
                    <div className="absolute -top-3.5 left-8 bg-primary text-white px-4 py-1 rounded-lg text-[9px] font-black tracking-[0.2em] shadow-lg">
                        LISTADO DE CATEGORÍAS
                    </div>

                    <div className="overflow-x-auto mt-2">
                        <table className="w-full text-left border-separate border-spacing-y-4">
                            <thead>
                                <tr className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                                    <th className="px-6 py-2">Icono / Categoría</th>
                                    <th className="px-6 py-2">Color</th>
                                    <th className="px-6 py-2 text-center">Usos Acumulados</th>
                                    <th className="px-6 py-2 text-center">Estado (Activo)</th>
                                    <th className="px-6 py-2 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {taskTypes.map((type) => (
                                    <tr key={type.id} className="group transition-all duration-300">
                                        <td className="px-6 py-4 bg-card/60 rounded-l-2xl border-l border-y border-border group-hover:bg-accent/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner border border-white/5 transition-transform group-hover:scale-105"
                                                    style={{ backgroundColor: `${type.color}15`, color: type.color }}
                                                >
                                                    <DynamicLucideIcon name={type.icon} className="w-5 h-5" />
                                                </div>
                                                <span className="text-sm font-black text-foreground tracking-tight">
                                                    {type.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 bg-card/60 border-y border-border group-hover:bg-accent/50 transition-colors text-xs font-mono">
                                            <div className="flex items-center gap-2">
                                                <span className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: type.color }} />
                                                <span className="text-muted-foreground uppercase font-semibold">{type.color}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 bg-card/60 border-y border-border group-hover:bg-accent/50 transition-colors text-center text-sm font-bold text-foreground">
                                            {type.usageCount || 0}
                                        </td>
                                        <td className="px-6 py-4 bg-card/60 border-y border-border group-hover:bg-accent/50 transition-colors">
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={() => handleToggleActive(type.id, type.active)}
                                                    className={cn(
                                                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                                        type.active ? "bg-emerald-500" : "bg-zinc-700"
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                            type.active ? "translate-x-5" : "translate-x-0"
                                                        )}
                                                    />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 bg-card/60 rounded-r-2xl border-r border-y border-border group-hover:bg-accent/50 transition-colors text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenEdit(type)}
                                                    className="p-1.5 hover:bg-white/10 text-muted-foreground hover:text-foreground rounded-lg transition-all"
                                                    title="Editar"
                                                >
                                                    <Lucide.Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCategory(type.id, type.name)}
                                                    className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-lg transition-all"
                                                    title="Eliminar"
                                                >
                                                    <Lucide.Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal for Create/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 relative flex flex-col max-h-[90vh] overflow-hidden">
                        <button
                            onClick={handleCloseModal}
                            className="absolute top-4 right-4 p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Lucide.X className="w-5 h-5" />
                        </button>

                        <h2 className="text-lg font-black text-foreground uppercase tracking-tight flex items-center gap-2 mb-4 border-b border-border pb-3">
                            <Lucide.Boxes className="w-5 h-5 text-primary" />
                            {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
                        </h2>

                        <form onSubmit={handleSaveCategory} className="space-y-6 overflow-y-auto pr-1 custom-scrollbar">
                            {/* Category Name */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                    Nombre de la Categoría
                                </label>
                                <input
                                    type="text"
                                    value={categoryName}
                                    onChange={(e) => setCategoryName(e.target.value)}
                                    placeholder="Ej: Reunión con Cliente, Soporte Técnico..."
                                    required
                                    className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none transition-all font-bold"
                                />
                            </div>

                            {/* Color Selector */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                    Color Temático
                                </label>
                                <div className="flex items-center gap-3 bg-background border border-border p-3 rounded-xl">
                                    <div
                                        className="w-10 h-10 rounded-lg shrink-0 border border-white/10"
                                        style={{ backgroundColor: selectedColor }}
                                    />
                                    <div className="grid grid-cols-6 gap-2 w-full">
                                        {PRESET_COLORS.map((col) => (
                                            <button
                                                key={col}
                                                type="button"
                                                onClick={() => setSelectedColor(col)}
                                                className={cn(
                                                    "w-full h-7 rounded-md transition-all border",
                                                    selectedColor === col ? "border-white scale-110 shadow-md shadow-white/5" : "border-transparent opacity-80 hover:opacity-100"
                                                )}
                                                style={{ backgroundColor: col }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Icon Selector */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                    Icono Representativo
                                </label>
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 bg-background border border-border p-3.5 rounded-xl max-h-48 overflow-y-auto custom-scrollbar">
                                    {AVAILABLE_ICONS.map((ico) => {
                                        const isSelected = selectedIcon === ico.name;
                                        return (
                                            <button
                                                key={ico.name}
                                                type="button"
                                                onClick={() => setSelectedIcon(ico.name)}
                                                className={cn(
                                                    "h-12 flex flex-col items-center justify-center gap-1 rounded-lg border text-xs transition-all",
                                                    isSelected
                                                        ? "bg-primary/20 border-primary text-primary font-bold scale-[1.03]"
                                                        : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                                )}
                                                title={ico.label}
                                            >
                                                <DynamicLucideIcon name={ico.name} className="w-5 h-5" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="pt-4 flex gap-3 justify-end border-t border-border mt-6">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-xl text-xs font-bold transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="bg-primary hover:bg-primary/90 text-white font-bold py-2 px-5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

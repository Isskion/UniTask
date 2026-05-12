"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import * as Lucide from "lucide-react";
import ExcelJS from "exceljs";
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

    // Tracking States
    const [consultantTasks, setConsultantTasks] = useState<any[]>([]);
    const [activeTimersList, setActiveTimersList] = useState<any[]>([]); // Track running timers
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [activeSubTab, setActiveSubTab] = useState<"categories" | "tracking">(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("task_control_subtab");
            if (saved === "categories" || saved === "tracking") return saved as "categories" | "tracking";
        }
        return "categories";
    });

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("task_control_subtab", activeSubTab);
        }
    }, [activeSubTab]);

    // Edit Task Modal States
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<any | null>(null);
    const [editTaskDuration, setEditTaskDuration] = useState<number>(0);
    const [editTaskDetails, setEditTaskDetails] = useState<string>("");
    
    // Export Actions UI State
    const [isExportOpen, setIsExportOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
                setIsExportOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter States
    const [filterConsultant, setFilterConsultant] = useState("");
    const [filterProject, setFilterProject] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [filterStartDate, setFilterStartDate] = useState(() => {
        return new Date().toISOString().split("T")[0];
    });
    const [filterEndDate, setFilterEndDate] = useState(() => new Date().toISOString().split("T")[0]);


    const dailyTotalMinutes = useMemo(() => {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        return consultantTasks
            .filter((task) => {
                if (!task.createdAt) return false;
                const taskDate = new Date(task.createdAt.seconds * 1000);
                return taskDate >= startOfToday;
            })
            .reduce((sum, task) => sum + (Number(task.durationMinutes) || 0), 0);
    }, [consultantTasks]);

    const formattedDailyTotal = useMemo(() => {
        const hours = Math.floor(dailyTotalMinutes / 60);
        const mins = dailyTotalMinutes % 60;
        return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    }, [dailyTotalMinutes]);

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

    // Fetch All Consultant Tasks for Tracking Tab
    useEffect(() => {
        if (!currentTenantId || currentTenantId === "unknown" || currentTenantId === "__DENY__") return;

        setLoadingTasks(true);
        const q = query(
            collection(db, "consultantTasks"),
            where("tenantId", "==", currentTenantId),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tasks: any[] = [];
            snapshot.forEach((doc) => {
                tasks.push({ id: doc.id, ...doc.data() });
            });
            setConsultantTasks(tasks);
            setLoadingTasks(false);
        }, (error) => {
            console.error("Error fetching consultant tasks:", error);
            showToast("Error", "No se pudieron cargar los registros de actividades", "error");
            setLoadingTasks(false);
        });

        return () => unsubscribe();
    }, [currentTenantId]);

    // Fetch ALL Active Timers for live monitoring
    useEffect(() => {
        if (!currentTenantId || currentTenantId === "unknown" || currentTenantId === "__DENY__") return;

        const q = query(
            collection(db, "activeTimers"),
            where("tenantId", "==", currentTenantId),
            where("isRunning", "==", true)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const active: any[] = [];
            snapshot.forEach((doc) => {
                active.push({ id: doc.id, ...doc.data() });
            });
            setActiveTimersList(active);
        });

        return () => unsubscribe();
    }, [currentTenantId]);

    const handleForceStopTimer = async (userId: string, name: string) => {
        if (!confirm(`¿Estás seguro de que deseas DETENER FORZADAMENTE el temporizador de ${name}? El progreso no guardado se perderá.`)) return;
        
        try {
            await deleteDoc(doc(db, "activeTimers", userId));
            showToast("Monitorización", "Temporizador detenido correctamente", "success");
        } catch (e) {
            console.error("Err forcing stop", e);
            showToast("Error", "No se pudo detener el temporizador", "error");
        }
    };

    const handleDeleteConsultantTask = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este registro de actividad?")) return;

        try {
            await deleteDoc(doc(db, "consultantTasks", id));
            showToast("Seguimiento de Tareas", "Registro eliminado", "info");
        } catch (err) {
            console.error("Error deleting activity:", err);
            showToast("Error", "No se pudo eliminar el registro", "error");
        }
    };

    const handleOpenTaskEdit = (task: any) => {
        setEditingTask(task);
        setEditTaskDuration(task.durationMinutes || 0);
        setEditTaskDetails(task.details || "");
        setIsTaskModalOpen(true);
    };

    const handleUpdateTask = async () => {
        if (!editingTask) return;
        
        if (editTaskDuration < 1) {
            showToast("Error", "La duración debe ser al menos 1 minuto", "error");
            return;
        }

        try {
            await updateDoc(doc(db, "consultantTasks", editingTask.id), {
                durationMinutes: Number(editTaskDuration),
                details: editTaskDetails,
                updatedAt: serverTimestamp()
            });
            showToast("Control de Tareas", "Actividad actualizada correctamente", "success");
            setIsTaskModalOpen(false);
            setEditingTask(null);
        } catch (err) {
            console.error("Error updating task:", err);
            showToast("Error", "Fallo al guardar los cambios de la actividad", "error");
        }
    };

    const filteredTasks = useMemo(() => {
        return consultantTasks.filter((task) => {
            const matchConsultant = !filterConsultant || task.userName?.toLowerCase().includes(filterConsultant.toLowerCase());
            const matchProject = !filterProject || task.projectName?.toLowerCase().includes(filterProject.toLowerCase());
            const matchCategory = !filterCategory || task.taskTypeName?.toLowerCase().includes(filterCategory.toLowerCase());
            
            // Date range comparison
            let matchDate = true;
            if (task.createdAt) {
                const taskDate = new Date(task.createdAt.seconds * 1000);
                const taskDateStr = taskDate.toISOString().split("T")[0];
                
                if (filterStartDate && taskDateStr < filterStartDate) matchDate = false;
                if (filterEndDate && taskDateStr > filterEndDate) matchDate = false;
            }
            
            return matchConsultant && matchProject && matchCategory && matchDate;
        });
    }, [consultantTasks, filterConsultant, filterProject, filterCategory, filterStartDate, filterEndDate]);

    const filteredTotalMinutes = useMemo(() => {
        return filteredTasks.reduce((sum, task) => sum + (Number(task.durationMinutes) || 0), 0);
    }, [filteredTasks]);

    const formattedFilteredTotal = useMemo(() => {
        const hrs = Math.floor(filteredTotalMinutes / 60);
        const mins = filteredTotalMinutes % 60;
        return `${hrs}h ${mins.toString().padStart(2, "0")}m`;
    }, [filteredTotalMinutes]);

    const handleExportToCsv = () => {
        if (filteredTasks.length === 0) {
            showToast("Info", "No hay datos filtrados para exportar", "info");
            return;
        }

        let csv = 'Consultor,Proyecto,Categoria,Detalle,Duracion(min),Fecha\n';
        const safeStr = (s: string) => `"${s ? String(s).replace(/"/g, '""').replace(/\n/g, " ") : ''}"`;

        filteredTasks.forEach(task => {
            const dateStr = task.createdAt ? new Date(task.createdAt.seconds * 1000).toLocaleDateString() : 'Reciente';
            csv += `${safeStr(task.userName)},${safeStr(task.projectName)},${safeStr(task.taskTypeName)},${safeStr(task.details)},${task.durationMinutes || 0},${dateStr}\n`;
        });

        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `registro_actividades_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Exportación", "Archivo CSV descargado correctamente", "success");
        setIsExportOpen(false);
    };

    const handleExportRichExcel = async () => {
        if (filteredTasks.length === 0) {
            showToast("Info", "No hay datos filtrados para exportar", "info");
            return;
        }

        try {
            showToast("Exportación", "Generando libro de Excel...", "info");
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'UniTask System';
            workbook.created = new Date();

            // 1. Detalle Completo Sheet
            const sheet1 = workbook.addWorksheet('Listado Detallado');
            sheet1.columns = [
                { header: 'Fecha', key: 'fecha', width: 15 },
                { header: 'Consultor', key: 'consultor', width: 25 },
                { header: 'Proyecto', key: 'proyecto', width: 25 },
                { header: 'Categoría', key: 'categoria', width: 20 },
                { header: 'Duración (Min)', key: 'duracion', width: 15 },
                { header: 'Detalle Técnico', key: 'detalle', width: 60 }
            ];
            sheet1.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            sheet1.getRow(1).fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FF1F2937'}};

            // 2. Groupings Storage
            const byConsultant: Record<string, { hrs: number, count: number }> = {};
            const byProject: Record<string, { hrs: number, count: number }> = {};

            filteredTasks.forEach(task => {
                const dateStr = task.createdAt ? new Date(task.createdAt.seconds * 1000).toLocaleDateString() : 'Reciente';
                const dur = Number(task.durationMinutes) || 0;

                sheet1.addRow({
                    fecha: dateStr,
                    consultor: task.userName || 'N/A',
                    proyecto: task.projectName || 'N/A',
                    categoria: task.taskTypeName || 'N/A',
                    duracion: dur,
                    detalle: task.details || ''
                });

                const c = task.userName || 'Sin Identificar';
                const p = task.projectName || 'Sin Proyecto';
                
                if(!byConsultant[c]) byConsultant[c] = { hrs: 0, count: 0 };
                byConsultant[c].hrs += dur / 60;
                byConsultant[c].count += 1;

                if(!byProject[p]) byProject[p] = { hrs: 0, count: 0 };
                byProject[p].hrs += dur / 60;
                byProject[p].count += 1;
            });

            // 2. Consultant Summary Sheet
            const sheet2 = workbook.addWorksheet('Resumen Consultor');
            sheet2.columns = [
                { header: 'Consultor', key: 'c', width: 30 },
                { header: 'Total Horas', key: 'h', width: 15 },
                { header: 'Nº Tareas', key: 't', width: 15 }
            ];
            sheet2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            sheet2.getRow(1).fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FF991B1B'}};
            Object.entries(byConsultant).forEach(([name, data]) => {
                sheet2.addRow({ c: name, h: Number(data.hrs.toFixed(2)), t: data.count });
            });

            // 3. Project Summary Sheet
            const sheet3 = workbook.addWorksheet('Resumen Proyecto');
            sheet3.columns = [
                { header: 'Proyecto', key: 'p', width: 35 },
                { header: 'Total Horas', key: 'h', width: 15 },
                { header: 'Nº Tareas', key: 't', width: 15 }
            ];
            sheet3.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            sheet3.getRow(1).fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FF374151'}};
            Object.entries(byProject).forEach(([proj, data]) => {
                sheet3.addRow({ p: proj, h: Number(data.hrs.toFixed(2)), t: data.count });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte_unitask_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast("Éxito", "Libro Excel descargado correctamente", "success");
            setIsExportOpen(false);
        } catch (err) {
            console.error(err);
            showToast("Error", "No se pudo procesar el Excel", "error");
        }
    };

    const handleCopyToClipboard = async () => {
        if (filteredTasks.length === 0) {
            showToast("Info", "Sin datos para copiar", "info");
            return;
        }
        
        let txt = `📊 RESUMEN DE ACTIVIDADES DEL TENANT\nFecha: ${new Date().toLocaleDateString()}\n\n`;
        const byP: Record<string, number> = {};
        filteredTasks.forEach(t => {
            const p = t.projectName || 'Sin Proyecto';
            byP[p] = (byP[p] || 0) + (Number(t.durationMinutes) || 0);
        });

        txt += `🕒 TIEMPOS TOTALES POR PROYECTO:\n`;
        Object.entries(byP).forEach(([proj, mins]) => {
            txt += `- ${proj}: ${(mins/60).toFixed(2)} Horas (${mins} min)\n`;
        });

        txt += `\n📋 ÚLTIMOS REGISTROS (${Math.min(15, filteredTasks.length)}):\n`;
        filteredTasks.slice(0, 15).forEach(t => {
            txt += `• [${t.userName || '?'}] ${t.projectName}: ${t.details ? t.details.substring(0, 60) + (t.details.length > 60 ? "..." : "") : "Sin detalle"} (${t.durationMinutes}m)\n`;
        });

        try {
            await navigator.clipboard.writeText(txt);
            showToast("Copiado", "Resumen de texto enviado al portapapeles", "success");
            setIsExportOpen(false);
        } catch (e) {
            console.error(e);
            showToast("Error", "Fallo de escritura en portapapeles", "error");
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
                    <h1 className="text-2xl md:text-3xl font-black text-foreground flex flex-wrap items-center gap-3 tracking-tighter">
                        <Lucide.ClipboardCheck className="w-8 h-8 text-primary animate-pulse" />
                        <span>CONTROL DE TAREAS</span>
                        <span className="text-xs font-black bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20 flex items-center gap-1.5 shadow-sm shadow-primary/5 animate-pulse ml-2" title="Tiempo total trabajado hoy (HH:mm)">
                            <Lucide.Clock className="w-3.5 h-3.5" />
                            Hoy: {formattedDailyTotal}
                        </span>
                    </h1>
                    <p className="text-muted-foreground mt-1 text-xs md:text-sm font-medium tracking-wide">
                        Administración de categorías de actividades del consultor
                    </p>
                </div>

                {activeSubTab === "categories" && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-5 rounded-xl text-xs uppercase tracking-wider transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-primary/20"
                    >
                        <Lucide.Plus className="w-4 h-4" />
                        Nueva Categoría
                    </button>
                )}
            </div>

            {/* Sub-Tabs Selector */}
            <div className="flex gap-2 border-b border-border pb-px">
                <button
                    onClick={() => setActiveSubTab("categories")}
                    className={cn(
                        "px-6 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all duration-200 flex items-center gap-2",
                        activeSubTab === "categories"
                            ? "border-primary text-primary font-black"
                            : "border-transparent text-muted-foreground hover:text-foreground font-semibold"
                    )}
                >
                    <Lucide.Boxes className="w-4 h-4" />
                    Gestión de Categorías
                </button>
                <button
                    onClick={() => setActiveSubTab("tracking")}
                    className={cn(
                        "px-6 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all duration-200 flex items-center gap-2",
                        activeSubTab === "tracking"
                            ? "border-primary text-primary font-black"
                            : "border-transparent text-muted-foreground hover:text-foreground font-semibold"
                    )}
                >
                    <Lucide.LineChart className="w-4 h-4" />
                    Seguimiento de Actividades
                </button>
            </div>

            {/* CATEGORIES SUB-TAB CONTENT */}
            {activeSubTab === "categories" && (
                <div className="space-y-8 animate-in fade-in duration-300">
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
                </div>
            )}

            {/* TRACKING SUB-TAB CONTENT */}
            {activeSubTab === "tracking" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    
                    {/* LIVE MONITOR: ACTIVE TIMERS */}
                    {activeTimersList.length > 0 && (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 shadow-xl backdrop-blur-md relative animate-in slide-in-from-bottom-4">
                            <div className="absolute -top-3.5 left-8 bg-emerald-600 text-white px-4 py-1 rounded-lg text-[9px] font-black tracking-[0.2em] shadow-lg flex items-center gap-2">
                                <Lucide.Activity className="w-3 h-3 animate-pulse" />
                                EN CURSO AHORA MISMO
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                                {activeTimersList.map((timer) => (
                                    <div key={timer.id} className="bg-card border border-border/60 hover:border-emerald-500/40 p-4 rounded-2xl shadow-sm flex flex-col gap-3 transition-all group relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-emerald-500/10 to-transparent pointer-events-none" />
                                        
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center border border-emerald-500/20">
                                                    <Lucide.User className="w-4 h-4 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black text-foreground truncate max-w-[140px]">{timer.userName || 'Desconocido'}</h4>
                                                    <span className="text-[9px] bg-emerald-500/10 text-emerald-600 font-black px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 mt-0.5 w-fit">
                                                        <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" /> EJECUTANDO
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleForceStopTimer(timer.id, timer.userName)}
                                                className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all shadow-sm"
                                                title="Detener Forzadamente"
                                            >
                                                <Lucide.Square className="w-3.5 h-3.5 fill-current" />
                                            </button>
                                        </div>

                                        <div className="bg-background/50 border border-border/50 rounded-xl p-2.5 space-y-1.5">
                                            <p className="text-[9px] font-black text-primary uppercase tracking-wider truncate">{timer.projectName || 'Sin Proyecto'}</p>
                                            <p className="text-[10px] font-bold text-foreground/80 flex items-center gap-1.5">
                                                <Lucide.Tag className="w-3 h-3 text-muted-foreground" />
                                                {timer.taskTypeName || 'General'}
                                            </p>
                                            {timer.details && (
                                                <p className="text-[10px] text-muted-foreground italic border-t border-border/50 pt-1.5 mt-1.5 line-clamp-1">
                                                    "{timer.details}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Filters Panel */}
                    <div className="bg-card/40 border border-border rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Filtrar por Consultor</label>
                                <div className="relative">
                                    <Lucide.Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={filterConsultant}
                                        onChange={(e) => setFilterConsultant(e.target.value)}
                                        placeholder="Buscar consultor..."
                                        className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary font-bold"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Filtrar por Proyecto</label>
                                <div className="relative">
                                    <Lucide.Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={filterProject}
                                        onChange={(e) => setFilterProject(e.target.value)}
                                        placeholder="Buscar proyecto..."
                                        className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary font-bold"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Filtrar por Categoría</label>
                                <div className="relative">
                                    <Lucide.Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={filterCategory}
                                        onChange={(e) => setFilterCategory(e.target.value)}
                                        placeholder="Buscar categoría..."
                                        className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/40">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Fecha Inicio</label>
                                <div className="relative">
                                    <Lucide.Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="date"
                                        value={filterStartDate}
                                        onChange={(e) => setFilterStartDate(e.target.value)}
                                        className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary font-bold"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Fecha Fin</label>
                                <div className="relative">
                                    <Lucide.Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="date"
                                        value={filterEndDate}
                                        onChange={(e) => setFilterEndDate(e.target.value)}
                                        className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary font-bold"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Activities List Area */}
                    <div className="bg-card/40 border border-border rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-md relative">
                        <div className="absolute -top-3.5 left-8 bg-primary text-white px-4 py-1 rounded-lg text-[9px] font-black tracking-[0.2em] shadow-lg">
                            REGISTRO DE ACTIVIDADES DEL TENANT
                        </div>

                        <div className="absolute -top-3.5 right-8 flex items-center gap-3" ref={exportMenuRef}>
                            {/* Total Duration Summation of Filtered Content */}
                            <div className="bg-background border border-border px-4 py-1.5 rounded-lg text-[10px] font-black shadow-xl flex items-center gap-2 tracking-widest text-foreground select-none animate-in fade-in duration-300" title="Sumatorio total acumulado en el filtro actual">
                                <Lucide.Clock className="w-3.5 h-3.5 text-primary animate-pulse" />
                                TOTAL FILTRADO: <span className="text-primary bg-primary/10 px-2 py-0.5 rounded font-mono ml-1 border border-primary/20">{formattedFilteredTotal}</span>
                            </div>
                            <button
                                onClick={() => setIsExportOpen(!isExportOpen)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-[10px] font-black shadow-xl flex items-center gap-2 transition-all active:scale-95 uppercase tracking-widest"
                                title="Opciones de Exportación"
                            >
                                <Lucide.DownloadCloud className="w-3.5 h-3.5" />
                                Exportar
                                <Lucide.ChevronDown className={cn("w-3 h-3 transition-transform", isExportOpen ? "rotate-180" : "")} />
                            </button>

                            {isExportOpen && (
                                <div className="absolute top-full right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-xl">
                                    <div className="p-2 flex flex-col gap-1">
                                        <div className="px-3 py-1 text-[9px] font-black text-muted-foreground uppercase tracking-wider border-b border-border mb-1">Formato Profesional</div>
                                        <button 
                                            onClick={handleExportRichExcel}
                                            className="flex items-center gap-3 px-3 py-2 hover:bg-emerald-500/10 rounded-lg text-left group transition-colors"
                                        >
                                            <div className="p-1.5 bg-emerald-500/20 text-emerald-600 rounded-md group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                                <Lucide.FileSpreadsheet className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-foreground">Libro Excel (.xlsx)</div>
                                                <div className="text-[9px] text-muted-foreground">3 hojas con reportes y resúmenes</div>
                                            </div>
                                        </button>
                                        
                                        <div className="px-3 py-1 text-[9px] font-black text-muted-foreground uppercase tracking-wider border-b border-border mt-2 mb-1">Datos Rápidos</div>
                                        <button 
                                            onClick={handleExportToCsv}
                                            className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/80 rounded-lg text-left group transition-colors"
                                        >
                                            <div className="p-1.5 bg-secondary text-muted-foreground rounded-md group-hover:bg-foreground group-hover:text-background transition-all">
                                                <Lucide.FileText className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-foreground">CSV Plano</div>
                                                <div className="text-[9px] text-muted-foreground">Listado crudo compatible</div>
                                            </div>
                                        </button>

                                        <button 
                                            onClick={handleCopyToClipboard}
                                            className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/80 rounded-lg text-left group transition-colors"
                                        >
                                            <div className="p-1.5 bg-secondary text-muted-foreground rounded-md group-hover:bg-foreground group-hover:text-background transition-all">
                                                <Lucide.ClipboardCopy className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-foreground">Copiar Resumen</div>
                                                <div className="text-[9px] text-muted-foreground">Texto formateado al portapapeles</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {loadingTasks ? (
                            <div className="flex h-48 items-center justify-center">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent" />
                            </div>
                        ) : filteredTasks.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground text-xs italic">
                                No se encontraron registros de actividades con los filtros aplicados
                            </div>
                        ) : (
                            <div className="overflow-x-auto mt-2">
                                <table className="w-full text-left border-separate border-spacing-y-4">
                                    <thead>
                                        <tr className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                                            <th className="px-6 py-2">Consultor</th>
                                            <th className="px-6 py-2">Proyecto</th>
                                            <th className="px-6 py-2">Categoría</th>
                                            <th className="px-6 py-2">Detalle / Actividad</th>
                                            <th className="px-6 py-2 text-center">Duración</th>
                                            <th className="px-6 py-2 text-center">Fecha</th>
                                            <th className="px-6 py-2 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTasks.map((task) => (
                                            <tr key={task.id} className="group transition-all duration-300">
                                                <td className="px-6 py-4 bg-card/60 rounded-l-2xl border-l border-y border-border group-hover:bg-accent/50 transition-colors text-xs font-bold text-foreground">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary">
                                                            {task.userName ? task.userName.split(" ").map((n: any) => n[0]).join("").substring(0, 2).toUpperCase() : "C"}
                                                        </div>
                                                        {task.userName || "Consultor"}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 bg-card/60 border-y border-border group-hover:bg-accent/50 transition-colors text-xs font-bold text-primary">
                                                    <span className="bg-primary/5 border border-primary/15 px-2 py-1 rounded-lg">
                                                        {task.projectName}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 bg-card/60 border-y border-border group-hover:bg-accent/50 transition-colors text-xs font-bold">
                                                    <span className="bg-zinc-800 text-zinc-200 border border-white/5 px-2.5 py-1 rounded-full text-[10px]">
                                                        {task.taskTypeName}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 bg-card/60 border-y border-border group-hover:bg-accent/50 transition-colors text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed max-w-xs truncate" title={task.details}>
                                                    {task.details || <span className="text-muted-foreground italic">Sin detalle técnico</span>}
                                                </td>
                                                <td className="px-6 py-4 bg-card/60 border-y border-border group-hover:bg-accent/50 transition-colors text-center text-xs font-mono font-bold text-foreground">
                                                    {task.durationMinutes} min
                                                </td>
                                                <td className="px-6 py-4 bg-card/60 border-y border-border group-hover:bg-accent/50 transition-colors text-center text-[10px] text-muted-foreground font-semibold">
                                                    {task.createdAt ? new Date(task.createdAt.seconds * 1000).toLocaleDateString() : "Reciente"}
                                                </td>
                                                <td className="px-6 py-4 bg-card/60 rounded-r-2xl border-r border-y border-border group-hover:bg-accent/50 transition-colors text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => handleOpenTaskEdit(task)}
                                                            className="p-1.5 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-lg transition-all"
                                                            title="Editar Actividad"
                                                        >
                                                            <Lucide.Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteConsultantTask(task.id)}
                                                            className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-lg transition-all"
                                                            title="Eliminar Registro"
                                                        >
                                                            <Lucide.Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
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

            {/* EDIT TASK DETAILS MODAL */}
            {isTaskModalOpen && editingTask && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card border border-border shadow-2xl rounded-3xl w-full max-w-md overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                                    <Lucide.Edit2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black tracking-tight">Modificar Actividad</h2>
                                    <p className="text-[10px] text-muted-foreground font-medium">{editingTask.projectName} - {editingTask.taskTypeName}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsTaskModalOpen(false)}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                            >
                                <Lucide.X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Duration Section */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <Lucide.Clock className="w-3 h-3" />
                                        Duración en Minutos
                                    </label>
                                    <span className="text-xs font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                        {editTaskDuration} min
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="480"
                                    step="5"
                                    value={editTaskDuration}
                                    onChange={(e) => setEditTaskDuration(Number(e.target.value))}
                                    className="w-full accent-primary mt-2 h-2 rounded-full bg-secondary appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-[9px] text-muted-foreground font-bold px-1">
                                    <span>1m</span>
                                    <span>1h</span>
                                    <span>2h</span>
                                    <span>4h</span>
                                    <span>8h</span>
                                </div>
                            </div>

                            {/* Details Input */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Lucide.FileText className="w-3 h-3" />
                                    Detalles Técnicos
                                </label>
                                <textarea
                                    value={editTaskDetails}
                                    onChange={(e) => setEditTaskDetails(e.target.value)}
                                    placeholder="Actualiza la descripción de lo que hiciste..."
                                    rows={4}
                                    className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none font-medium leading-relaxed"
                                />
                            </div>

                            {/* Form Actions */}
                            <div className="pt-4 flex items-center gap-3 justify-end border-t border-border mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsTaskModalOpen(false)}
                                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-xl text-xs font-bold transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleUpdateTask}
                                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-5 rounded-xl text-xs uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                                >
                                    <Lucide.CheckCircle2 className="w-3.5 h-3.5" />
                                    Actualizar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

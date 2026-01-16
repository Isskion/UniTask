"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, query, orderBy, serverTimestamp, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useSafeFirestore } from "@/hooks/useSafeFirestore";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/hooks/useTheme";
import { Loader2, Plus, Edit2, Save, XCircle, Search, Trash2, CheckSquare, ListTodo, AlertTriangle, ArrowLeft, LayoutTemplate, Calendar as CalendarIcon, Link as LinkIcon, Users, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, X, User as UserIcon, FolderGit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task, Project, UserProfile } from "@/types";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/context/ToastContext";

export default function TaskManagement({ initialTaskId }: { initialTaskId?: string | null }) {
    const { userRole, user, tenantId } = useAuth();
    const { addDoc, updateDoc, deleteDoc } = useSafeFirestore();
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const { showToast } = useToast();
    const { isAdmin: checkIsAdmin, can, permissions } = usePermissions();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<any>(null);

    // Sidebar Filters
    const [sidebarSearch, setSidebarSearch] = useState("");
    const [sidebarFilter, setSidebarFilter] = useState<'all' | 'active' | 'completed'>('active');

    // Selection state
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<Task>>({});
    const [isNew, setIsNew] = useState(false);
    const [saving, setSaving] = useState(false);

    // Permissions Helper - now using usePermissions hook
    const isAdmin = checkIsAdmin();

    // Dirty Check Helper
    const isDirty = () => {
        if (!selectedTask && !isNew) return false;
        if (isNew) {
            // Check if user typed anything meaningful
            return !!formData.title || !!formData.description || (formData.acceptanceCriteria?.length ?? 0) > 1;
        }
        if (!selectedTask) return false;

        // Compare key fields (Added isBlocking)
        const keys: (keyof Task)[] = ['title', 'description', 'status', 'isBlocking', 'techDescription', 'rtmId', 'progress', 'startDate', 'endDate', 'projectId'];
        for (const key of keys) {
            const val1 = formData[key] ?? "";
            const val2 = (selectedTask as any)[key] ?? "";
            if (val1 != val2) return true; // Loose equality for null/undefined/""
        }

        // Complex objects
        if (JSON.stringify(formData.raci) !== JSON.stringify(selectedTask.raci)) return true;
        if (JSON.stringify(formData.dependencies) !== JSON.stringify(selectedTask.dependencies)) return true;
        if (JSON.stringify(formData.acceptanceCriteria) !== JSON.stringify(selectedTask.acceptanceCriteria)) return true;

        return false;
    };

    // Warn on browser close/refresh
    // Warn on browser close/refresh
    /*
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty()) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [formData, selectedTask, isNew]);
    */

    // UI States
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [activeRaciRole, setActiveRaciRole] = useState<'responsible' | 'accountable' | 'consulted' | 'informed' | null>(null);
    const [dependencySearch, setDependencySearch] = useState("");

    // Date Picker State
    const [datePickerTarget, setDatePickerTarget] = useState<'startDate' | 'endDate' | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void; destructive?: boolean } | null>(null);
    const retriedIds = useRef<Set<string>>(new Set());

    // Data Loader
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Force use of the ACTIVE context tenantId (masqueraded or real)
            const targetTenantId = tenantId || "1";
            console.log("[TaskManagement] Loading data for Tenant:", targetTenantId);

            // Load Projects (filtered by tenant)
            const qp = query(collection(db, "projects"), where("tenantId", "==", targetTenantId), orderBy("name"));
            const snapP = await getDocs(qp);
            const loadedProjects: Project[] = [];
            snapP.forEach(doc => loadedProjects.push({ id: doc.id, ...doc.data() } as Project));
            setProjects(loadedProjects);

            // Load Users (filtered by tenant)
            const qu = query(collection(db, "users"), where("tenantId", "==", targetTenantId));
            const snapU = await getDocs(qu);
            const loadedUsers: UserProfile[] = [];
            snapU.forEach(doc => loadedUsers.push({ uid: doc.id, ...doc.data() } as UserProfile));
            setUsers(loadedUsers);

            // Load Tasks (filtered by tenant)
            const qt = query(collection(db, "tasks"), where("tenantId", "==", targetTenantId), orderBy("createdAt", "desc"));
            const snapT = await getDocs(qt);
            const loadedTasks: Task[] = [];
            snapT.forEach(doc => loadedTasks.push({ id: doc.id, ...doc.data() } as Task));
            setTasks(loadedTasks);
        } catch (error) {
            console.error("Error loading TaskManagement data", error);
            showToast("Error", "No se pudieron cargar los datos", "error");
        } finally {
            setLoading(false);
        }
    }, [tenantId, showToast]);

    // Initial Selection from Prop
    useEffect(() => {
        if (!loading && initialTaskId) {
            const target = tasks.find(t => t.id === initialTaskId);
            if (target) {
                console.log("[TaskManagement] Selecting initial task:", target.friendlyId);
                setSelectedTask(target);
            } else {
                if (!retriedIds.current.has(initialTaskId)) {
                    console.warn("[TaskManagement] Task not found, attempting reload for:", initialTaskId);
                    retriedIds.current.add(initialTaskId);
                    loadData();
                } else {
                    console.error("[TaskManagement] Task ID not found even after reload:", initialTaskId);
                    showToast("Error", "La tarea solicitada no existe o no tienes acceso.", "error");
                }
            }
        }
    }, [initialTaskId, loading, tasks, loadData]);

    useEffect(() => {
        // Fetch User Profile if we need it for filtering
        if (user && !isAdmin) {
            getDocs(query(collection(db, "users"), where("__name__", "==", user.uid)))
                .then(snap => {
                    if (!snap.empty) {
                        setUserProfile(snap.docs[0].data());
                    }
                });
        }
        loadData();
    }, [user, userRole, loadData]);


    // Computed Lists
    const visibleProjects = projects.filter(p => {
        if (isAdmin) return true; // Admins see all
        if (permissions.projectAccess?.viewAll) return true; // Permission Bypass (Global PM)
        if (!userProfile?.assignedProjectIds) return false;
        return userProfile.assignedProjectIds.includes(p.id);
    });

    const visibleTasks = tasks.filter(t => {
        // FILTER BY SIMULATED ROLE
        // If simulated role is superadmin/app_admin, see all loaded tasks (which are already tenant-filtered by loadData).
        if (userRole === 'superadmin' || userRole === 'app_admin') {
            // See all
        } else {
            // Regular user constraints
            if (!t.projectId) return false;
            // Check if project is assigned to user
            // Note: visibleProjects is already filtered by assignment for non-admins
            if (!visibleProjects.some(vp => vp.id === t.projectId)) return false;
        }

        // Apply Sidebar Filters
        if (sidebarFilter === 'active' && t.status === 'completed') return false;
        if (sidebarFilter === 'completed' && t.status !== 'completed') return false;

        if (sidebarSearch.trim()) {
            const q = sidebarSearch.toLowerCase();
            return (
                (t.title?.toLowerCase().includes(q)) ||
                (t.description?.toLowerCase().includes(q)) ||
                (t.friendlyId?.toLowerCase().includes(q))
            );
        }

        return true;
    });


    // --- HANDLERS ---

    const handleSelectTask = (task: Task) => {
        const proceed = () => {
            setSelectedTask(task);
            // Smart Migration: If title is missing but description exists, use description as title
            setFormData({
                ...task,
                title: task.title || task.description || "",
            });
            setIsNew(false);
            setIsStatusOpen(false);
            setActiveRaciRole(null);
            setDependencySearch("");
            setConfirmModal(null);
        };

        if (isDirty()) {
            setConfirmModal({
                open: true,
                title: "Cambios sin guardar",
                message: "Tienes cambios sin guardar. ¿Deseas descartarlos y cambiar de tarea?",
                onConfirm: proceed
            });
            return;
        }
        proceed();
    };



    const handleCreateClick = () => {
        const proceed = () => {
            const newTemplate: Partial<Task> = {
                title: "",
                status: 'pending',
                projectId: "", // User must select
                startDate: new Date().toISOString(),
                acceptanceCriteria: [
                    { id: '1', text: 'Criterio de aceptación 1', completed: false }
                ],
                progress: 0,
                raci: { responsible: [], accountable: [], consulted: [], informed: [] },
                dependencies: []
            };
            const ghost = { id: 'new', friendlyId: 'NEW', ...newTemplate } as Task;
            setSelectedTask(ghost);
            setFormData(newTemplate);
            setIsNew(true);
            setConfirmModal(null);
        };

        if (isDirty()) {
            setConfirmModal({
                open: true,
                title: "Cambios sin guardar",
                message: "Tienes cambios sin guardar. ¿Deseas descartarlos y crear nueva tarea?",
                onConfirm: proceed
            });
            return;
        }
        proceed();
    };

    const handleSave = async () => {
        if (!formData.title) return showToast("UniTaskController", "El título es obligatorio", "error");
        if (!formData.projectId) return showToast("UniTaskController", "Debes asignar un proyecto a la tarea", "error");

        // Security Check: Ensure project is allowed
        if (!isAdmin) {
            const isAllowed = visibleProjects.some(p => p.id === formData.projectId);
            if (!isAllowed) return showToast("UniTaskController", "No tienes permisos para crear tareas en este proyecto.", "error");
        }

        // Dependency Check Logic
        if (formData.status === 'completed' && formData.dependencies && formData.dependencies.length > 0) {
            const blockingTasks = tasks.filter(t => formData.dependencies?.includes(t.id) && t.status !== 'completed');
            if (blockingTasks.length > 0) {
                showToast("UniTaskController", `Tarea bloqueada por: ${blockingTasks.map(t => t.friendlyId).join(', ')}`, "error");
                return;
            }
        }

        setSaving(true);
        try {
            if (isNew) {
                const friendlyId = `TSK-${Math.floor(1000 + Math.random() * 9000)}`;
                const docRef = await addDoc(collection(db, "tasks"), {
                    ...formData,
                    friendlyId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                const createdTask = { id: docRef.id, friendlyId, ...formData } as Task;
                setTasks(prev => [createdTask, ...prev]);

                // NOTIFICATION (NEW TASK)
                if (formData.assignedTo && formData.assignedTo !== user?.uid) {
                    addDoc(collection(db, "notifications"), {
                        userId: formData.assignedTo,
                        type: 'assignment',
                        title: 'Nueva Tarea Asignada',
                        message: `Te han asignado la nueva tarea: ${friendlyId} - ${formData.title}`,
                        taskId: docRef.id,
                        read: false,
                        createdAt: serverTimestamp()
                    }).catch(e => console.error("Notification Error", e));
                }

                setSelectedTask(createdTask);
                setIsNew(false);
            } else {
                if (selectedTask?.id) {
                    // Check change BEFORE update (formData vs selectedTask)
                    const isAssignmentChanged = formData.assignedTo && formData.assignedTo !== selectedTask.assignedTo;
                    const assignee = formData.assignedTo;

                    const { id, ...data } = formData;
                    await updateDoc(doc(db, "tasks", selectedTask.id), {
                        ...data,
                        updatedAt: serverTimestamp()
                    });

                    // NOTIFICATION (UPDATE)
                    if (isAssignmentChanged && assignee && assignee !== user?.uid) {
                        addDoc(collection(db, "notifications"), {
                            userId: assignee,
                            type: 'assignment',
                            title: 'Tarea Asignada',
                            message: `Te han asignado la tarea: ${selectedTask.friendlyId} - ${formData.title}`,
                            taskId: selectedTask.id,
                            read: false,
                            createdAt: serverTimestamp()
                        })
                            .catch(e => console.error("Notification Error", e));
                    }

                    setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, ...data } as Task : t));
                    // Update selectedTask reference to match the new saved state
                    setSelectedTask({ ...selectedTask, ...data } as Task);

                    setIsNew(false);
                    showToast("UniTaskController", "Guardado", "success");
                }
            }
        } catch (e) {
            console.error(e);
            showToast("UniTaskController", "Error al guardar", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        // Double Check UI shouldn't allow this, but safe guard
        if (!can('delete', 'tasks')) return showToast("UniTaskController", "No tienes permisos para eliminar tareas.", "error");

        if (!selectedTask?.id || isNew) return;

        setConfirmModal({
            open: true,
            title: "Eliminar Tarea",
            message: "¿Borrar esta tarea permanentemente? Esta acción es irreversible.",
            destructive: true,
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, "tasks", selectedTask.id));
                    setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
                    setSelectedTask(null);
                    showToast("UniTaskController", "Tarea eliminada", "success");
                } catch (e) {
                    console.error(e);
                    showToast("UniTaskController", "Error eliminando tarea", "error");
                }
                setConfirmModal(null);
            }
        });
    };

    // --- CUSTOM DATE PICKER COMPONENT ---
    const CustomDatePicker = ({ target, value, onClose, onSelect }: { target: string, value: string | undefined, onClose: () => void, onSelect: (d: string) => void }) => {
        const title = target === 'startDate' ? 'Fecha de Inicio' : 'Fecha Fin';

        const days = eachDayOfInterval({
            start: startOfMonth(currentMonth),
            end: endOfMonth(currentMonth)
        });

        const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
        const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

        return (
            <div className="absolute z-50 mt-2 bg-popover border border-border rounded-xl shadow-2xl p-4 w-64 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase">{title}</h4>
                    <button onClick={onClose}><X className="w-3 h-3 text-zinc-500 hover:text-white" /></button>
                </div>

                <div className="flex justify-between items-center mb-4 bg-black/20 p-2 rounded-lg">
                    <button onClick={handlePrevMonth} className="p-1 hover:bg-white/10 rounded"><ChevronLeft className="w-4 h-4 text-zinc-400" /></button>
                    <span className="text-sm font-bold text-white capitalize">
                        {format(currentMonth, 'MMMM yyyy', { locale: es })}
                    </span>
                    <button onClick={handleNextMonth} className="p-1 hover:bg-white/10 rounded"><ChevronRight className="w-4 h-4 text-zinc-400" /></button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => (
                        <div key={d} className="text-[10px] text-zinc-600 font-bold">{d}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {days.map(d => {
                        const isSelected = value && isSameDay(new Date(value), d);
                        return (
                            <button
                                key={d.toISOString()}
                                onClick={() => {
                                    onSelect(d.toISOString());
                                    onClose();
                                }}
                                className={cn(
                                    "h-7 w-7 rounded-full flex items-center justify-center text-xs transition-all",
                                    isSelected ? "bg-indigo-600 text-white font-bold" :
                                        isToday(d) ? "border border-indigo-500 text-indigo-400" :
                                            "text-zinc-400 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                {format(d, 'd')}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    // --- RENDER HELPERS ---
    const getStatusColor = (s?: string) => {
        switch (s) {
            case 'completed': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'in_progress': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'review': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
        }
    };

    const getStatusLabel = (s?: string) => {
        switch (s) {
            case 'completed': return 'Aprobación Final';
            case 'in_progress': return 'En Curso';
            case 'review': return 'Revisión';
            default: return 'Pendiente';
        }
    };

    // --- RENDER ---
    // Removed Blocking Return for Restricted Users

    return (
        <div className="flex h-full bg-background text-foreground">
            {/* Sidebar List */}
            <div className={cn("w-72 border-r border-border flex-shrink-0 transition-all duration-300 bg-card/30", selectedTask ? "hidden lg:block lg:w-72" : "w-full lg:w-72")}>
                <div className="h-full flex flex-col">
                    <div className={cn("p-4 border-b", isLight ? "bg-zinc-50 border-zinc-200" : "bg-muted/10 border-border")}>
                        <div className="flex justify-between items-center mb-3">
                            <h2 className={cn("text-xs font-bold uppercase tracking-wider", isLight ? "text-zinc-900" : "text-white")}>Tareas ({visibleTasks.length})</h2>
                            <button onClick={handleCreateClick} className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-all"><Plus className="w-3.5 h-3.5" /></button>
                        </div>

                        {/* Search & Filter */}
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                                <input
                                    className={cn("w-full rounded pl-7 pr-2 py-1 text-[10px] focus:outline-none",
                                        isLight ? "bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400" : "bg-black/20 border border-white/5 text-zinc-300 focus:border-indigo-500/30"
                                    )}
                                    placeholder="Buscar..."
                                    value={sidebarSearch}
                                    onChange={e => setSidebarSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex bg-black/20 rounded p-0.5 border border-white/5">
                                {(['all', 'active', 'completed'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setSidebarFilter(f)}
                                        className={cn(
                                            "flex-1 py-1 text-[9px] font-bold uppercase rounded transition-all",
                                            sidebarFilter === f ? "bg-primary text-primary-foreground" : "text-zinc-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        {f === 'all' ? 'Todas' : f === 'active' ? 'Activas' : 'Completas'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {visibleTasks.map(t => {
                            const project = projects.find(p => p.id === t.projectId);
                            return (
                                <div key={t.id} onClick={() => handleSelectTask(t)} className={cn("group flex flex-col p-2.5 rounded-lg cursor-pointer transition-all border",
                                    selectedTask?.id === t.id
                                        ? (isLight ? "bg-zinc-900 border-zinc-900 shadow-sm" : "bg-primary/20 border-primary/50")
                                        : (isLight ? "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50" : "bg-card/50 border-transparent hover:bg-white/5 hover:border-white/5")
                                )}>
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-1">
                                            <span className={cn("font-bold font-mono text-[10px]",
                                                selectedTask?.id === t.id
                                                    ? (isLight ? "text-white" : "text-white")
                                                    : (isLight ? "text-zinc-500" : "text-zinc-400")
                                            )}>{t.friendlyId || 'No ID'}</span>
                                            {t.isBlocking && <AlertTriangle className="w-3 h-3 text-red-500" />}
                                        </div>
                                        <div className={cn("w-1.5 h-1.5 rounded-full", t.status === 'completed' ? 'bg-blue-500' : t.status === 'in_progress' ? 'bg-emerald-500' : 'bg-zinc-700')} />
                                    </div>
                                    <div className={cn("text-[11px] line-clamp-2 mb-1.5 font-medium transition-colors",
                                        selectedTask?.id === t.id
                                            ? (isLight ? "text-white" : "text-white")
                                            : (isLight ? "text-zinc-900 group-hover:text-black" : "text-zinc-300 group-hover:text-white")
                                    )}>
                                        {t.title || t.description || "Sin Título"}
                                    </div>
                                    {project && <div className="text-[9px] text-zinc-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />{project.name}</div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className={cn("flex-1 flex flex-col min-w-0 bg-background", !selectedTask ? "hidden lg:flex" : "flex")}>
                {!selectedTask ? (
                    <div className={cn("flex-1 flex flex-col items-center justify-center", isLight ? "text-zinc-400" : "text-white")}>
                        <LayoutTemplate className="w-12 h-12 mb-3 opacity-80" />
                        <p className={cn("text-sm font-medium", isLight ? "text-zinc-500" : "text-white")}>Selecciona una tarea para gestionar</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar relative">
                        {/* Header */}
                        <div className={cn("backdrop-blur-sm border-b px-6 py-4 sticky top-0 z-10 shadow-lg shrink-0",
                            isLight ? "bg-white/90 border-zinc-200 shadow-zinc-200/50" : "bg-card/90 border-white/5 shadow-black/20"
                        )}>
                            <div className="max-w-6xl mx-auto">
                                <div className="flex justify-between items-start mb-2">
                                    <div className={cn("text-[10px] font-bold uppercase tracking-widest font-mono", isLight ? "text-zinc-500" : "text-zinc-400")}>ID: {selectedTask.friendlyId || selectedTask.id}</div>
                                    <div className="relative">
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-[10px] font-bold uppercase", isLight ? "text-zinc-500" : "text-zinc-400")}>Estado</span>
                                            <button onClick={() => setIsStatusOpen(!isStatusOpen)} className={cn("px-3 py-1 rounded text-xs font-bold border transition-all flex items-center gap-1.5", getStatusColor(formData.status))}>
                                                {getStatusLabel(formData.status)} <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                                            </button>
                                        </div>
                                        {isStatusOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setIsStatusOpen(false)} />
                                                <div className="absolute right-0 top-full mt-1 w-40 bg-popover border border-border rounded-lg shadow-2xl z-50 overflow-hidden py-1">
                                                    {(['pending', 'in_progress', 'review', 'completed'] as const).map(s => (
                                                        <button key={s} onClick={() => { setFormData({ ...formData, status: s }); setIsStatusOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5 flex items-center gap-2">
                                                            <div className={cn("w-1.5 h-1.5 rounded-full", getStatusColor(s).replace('text-', 'bg-').split(' ')[0])} /> {getStatusLabel(s)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFormData({ ...formData, isBlocking: !formData.isBlocking })}
                                    className={cn(
                                        "px-3 py-1 ml-2 rounded text-xs font-bold border transition-all flex items-center gap-1.5",
                                        formData.isBlocking
                                            ? "bg-red-500/20 text-red-500 border-red-500/30"
                                            : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-red-400"
                                    )}
                                    title={formData.isBlocking ? "Marcar como NO Bloqueante" : "Marcar como Bloqueante"}
                                >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    {formData.isBlocking ? "Es Bloqueante" : "Bloqueante"}
                                </button>
                            </div>
                            <input
                                className={cn("text-xl md:text-2xl font-bold bg-transparent outline-none w-full leading-tight",
                                    isLight ? "text-zinc-900 placeholder:text-zinc-400" : "text-white placeholder:text-zinc-600"
                                )}
                                value={formData.title || ""}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Escribe el título de la tarea..."
                            />
                        </div>


                        {/* Grid */}
                        <div className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                {/* Col 1 */}
                                <div className="md:col-span-7 space-y-6">

                                    {/* Project Selector - Added context block */}
                                    <div className={cn("border rounded-xl p-5 shadow-lg", isLight ? "bg-white border-zinc-200" : "bg-card border-white/10")}>
                                        <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-3", isLight ? "text-zinc-900" : "text-white")}>Proyecto Asignado</h3>
                                        <div className="flex items-center gap-2">
                                            <FolderGit2 className="w-4 h-4 text-indigo-500" />
                                            <select
                                                className={cn("border rounded-lg px-3 py-2 text-xs focus:outline-none w-full",
                                                    isLight ? "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-400" : "bg-black/20 border-white/5 text-zinc-300 focus:border-indigo-500/50"
                                                )}
                                                value={formData.projectId || ""}
                                                onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                                            >
                                                <option value="" disabled>Seleccionar Proyecto...</option>
                                                {visibleProjects.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Tech Desc */}
                                    <div className={cn("border rounded-xl p-5 shadow-lg", isLight ? "bg-white border-zinc-200" : "bg-card border-white/10")}>
                                        <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-3", isLight ? "text-zinc-900" : "text-white")}>Descripción Técnica</h3>
                                        <textarea
                                            className={cn("w-full min-h-[80px] border rounded-lg p-3 text-xs focus:outline-none resize-none font-mono",
                                                isLight ? "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-400" : "bg-black/20 border-white/5 text-zinc-300 focus:border-indigo-500/50"
                                            )}
                                            value={formData.techDescription || ""}
                                            onChange={e => setFormData({ ...formData, techDescription: e.target.value })}
                                            placeholder="Detalles técnicos..."
                                        />
                                    </div>

                                    {/* Execution */}
                                    <div className={cn("border rounded-xl p-5 shadow-lg", isLight ? "bg-white border-zinc-200" : "bg-card border-white/10")}>
                                        <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-3", isLight ? "text-zinc-900" : "text-white")}>Ejecución</h3>
                                        <div className={cn("space-y-2 pl-4 border-l", isLight ? "border-zinc-200" : "border-white/5")}>
                                            {formData.acceptanceCriteria?.map((ac, idx) => (
                                                <div key={ac.id} className="flex items-center gap-2 group/item">
                                                    <input type="checkbox" checked={ac.completed} onChange={(e) => { const newAC = [...(formData.acceptanceCriteria || [])]; newAC[idx].completed = e.target.checked; setFormData({ ...formData, acceptanceCriteria: newAC }); }} className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-indigo-500 cursor-pointer" />
                                                    <input
                                                        className={cn("bg-transparent outline-none flex-1 text-xs",
                                                            ac.completed
                                                                ? "line-through text-zinc-500"
                                                                : (isLight ? "text-zinc-900" : "text-zinc-400")
                                                        )}
                                                        value={ac.text}
                                                        onChange={e => { const newAC = [...(formData.acceptanceCriteria || [])]; newAC[idx].text = e.target.value; setFormData({ ...formData, acceptanceCriteria: newAC }); }}
                                                    />
                                                </div>
                                            ))}
                                            <button onClick={() => setFormData({ ...formData, acceptanceCriteria: [...(formData.acceptanceCriteria || []), { id: Date.now().toString(), text: "Nuevo Criterio", completed: false }] })} className="text-[10px] text-indigo-400 font-bold mt-2 flex items-center gap-1.5"><Plus className="w-3 h-3" /> Añadir Criterio</button>
                                        </div>
                                    </div>

                                    {/* Traceability */}
                                    <div className={cn("border rounded-xl p-5 shadow-lg", isLight ? "bg-white border-zinc-200" : "bg-card border-white/10")}>
                                        <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-3", isLight ? "text-zinc-900" : "text-white")}>Trazabilidad</h3>
                                        <div className={cn("border rounded-lg px-3 py-2 flex items-center gap-2", isLight ? "bg-zinc-50 border-zinc-300" : "border-white/5 bg-black/20")}>
                                            <div className={cn("text-[10px] font-bold", isLight ? "text-zinc-600" : "text-zinc-500")}>ID Requisito RTM:</div>
                                            <input
                                                className={cn("bg-transparent outline-none flex-1 font-mono text-xs", isLight ? "text-zinc-900" : "text-zinc-300")}
                                                value={formData.rtmId || ""}
                                                onChange={e => setFormData({ ...formData, rtmId: e.target.value })}
                                                placeholder="RTM-CORE-005"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Col 2 */}
                                <div className="md:col-span-5 space-y-6">
                                    {/* Dates & Timeline */}
                                    <div className={cn("border rounded-xl p-5 shadow-lg relative", isLight ? "bg-white border-zinc-200" : "bg-card border-white/10")}>
                                        <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-4", isLight ? "text-zinc-900" : "text-white")}>Cronograma</h3>
                                        <div className="flex items-center gap-5 mb-5 h-20">
                                            <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                                                <svg className="w-full h-full transform -rotate-90">
                                                    <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="transparent" className={cn(isLight ? "text-zinc-200" : "text-zinc-800")} />
                                                    <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={201} strokeDashoffset={201 - (201 * (formData.progress || 0) / 100)} className={cn("transition-all duration-1000 ease-out", (formData.progress || 0) === 100 ? "text-blue-500" : "text-emerald-500")} />
                                                </svg>
                                                <div className={cn("absolute inset-0 flex items-center justify-center font-bold text-lg", isLight ? "text-zinc-900" : "text-zinc-200")}>{formData.progress || 0}%</div>
                                            </div>

                                            <div className="flex-1 flex flex-col justify-center gap-3 relative">
                                                {/* Start Date */}
                                                <div className="relative group">
                                                    <label className="text-[9px] text-white font-bold uppercase block mb-1">Inicio</label>
                                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setDatePickerTarget('startDate'); setCurrentMonth(formData.startDate ? new Date(formData.startDate) : new Date()); }}>
                                                        <CalendarIcon className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                                                        <span className="text-xs text-zinc-300 font-mono">{formData.startDate ? format(new Date(formData.startDate), 'dd MMM yyyy', { locale: es }) : 'Seleccionar'}</span>
                                                    </div>
                                                    {datePickerTarget === 'startDate' && (
                                                        <>
                                                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setDatePickerTarget(null); }} />
                                                            <CustomDatePicker target="startDate" value={formData.startDate} onClose={() => setDatePickerTarget(null)} onSelect={(d) => setFormData({ ...formData, startDate: d })} />
                                                        </>
                                                    )}
                                                </div>
                                                {/* End Date */}
                                                <div className="relative group">
                                                    <label className="text-[9px] text-white font-bold uppercase block mb-1">Fin Estimado</label>
                                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setDatePickerTarget('endDate'); setCurrentMonth(formData.endDate ? new Date(formData.endDate) : new Date()); }}>
                                                        <CalendarIcon className="w-4 h-4 text-zinc-400 group-hover:text-amber-400 transition-colors" />
                                                        <span className="text-xs text-zinc-300 font-mono">{formData.endDate ? format(new Date(formData.endDate), 'dd MMM yyyy', { locale: es }) : 'Seleccionar'}</span>
                                                    </div>
                                                    {datePickerTarget === 'endDate' && (
                                                        <>
                                                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setDatePickerTarget(null); }} />
                                                            <CustomDatePicker target="endDate" value={formData.endDate} onClose={() => setDatePickerTarget(null)} onSelect={(d) => setFormData({ ...formData, endDate: d })} />
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <input type="range" min="0" max="100" value={formData.progress || 0} onChange={e => setFormData({ ...formData, progress: parseInt(e.target.value) })} className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
                                    </div>

                                    {/* Assignment (Replaces RACI) */}
                                    <div className={cn("border rounded-xl p-5 shadow-lg relative", isLight ? "bg-white border-zinc-200" : "bg-card border-white/10")}>
                                        <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-4", isLight ? "text-zinc-900" : "text-white")}>Asignación</h3>

                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                                                <UserIcon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <label className={cn("text-[10px] font-bold uppercase mb-1 block", isLight ? "text-zinc-500" : "text-zinc-400")}>Responsable de la Tarea</label>
                                                <select
                                                    className={cn("w-full appearance-none border rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 outline-none transition-all cursor-pointer",
                                                        isLight ? "bg-zinc-50 border-zinc-300 text-zinc-900 focus:ring-indigo-500/50" : "bg-black/20 border-white/10 text-white focus:ring-indigo-500/50"
                                                    )}
                                                    value={formData.assignedTo || ""}
                                                    onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                                                >
                                                    <option value="">Seleccionar Responsable...</option>
                                                    {users.map(u => (
                                                        <option key={u.uid} value={u.uid}>
                                                            {u.displayName} ({u.role?.replace('_', ' ')})
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="text-[10px] text-zinc-500 mt-1 italic">
                                                    * Al asignar, el usuario recibirá una notificación inmediata.
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dependencies */}
                                    <div className={cn("border rounded-xl p-5 shadow-lg", isLight ? "bg-white border-zinc-200" : "bg-card border-white/10")}>
                                        <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-3", isLight ? "text-zinc-900" : "text-white")}>Dependencias</h3>

                                        {/* List Existing */}
                                        <div className="space-y-2 mb-3">
                                            {formData.dependencies?.map(depId => {
                                                const depTask = tasks.find(t => t.id === depId);
                                                if (!depTask) return null;
                                                return (
                                                    <div key={depId} className="flex items-center gap-3 p-2 bg-red-500/5 text-red-400 rounded-lg text-xs border border-red-500/10 justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <AlertTriangle className="w-4 h-4 shrink-0" />
                                                            <div>
                                                                <span className="font-bold block text-[9px] uppercase opacity-70">Blocked By</span>
                                                                <div className="font-medium text-zinc-300">{depTask.friendlyId || 'Unknown'} - {depTask.title}</div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                const newDeps = formData.dependencies?.filter(d => d !== depId);
                                                                setFormData({ ...formData, dependencies: newDeps });
                                                            }}
                                                            className="p-1 hover:bg-red-500/20 rounded text-red-400"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Search Input */}
                                        <div className="relative">
                                            <div className={cn("flex items-center gap-2 border rounded-lg px-2 py-1.5 focus-within:border-indigo-500/30",
                                                isLight ? "bg-zinc-50 border-zinc-300" : "bg-black/20 border-white/5"
                                            )}>
                                                <Search className="w-3.5 h-3.5 text-zinc-500" />
                                                <input
                                                    className={cn("bg-transparent outline-none flex-1 text-xs placeholder:text-zinc-600",
                                                        isLight ? "text-zinc-900 placeholder:text-zinc-400" : "text-zinc-300 placeholder:text-zinc-600"
                                                    )}
                                                    placeholder="Buscar tarea ID o título..."
                                                    value={dependencySearch}
                                                    onChange={e => setDependencySearch(e.target.value)}
                                                />
                                            </div>
                                            {dependencySearch.length > 1 && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto custom-scrollbar">
                                                    {tasks
                                                        .filter(t => t.id !== selectedTask.id && (t.friendlyId?.toLowerCase().includes(dependencySearch.toLowerCase()) || t.title?.toLowerCase().includes(dependencySearch.toLowerCase())))
                                                        .slice(0, 5)
                                                        .map(t => (
                                                            <button
                                                                key={t.id}
                                                                onClick={() => {
                                                                    if (!formData.dependencies?.includes(t.id)) {
                                                                        setFormData({ ...formData, dependencies: [...(formData.dependencies || []), t.id] });
                                                                    }
                                                                    setDependencySearch("");
                                                                }}
                                                                className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:bg-white/5 hover:text-white border-b border-white/5 last:border-0"
                                                            >
                                                                <span className="font-bold font-mono text-indigo-400 mr-2">{t.friendlyId}</span>
                                                                {t.title}
                                                            </button>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="pt-2 border-t border-white/5 flex flex-col gap-3">
                                        <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-indigo-900/30 transition-all flex justify-center items-center gap-2 text-xs uppercase tracking-wide">
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar Cambios
                                        </button>
                                        {!isNew && can('delete', 'tasks') && <button onClick={handleDelete} className="w-full py-3 bg-transparent border border-white/10 text-red-400 hover:bg-red-500/10 hover:border-red-500/20 font-bold rounded-lg transition-all text-xs uppercase tracking-wide">Eliminar Tarea</button>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
                }
            </div >

            {/* Confirmation Modal */}
            {confirmModal && confirmModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 scale-100 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-white mb-2">{confirmModal.title}</h3>
                        <p className="text-sm text-zinc-400 mb-6">{confirmModal.message}</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className={cn(
                                    "px-4 py-2 text-sm font-bold rounded-lg shadow-lg active:scale-95 transition-all text-white",
                                    confirmModal.destructive
                                        ? "bg-red-500 hover:bg-red-600 shadow-red-500/20"
                                        : "bg-primary hover:bg-primary/90 shadow-primary/20"
                                )}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

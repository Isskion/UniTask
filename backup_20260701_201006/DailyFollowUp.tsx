"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import ProjectManagement from "./ProjectManagement";
import TaskManagement from "./TaskManagement";
import TaskDashboard from "./TaskDashboard";
import { AppLayout } from "./AppLayout";
import { Project, JournalEntry, Task, NoteBlock } from "@/types";
import { cn } from "@/lib/utils";
import { startOfWeek, isSameDay, format, subDays, addDays, getISOWeek, getYear } from "date-fns";
import { es } from "date-fns/locale";
import { saveJournalEntry, getJournalEntry, getRecentJournalEntries } from "@/lib/storage";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query } from "firebase/firestore";
import { Plus, Sparkles, Activity, Loader2, ListTodo, AlertTriangle, PlayCircle, PauseCircle, Timer, Save, Calendar, PenSquare, CalendarPlus, Trash2, X, UserCircle2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { summarizeNotesWithAI } from "@/app/ai-actions";
import UserManagement from "./UserManagement";
import Dashboard from "./Dashboard";
import FirebaseDiagnostic from "./FirebaseDiagnostic";
import { subscribeToProjectTasks, subscribeToOpenTasks, toggleTaskBlock, updateTaskStatus, createTask } from "@/lib/tasks";

export default function DailyFollowUp() {
    const { userRole, user, loading: authLoading, loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
    const [userProfile, setUserProfile] = useState<any>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [globalProjects, setGlobalProjects] = useState<Project[]>([]);



    // --- STATE: DATE & NAVIGATION ---
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [isHydrated, setIsHydrated] = useState(false);

    // Hydration-safe initial load
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Load Date
            const savedDate = localStorage.getItem('daily_current_date');
            if (savedDate) setCurrentDate(new Date(savedDate));

            // Load View Mode
            const savedView = localStorage.getItem('daily_view_mode');
            if (savedView === 'dashboard' || savedView === 'projects' || savedView === 'users' || savedView === 'trash' || savedView === 'tasks' || savedView === 'task-manager') {
                setViewMode(savedView);
            }

            // Load Active Tab
            const savedTab = localStorage.getItem('daily_active_tab');
            if (savedTab && savedTab !== "General") {
                setActiveTab(savedTab);
            }

            setIsHydrated(true);
        }
    }, []);

    // Persist Current Date
    useEffect(() => {
        if (isHydrated && currentDate) {
            localStorage.setItem('daily_current_date', currentDate.toISOString());
        }
    }, [currentDate, isHydrated]);

    const [viewMode, setViewMode] = useState<'editor' | 'trash' | 'users' | 'projects' | 'dashboard' | 'tasks' | 'task-manager'>('editor');

    // Persist View Mode
    useEffect(() => {
        if (isHydrated && typeof window !== 'undefined') {
            localStorage.setItem('daily_view_mode', viewMode);
        }
    }, [viewMode, isHydrated]);

    // --- STATE: DATA ---
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [entry, setEntry] = useState<JournalEntry>({
        id: format(new Date(), 'yyyy-MM-dd'),
        date: format(new Date(), 'yyyy-MM-dd'),
        projects: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });

    const [activeTab, setActiveTab] = useState<string>("General");

    // Load active tab from local storage on mount (Client only)
    useEffect(() => {
        const saved = localStorage.getItem('daily_active_tab');
        if (saved && saved !== "General") {
            setActiveTab(saved);
        }
    }, []);

    // Persist Active Tab
    useEffect(() => {
        if (activeTab && activeTab !== "General") {
            localStorage.setItem('daily_active_tab', activeTab);
        }
    }, [activeTab]);

    // Load user profile
    useEffect(() => {
        if (!user?.uid) return;

        const loadProfile = async () => {
            try {
                const docRef = doc(db, "user", user.uid);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setUserProfile(snap.data());
                }
            } catch (e) {
                console.error("[DailyFollowUp] Error fetching user profile", e);
            } finally {
                setProfileLoading(false);
            }
        };

        setProfileLoading(true);
        loadProfile();
    }, [user]);



    // --- STATE: TASKS ---
    const [projectTasks, setProjectTasks] = useState<Task[]>([]);

    // Subscribe to tasks when Active Tab changes
    const activeProject = globalProjects.find(p => p.name === activeTab);
    const activeProjectId = activeProject?.id;

    useEffect(() => {
        if (!user) return; // Wait for auth

        let unsubscribe: () => void;

        if (activeTab === "General") {
            // General -> Show ALL Open Tasks (Global overview)
            unsubscribe = subscribeToOpenTasks((data) => {
                setProjectTasks(data);
            });
        } else {
            // Specific Project
            if (activeProjectId) {
                unsubscribe = subscribeToProjectTasks(activeProjectId, (data) => {
                    setProjectTasks(data);
                });
            } else {
                setProjectTasks([]);
                unsubscribe = () => { };
            }
        }

        return () => unsubscribe();
    }, [activeTab, activeProjectId, user]);

    // Helper to toggle block status
    const handleToggleBlock = async (task: Task) => {
        if (!user?.uid) return;
        try {
            await toggleTaskBlock(task.id, !task.isBlocking, user.uid);
        } catch (e) {
            console.error(e);
            alert("Error updating task");
        }
    };
    // Context-Aware Task Filtering
    // General Tab: Show tasks ONLY for projects that are active in this Daily Entry.
    // Specific Tab: Show tasks for that project (subscription already handles it).
    const visibleTasks = useMemo(() => {
        if (activeTab !== "General") return projectTasks;

        // "Ghosting" Fix: Filter global tasks to match only projects present in this day's entry.
        let dailyProjectIds = entry.projects
            .filter(p => p.status !== 'trash')
            .map(p => {
                // Resolve ID from stored projectId OR lookup by name
                return p.projectId || globalProjects.find(gp => gp.name === p.name)?.id;
            })
            .filter(Boolean) as string[];

        // Permission Filter for General View
        if (userRole !== 'app_admin' && userRole !== 'global_pm') {
            const assignedIds = userProfile?.assignedProjectIds || [];
            dailyProjectIds = dailyProjectIds.filter(id => assignedIds.includes(id));
        }

        if (dailyProjectIds.length === 0) return []; // Empty day or no allowed projects

        return projectTasks.filter(t => t.projectId && dailyProjectIds.includes(t.projectId));
    }, [projectTasks, activeTab, entry.projects, globalProjects, userRole, userProfile]);

    const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]); // Rich history with Full Entry data

    // Permission Logic
    const allowedProjectNames = useMemo(() => {
        if (userRole === 'app_admin' || userRole === 'global_pm') return null; // All allowed
        if (!userProfile) return new Set<string>();
        const assignedIds = userProfile.assignedProjectIds || [];
        return new Set(globalProjects.filter(gp => assignedIds.includes(gp.id)).map(gp => gp.name));
    }, [userRole, userProfile, globalProjects]);

    // AI State
    const [isAILoading, setIsAILoading] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [aiSummary, setAiSummary] = useState<string>("");

    // Manual Task State
    const [newTaskText, setNewTaskText] = useState("");

    // Auth UI State
    const [isRegistering, setIsRegistering] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // 1. Initial Load (User & Projects)
    useEffect(() => {
        if (!user?.uid) return;
        const loadInit = async () => {
            // User
            try {
                const uSnap = await getDoc(doc(db, "user", user.uid));
                if (uSnap.exists()) setUserProfile(uSnap.data());
            } catch (e) { console.error("User Load Error", e); }

            // Projects
            try {
                const q = query(collection(db, "projects"));
                const snap = await getDocs(q);
                setGlobalProjects(snap.docs.map(d => ({
                    id: d.id,
                    ...d.data()
                } as any)));
            } catch (e) { console.error("Projects Load Error", e); }

            // Recent History (Rich)
            try {
                const recents = await getRecentJournalEntries(60);
                setRecentEntries(recents);
            } catch (e) { console.error("History Load Error", e); }
        };
        loadInit();
    }, [user]);

    // 2. Load Entry Data when Date Changes
    const loadData = useCallback(async (dateObj: Date) => {
        setLoading(true);
        const dateId = format(dateObj, 'yyyy-MM-dd');

        // Reset state
        setEntry(prev => ({ ...prev, id: dateId, date: dateId, projects: [] }));

        try {
            const existing = await getJournalEntry(dateId);
            if (existing) {
                // --- DATA MIGRATION LAYER ---
                // Map legacy 'nextWeekTasks' to 'nextSteps' if present
                const migratedProjects = existing.projects.map(p => ({
                    ...p,
                    nextSteps: p.nextSteps || (p as any).nextWeekTasks || ""
                }));

                setEntry({
                    ...existing,
                    projects: migratedProjects
                });
            } else {
                // New Entry
                setEntry({
                    id: dateId,
                    date: dateId,
                    projects: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
        } catch (e) {
            console.error("Error loading journal", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (loading) return;

        // Auto-fix Active Tab:
        // Filter active projects AND apply permissions to ensure we don't land on a restricted project
        let activeProjects = entry.projects.filter(p => p.status !== 'trash');

        if (userRole !== 'app_admin' && userRole !== 'global_pm') {
            // Strict filtering for restricted users
            const assignedIds = userProfile?.assignedProjectIds || [];
            activeProjects = activeProjects.filter(p => {
                const pid = p.projectId || globalProjects.find(gp => gp.name === p.name)?.id;
                return pid && assignedIds.includes(pid);
            });
        }

        const isValid = activeProjects.some(p => p.name === activeTab);

        if (!isValid) {
            // Current tab is invalid for this day (or restricted). Switch context.
            if (activeProjects.length > 0) {
                // Focus first available/allowed project
                setActiveTab(activeProjects[0].name);
            } else {
                // Fallback to General
                setActiveTab("General");
            }
        }
    }, [entry.id, loading, userRole, userProfile, globalProjects]); // Only run when Day changes or Load finishes

    useEffect(() => {
        if (user) {
            loadData(currentDate);
        }
    }, [currentDate, loadData, user]);



    // 3. Save Handler
    const handleSave = async () => {
        if (!auth.currentUser) return alert("No user logged in");
        setSaving(true);
        try {
            const toSave = { ...entry, updatedAt: new Date().toISOString() };
            await saveJournalEntry(toSave);
            setEntry(toSave);

            // Update local history cache
            setRecentEntries(prev => {
                const filtered = prev.filter(p => p.date !== toSave.date);
                return [toSave, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
            });

            alert("Guardado correctamente");
        } catch (e) {
            console.error(e);
            alert("Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    // 4. AI Handler
    // 4. AI Handler
    const handleAI = async (specificText?: string, specificContext?: string) => {
        setIsAILoading(true);
        try {
            let notesToAnalyze = specificText;

            // If no specific text, gather GLOBAL context (All blocks)
            if (!notesToAnalyze) {
                if (activeTab === "General") {
                    notesToAnalyze = entry.generalNotes || "";
                } else {
                    const blocks = getProjectBlocks(activeTab);
                    if (blocks.length > 0) {
                        // Concatenate all blocks with titles for context
                        notesToAnalyze = blocks.map(b => `[${b.title || 'Notas'}]:\n${b.content}`).join('\n\n');
                    } else {
                        notesToAnalyze = getCurrentData().pmNotes;
                    }
                }
            }

            if (!notesToAnalyze?.trim()) {
                alert("Escribe algunas notas primero para analizar.");
                return;
            }

            // Build Context
            let context = `Proyecto: ${activeTab}`;
            if (activeTab !== "General") {
                const proj = globalProjects.find(p => p.name === activeTab);
                if (proj) {
                    context += `\nCliente: ${proj.clientName || 'N/A'}`;
                    context += `\nEstado: ${proj.status}`;
                }
            }
            if (specificContext) {
                context += `\nContexto Adicional: ${specificContext}`;
            }

            const result = await summarizeNotesWithAI(notesToAnalyze, context);

            if (result.error) {
                alert(result.error);
                return;
            }

            // Set state for UI review
            setAiSummary(result.resumenEjecutivo);

            // Combine tasks and next steps into a single "Suggestions" list
            const suggestions = [
                ...result.tareasExtraidas,
                ...result.proximosPasos
            ];
            setAiSuggestions(suggestions);

        } catch (e) {
            console.error(e);
            alert("Error en AI");
        } finally {
            setIsAILoading(false);
        }
    };

    const handleAcceptSuggestion = async (taskDesc: string, isBlocked: boolean = false) => {
        if (!user?.uid) return;
        try {
            // Determine Project ID and Name
            let projectId: string | undefined;
            let projectName: string | undefined;

            if (activeTab !== 'General') {
                const project = globalProjects.find(p => p.name === activeTab);
                if (project) {
                    projectId = project.id;
                    projectName = project.name;
                }
            }

            // Create the task
            await createTask(
                {
                    weekId: entry.id,
                    projectId: projectId,
                    title: taskDesc,
                    description: taskDesc,
                    status: 'pending',
                    isBlocking: isBlocked,
                    isActive: true,
                    createdBy: user.uid,
                    assignedTo: user.uid
                },
                user.uid,
                projectName
            );

            // Remove from suggestions
            setAiSuggestions(prev => prev.filter(t => t !== taskDesc));
        } catch (e) {
            console.error("Error creating task", e);
            alert("Error al crear la tarea: " + (e instanceof Error ? e.message : "Desconocido"));
        }
    };

    const handleManualAddTask = async (isBlocked: boolean = false) => {
        if (!newTaskText.trim()) return;
        await handleAcceptSuggestion(newTaskText, isBlocked); // Reuse logic
        setNewTaskText("");
    };

    const handleDismissSuggestion = (taskDesc: string) => {
        setAiSuggestions(prev => prev.filter(t => t !== taskDesc));
    };

    // 5. Helpers
    const getVisibleProjects = () => {
        const activeOnly = entry.projects.filter(p => p.status !== 'trash');
        if (userRole === 'app_admin' || userRole === 'global_pm') return activeOnly;
        if (!userProfile) return [];

        const assignedIds = userProfile.assignedProjectIds || [];
        const allowedNames = new Set(globalProjects.filter(gp => assignedIds.includes(gp.id)).map(gp => gp.name));
        return activeOnly.filter(p => allowedNames.has(p.name));
    };

    const addProject = (projectToAdd: { name: string, id: string, code: string }) => {
        const existing = entry.projects.find(p => p.name === projectToAdd.name);
        if (existing) {
            if (existing.status === 'trash') {
                setEntry(prev => ({
                    ...prev,
                    projects: prev.projects.map(p => p.name === projectToAdd.name ? { ...p, status: 'active' } : p)
                }));
            }
            setActiveTab(projectToAdd.name);
        } else {
            setEntry(prev => ({
                ...prev,
                projects: [...prev.projects, {
                    name: projectToAdd.name,
                    projectId: projectToAdd.id,
                    pmNotes: "",
                    conclusions: "",
                    nextSteps: "",
                    status: 'active'
                }]
            }));
            setActiveTab(projectToAdd.name);
        }
    };

    const getCurrentData = () => {
        if (activeTab === "General") {
            return { pmNotes: entry.generalNotes || "", conclusions: "", nextSteps: "" };
        }
        const p = entry.projects.find(p => p.name === activeTab);
        return p || { pmNotes: "", conclusions: "", nextSteps: "" };
    };

    const updateCurrentData = (field: string, value: string) => {
        if (activeTab === "General") {
            setEntry(prev => ({ ...prev, generalNotes: value }));
        } else {
            setEntry(prev => ({
                ...prev,
                projects: prev.projects.map(p => p.name === activeTab ? { ...p, [field]: value } : p)
            }));
        }
    };



    // --- BLOCK LOGIC ---
    const getProjectBlocks = (projectName: string): NoteBlock[] => {
        if (projectName === "General") return []; // General only supports flat notes for now
        const p = entry.projects.find(p => p.name === projectName);
        if (!p) return [];

        // Return existing blocks OR migrate legacy pmNotes to a default block
        if (p.blocks && p.blocks.length > 0) return p.blocks;
        return [{ id: 'default', title: 'Notas', content: p.pmNotes || "" }];
    };

    const handleBlockUpdate = (projectName: string, blockId: string, field: 'title' | 'content', value: string) => {
        if (projectName === "General") return; // Not supported on General yet

        setEntry(prev => ({
            ...prev,
            projects: prev.projects.map(p => {
                if (p.name !== projectName) return p;

                // 1. Get ready state
                const currentBlocks = (p.blocks && p.blocks.length > 0)
                    ? [...p.blocks]
                    : [{ id: 'default', title: 'Notas', content: p.pmNotes || "" }];

                // 2. Update
                const idx = currentBlocks.findIndex(b => b.id === blockId);
                if (idx !== -1) {
                    currentBlocks[idx] = { ...currentBlocks[idx], [field]: value };
                }

                // 3. Sync Legacy (First block -> pmNotes)
                const legacySync = currentBlocks.length > 0 ? currentBlocks[0].content : "";

                return { ...p, blocks: currentBlocks, pmNotes: legacySync };
            })
        }));
    };

    const handleAddBlock = (projectName: string) => {
        if (projectName === "General") return;
        setEntry(prev => ({
            ...prev,
            projects: prev.projects.map(p => {
                if (p.name !== projectName) return p;

                // Initialize if needed
                const currentBlocks = (p.blocks && p.blocks.length > 0)
                    ? [...p.blocks]
                    : [{ id: 'default', title: 'Notas', content: p.pmNotes || "" }];

                const newBlock: NoteBlock = {
                    id: Date.now().toString(),
                    title: 'Nuevo Bloque',
                    content: ''
                };

                return { ...p, blocks: [...currentBlocks, newBlock] };
            })
        }));
    };

    const handleRemoveBlock = (projectName: string, blockId: string) => {
        if (!confirm("¿Eliminar este bloque de notas?")) return;
        setEntry(prev => ({
            ...prev,
            projects: prev.projects.map(p => {
                if (p.name !== projectName) return p;

                let currentBlocks = (p.blocks && p.blocks.length > 0)
                    ? [...p.blocks]
                    : [{ id: 'default', title: 'Notas', content: p.pmNotes || "" }];

                currentBlocks = currentBlocks.filter(b => b.id !== blockId);

                // Ensure at least one block exists or clear
                const legacySync = currentBlocks.length > 0 ? currentBlocks[0].content : "";

                return { ...p, blocks: currentBlocks, pmNotes: legacySync };
            })
        }));
    };

    const getAvailableProjectsToAdd = () => {
        let pool = globalProjects;
        if (userRole !== 'app_admin' && userRole !== 'global_pm') {
            const assignedIds = userProfile?.assignedProjectIds || [];
            pool = pool.filter(p => assignedIds.includes(p.id));
        }
        return pool.filter(gp => !entry.projects.some(ep => ep.name === gp.name && ep.status !== 'trash'));
    };

    // 6. Render
    // --- RENDER BLOCKER ---
    if (!isHydrated) {
        return (
            <div className="h-screen bg-[#09090b] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    if (authLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black text-white">
                <Loader2 className="w-10 h-10 animate-spin text-[#D32F2F]" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black relative overflow-hidden">
                {/* Background Ambient */}
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#D32F2F] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse-slow"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-orange-600 rounded-full mix-blend-screen filter blur-[100px] opacity-10"></div>

                <div className="relative z-10 glass-panel p-12 rounded-3xl border border-white/10 flex flex-col items-center max-w-md w-full shadow-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D32F2F] to-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-red-900/50">
                        <UserCircle2 className="w-8 h-8 text-white" />
                    </div>

                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent mb-2">
                        UniTaskController
                    </h1>
                    <p className="text-zinc-500 text-sm mb-8 text-center">
                        Gestión inteligente de proyectos y tareas
                    </p>

                    <button
                        onClick={loginWithGoogle}
                        className="w-full bg-white text-black font-bold py-3 px-6 rounded-xl hover:bg-zinc-200 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3 shadow-lg"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                        Iniciar sesión con Google
                    </button>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-zinc-700" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#09090b] px-2 text-zinc-500">O con email</span>
                        </div>
                    </div>

                    <div className="flex justify-center mb-4 gap-4">
                        <button
                            onClick={() => setIsRegistering(false)}
                            className={cn("text-sm pb-1", !isRegistering ? "text-white border-b-2 border-[#D32F2F] font-bold" : "text-zinc-500")}
                        >
                            Iniciar Sesión
                        </button>
                        <button
                            onClick={() => setIsRegistering(true)}
                            className={cn("text-sm pb-1", isRegistering ? "text-white border-b-2 border-[#D32F2F] font-bold" : "text-zinc-500")}
                        >
                            Crear Cuenta
                        </button>
                    </div>

                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const email = formData.get('email') as string;
                        const password = formData.get('password') as string;
                        const name = formData.get('name') as string;

                        if (isRegistering) {
                            const confirmPassword = formData.get('confirmPassword') as string;
                            if (!name) return alert("El nombre es requerido");
                            if (password !== confirmPassword) return alert("Las contraseñas no coinciden");
                            if (password.length < 6) return alert("La contraseña debe tener al menos 6 caracteres");

                            if (registerWithEmail) {
                                registerWithEmail(email, password, name).catch((err: any) => alert(err.message));
                            } else {
                                alert("Error: Función de registro no disponible. Recarga la página.");
                            }
                        } else {
                            loginWithEmail(email, password).catch(err => alert(err.message));
                        }
                    }} className="space-y-3">
                        {isRegistering && (
                            <input name="name" type="text" placeholder="Tu Nombre Completo" required className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 animate-in fade-in slide-in-from-top-1" />
                        )}
                        <input name="email" type="email" placeholder="Email" required className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600" />

                        <div className="relative">
                            <input
                                name="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Contraseña"
                                required
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        {isRegistering && (
                            <div className="relative animate-in fade-in slide-in-from-top-1">
                                <input
                                    name="confirmPassword"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Confirmar Contraseña"
                                    required
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 pr-10"
                                />
                            </div>
                        )}

                        <button type="submit" className="w-full bg-zinc-800 text-zinc-200 font-bold py-2 px-4 rounded-lg hover:bg-zinc-700 transition-colors text-sm">
                            {isRegistering ? "Registrarse" : "Entrar"}
                        </button>
                    </form>

                    <p className="mt-6 text-xs text-zinc-600 text-center">
                        Acceso restringido a personal autorizado. <br />
                        Contacta con soporte si no tienes acceso.
                    </p>
                </div>
                <FirebaseDiagnostic />
            </div>
        );
    }

    return (
        <AppLayout viewMode={viewMode} onViewChange={setViewMode}>
            <div className="flex h-full gap-6 p-4 pt-2">

                {/* LEFT SIDEBAR: Timeline (Vertical List) */}
                {viewMode === 'editor' && (
                    <div className="w-72 flex flex-col gap-3 shrink-0">
                        <div className="bg-[#0c0c0e] rounded-xl border border-white/5 p-3 flex flex-col gap-2 h-full">
                            <div className="flex items-center justify-between px-1 mb-2">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Bitácora</h3>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setCurrentDate(new Date())} className="text-[10px] text-indigo-400 font-bold hover:underline">HOY</button>
                                    <div className="relative">
                                        <button
                                            onClick={() => (document.getElementById('timeline-date-picker') as HTMLInputElement)?.showPicker()}
                                            className="text-zinc-500 hover:text-white transition-colors"
                                            title="Buscar fecha anterior"
                                        >
                                            <CalendarPlus className="w-4 h-4" />
                                        </button>
                                        <input
                                            id="timeline-date-picker"
                                            type="date"
                                            className="absolute top-0 right-0 opacity-0 w-0 h-0"
                                            onChange={(e) => {
                                                if (e.target.valueAsDate) setCurrentDate(e.target.valueAsDate);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable Day List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                {(() => {
                                    // 1. Collect all relevant dates
                                    const todayStr = format(new Date(), 'yyyy-MM-dd');
                                    const currentStr = format(currentDate, 'yyyy-MM-dd');

                                    // Start with days that have data (active + permitted)
                                    const rawDates = recentEntries
                                        .filter(e => e.projects.some(p =>
                                            p.status !== 'trash' &&
                                            (!allowedProjectNames || allowedProjectNames.has(p.name))
                                        ))
                                        .map(e => e.date);

                                    // Add Today and Selected (Active) Day
                                    rawDates.push(todayStr);
                                    rawDates.push(currentStr);

                                    // Deduplicate and Sort Descending
                                    const uniqueDates = Array.from(new Set(rawDates))
                                        .sort((a, b) => b.localeCompare(a));

                                    return uniqueDates.map(dateStr => {
                                        // Safe date parsing to avoid timezone issues with 'YYYY-MM-DD'
                                        const [y, m, d] = dateStr.split('-').map(Number);
                                        const dateObj = new Date(y, m - 1, d); // Local time construction

                                        const isSelected = dateStr === currentStr;
                                        const isToday = dateStr === todayStr;
                                        const dayEntry = recentEntries.find(e => e.date === dateStr);
                                        const hasData = !!dayEntry && dayEntry.projects.some(p =>
                                            p.status !== 'trash' &&
                                            (!allowedProjectNames || allowedProjectNames.has(p.name))
                                        );

                                        const recordedProjects = (dayEntry?.projects || []).filter(p =>
                                            p.status !== 'trash' &&
                                            (!allowedProjectNames || allowedProjectNames.has(p.name))
                                        );

                                        return (
                                            <button
                                                key={dateStr}
                                                onClick={() => setCurrentDate(dateObj)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 p-2.5 rounded-lg transition-all border text-left group relative",
                                                    isSelected
                                                        ? "bg-white/10 border-white/10 text-white shadow-lg"
                                                        : hasData
                                                            ? "bg-white/5 border-transparent hover:bg-white/10 text-zinc-300"
                                                            : "bg-transparent border-transparent hover:bg-white/5 text-zinc-600 opacity-70 hover:opacity-100"
                                                )}
                                            >
                                                {/* Day Number */}
                                                <div className={cn(
                                                    "flex flex-col items-center justify-center w-9 h-9 rounded-md font-mono leading-none shrink-0 transition-colors",
                                                    isSelected ? "bg-indigo-600 text-white font-bold" :
                                                        isToday ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20" : "bg-white/5 text-zinc-500"
                                                )}>
                                                    <span className="text-sm">{format(dateObj, 'd')}</span>
                                                </div>

                                                {/* Date Info */}
                                                <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                                                    <div className="flex justify-between items-baseline">
                                                        <span className={cn("text-xs font-medium uppercase tracking-wide", isSelected ? "text-white" : "text-zinc-400 group-hover:text-zinc-300")}>
                                                            {format(dateObj, 'MMMM', { locale: es })}
                                                        </span>
                                                        <span className="text-[9px] opacity-50">{format(dateObj, 'EEE', { locale: es })}</span>
                                                    </div>

                                                    {/* Dots / Indicators */}
                                                    {hasData && (
                                                        <div className="flex items-center gap-1 mt-1.5 overflow-hidden h-2">
                                                            {recordedProjects.length > 0 ? (
                                                                <div className="flex gap-1">
                                                                    {recordedProjects.slice(0, 5).map((p, idx) => {
                                                                        const color = globalProjects.find(gp => gp.name === p.name)?.color || '#10b981';
                                                                        return (
                                                                            <div key={idx} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} title={p.name} />
                                                                        );
                                                                    })}
                                                                    {recordedProjects.length > 5 && <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />}
                                                                </div>
                                                            ) : (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600/50" title="Solo notas generales" />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {/* MAIN EDITOR */}
                <div className="flex-1 flex flex-col min-w-0 h-full relative bg-[#0c0c0e] rounded-xl border border-white/5 overflow-hidden shadow-2xl">
                    {viewMode === 'editor' ? (
                        <div className="h-full flex flex-col">
                            {/* Header */}
                            <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-white/[0.02]">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-lg font-medium text-white flex items-center gap-3">
                                        <Calendar className="w-5 h-5 text-indigo-500" />
                                        <span className="capitalize">{format(currentDate, "EEEE, d 'de' MMMM", { locale: es })}</span>
                                    </h2>
                                    {loading && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-white text-black text-xs font-bold rounded hover:bg-zinc-200 transition-colors"
                                    >
                                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                        Guardar
                                    </button>

                                    {/* DIAGNOSTIC BUTTON REMOVED */}{" "}
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex items-center gap-1 p-2 border-b border-white/5 bg-black/20 overflow-visible relative z-40">
                                {getVisibleProjects().map(p => {
                                    const gp = globalProjects.find(g => g.name === p.name);
                                    return (
                                        <button
                                            key={p.name}
                                            onClick={() => setActiveTab(p.name)}
                                            className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 shrink-0 border",
                                                activeTab === p.name
                                                    ? "bg-[#18181b] border-indigo-500/50 text-white shadow-sm"
                                                    : "bg-transparent border-transparent text-zinc-400 hover:bg-white/5"
                                            )}
                                        >
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: gp?.color || '#71717a' }} />
                                            {p.name}
                                        </button>
                                    );
                                })}

                                <div className="relative group ml-2 z-50">
                                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-md text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all">
                                        <Plus className="w-3.5 h-3.5" /> Añadir Proyecto
                                    </button>
                                    <div className="absolute top-full left-0 mt-1 w-64 bg-[#18181b] border border-white/10 rounded-xl shadow-xl p-2 hidden group-hover:block max-h-64 overflow-y-auto custom-scrollbar">
                                        <div className="text-[10px] font-bold text-zinc-500 px-2 py-1 uppercase">Disponibles</div>
                                        {getAvailableProjectsToAdd().map(gp => (
                                            <button
                                                key={gp.id}
                                                onClick={() => addProject(gp)}
                                                className="w-full text-left px-2 py-1.5 text-xs text-zinc-300 hover:bg-white/10 rounded-lg flex items-center gap-2"
                                            >
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: gp.color || '#71717a' }} />
                                                {gp.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Content Editor */}
                            <div className="flex-1 p-6 overflow-y-auto mb-10 relative z-0">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                                    {/* Left: PM Notes (Blocks) */}
                                    <div className="flex flex-col gap-4 h-full pr-2 overflow-y-auto custom-scrollbar">
                                        <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2 shrink-0">
                                            <PenSquare className="w-3 h-3" />
                                            {activeTab === 'General' ? 'Notas Generales' : `Bloques de Notas: ${activeTab}`}
                                        </label>

                                        {activeTab === 'General' ? (
                                            <textarea
                                                value={getCurrentData().pmNotes}
                                                onChange={(e) => updateCurrentData("generalNotes", e.target.value)}
                                                className="flex-1 bg-[#121212] border border-white/10 rounded-xl p-4 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 resize-none leading-relaxed custom-scrollbar min-h-[300px]"
                                                placeholder="¿Resumen del día? ¿Anuncios importantes?"
                                            />
                                        ) : (
                                            <div className="flex flex-col gap-4">
                                                {getProjectBlocks(activeTab).map((block, idx) => (
                                                    <div key={block.id} className="bg-[#121212] border border-white/10 rounded-xl p-3 flex flex-col gap-2 group relative">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                className="bg-transparent text-xs font-bold text-indigo-400 focus:outline-none w-full placeholder:text-zinc-700"
                                                                value={block.title || `Bloque ${idx + 1}`}
                                                                onChange={(e) => handleBlockUpdate(activeTab, block.id, 'title', e.target.value)}
                                                                placeholder="Título del bloque (ej. Reunión Equipo)"
                                                            />
                                                            <button
                                                                onClick={() => handleAI(block.content, `Bloque específico: ${block.title}`)}
                                                                className="text-zinc-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                title="Analizar solo este bloque"
                                                            >
                                                                <Sparkles className="w-3.5 h-3.5" />
                                                            </button>
                                                            {getProjectBlocks(activeTab).length > 1 && (
                                                                <button
                                                                    onClick={() => handleRemoveBlock(activeTab, block.id)}
                                                                    className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    title="Eliminar bloque"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <textarea
                                                            value={block.content}
                                                            onChange={(e) => handleBlockUpdate(activeTab, block.id, 'content', e.target.value)}
                                                            className="w-full bg-transparent text-sm text-zinc-300 focus:outline-none resize-none leading-relaxed custom-scrollbar min-h-[150px]"
                                                            placeholder="Escribe aquí las conclusiones..."
                                                        />
                                                    </div>
                                                ))}

                                                <button
                                                    onClick={() => handleAddBlock(activeTab)}
                                                    className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-white/5 rounded-xl text-zinc-600 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all text-xs font-bold"
                                                >
                                                    <Plus className="w-4 h-4" /> Añadir otro bloque de notas
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Active Tasks & AI */}
                                    <div className="flex flex-col gap-2 h-full border-l border-white/5 pl-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-2">
                                                <ListTodo className="w-3 h-3" />
                                                {activeTab === 'General' ? 'Todas las Tareas Activas' : `Tareas Activas: ${activeTab}`}
                                            </label>
                                            {/* <button
                                                onClick={() => handleAI()}
                                                disabled={isAILoading}
                                                className="text-[10px] bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                                                title="Analizar notas y extraer tareas"
                                            >
                                                {isAILoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                Extraer tareas
                                            </button> */}
                                        </div>

                                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">

                                            {/* MANUAL ENTRY */}
                                            <div className="flex items-center gap-2 mb-4 bg-[#18181b] p-2 rounded-lg border border-white/5 focus-within:border-indigo-500/50 transition-colors">
                                                <input
                                                    type="text"
                                                    value={newTaskText}
                                                    onChange={(e) => setNewTaskText(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleManualAddTask(false)}
                                                    placeholder="Nueva tarea manual..."
                                                    className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                                                />
                                                <button onClick={() => handleManualAddTask(false)} disabled={!newTaskText.trim()} className="text-zinc-500 hover:text-indigo-400 disabled:opacity-30">
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleManualAddTask(true)} disabled={!newTaskText.trim()} className="text-zinc-500 hover:text-red-400 disabled:opacity-30">
                                                    <AlertTriangle className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* AI RESULTS AREA */}
                                            {(aiSummary || aiSuggestions.length > 0) && (
                                                <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-lg p-3 space-y-3 relative overflow-hidden mb-4">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50" />

                                                    {/* Summary */}
                                                    {aiSummary && (
                                                        <div className="mb-2">
                                                            <h4 className="text-[10px] font-bold text-indigo-300 uppercase mb-1 flex items-center gap-1">
                                                                <Activity className="w-3 h-3" /> Resumen / Contexto
                                                            </h4>
                                                            <p className="text-xs text-indigo-200/80 leading-relaxed italic">
                                                                "{aiSummary}"
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Suggestions List */}
                                                    {aiSuggestions.length > 0 && (
                                                        <div>
                                                            <h4 className="text-[10px] font-bold text-indigo-300 uppercase mb-2">Sugerencias ({aiSuggestions.length})</h4>
                                                            <div className="space-y-1">
                                                                {aiSuggestions.map((sugg, idx) => (
                                                                    <div key={idx} className="flex gap-2 items-start bg-[#0c0c0e] p-2 rounded border border-indigo-500/20">
                                                                        <p className="text-xs text-zinc-300 flex-1">{sugg}</p>
                                                                        <div className="flex flex-col gap-1">
                                                                            <button
                                                                                onClick={() => handleAcceptSuggestion(sugg, false)}
                                                                                className="p-1 hover:bg-green-500/20 text-green-500 rounded"
                                                                                title="Crear Tarea"
                                                                            >
                                                                                <Plus className="w-3 h-3" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleAcceptSuggestion(sugg, true)}
                                                                                className="p-1 hover:bg-red-500/20 text-red-500 rounded"
                                                                                title="Crear como BLOQUEANTE"
                                                                            >
                                                                                <AlertTriangle className="w-3 h-3" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDismissSuggestion(sugg)}
                                                                                className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 rounded"
                                                                                title="Descartar"
                                                                            >
                                                                                <Activity className="w-3 h-3 rotate-45" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={() => { setAiSummary(""); setAiSuggestions([]); }}
                                                        className="w-full text-[9px] text-center text-indigo-400/50 hover:text-indigo-400 py-1 hover:underline"
                                                    >
                                                        Cerrar sugerencias
                                                    </button>
                                                </div>
                                            )}

                                            {visibleTasks.length === 0 ? (
                                                <div className="text-center py-10 text-zinc-600 italic border border-dashed border-zinc-800 rounded-lg">
                                                    No hay tareas activas para los proyectos de hoy
                                                </div>
                                            ) : (
                                                visibleTasks.filter(t => t.status !== 'completed').map(task => (
                                                    <div
                                                        key={task.id}
                                                        className={cn(
                                                            "group p-3 rounded-lg border transition-all relative",
                                                            task.isBlocking
                                                                ? "bg-red-950/10 border-red-500/30 hover:bg-red-950/20"
                                                                : "bg-[#18181b] border-white/5 hover:border-white/10 hover:bg-white/5"
                                                        )}
                                                    >
                                                        <div className="flex justify-between items-start gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="font-mono text-[9px] text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded">
                                                                        {task.friendlyId || 'TSK'}
                                                                    </span>
                                                                    {task.isBlocking && (
                                                                        <span className="text-[9px] font-bold text-red-500 bg-red-950/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                            <AlertTriangle className="w-2.5 h-2.5" /> BLOQUEANTE
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className={cn(
                                                                    "text-xs leading-relaxed line-clamp-3",
                                                                    task.isBlocking ? "text-red-200" : "text-zinc-300"
                                                                )}>
                                                                    {task.description}
                                                                </p>
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => handleToggleBlock(task)}
                                                                    title={task.isBlocking ? "Desbloquear" : "Bloquear"}
                                                                    className={cn(
                                                                        "p-1.5 rounded hover:bg-white/10 transition-colors",
                                                                        task.isBlocking ? "text-red-400" : "text-zinc-500 hover:text-red-400"
                                                                    )}
                                                                >
                                                                    <AlertTriangle className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : viewMode === 'projects' ? (
                        <ProjectManagement />
                    ) : viewMode === 'tasks' ? (
                        <TaskDashboard
                            projects={
                                (userRole === 'app_admin' || userRole === 'global_pm')
                                    ? globalProjects
                                    : globalProjects.filter(p => userProfile?.assignedProjectIds?.includes(p.id))
                            }
                            userProfile={userProfile}
                            permissionLoading={profileLoading}
                        />
                    ) : viewMode === 'task-manager' ? (
                        <TaskManagement />
                    ) : viewMode === 'users' ? (
                        <UserManagement />
                    ) : viewMode === 'dashboard' ? (
                        <Dashboard
                            entry={entry}
                            globalProjects={globalProjects}
                            userProfile={userProfile}
                            userRole={userRole}
                        />
                    ) : (
                        <div className="p-10 text-center text-zinc-500">Módulo en construcción: {viewMode}</div>
                    )}
                </div>

                {/* ADMIN DIAGNOSTIC PANEL */}
                {user?.email?.toLowerCase() === 'argoss01@gmail.com' && <FirebaseDiagnostic />}
            </div>
        </AppLayout >
    );
}

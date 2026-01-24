"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation"; // Added for routing
import ProjectManagement from "./ProjectManagement";
import TaskManagement from "./TaskManagement";
import TaskDashboard from "./TaskDashboard";
import { AppLayout } from "./AppLayout";
import { Project, DailyStatus, Task, ContentBlock } from "@/types";
import { NotificationBell } from "./NotificationBell"; // Re-applied Import Fix
import { cn } from "@/lib/utils";
import { startOfWeek, isSameDay, format, subDays, addDays, getISOWeek, getYear } from "date-fns";
import { saveDailyStatus, getDailyStatus, getRecentDailyStatusEntries, getDailyStatusLogsForDate, getAllDailyStatusEntries } from "@/lib/storage";
import { auth, db } from "@/lib/firebase";
// SECURE IMPORTS: Removed write methods from firebase/firestore
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { Plus, Trash2, Save, Sparkles, FileText, ChevronRight, ChevronDown, PenSquare, Eye, EyeOff, Layout, Calendar, Calendar as CalendarIcon, CheckSquare, Clock, ArrowRight, X, AlertTriangle, Printer, Loader2, CalendarPlus, Activity, ListTodo, PlayCircle, PauseCircle, Timer, UserCircle2, Search } from 'lucide-react';
import { generateDailyReportPDF } from '@/app/actions/pdf';
import { useAuth } from "@/context/AuthContext";
import { useSafeFirestore } from "@/hooks/useSafeFirestore"; // Security Hook
import { useToast } from "@/context/ToastContext";
import { summarizeNotesWithAI } from "@/app/ai-actions";
import UserManagement from "./UserManagement";
import UserRoleManagement from "./UserRoleManagement";
import Dashboard from "./Dashboard";
import FirebaseDiagnostic from "./FirebaseDiagnostic";
import { subscribeToProjectTasks, subscribeToOpenTasks, toggleTaskBlock, updateTaskStatus, createTask } from "@/lib/tasks";
import { getActiveProjects } from "@/lib/projects";

import TenantManagement from "./TenantManagement";
import { useTheme } from "@/hooks/useTheme";
import ChangelogModal from "./ChangelogModal";
import { getRoleLevel, RoleLevel } from "@/types"; // Added import
import TaskMasterDataManagement from "./TaskMasterDataManagement"; // Master Data Manager // Added import
import ReportManagement from "./reports/ReportManagement"; // Added Import
import SupportManagement from "./SupportManagement";
import ManualViewer from "./ManualViewer";
import { useLanguage } from "@/context/LanguageContext";
import { es, enUS, de, fr, ca, pt } from 'date-fns/locale';

// Helper to map language string to date-fns locale
const localeMap: Record<string, any> = {
    en: enUS,
    es: es,
    de: de,
    fr: fr,
    ca: ca,
    pt: pt
};

type ViewMode = 'editor' | 'trash' | 'users' | 'projects' | 'dashboard' | 'tasks' | 'task-manager' | 'user-roles' | 'tenant-management' | 'admin-task-master' | 'reports' | 'support-management' | 'user-manual';

export default function DailyFollowUp() {
    const searchParams = useSearchParams();
    const { t, language } = useLanguage();
    const currentLocale = localeMap[language] || enUS;
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const isRed = theme === 'red';

    // --- SEARCH STATE ---
    const [searchQuery, setSearchQuery] = useState("");
    const [fullHistory, setFullHistory] = useState<DailyStatus[] | null>(null);
    const [isSearchingHistory, setIsSearchingHistory] = useState(false);

    const {
        user,
        userRole,
        tenantId,
        loading: authLoading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail
    } = useAuth();
    const { addDoc, updateDoc } = useSafeFirestore(); // Use Safe Hook
    const { showToast } = useToast();
    const [userProfile, setUserProfile] = useState<any>(null);

    const handleToggleBlock = async (task: Task) => {
        try {
            const isBlocking = !task.isBlocking;
            await toggleTaskBlock(task.id, isBlocking, user?.uid || "system", updateDoc);
            showToast("Tarea actualizada", `Estado de bloqueo cambiado para: ${task.description}`, "success");
        } catch (error) {
            console.error("Error toggling block:", error);
            showToast("Error", "No se pudo cambiar el estado de bloqueo", "error");
        }
    };

    const handlePrint = async () => {
        if (!user || !tenantId) {
            showToast("Error", "User not authenticated or tenant not available.", "error");
            return;
        }
        setIsGeneratingPDF(true);
        try {
            const formattedDate = format(currentDate, 'yyyy-MM-dd');
            const result = await generateDailyReportPDF(formattedDate, tenantId);

            if (result.success && result.pdf) {
                const byteCharacters = atob(result.pdf);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = `Minuta_${formattedDate}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                showToast("Éxito", "Reporte PDF descargado.", "success");
            } else {
                showToast("Error", "No se recibió el PDF generado.", "error");
            }
        } catch (error) {
            console.error("Error generating PDF:", error);
            showToast("Error", "No se pudo generar el reporte PDF.", "error");
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const [profileLoading, setProfileLoading] = useState(true);
    const [globalProjects, setGlobalProjects] = useState<Project[]>([]);



    // --- STATE: DATE & NAVIGATION ---
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [isHydrated, setIsHydrated] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    // Hydration-safe initial load
    useEffect(() => {
        if (typeof window !== 'undefined') {
            console.log("[DailyFollowUp] Starting Hydration...");
            // 1. Load Date
            const savedDate = localStorage.getItem('daily_current_date');
            if (savedDate) setCurrentDate(new Date(savedDate));

            // 2. Load View Mode (Priority: URL > LocalStorage > Default)
            const urlMode = searchParams.get('mode') as ViewMode;
            const savedView = localStorage.getItem('daily_view_mode') as ViewMode;
            const allowedViews = ['dashboard', 'projects', 'users', 'trash', 'tasks', 'task-manager', 'user-roles', 'admin-task-master', 'reports', 'support-management', 'user-manual', 'tenant-management', 'editor'];

            if (urlMode && allowedViews.includes(urlMode)) {
                setViewMode(urlMode);
            } else if (savedView && allowedViews.includes(savedView)) {
                setViewMode(savedView);
            } else {
                setViewMode('editor');
            }

            // 3. Load Active Tab
            const savedTab = localStorage.getItem('daily_active_tab');
            if (savedTab && savedTab !== "General") {
                setActiveTab(savedTab);
            }

            setIsHydrated(true);
            console.log("[DailyFollowUp] Hydration Complete.");
        }
    }, []);

    // Persist Current Date
    useEffect(() => {
        if (isHydrated && currentDate) {
            localStorage.setItem('daily_current_date', currentDate.toISOString());
        }
    }, [currentDate, isHydrated]);

    const [viewMode, setViewMode] = useState<'editor' | 'trash' | 'users' | 'projects' | 'dashboard' | 'tasks' | 'task-manager' | 'user-roles' | 'tenant-management' | 'admin-task-master' | 'reports' | 'support-management' | 'user-manual' | null>(null);

    // Persist View Mode
    useEffect(() => {
        if (isHydrated && typeof window !== 'undefined' && viewMode) {
            console.log("[Persistence] Saving ViewMode to LocalStorage:", viewMode);
            localStorage.setItem('daily_view_mode', viewMode);
        }
    }, [viewMode, isHydrated]);

    // --- STATE: DATA ---
    // State for loading
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Entry State
    const [entry, setEntry] = useState<DailyStatus>({
        id: format(new Date(), 'yyyy-MM-dd'),
        date: format(new Date(), 'yyyy-MM-dd'),
        tenantId: tenantId || "1",
        projects: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });

    const [activeTab, setActiveTab] = useState<string>("General");
    const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
    const [availableTenants, setAvailableTenants] = useState<any[]>([]);

    // --- STATE: UI ---
    const [isTasksPanelVisible, setIsTasksPanelVisible] = useState(false);

    // --- STATE: TASKS ---
    const [projectTasks, setProjectTasks] = useState<Task[]>([]);

    // --- STATE: HISTORY ---
    const [recentEntries, setRecentEntries] = useState<DailyStatus[]>([]);

    // --- STATE: AI ---
    const [isAILoading, setIsAILoading] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [aiSummary, setAiSummary] = useState<string>("");

    const [newTaskText, setNewTaskText] = useState("");
    const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

    // --- STATE: AUTH UI ---
    const [isRegistering, setIsRegistering] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // --- STATE: DIRTY (Unsaved Changes) ---
    const [isDirty, setIsDirty] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false); // Added state
    // Move Feature State
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [moveTargetDate, setMoveTargetDate] = useState("");


    // Prevent accidental navigation if unsaved
    // [DEBUG] Disabling listener to see if warning persists.
    /*
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = ''; // Chrome requires this
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);
    */

    // Permission Logic
    const allowedProjectNames = useMemo(() => {
        if (userRole === 'superadmin' || userRole === 'app_admin' || userRole === 'global_pm') return null; // All allowed
        if (!userProfile) return new Set<string>();
        const assignedIds = userProfile.assignedProjectIds || [];
        return new Set(globalProjects.filter(gp => assignedIds.includes(gp.id)).map(gp => gp.name));
    }, [userRole, userProfile, globalProjects]);

    // Subscribe to tasks when Active Tab changes
    const activeProject = globalProjects.find(p => p.name === activeTab);
    const activeProjectId = activeProject?.id;

    useEffect(() => {
        if (!user) return; // Wait for auth

        let unsubscribe: () => void;

        if (activeTab === "General") {
            // General -> Show ALL Open Tasks (Global overview)
            unsubscribe = subscribeToOpenTasks(tenantId || "1", (data) => {
                setProjectTasks(data);
            });
        } else {
            // Specific Project
            if (activeProjectId) {
                unsubscribe = subscribeToProjectTasks(tenantId || "1", activeProjectId, (data) => {
                    setProjectTasks(data);
                });
            } else {
                setProjectTasks([]);
                unsubscribe = () => { };
            }
        }

        return () => unsubscribe();
    }, [activeTab, activeProjectId, user, tenantId]);

    // Context-Aware Task Filtering
    const visibleTasks = useMemo(() => {
        if (activeTab !== "General") return projectTasks;

        // "Ghosting" Fix: Filter global tasks to match only projects present in this day's entry.
        let dailyProjectIds = entry.projects
            .filter(p => p.status !== 'trash')
            .map(p => {
                return p.projectId || globalProjects.find(gp => gp.name === p.name)?.id;
            })
            .filter(Boolean) as string[];

        // Permission Filter for General View
        if (userRole !== 'superadmin' && userRole !== 'app_admin' && userRole !== 'global_pm') {
            const assignedIds = userProfile?.assignedProjectIds || [];
            dailyProjectIds = dailyProjectIds.filter(id => assignedIds.includes(id));
        }

        if (dailyProjectIds.length === 0) return [];

        return projectTasks.filter(t => t.projectId && dailyProjectIds.includes(t.projectId));
    }, [projectTasks, activeTab, entry.projects, globalProjects, userRole, userProfile]);


    // Load active tab from local storage
    useEffect(() => {
        const saved = localStorage.getItem('daily_active_tab');
        if (saved && saved !== "General") setActiveTab(saved);
    }, []);

    useEffect(() => {
        if (activeTab && activeTab !== "General") localStorage.setItem('daily_active_tab', activeTab);
    }, [activeTab]);

    // Load user profile
    useEffect(() => {
        if (!user?.uid) {
            setProfileLoading(false);
            return;
        }
        const loadProfile = async () => {
            try {
                const docRef = doc(db, "users", user.uid);
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

    // Navigation Events
    useEffect(() => {
        const handleSwitchProject = (e: any) => {
            const { name } = e.detail;
            if (name) setActiveTab(name);
            setViewMode('editor');
        };
        const handleSwitchView = (e: any) => {
            const { view } = e.detail;
            if (view) setViewMode(view as any);
        };
        window.addEventListener('switch-project', handleSwitchProject);
        window.addEventListener('switch-view', handleSwitchView);
        return () => {
            window.removeEventListener('switch-project', handleSwitchProject);
            window.removeEventListener('switch-view', handleSwitchView);
        };
    }, []);

    // Initial Load & React to Tenant Change
    useEffect(() => {
        if (!user?.uid) return;

        const loadInit = async () => {
            // Fetch Available Tenants (SuperAdmin Only)
            if (userRole === 'superadmin') {
                try {
                    const tSnap = await getDocs(collection(db, "tenants"));
                    const tList = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    setAvailableTenants(tList);
                } catch (e) { console.log("Tenants fetch skipped", e); }
            }

            // Load Projects for current context
            try {
                const targetTenant = (userRole === 'superadmin' && tenantId === "1") ? "ALL" : (tenantId || "1");
                const projs = await getActiveProjects(targetTenant);
                setGlobalProjects(projs);
            } catch (e) { console.error("Projects Load Error", e); }

            // Recent History
            try {
                const recents = await getRecentDailyStatusEntries(tenantId || "1", 60);
                setRecentEntries(recents);
            } catch (e) { console.error("History Load Error", e); }
        };

        loadInit();

        // Trigger data load
        loadData(currentDate);

    }, [user, userRole, tenantId]); // Reload when tenantId changes (Context Switch)

    // Race condition guard
    const lastLoadRef = useRef<string>("");

    // Load Data
    const loadData = useCallback(async (dateObj: Date) => {
        const requestId = Date.now().toString();
        lastLoadRef.current = requestId;

        setLoading(true);
        const dateId = format(dateObj, 'yyyy-MM-dd');
        const currentTenantId = tenantId || "1";

        // Default Empty State with UNIQUE ID (Format: Org_Date_Timestamp)
        const defaultEntry: DailyStatus = {
            id: `${currentTenantId}_${dateId}_${Date.now()}`,
            date: dateId,
            tenantId: currentTenantId,
            projects: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            // SuperAdmin Global View Check (Only if Tenant 1 and Role Superadmin)
            // [FIX] Strict Masquerading Check:
            // If tenantId is present and NOT "1", we are looking at a specific tenant (Masquerading).
            // Even if tenantId IS "1", if the user explicitly requested "1" via context switching, we might want single view.
            // BUT for now, we assume "1" = Global/Root context.
            const isMasquerading = tenantId && tenantId !== "1";

            if (userRole === 'superadmin' && !isMasquerading) {
                console.log(`[LoadData] Multi-tenant view loading...`);
                const allEntries: any[] = [];
                // Only load if we are truly in "Global" mode.
                // If the user picked a tenant, isMasquerading should be true.

                const tenantsToCheck = availableTenants.length > 0 ? availableTenants.map(t => t.id) : ["1", "2", "3", "4", "5", "6"];

                for (const tid of tenantsToCheck) {
                    try {
                        const existing = await getDailyStatus(tid, dateId);
                        if (existing) allEntries.push(existing);
                    } catch (err: any) {
                        console.warn(`[LoadData] Skip tenant ${tid} due to permissions/error:`, err.message);
                    }
                }

                if (lastLoadRef.current !== requestId) return;

                if (allEntries.length > 0) {
                    const mergedProjects = allEntries.flatMap(e => e.projects || []);
                    setEntry({
                        id: dateId, // Global view still uses date ID for now
                        date: dateId,
                        tenantId: "MULTI",
                        projects: mergedProjects,
                        createdAt: allEntries[0].createdAt,
                        updatedAt: new Date().toISOString()
                    });
                } else {
                    setEntry(defaultEntry);
                }
            } else {
                // Regular Load (Targeting Specific Tenant)
                // [FIX] Ensure we use the CURRENT tenantId, even if it is "1" (if masquerading logic failed above, we default here)
                const targetTenant = tenantId || "1";
                console.log(`[DailyFollowUp] Loading Entries for: Tenant=${targetTenant}, Date=${dateId}`);
                const entries = await getDailyStatusLogsForDate(targetTenant, dateId);

                if (lastLoadRef.current !== requestId) return;

                if (entries.length > 0) {
                    // Load the LATEST entry
                    const latest = entries[0];
                    const migratedProjects = latest.projects.map(p => ({ ...p, nextSteps: p.nextSteps || (p as any).nextWeekTasks || "" }));
                    setEntry({ ...latest, projects: migratedProjects });

                    if (entries.length > 1) {
                        // Optional: could allow selecting entry
                    }
                } else {
                    setEntry({ ...defaultEntry, tenantId: targetTenant }); // Ensure default entry has correct tenant
                }
            }
        } catch (e) {
            console.error("Error loading journal", e);
        } finally {
            if (lastLoadRef.current === requestId) setLoading(false);
        }
    }, [tenantId, userRole, availableTenants]);

    useEffect(() => {
        if (loading) return;


        // Auto-fix Active Tab:
        // Filter active projects AND apply permissions to ensure we don't land on a restricted project
        let activeProjects = entry.projects.filter(p => p.status !== 'trash');

        if (userRole !== 'superadmin' && userRole !== 'app_admin' && userRole !== 'global_pm') {
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
            // Wait for tenantId to be loaded for non-superadmins to avoid permission errors
            // (Superadmins might start with tenantId null/1, but base users strictly need their tenantId)
            if (userRole !== 'superadmin' && !tenantId) {
                return;
            }
            loadData(currentDate);
        }
    }, [currentDate, loadData, user, tenantId, userRole]);



    // 3. Save Handler
    const handleSave = async () => {
        if (!auth.currentUser) {
            showToast("Error", "No has iniciado sesión", "error");
            return;
        }
        setSaving(true);
        try {
            const activeProjects = entry.projects.filter(p => p.status !== 'trash');

            // Group projects by tenant
            const projectsByTenant = new Map<string, any[]>();

            for (const project of activeProjects) {
                const projectInfo = globalProjects.find(gp => gp.name === project.name);
                // FIX: Use context tenantId as fallback. If masquerading as T4, we save as T4.
                const projectTenant = projectInfo?.tenantId || tenantId || "1";

                if (!projectsByTenant.has(projectTenant)) {
                    projectsByTenant.set(projectTenant, []);
                }
                projectsByTenant.get(projectTenant)!.push(project);
            }

            // If no projects, save to user's tenant (active context)
            if (projectsByTenant.size === 0) {
                projectsByTenant.set(tenantId || "1", []);
            }

            console.log(`[Save] Saving to ${projectsByTenant.size} tenant(s):`);

            // Save each tenant's portion
            for (const [targetTenantId, projects] of projectsByTenant.entries()) {
                const toSave = {
                    id: entry.date,
                    date: entry.date,
                    tenantId: targetTenantId,
                    projects: projects,
                    generalNotes: projects.length === 0 ? entry.generalNotes : "", // Only save general notes if no projects
                    createdAt: entry.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                console.log(`  → Tenant ${targetTenantId}: ${projects.length} project(s)`);
                await saveDailyStatus(toSave);
            }

            // Update UI state with merged view (for SuperAdmin)
            setEntry({
                ...entry,
                updatedAt: new Date().toISOString()
            });

            // Update local history cache (simplified, could be improved)
            setRecentEntries(prev => {
                const filtered = prev.filter(p => p.date !== entry.date);
                return [{ ...entry, updatedAt: new Date().toISOString() }, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
            });

            showToast("UniTaskController", `Distributed save across ${projectsByTenant.size} tenant(s)`, "success");
            setIsDirty(false); // [FIX] Only clear dirty flag if save succeeded
        } catch (e) {
            console.error(e);
            showToast("Error", "Error al guardar: " + (e as Error).message, "error");
            // DO NOT clear isDirty here. User should try again.
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
                showToast("Información", "Escribe algunas notas primero para analizar.", "info");
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
                showToast("Error AI", result.error, "error");
                return;
            }

            // Set state for UI review
            setAiSummary(result.resumenEjecutivo);

            // Combine tasks and next steps into a single "Suggestions" list
            let suggestions = [
                ...result.tareasExtraidas,
                ...result.proximosPasos
            ];

            // --- DEDUPLICATION CHECK ---
            // Check against currently loaded tasks (projectTasks)
            const { findDuplicate } = await import("@/lib/deduplication");

            let tasksToCheck = projectTasks;

            // [FIX] Robustness: Fetch tasks on demand to ensure we have the latest and ALL tasks (including completed)
            // This solves race conditions where projectTasks might be empty or filtered
            if (activeTab !== 'General' && tenantId) {
                const pId = globalProjects.find(p => p.name === activeTab)?.id;
                if (pId) {
                    try {
                        const q = query(
                            collection(db, "tasks"),
                            where("tenantId", "==", tenantId),
                            where("projectId", "==", pId),
                            where("isActive", "==", true)
                        );
                        const snap = await getDocs(q);
                        tasksToCheck = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
                        console.log(`[Deduplication] Explicitly fetched ${tasksToCheck.length} tasks for project ${activeTab} to ensure coverage.`);
                    } catch (e) {
                        console.error("[Deduplication] Fetch failed, falling back to state:", e);
                    }
                }
            }

            // [DEBUG] Monitor Deduplication Context
            console.log(`[Deduplication] Checking against ${tasksToCheck.length} loaded tasks.`);

            suggestions = suggestions.map(suggestion => {
                const duplicate = findDuplicate(suggestion, tasksToCheck, 0.75); // 75% threshold

                if (duplicate) {
                    return `POSIBLE TAREA EXISTENTE EN ${duplicate.friendlyId} (${duplicate.title}): ${suggestion}`;
                }
                return suggestion;
            });

            setAiSuggestions(suggestions);
            setIsTasksPanelVisible(true); // Auto-open on success

        } catch (e) {
            console.error(e);
            showToast("Error", "Error en AI", "error");
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
            let taskTenantId: string = tenantId || "1"; // Default fallback

            if (activeTab !== 'General') {
                const project = globalProjects.find(p => p.name === activeTab);
                if (project) {
                    projectId = project.id;
                    projectName = project.name;
                    // FIX: Always use the User's Tenant ID for creating tasks, even if project is shared/global.
                    // Strict Multi-Tenancy: I can only create data that belongs to ME/MY TENANT.
                    taskTenantId = tenantId || "1";
                }
            }

            // Verify payload before sending
            const taskData: any = {
                weekId: entry.date, // Keep Date for legacy weekId
                relatedDailyStatusId: entry.id, // [FIX] Link to specific entry instance
                projectId: projectId,
                tenantId: taskTenantId,
                title: taskDesc,
                description: taskDesc,
                status: 'pending',
                isBlocking: isBlocked,
                isActive: true,
                createdBy: user.uid,
                assignedTo: user.uid
            };
            console.log("[DailyFollowUp] Creating Task Payload:", taskData);

            // [FIX] Ensure Project Entry exists in the Journal Entry before saving
            // This prevents "orphaned" tasks that don't belong to any project entry on that date
            if (activeTab !== 'General') {
                setEntry(prev => {
                    const exists = prev.projects.some(p => p.name === activeTab);
                    if (exists) return prev;

                    const gp = globalProjects.find(g => g.name === activeTab);
                    return {
                        ...prev,
                        projects: [...prev.projects, {
                            name: activeTab,
                            projectId: gp?.id || "",
                            pmNotes: "",
                            conclusions: "",
                            nextSteps: "",
                            status: 'active'
                        }]
                    };
                });
            }

            // Create the task
            await createTask(
                taskData,
                user.uid, // authorId
                addDoc, // INJECTED DEPENDENCY
                projectName
            );

            // [FIX] Auto-save the Journal Entry to prevent "orphaned tasks"
            // This ensures meaningful notes are saved alongside the task
            await handleSave();
            setIsDirty(false); // [FIX] Force clear dirty state after task creation cycle

            // Remove from suggestions
            setAiSuggestions(prev => prev.filter(t => t !== taskDesc));
        } catch (e) {
            console.error("Error creating task", e);
            showToast("Error", "Error al crear la tarea: " + (e instanceof Error ? e.message : "Desconocido"), "error");
        }
    };

    const handleManualAddTask = async (isBlocked: boolean = false) => {
        if (!newTaskText.trim()) return;

        // --- DEDUPLICATION CHECK ---
        const { findDuplicate } = await import("@/lib/deduplication");
        const duplicate = findDuplicate(newTaskText, projectTasks, 0.8);

        if (duplicate) {
            const confirmCreate = window.confirm(
                `⚠️ POSIBLE DUPLICADO\n\n` +
                `Existe una tarea similar:\n` +
                `[${duplicate.friendlyId}] ${duplicate.title}\n\n` +
                `¿Crear de todas formas?`
            );
            if (!confirmCreate) return;
        }

        await handleAcceptSuggestion(newTaskText, isBlocked); // Reuse logic
        setNewTaskText("");
    };

    const [shouldCreateProject, setShouldCreateProject] = useState(false);

    // Event Listener for Command Menu Navigation
    useEffect(() => {
        // Helper to cast
        const asAny = (fn: any) => fn as EventListener;

        const handleSwitchProject = (e: CustomEvent) => {
            const p = e.detail;
            if (!p || !p.name) return;
            console.log("[DailyFollowUp] Command Menu Switch:", p.name);

            // If we are in Dashboard or other view, switch to Editor first?
            if (viewMode !== 'editor') {
                setViewMode('editor');
            }

            // Need to check if project exists in THIS entry (active today)
            const exists = entry.projects.find(ep => ep.name === p.name);
            if (exists) {
                if (exists.status === 'trash') {
                    // Optionally ask to restore? For now just switch.
                }
                setActiveTab(p.name);
            } else {
                // If not in today's list, AUTO-ADD it?
                // Yes, intended behavior: "Navigate to Project" implies opening it.
                addProject({ name: p.name, id: p.id, code: p.code || 'PRJ' });
            }
        };

        const handleOpenNewProject = () => {
            // 1. Switch to Projects View
            setViewMode('projects');
            // 2. Signal to open Creation Form
            setShouldCreateProject(true);

            // Reset signal after a delay to allow re-triggering later if needed?
            // Actually ProjectManagement consumes it in useEffect. 
            // Ideally we pass a callback, but for now this works if we toggle it off when view changes?
            // Let's just set it true. We can reset it when exiting viewMode === 'projects'.
        };

        window.addEventListener('switch-project', asAny(handleSwitchProject));
        window.addEventListener('open-new-project-modal', handleOpenNewProject);

        const handleOpenTask = (e: CustomEvent) => {
            const { taskId } = e.detail;
            if (taskId) {
                setPendingTaskId(taskId);
                setViewMode('task-manager');
            }
        };
        window.addEventListener('open-task', asAny(handleOpenTask));

        return () => {
            window.removeEventListener('switch-project', asAny(handleSwitchProject));
            window.removeEventListener('open-new-project-modal', handleOpenNewProject);
            window.removeEventListener('open-task', asAny(handleOpenTask));
        };
    }, [entry.projects, viewMode, activeTab]); // Dependencies


    const handleDismissSuggestion = (taskDesc: string) => {
        setAiSuggestions(prev => prev.filter(t => t !== taskDesc));
    };

    // --- MOVE PROJECT LOGIC ---
    const handleInitMove = () => {
        if (!activeTab || activeTab === "General") return;
        setMoveTargetDate(format(addDays(new Date(entry.date), 1), 'yyyy-MM-dd')); // Default tomorrow
        setIsMoveModalOpen(true);
    };

    const handleMoveProject = async () => {
        if (!user || !tenantId) return;
        if (!moveTargetDate) return;

        setLoading(true);
        try {
            const currentLevel = getRoleLevel(userRole);
            if (currentLevel < RoleLevel.PM) {
                showToast("Permiso Denegado", "Se requiere nivel PM o superior para mover entradas.", "error");
                return;
            }

            const sourceDate = entry.date;
            const targetDate = moveTargetDate;
            const projectName = activeTab;

            if (sourceDate === targetDate) {
                showToast("Error", "La fecha destino debe ser diferente.", "error");
                return;
            }

            // 1. Get Source Content
            const sourceProj = entry.projects.find(p => p.name === projectName);
            if (!sourceProj) return;

            // 2. Fetch Target Entry
            const targetEntry = await getDailyStatus(tenantId, targetDate) || {
                id: targetDate,
                date: targetDate,
                tenantId: tenantId,
                projects: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // 3. Prepare Source Content (Blocks + Notes)
            let contentToMove = sourceProj.pmNotes || "";
            if (sourceProj.blocks && sourceProj.blocks.length > 0) {
                contentToMove = sourceProj.blocks.map(b => `[${b.title}]: ${b.content}`).join('\n\n');
            }

            // 4. Update Target
            const existingTargetProjIndex = targetEntry.projects.findIndex(p => p.name === projectName);
            const auditHeader = `\n\n📅 [MOVIDO] Entrada traída del día ${sourceDate} por ${user.email || user.displayName}:\n----------------------------------------\n`;

            if (existingTargetProjIndex !== -1) {
                // Append to existing
                const tp = targetEntry.projects[existingTargetProjIndex];
                const newContent = (tp.pmNotes || "") + auditHeader + contentToMove;
                // Merge blocks? For simplicity, we append to pmNotes or Main Block. 
                // Let's append to pmNotes to be safe, or add a new block.
                // Better: Add a new Block "Entrada Movida"
                const movedBlock: ContentBlock = {
                    id: `moved-${Date.now()}`,
                    title: `Moved from ${sourceDate}`,
                    content: contentToMove
                };

                const updatedBlocks = [...(tp.blocks || []), movedBlock];
                targetEntry.projects[existingTargetProjIndex] = { ...tp, blocks: updatedBlocks, pmNotes: (tp.pmNotes || "") + " (Ver bloques movidos)" };
            } else {
                // Create new project entry in target
                targetEntry.projects.push({
                    ...sourceProj,
                    pmNotes: "",
                    blocks: [{
                        id: `moved-${Date.now()}`,
                        title: `Movido de ${sourceDate}`,
                        content: contentToMove
                    }],
                    status: 'active'
                });
            }

            // 5. Update Source (Audit Trace, DO NOT DELETE)
            // Replace content with trace
            const traceMessage = `➡ [REGISTRO] Entrada movida al día ${targetDate} por ${user.email || user.displayName}.`;
            const updatedSourceProjects = entry.projects.map(p => {
                if (p.name === projectName) {
                    return {
                        ...p,
                        pmNotes: traceMessage,
                        blocks: [{ id: 'trace', title: 'Registro de Movimiento', content: traceMessage }],
                        // Optional: status: 'archived' ? User asked to "Follow it", so maybe keep active but empty.
                    };
                }
                return p;
            });

            const updatedSourceEntry = { ...entry, projects: updatedSourceProjects, updatedAt: new Date().toISOString() };

            // 6. Save BOTH
            await saveDailyStatus(targetEntry); // Save target first
            await saveDailyStatus(updatedSourceEntry); // Save source

            // 7. Refresh
            setEntry(updatedSourceEntry);
            showToast("Éxito", `Entrada movida al día ${targetDate}`, "success");
            setIsMoveModalOpen(false);
            setIsDirty(false); // Clean state

        } catch (e) {
            console.error("Move Error:", e);
            showToast("Error", "No se pudo mover la entrada", "error");
        } finally {
            setLoading(false);
        }
    };


    // 5. Helpers
    const getVisibleProjects = () => {
        const activeOnly = entry.projects.filter(p => p.status !== 'trash');

        // [FIX] Use RoleLevel for case-insensitive check (Global_pm vs global_pm)
        const currentLevel = getRoleLevel(userRole);
        if (currentLevel >= RoleLevel.PM) return activeOnly; // Admin/PM see all

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
        if (!isDirty) console.log(`[DailyFollowUp] Dirtying state due to field: ${field}`);
        setIsDirty(true); // [FIX] Mark as dirty
        if (activeTab === "General") {
            setEntry(prev => ({ ...prev, generalNotes: value }));
        } else {
            setEntry(prev => {
                const exists = prev.projects.some(p => p.name === activeTab);
                if (exists) {
                    return {
                        ...prev,
                        projects: prev.projects.map(p => p.name === activeTab ? { ...p, [field]: value } : p)
                    };
                } else {
                    const gp = globalProjects.find(g => g.name === activeTab);
                    return {
                        ...prev,
                        projects: [...prev.projects, {
                            name: activeTab,
                            projectId: gp?.id || "",
                            pmNotes: field === 'pmNotes' ? value : "",
                            conclusions: field === 'conclusions' ? value : "",
                            nextSteps: field === 'nextSteps' ? value : "",
                            status: 'active'
                        }]
                    };
                }
            });
        }
    };



    const getProjectBlocks = (projectName: string): ContentBlock[] => {
        if (projectName === "General") return []; // General only supports flat notes for now
        const target = projectName.trim().toLowerCase();
        const p = entry.projects.find(p => (p.name || "").trim().toLowerCase() === target);
        if (!p) return [];

        // If no blocks, create a default one merging PM Notes, Conclusions and Next Steps (for legacy data)
        if (!p.blocks || p.blocks.length === 0) {
            let combinedContent = p.pmNotes || "";
            if (p.conclusions && p.conclusions.trim()) {
                combinedContent += `\n\n### ${t('follow_up.conclusions') || 'Conclusiones'}\n${p.conclusions}`;
            }
            if (p.nextSteps && p.nextSteps.trim()) {
                combinedContent += `\n\n### ${t('follow_up.next_steps') || 'Próximos Pasos'}\n${p.nextSteps}`;
            }
            return [{ id: 'default', title: 'Notas Principales', content: combinedContent, isCollapsed: false }];
        }

        return p.blocks;
    };

    const handleToggleBlockCollapse = (projectName: string, blockId: string) => {
        if (projectName === "General") return;
        setEntry(prev => ({
            ...prev,
            projects: prev.projects.map(p => {
                if (p.name !== projectName) return p;
                const currentBlocks = (p.blocks && p.blocks.length > 0)
                    ? [...p.blocks]
                    : [{ id: 'default', title: t('follow_up.block_title_placeholder'), content: p.pmNotes || "", isCollapsed: false }];

                const idx = currentBlocks.findIndex(b => b.id === blockId);
                if (idx !== -1) {
                    currentBlocks[idx] = { ...currentBlocks[idx], isCollapsed: !currentBlocks[idx].isCollapsed };
                }
                return { ...p, blocks: currentBlocks };
            })
        }));
    };

    const handleBlockUpdate = (projectName: string, blockId: string, field: 'title' | 'content', value: string) => {
        if (projectName === "General") return; // Not supported on General yet

        setIsDirty(true); // [FIX] Mark as dirty

        setEntry(prev => {
            const exists = prev.projects.some(p => p.name === projectName);
            let targetProjects = [...prev.projects];

            if (!exists) {
                const gp = globalProjects.find(g => g.name === projectName);
                targetProjects.push({
                    name: projectName,
                    projectId: gp?.id || "",
                    pmNotes: "",
                    conclusions: "",
                    nextSteps: "",
                    status: 'active',
                    blocks: []
                });
            }

            return {
                ...prev,
                projects: targetProjects.map(p => {
                    if (p.name !== projectName) return p;

                    // 1. Get ready state
                    const currentBlocks = (p.blocks && p.blocks.length > 0)
                        ? [...p.blocks]
                        : [{ id: 'default', title: t('follow_up.block_title_placeholder'), content: p.pmNotes || "", isCollapsed: false }];

                    // 2. Update
                    const idx = currentBlocks.findIndex(b => b.id === blockId);
                    if (idx !== -1) {
                        currentBlocks[idx] = { ...currentBlocks[idx], [field]: value };
                    }

                    // 3. Sync Legacy (First block -> pmNotes)
                    const legacySync = currentBlocks.length > 0 ? currentBlocks[0].content : "";

                    return { ...p, blocks: currentBlocks, pmNotes: legacySync };
                })
            };
        });
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
                    : [{ id: 'default', title: t('follow_up.block_title_placeholder'), content: p.pmNotes || "", isCollapsed: false }];

                // Collapse existing blocks to make room for the new one
                const collapsedBlocks = currentBlocks.map(b => ({ ...b, isCollapsed: true }));

                const newBlock: ContentBlock = {
                    id: Date.now().toString(),
                    title: '',
                    content: '',
                    isCollapsed: false
                };

                const updatedBlocks = [...collapsedBlocks, newBlock];
                const legacySync = updatedBlocks[0]?.content || "";

                return { ...p, blocks: updatedBlocks, pmNotes: legacySync };
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
                    : [{ id: 'default', title: t('follow_up.block_title_placeholder'), content: p.pmNotes || "", isCollapsed: false }];

                currentBlocks = currentBlocks.filter(b => b.id !== blockId);

                // Ensure at least one block exists or clear
                const legacySync = currentBlocks.length > 0 ? currentBlocks[0].content : "";

                return { ...p, blocks: currentBlocks, pmNotes: legacySync };
            })
        }));
    };

    const getAvailableProjectsToAdd = () => {
        let pool = globalProjects;
        console.log("DEBUG: projects pool size:", pool.length);
        if (userRole !== 'superadmin' && userRole !== 'app_admin' && userRole !== 'global_pm') {
            const assignedIds = userProfile?.assignedProjectIds || [];
            pool = pool.filter(p => assignedIds.includes(p.id));
        }
        const final = pool.filter(gp => !entry.projects.some(ep => ep.name === gp.name && ep.status !== 'trash'));
        console.log("DEBUG: available to add:", final.length);
        return final;
    };

    // --- RENDER BLOCKER ---
    if (!isHydrated || authLoading || !viewMode) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black text-white flex-col gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-[#D32F2F]" />
                <div className="text-[10px] font-mono uppercase tracking-widest animate-pulse opacity-50">
                    {!isHydrated ? "Sincronizando Interfaz..." : "Verificando Credenciales..."}
                </div>
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
                            if (!name) {
                                showToast("Error", "El nombre es requerido", "error");
                                return;
                            }
                            if (password !== confirmPassword) {
                                showToast("Error", "Las contraseñas no coinciden", "error");
                                return;
                            }
                            if (password.length < 6) {
                                showToast("Error", "La contraseña debe tener al menos 6 caracteres", "error");
                                return;
                            }

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
                        <div className="flex justify-end mt-1">
                            <Link href="/forgot-password" className="text-xs text-zinc-500 hover:text-white transition-colors">
                                ¿Olvidaste tu contraseña?
                            </Link>
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
                </div >
                {userRole === 'superadmin' && <FirebaseDiagnostic />}
            </div >
        );
    }

    return (
        <>
            <AppLayout
                viewMode={viewMode}
                onViewChange={setViewMode}
                onOpenChangelog={() => setShowChangelog(true)}
            >
                {/* Tenant Missing Warning Banner */}
                {user && !tenantId && (
                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-3 mx-4 mt-2 rounded-lg flex items-center gap-3 animate-in fade-in">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-amber-400">⚠️ No Tenant Assigned</p>
                            <p className="text-xs text-amber-300/80">
                                Your account does not have a <strong>Tenant</strong> assigned. This may cause permission errors.
                                Contact an administrator to be assigned to a tenant.
                            </p>
                            <p className="text-[10px] text-amber-500/60 mt-1 font-mono">
                                UID: {user.uid} | Role: {userRole || 'unknown'} | TenantId: {tenantId || 'null'}
                            </p>
                        </div>
                    </div>
                )}
                <div className="flex h-full gap-6 p-4 pt-2">

                    {/* LEFT SIDEBAR: Timeline (Vertical List) */}
                    {viewMode === 'editor' && (
                        <div className="w-72 flex flex-col gap-3 shrink-0">
                            <div className="bg-card rounded-xl border border-border p-3 flex flex-col gap-2 h-full">
                                <div className="flex items-center justify-between px-1 mb-2">
                                    <h3 className={cn("text-xs font-bold uppercase tracking-wider", isLight ? "text-zinc-900" : "text-white")}>Timeline</h3>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setCurrentDate(new Date())} className={cn("text-[10px] font-bold hover:underline", isLight ? "text-red-600" : "text-white")}>HOY</button>
                                        <div className="relative">
                                            <button
                                                onClick={() => (document.getElementById('timeline-date-picker') as HTMLInputElement)?.showPicker()}
                                                className={cn("transition-colors", isLight ? "text-zinc-600 hover:text-zinc-900" : "text-white hover:text-zinc-300")}
                                                title="Buscar fecha anterior"
                                            >
                                                <CalendarPlus className="w-4 h-4" />
                                            </button>
                                            <input
                                                id="timeline-date-picker"
                                                type="date"
                                                className="absolute top-0 right-0 opacity-0 w-0 h-0"
                                                value={format(currentDate, 'yyyy-MM-dd')}
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        const [y, m, d] = e.target.value.split('-').map(Number);
                                                        setCurrentDate(new Date(y, m - 1, d));
                                                    }
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
                                            .filter(e => {
                                                // 1. Basic Filter
                                                const hasActiveProjects = e.projects.some(p =>
                                                    p.status !== 'trash' &&
                                                    (!allowedProjectNames || allowedProjectNames.has(p.name))
                                                );
                                                if (!hasActiveProjects) return false;

                                                // 2. Search Filter
                                                if (searchQuery) {
                                                    const lowerQ = searchQuery.toLowerCase();
                                                    if (activeTab === 'General') {
                                                        return e.generalNotes?.toLowerCase().includes(lowerQ);
                                                    } else {
                                                        const proj = e.projects.find(p => p.name === activeTab);
                                                        if (!proj) return false;
                                                        return proj.blocks?.some(b =>
                                                            (b.title?.toLowerCase().includes(lowerQ)) ||
                                                            (b.content?.toLowerCase().includes(lowerQ))
                                                        ) || false;
                                                    }
                                                }
                                                return true;
                                            })
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
                                                            ? "bg-primary/10 text-primary-foreground shadow-sm border-primary/50 ring-1 ring-primary/20"
                                                            : hasData
                                                                ? "bg-muted/50 border-transparent hover:bg-muted text-foreground"
                                                                : "bg-transparent border-transparent hover:bg-muted/30 text-muted-foreground opacity-70 hover:opacity-100"
                                                    )}
                                                >
                                                    {/* Day Number */}
                                                    <div className={cn(
                                                        "flex flex-col items-center justify-center w-9 h-9 rounded-md font-mono leading-none shrink-0 transition-colors",
                                                        isSelected ? "bg-indigo-600 text-white font-bold" :
                                                            isToday ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20" :
                                                                (isLight ? "bg-zinc-200 text-zinc-900 font-bold" : "bg-white/10 text-white font-bold")
                                                    )}>
                                                        <span className="text-sm">{format(dateObj, 'd')}</span>
                                                    </div>

                                                    {/* Date Info */}
                                                    <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                                                        <div className="flex justify-between items-baseline">
                                                            <span className={cn("text-xs font-medium uppercase tracking-wide",
                                                                isSelected
                                                                    ? "text-primary-foreground font-bold"
                                                                    : (isLight ? "text-zinc-700 group-hover:text-zinc-900" : "text-zinc-100 group-hover:text-white")
                                                            )}>
                                                                {format(dateObj, 'MMMM', { locale: currentLocale })}
                                                            </span>
                                                            <span className={cn("text-[9px]",
                                                                isSelected
                                                                    ? "text-primary-foreground/80"
                                                                    : (isLight ? "text-zinc-500" : "text-white")
                                                            )}>{format(dateObj, 'EEE', { locale: currentLocale })}</span>
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
                    <div className="flex-1 flex flex-col min-w-0 h-full relative bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                        {viewMode === 'editor' ? (
                            <div className="h-full flex flex-col">
                                {/* Header */}
                                <div className={cn("h-14 border-b flex items-center justify-between px-6 transition-colors",
                                    isLight
                                        ? "bg-zinc-50 border-zinc-200"
                                        : "bg-white/5 border-white/5"
                                )}>
                                    <div className="flex items-center gap-4">
                                        <h2 className={cn("text-lg font-medium flex items-center gap-3", isLight ? "text-zinc-900" : "text-white")}>
                                            <Calendar className={cn("w-5 h-5", isLight ? "text-red-600" : "text-white")} />
                                            <span className="capitalize">{format(currentDate, "EEEE, d 'de' MMMM", { locale: currentLocale })}</span>
                                        </h2>

                                        {/* SEARCH BAR REMOVED */}

                                        {userRole === 'superadmin' && (
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const tid = tenantId || "1";
                                                        const did = format(currentDate, 'yyyy-MM-dd');
                                                        const target = `${tid}_${did}`;
                                                        alert(`Attempting read: ${target}`);
                                                        const snap = await getDoc(doc(db, "journal_entries", target));
                                                        alert(`Result: Exists=${snap.exists()}, Data=${JSON.stringify(snap.data())}`);
                                                    } catch (e: any) {
                                                        alert(`Error Lectura: ${e.message} code=${e.code}`);
                                                    }
                                                }}
                                                className="ml-4 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded"
                                            >
                                                TEST READ
                                            </button>
                                        )}
                                        {loading && <Loader2 className={cn("w-4 h-4 animate-spin", isLight ? "text-zinc-400" : "text-zinc-500")} />}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2">
                                            {/* --- HEADER ACTIONS --- */}

                                            {/* 1. TASKS TOGGLE */}
                                            <button
                                                onClick={() => setIsTasksPanelVisible(!isTasksPanelVisible)}
                                                className={cn("flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-[10px] font-bold shadow-sm",
                                                    isLight
                                                        ? (isTasksPanelVisible
                                                            ? "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200"
                                                            : "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100")
                                                        : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                                                )}
                                                title={isTasksPanelVisible ? t('follow_up.hide_tasks') : t('follow_up.view_tasks')}
                                            >
                                                <ListTodo className="w-3 h-3" />
                                                {isTasksPanelVisible ? t('follow_up.hide') : t('follow_up.tasks')}
                                            </button>

                                            {/* 2. SCAN PDF */}
                                            <div>
                                                <input
                                                    type="file"
                                                    accept="application/pdf"
                                                    className="hidden"
                                                    id="daily-pdf-scan-header"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        setSaving(true);
                                                        showToast("UniTask AI", "Leyendo documento...", "info");
                                                        try {
                                                            const reader = new FileReader();
                                                            reader.onload = async () => {
                                                                const base64String = (reader.result as string).split(',')[1];

                                                                // [FIX] Add Auth Token
                                                                const token = await user?.getIdToken();
                                                                if (!token) {
                                                                    showToast("Error", "Not authenticated", "error");
                                                                    setSaving(false);
                                                                    return;
                                                                }

                                                                const res = await fetch('/api/analyze-pdf', {
                                                                    method: 'POST',
                                                                    headers: {
                                                                        'Content-Type': 'application/json',
                                                                        'Authorization': `Bearer ${token}`
                                                                    },
                                                                    body: JSON.stringify({ base64Data: base64String })
                                                                });
                                                                const json = await res.json();

                                                                if (json.success && json.data) {
                                                                    const { title, description, action_items, endDate, full_content } = json.data;
                                                                    const md = `\n\n### 📄 ${title || 'Scanned Document'}\n\n${full_content || '(No text could be extracted)'}\n`;

                                                                    if (activeTab === 'General') {
                                                                        setEntry(prev => ({ ...prev, generalNotes: (prev.generalNotes || "") + md }));
                                                                    } else {
                                                                        const newBlock: ContentBlock = {
                                                                            id: crypto.randomUUID(),
                                                                            title: title || "PDF Summary",
                                                                            content: md,
                                                                            type: 'notes'
                                                                        };
                                                                        setEntry(prev => {
                                                                            const exists = prev.projects.some(p => p.name === activeTab);
                                                                            if (exists) {
                                                                                return {
                                                                                    ...prev,
                                                                                    projects: prev.projects.map(p =>
                                                                                        p.name === activeTab
                                                                                            ? { ...p, blocks: [...(p.blocks || []), newBlock] }
                                                                                            : p
                                                                                    )
                                                                                };
                                                                            } else {
                                                                                // Create new project entry if it doesn't exist for this day
                                                                                const gp = globalProjects.find(g => g.name === activeTab);
                                                                                return {
                                                                                    ...prev,
                                                                                    projects: [...prev.projects, {
                                                                                        name: activeTab,
                                                                                        projectId: gp?.id || "",
                                                                                        pmNotes: "",
                                                                                        conclusions: "",
                                                                                        nextSteps: "",
                                                                                        blocks: [newBlock],
                                                                                        status: 'active'
                                                                                    }]
                                                                                };
                                                                            }
                                                                        });
                                                                        setIsDirty(true); // Mark state as dirty after scan results arrive
                                                                    }
                                                                    setAiSummary(description || "Sin resumen disponible");
                                                                    setAiSuggestions(action_items || []);
                                                                    setIsTasksPanelVisible(true); // Auto-open panel
                                                                    showToast("UniTask AI", "Documento leído.", "success");
                                                                } else {
                                                                    console.error(json);
                                                                    showToast("Error", `Fallo al procesar: ${json.error}`, "error");
                                                                }
                                                                setSaving(false);
                                                            };


                                                            reader.readAsDataURL(file);
                                                        } catch (err) { console.error(err); showToast("Error", "Fallo al procesar", "error"); setSaving(false); }
                                                        e.target.value = "";
                                                    }}
                                                />
                                                <label htmlFor="daily-pdf-scan-header" className={cn("cursor-pointer flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-[10px] font-bold shadow-sm", isLight ? "bg-sky-50 text-sky-600 border-sky-100 hover:bg-sky-100" : "bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/20")} title={t('follow_up.scan_pdf')}>
                                                    <Sparkles className="w-3 h-3" /> {t('follow_up.scan')}
                                                </label>
                                            </div>

                                            {/* 3. MOVE (PM+ only) */}
                                            {activeTab !== 'General' && getRoleLevel(userRole) >= RoleLevel.PM && (
                                                <button
                                                    onClick={handleInitMove}
                                                    className={cn("flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-[10px] font-bold shadow-sm",
                                                        isLight
                                                            ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                                                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                                    )}
                                                    title={t('follow_up.move_notes')}
                                                >
                                                    <ArrowRight className="w-3 h-3" />
                                                    {t('follow_up.move')}
                                                </button>
                                            )}

                                            <div className="w-px h-6 bg-border mx-1" />

                                            {/* 4. SAVE (Unified Style) */}
                                            <button
                                                onClick={handleSave}
                                                disabled={saving}
                                                className={cn("flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full border transition-all text-[10px] font-bold shadow-sm",
                                                    isLight
                                                        ? "bg-zinc-900 text-white border-zinc-900 hover:bg-black hover:scale-105 active:scale-95"
                                                        : "bg-white text-black border-white hover:bg-zinc-200 hover:scale-105 active:scale-95"
                                                )}
                                            >
                                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                {t('common.save')}
                                            </button>

                                            {isDirty && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse ml-1" title="Cambios sin guardar" />
                                            )}

                                            <button
                                                onClick={() => {
                                                    window.onbeforeunload = null;
                                                    showToast("Debug", "Warning Disabled", "info");
                                                }}
                                                className="w-1.5 h-1.5 rounded-full bg-red-900/10 hover:bg-red-500 transition-colors ml-1"
                                                title="Debug: Kill Warning"
                                            />

                                            {/* DIAGNOSTIC BUTTON REMOVED */}{" "}
                                            {/* Add Project Button State */}
                                            {/* We need a local state for the dropdown, but we are in a map... wait, this is the header, outside map */}
                                        </div>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className={cn("flex items-center gap-1 p-2 border-b overflow-visible relative z-40 transition-colors",
                                    isLight ? "bg-white border-zinc-200" : "bg-muted/20 border-border"
                                )}>
                                    {getVisibleProjects().map(p => {
                                        const gp = globalProjects.find(g => g.name === p.name);
                                        return (
                                            <button
                                                key={p.name}
                                                onClick={() => setActiveTab(p.name)}
                                                className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 shrink-0 border",
                                                    activeTab === p.name
                                                        ? (isLight
                                                            ? "bg-zinc-900 border-zinc-900 text-white shadow-sm"
                                                            : "bg-zinc-800 border-zinc-700 text-white shadow-sm ring-1 ring-white/10")
                                                        : (isLight
                                                            ? "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                                            : "bg-transparent border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200")
                                                )}
                                            >
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: gp?.color || '#71717a' }} />
                                                {p.name || "Sin Nombre"}
                                            </button>
                                        );
                                    })}

                                    <div className="relative ml-2 z-50">
                                        {userRole === 'superadmin' && (
                                            <button
                                                onClick={handlePrint}
                                                disabled={isGeneratingPDF}
                                                className={cn("flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-bold transition-all mr-2",
                                                    isLight
                                                        ? "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900"
                                                        : "bg-zinc-800 text-zinc-300 border-zinc-700/50 hover:bg-zinc-700 hover:text-white"
                                                )}>
                                                {isGeneratingPDF ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <Printer className="w-3.5 h-3.5" />
                                                )}
                                                {isGeneratingPDF ? t('follow_up.generating') : t('follow_up.print')}
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setIsAddProjectOpen(!isAddProjectOpen)}
                                            className={cn("flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-bold transition-all",
                                                isLight
                                                    ? "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900 hover:border-zinc-300"
                                                    : "bg-zinc-800 text-zinc-300 border-zinc-700/50 hover:bg-zinc-700 hover:text-white"
                                            )}>
                                            <Plus className="w-3.5 h-3.5" /> {t('follow_up.add_project')}
                                        </button>

                                        {isAddProjectOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setIsAddProjectOpen(false)} />
                                                <div className="absolute top-full left-0 mt-1 w-64 bg-[#18181b] border border-zinc-800 rounded-xl shadow-2xl p-2 max-h-64 overflow-y-auto custom-scrollbar z-50 ring-1 ring-white/10">
                                                    <div className="text-[10px] font-bold text-muted-foreground px-2 py-1 uppercase">Disponibles ({getAvailableProjectsToAdd().length})</div>
                                                    {getAvailableProjectsToAdd().map(gp => (
                                                        <button
                                                            key={gp.id}
                                                            onClick={() => {
                                                                addProject(gp);
                                                                setIsAddProjectOpen(false);
                                                            }}
                                                            className="w-full text-left px-2 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg flex items-center gap-2 transition-colors"
                                                        >
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: gp.color || '#71717a' }} />
                                                            {gp.name}
                                                        </button>
                                                    ))}
                                                    {getAvailableProjectsToAdd().length === 0 && (
                                                        <div className="text-xs text-zinc-500 px-2 py-2 italic text-center">No hay más proyectos disponibles</div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Content Editor */}
                                <div className="flex-1 p-6 overflow-y-auto mb-10 relative z-0">
                                    <div className={cn("grid gap-6 h-full transition-all duration-300",
                                        isTasksPanelVisible ? "grid-cols-1 lg:grid-cols-[1.5fr_1fr]" : "grid-cols-1"
                                    )}>
                                        {/* Left: PM Notes (Blocks) */}
                                        <div className="flex flex-col gap-4 h-full pr-2 overflow-y-auto custom-scrollbar">
                                            <div className="flex justify-between items-center w-full mb-2">
                                                <div className="flex items-center gap-3">
                                                    <label className={cn("text-xs font-bold uppercase flex items-center gap-2 shrink-0", isLight ? "text-zinc-900" : "text-white")}>
                                                        <PenSquare className="w-3 h-3" />
                                                        {activeTab === 'General'
                                                            ? t('follow_up.general_notes')
                                                            : `${t('follow_up.minute')}: ${globalProjects.find(p => p.name === activeTab)?.code || activeTab.slice(0, 4)}`
                                                        }
                                                    </label>
                                                </div>
                                            </div>



                                            {activeTab === 'General' ? (
                                                <textarea
                                                    value={getCurrentData().pmNotes}
                                                    onChange={(e) => updateCurrentData("generalNotes", e.target.value)}
                                                    className={cn("flex-1 border rounded-xl p-4 text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/50 resize-none leading-relaxed custom-scrollbar min-h-[300px]",
                                                        isLight
                                                            ? "bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
                                                            : "bg-white/5 border-white/10 text-zinc-200 placeholder:text-zinc-500"
                                                    )}
                                                    placeholder={t('follow_up.today_summary')}
                                                />
                                            ) : (
                                                <div className="flex-1 flex flex-col gap-4 min-h-0">
                                                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-1">
                                                        {getProjectBlocks(activeTab).map((block, idx) => (
                                                            <div key={block.id} className={cn("border rounded-xl p-3 flex flex-col gap-2 group relative transition-all duration-300",
                                                                isLight
                                                                    ? "bg-white border-zinc-200 hover:border-zinc-300"
                                                                    : "bg-white/5 border-white/10 hover:border-white/20",
                                                                block.isCollapsed ? "h-fit bg-zinc-500/5 opacity-60" : "flex-1 min-h-[250px] shadow-sm"
                                                            )}>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => handleToggleBlockCollapse(activeTab, block.id)}
                                                                        className={cn("p-1 rounded-md transition-transform duration-200", isLight ? "hover:bg-zinc-100" : "hover:bg-white/10", block.isCollapsed ? "-rotate-90" : "rotate-0")}
                                                                    >
                                                                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                                                                    </button>
                                                                    <input
                                                                        className={cn("bg-transparent text-xs font-bold focus:outline-none w-full", isLight ? "text-zinc-900 placeholder:text-zinc-400" : "text-white placeholder:text-zinc-500")}
                                                                        value={block.title || `Bloque ${idx + 1}`}
                                                                        onChange={(e) => handleBlockUpdate(activeTab, block.id, 'title', e.target.value)}
                                                                        placeholder={t('follow_up.block_title_placeholder')}
                                                                    />
                                                                    {!block.isCollapsed && (
                                                                        <button
                                                                            onClick={() => handleAI(block.content, `Bloque específico: ${block.title}`)}
                                                                            className={cn("transition-opacity", isLight ? "text-zinc-400 hover:text-zinc-800" : "text-zinc-400 hover:text-white")}
                                                                            title="Analizar solo este bloque"
                                                                        >
                                                                            <Sparkles className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}
                                                                    {getProjectBlocks(activeTab).length > 1 && (
                                                                        <button
                                                                            onClick={() => handleRemoveBlock(activeTab, block.id)}
                                                                            className="text-zinc-400 hover:text-red-400 transition-opacity"
                                                                            title="Eliminar bloque"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {!block.isCollapsed && (
                                                                    <textarea
                                                                        value={block.content}
                                                                        onChange={(e) => handleBlockUpdate(activeTab, block.id, 'content', e.target.value)}
                                                                        className={cn("w-full flex-1 bg-transparent text-sm focus:outline-none resize-none leading-relaxed custom-scrollbar",
                                                                            isLight ? "text-zinc-900 placeholder:text-zinc-400" : "text-zinc-300 placeholder:text-zinc-600"
                                                                        )}
                                                                        placeholder={t('follow_up.block_content_placeholder')}
                                                                    />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <button
                                                        onClick={() => handleAddBlock(activeTab)}
                                                        className={cn("mt-auto flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-xl transition-all text-xs font-bold shrink-0",
                                                            isLight
                                                                ? "border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50"
                                                                : "border-border text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5"
                                                        )}
                                                    >
                                                        <Plus className="w-4 h-4" /> {t('follow_up.add_note_block')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right: Active Tasks & AI */}
                                        {isTasksPanelVisible && (
                                            <div className="flex flex-col gap-2 h-full border-l border-border pl-6">
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className={cn("text-xs font-bold uppercase flex items-center gap-2", isLight ? "text-zinc-900" : "text-white")}>
                                                        <ListTodo className={cn("w-3 h-3", isLight ? "text-zinc-900" : "text-white")} />
                                                        {activeTab === 'General' ? t('follow_up.all_active_tasks') : `${t('follow_up.active_tasks')}: ${activeTab}`}
                                                    </label>
                                                    <button
                                                        onClick={() => handleAI()}
                                                        disabled={isAILoading}
                                                        className="text-[10px] bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                                                        title="Analizar notas y extraer tareas"
                                                    >
                                                        {isAILoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                        {t('follow_up.extract_tasks')}
                                                    </button>
                                                </div>

                                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">

                                                    {/* MANUAL ENTRY */}
                                                    <div className={cn("flex items-center gap-2 mb-4 p-2 rounded-lg border transition-colors",
                                                        isLight
                                                            ? "bg-white border-zinc-200 focus-within:border-zinc-400"
                                                            : "bg-muted/40 border-border focus-within:border-primary/50"
                                                    )}>
                                                        <input
                                                            type="text"
                                                            value={newTaskText}
                                                            onChange={(e) => setNewTaskText(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleManualAddTask(false)}
                                                            placeholder={t('follow_up.new_manual_task')}
                                                            className={cn("flex-1 bg-transparent text-xs focus:outline-none", isLight ? "text-zinc-900 placeholder:text-zinc-400" : "text-white placeholder:text-zinc-400")}
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
                                                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-3 relative overflow-hidden mb-4">
                                                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/50" />

                                                            {/* Summary */}
                                                            {aiSummary && (
                                                                <div className="mb-2">
                                                                    <h4 className="text-[10px] font-bold text-primary uppercase mb-1 flex items-center gap-1">
                                                                        <Activity className="w-3 h-3" /> {t('follow_up.summary_context')}
                                                                    </h4>
                                                                    <p className="text-xs text-primary/80 leading-relaxed italic">
                                                                        "{aiSummary}"
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {/* Suggestions List */}
                                                            {aiSuggestions.length > 0 && (
                                                                <div>
                                                                    <h4 className="text-[10px] font-bold text-primary uppercase mb-2">{t('follow_up.suggestions')} ({aiSuggestions.length})</h4>
                                                                    <div className="space-y-1">
                                                                        {aiSuggestions.map((sugg, idx) => (
                                                                            <div key={idx} className="flex gap-2 items-start bg-card p-2 rounded border border-primary/10">
                                                                                <p className="text-xs text-foreground flex-1">{sugg}</p>
                                                                                <div className="flex flex-col gap-1">
                                                                                    <button
                                                                                        onClick={() => handleAcceptSuggestion(sugg, false)}
                                                                                        className="p-1 hover:bg-green-500/20 text-green-500 rounded"
                                                                                        title={t('follow_up.create_task')}
                                                                                    >
                                                                                        <Plus className="w-3 h-3" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleAcceptSuggestion(sugg, true)}
                                                                                        className="p-1 hover:bg-red-500/20 text-red-500 rounded"
                                                                                        title={t('follow_up.create_blocker')}
                                                                                    >
                                                                                        <AlertTriangle className="w-3 h-3" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleDismissSuggestion(sugg)}
                                                                                        className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
                                                                                        title={t('follow_up.dismiss')}
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
                                                                className="w-full text-[9px] text-center text-primary/50 hover:text-primary py-1 hover:underline"
                                                            >
                                                                {t('follow_up.close_suggestions')}
                                                            </button>
                                                        </div>
                                                    )}

                                                    {visibleTasks.length === 0 ? (
                                                        <div className="text-center py-10 text-muted-foreground italic border border-dashed border-border rounded-lg">
                                                            {t('follow_up.no_tasks_active')}
                                                        </div>
                                                    ) : (
                                                        visibleTasks.filter(t => t.status !== 'completed').map(task => (
                                                            <div
                                                                key={task.id}
                                                                className={cn(
                                                                    "group p-3 rounded-lg border transition-all relative",
                                                                    task.isBlocking
                                                                        ? "bg-destructive/10 border-destructive/20 hover:bg-destructive/10"
                                                                        : (isLight
                                                                            ? "bg-white border-zinc-200 hover:border-red-200 hover:shadow-sm"
                                                                            : "bg-card border-border hover:border-primary/20 hover:bg-muted/50")
                                                                )}
                                                            >
                                                                <div className="flex justify-between items-start gap-3">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="font-mono text-[9px] text-zinc-300/80 bg-white/10 px-1.5 py-0.5 rounded">
                                                                                {task.friendlyId || 'TSK'}
                                                                            </span>
                                                                            {task.isBlocking && (
                                                                                <span className="text-[9px] font-bold text-red-500 bg-red-950/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                                    <AlertTriangle className="w-2.5 h-2.5" /> {t('follow_up.blocker')}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className={cn(
                                                                            "text-xs leading-relaxed line-clamp-3",
                                                                            task.isBlocking
                                                                                ? "text-red-200"
                                                                                : (isLight ? "text-zinc-900" : "text-zinc-200")
                                                                        )}>
                                                                            {task.description}
                                                                        </p>
                                                                    </div>

                                                                    {/* Actions */}
                                                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={() => handleToggleBlock(task)}
                                                                            title={task.isBlocking ? t('follow_up.unblock') : t('follow_up.block_task')}
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
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : viewMode === 'projects' ? (
                            <ProjectManagement autoFocusCreate={shouldCreateProject} />
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
                            <TaskManagement initialTaskId={pendingTaskId || searchParams.get('taskId')} />
                        ) : viewMode === 'users' ? (
                            <UserManagement />
                        ) : viewMode === 'user-roles' ? (
                            <UserRoleManagement />
                        ) : viewMode === 'tenant-management' ? (
                            <TenantManagement />
                        ) : viewMode === 'dashboard' ? (
                            <Dashboard
                                entry={entry}
                                globalProjects={globalProjects}
                                userProfile={userProfile}
                                userRole={userRole}
                            />
                        ) : viewMode === 'admin-task-master' ? (
                            <TaskMasterDataManagement />
                        ) : viewMode === 'reports' ? (
                            <ReportManagement />
                        ) : viewMode === 'support-management' ? (
                            <SupportManagement />
                        ) : viewMode === 'user-manual' ? (
                            <ManualViewer />
                        ) : (
                            <div className="p-10 text-center text-zinc-500">{t('common.under_construction')} {viewMode}</div>
                        )}
                    </div>
                </div>

                <ChangelogModal
                    isOpen={showChangelog}
                    onClose={() => setShowChangelog(false)}
                />

                {/* MOVE MODAL */}
                {
                    isMoveModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <div className={cn("w-full max-w-sm p-6 rounded-xl shadow-2xl border", isLight ? "bg-white border-zinc-200" : "bg-zinc-900 border-zinc-700")}>
                                <h3 className={cn("text-lg font-bold mb-4", isLight ? "text-zinc-900" : "text-white")}>{t('follow_up.move_entry')}</h3>
                                <p className={cn("text-sm mb-4", isLight ? "text-zinc-600" : "text-zinc-400")}>
                                    {t('follow_up.move_notes_from')} <strong>{activeTab}</strong> {t('follow_up.to_date')}
                                </p>

                                <input
                                    type="date"
                                    value={moveTargetDate}
                                    onChange={(e) => setMoveTargetDate(e.target.value)}
                                    className={cn("w-full p-2 rounded-lg border mb-4 text-sm",
                                        isLight
                                            ? "bg-zinc-50 border-zinc-200 text-zinc-900 focus:ring-zinc-500"
                                            : "bg-black/20 border-zinc-700 text-white focus:ring-primary"
                                    )}
                                />

                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setIsMoveModalOpen(false)}
                                        className={cn("px-4 py-2 rounded-lg text-xs font-medium", isLight ? "hover:bg-zinc-100 text-zinc-600" : "hover:bg-white/10 text-zinc-400")}
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        onClick={handleMoveProject}
                                        disabled={loading || !moveTargetDate}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2"
                                    >
                                        {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                                        {t('follow_up.confirm_move')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </AppLayout >
        </>
    );
}

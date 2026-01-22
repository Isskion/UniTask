"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import UserManagement from "./UserManagement";
import ProjectManagement from "./ProjectManagement";
import Dashboard from "./Dashboard";
import TaskDashboard from "./TaskDashboard";
import TaskList from "./TaskList";
import TaskManagement from "./TaskManagement";
import UserRoleManagement from "./UserRoleManagement";
import ReportManagement from "./reports/ReportManagement"; // Added ReportManagement
import SupportManagement from "./SupportManagement";
import TenantManagement from "./TenantManagement";
import TaskMasterDataManagement from "./TaskMasterDataManagement";
import { AppLayout } from "./AppLayout";
import ChangelogModal from "./ChangelogModal";
import ManualViewer from "./ManualViewer";
import { WeeklyEntry, ProjectEntry, RoleLevel, getRoleLevel, Project } from "@/types"; // [FIX] Added RoleLevel, getRoleLevel, Project
import { formatDateId, getWeekNumber, getYearNumber, cn } from "@/lib/utils";
import { startOfWeek, addWeeks, subWeeks, isSameDay, parseISO, format, startOfISOWeekYear, getISOWeekYear, addDays } from "date-fns";
import { enUS } from "date-fns/locale";
import { saveWeeklyEntry, getWeeklyEntry, getAllEntries } from "@/lib/storage";
import { auth, db } from "@/lib/firebase"; // Added db
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore"; // Added Firestore imports
import { Loader2, Save, Calendar, History, CheckCircle2, Plus, X, Layout, Search, Menu, Trash2, Users, RotateCcw, Sparkles, FolderGit2, Wand2, XCircle, ArrowRight, ListTodo, BarChart3, ChevronLeft, ChevronDown, PenSquare } from "lucide-react";
import { parseNotes } from "@/lib/smartParser";
import { useAuth } from "@/context/AuthContext";
import { useSafeFirestore } from '@/hooks/useSafeFirestore'; // Safe Hook
import { summarizeNotesWithAI, AISummaryResult } from "@/app/ai-actions";
import { useToast } from "@/context/ToastContext";

import ProjectActivityFeed from "./ProjectActivityFeed";
import TodaysWorkbench from "./TodaysWorkbench";
import { createTask } from "@/lib/tasks";
import { syncShadowProjects } from "@/lib/projects"; // Phase 2: Shadow Writes
import RichTextEditor from "@/components/RichTextEditor"; // Phase 4: Tiptap
import { useSearchParams } from "next/navigation";

// Helper for previous entry logic (moved from actions to here or storage)
// Note: organizationId should be passed from the component, defaulting to "1" for now
async function fetchPreviousEntryClient(currentId: string, tenantId: string = "1") {
    const all = await getAllEntries(tenantId);
    return all.find(e => e.id < currentId) || null;
}

async function fetchExistingIdsClient(tenantId: string = "1") {
    const all = await getAllEntries(tenantId);
    return all.map(e => e.id);
}

export default function WeeklyEditor() {
    const [showChangelog, setShowChangelog] = useState(false); // Added state
    const { userRole, user, loading: authLoading, tenantId, viewContext } = useAuth(); // [FIX] Added viewContext
    const { addDoc } = useSafeFirestore(); // Safe Hook
    const { showToast } = useToast();
    const [userProfile, setUserProfile] = useState<any>(null); // Store full user profile for assignments
    const [profileLoading, setProfileLoading] = useState(true); // Track potential fetch delay
    const [globalProjects, setGlobalProjects] = useState<Project[]>([]); // Cache for global projects (Full Type)
    const [weeklyProjectMap, setWeeklyProjectMap] = useState<Record<string, { code: string, color: string }[]>>({}); // WeekID -> Active Projects Codes

    // Always work with MONDAY as the anchor
    const [currentDate, setCurrentDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [existingIds, setExistingIds] = useState<Set<string>>(new Set());

    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<string>("General");
    const [newProjectName, setNewProjectName] = useState("");
    const [isAddingProject, setIsAddingProject] = useState(false);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void; destructive?: boolean } | null>(null);



    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'editor' | 'trash' | 'users' | 'projects' | 'dashboard' | 'tasks' | 'task-manager' | 'user-roles' | 'organization-management' | 'admin-task-master' | 'reports' | 'support-management' | 'user-manual'>('editor');
    const [isHydrated, setIsHydrated] = useState(false);



    // Hydration-safe initial load
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const view = params.get('view');

            // 1. URL Param Priority
            if (view === 'dashboard' || view === 'projects' || view === 'users' || view === 'trash' || view === 'tasks' || view === 'task-manager' || view === 'user-roles' || view === 'organization-management' || view === 'admin-task-master' || view === 'reports' || view === 'support-management' || view === 'user-manual') {
                setViewMode(view as any);
                setIsHydrated(true);
                return;
            }

            // 2. Local Storage Fallback
            const saved = localStorage.getItem('last_view_mode');
            if (saved === 'dashboard' || saved === 'projects' || saved === 'users' || saved === 'trash' || saved === 'tasks' || saved === 'task-manager' || saved === 'user-roles' || saved === 'organization-management' || saved === 'admin-task-master' || saved === 'reports' || saved === 'support-management' || saved === 'user-manual') {
                setViewMode(saved as any);
            }
            setIsHydrated(true);
        }
    }, [searchParams]);

    // Persist View Mode
    useEffect(() => {
        if (isHydrated && typeof window !== 'undefined') {
            localStorage.setItem('last_view_mode', viewMode);
        }
    }, [viewMode, isHydrated]);

    const [entry, setEntry] = useState<WeeklyEntry>({
        id: "",
        weekNumber: 0,
        year: 0,
        tenantId: tenantId || "1",
        pmNotes: "",
        conclusions: "",
        nextSteps: "",
        projects: [],
        createdAt: "",
    });

    const [previousEntry, setPreviousEntry] = useState<WeeklyEntry | null>(null);
    const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set());

    // AI Summary State
    const [isAILoading, setIsAILoading] = useState(false);
    const [aiResult, setAIResult] = useState<AISummaryResult | null>(null);
    const [showAIModal, setShowAIModal] = useState(false);

    // Effect: Sync Active Tab with URL Param (Command K Support)
    useEffect(() => {
        const projectParam = searchParams.get('project');
        if (projectParam && entry.projects.some(p => p.name === projectParam)) {
            setActiveTab(projectParam);
        }
    }, [searchParams, entry.projects]);

    // Fetch user profile and global projects
    useEffect(() => {
        if (!user?.uid) return;

        const loadInitData = async () => {
            // 1. Fetch Profile
            try {
                const snap = await getDoc(doc(db, "user_profiles", user.uid));
                if (snap.exists()) {
                    const profileData = snap.data();
                    setUserProfile(profileData);
                } else {
                    console.warn('[WeeklyEditor] No profile document found for user:', user.uid);
                }
            } catch (e) {
                console.error("Error fetching user profile", e);
            } finally {
                setProfileLoading(false);
            }

            // 2. Fetch Global Projects for mapping
            try {
                const q = query(collection(db, "projects"), where("tenantId", "==", tenantId));
                const snap = await getDocs(q);
                const loaded = snap.docs.map(d => ({
                    id: d.id,
                    ...d.data()
                })) as Project[];
                setGlobalProjects(loaded);
            } catch (e) {
                console.error("Error fetching global projects", e);
            }
        };

        setProfileLoading(true);
        loadInitData();
    }, [user, tenantId]); // [FIX] Re-run when tenantId changes (Masquerade)

    // Helper to cast Event to CustomEvent for TS
    const asAny = (fn: any) => fn as EventListener;

    // Separate effect to build the map when globalProjects or entries change would be ideal,
    // but simplified: fetch all entries, and for each, find the active projects.
    useEffect(() => {
        const buildMap = async () => {
            if (globalProjects.length === 0) return;

            const all = await getAllEntries(tenantId || "1");
            const newMap: Record<string, { code: string, color: string }[]> = {};

            all.forEach(e => {
                // Filter projects that are NOT trash
                const activeInWeek = e.projects?.filter(p => p.status !== 'trash') || [];

                const metaList = activeInWeek.map(p => {
                    // 1. Try match by ID if available (Reliable)
                    let gp = p.projectId ? globalProjects.find(g => g.id === p.projectId) : undefined;

                    // 2. Fallback: Match by Name (Legacy Support)
                    if (!gp) {
                        gp = globalProjects.find(g => g.name.toLowerCase().trim() === p.name.toLowerCase().trim());
                    }

                    if (gp) return { code: gp.code, color: gp.color || '#fbbf24' }; // default amber
                    return { code: p.name.substring(0, 3).toUpperCase(), color: '#71717a' }; // fallback gray
                });

                if (metaList.length > 0) {
                    newMap[e.id] = metaList;
                }
            });
            setWeeklyProjectMap(newMap);
        };
        buildMap();
    }, [globalProjects, entry]); // Rebuild when global projects load or we save a new entry (updating local cache)

    // ... (existing useEffects) ...

    const loadData = useCallback(async (id: string) => {
        setLoading(true);
        setCheckedTasks(new Set());

        // Ensure we are strictly on the Monday of that week
        const monday = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekNum = getWeekNumber(monday);
        const yearNum = getYearNumber(monday);

        const currentTenant = tenantId || "1";

        // Temporary reset to avoid ghosting while loading
        setEntry({
            id,
            weekNumber: weekNum,
            year: yearNum,
            tenantId: "1",
            pmNotes: "Loading...",
            conclusions: "Loading...",
            nextSteps: "Loading...",
            projects: [],
            createdAt: new Date().toISOString(),
        });

        try {
            const existing = await getWeeklyEntry(id);

            if (existing) {
                // Auto-repair 0 values from DB using the calculated date info
                setEntry({
                    ...existing,
                    projects: existing.projects || [],
                    weekNumber: existing.weekNumber || weekNum,
                    year: existing.year || yearNum,
                    tenantId: (existing as any).tenantId || tenantId || "1"
                });

                // Logic for Auto-Selecting Tab will move to Render or Effect to wait for userProfile
            } else {
                setEntry({
                    id,
                    weekNumber: weekNum,
                    year: yearNum,
                    tenantId: tenantId || "1",
                    pmNotes: "",
                    conclusions: "",
                    nextSteps: "",
                    projects: [],
                    createdAt: new Date().toISOString(),
                });
            }

            const prev = await fetchPreviousEntryClient(id, tenantId || "1");
            setPreviousEntry(prev);

            // Refresh existing IDs in case just saved
            fetchExistingIdsClient(tenantId || "1").then(ids => setExistingIds(new Set(ids)));
        } catch (error) {
            console.error("Error loading data:", error);
            showToast("UniTask", "Error loading data. Check your connection or permissions.", "error");
        } finally {
            setLoading(false);
            // setViewMode('editor'); // Don't reset view mode on data load, allow user to stay on Dashboard
        }
    }, [currentDate, tenantId]);

    // Filter Visible Projects based on Role/Assignment
    const getVisibleProjects = () => {
        // 1. Base filter: remove trashed
        const activeOnly = entry.projects.filter(p => p.status !== 'trash');

        // [FIX] Use Numeric Role for Robustness
        // Fallback to legacy getRoleLevel if viewContext is missing (e.g. initial load)
        // const currentLevel = viewContext?.activeRole ?? getRoleLevel(userRole); // userRole and viewContext removed from useAuth destructuring
        const currentLevel = getRoleLevel(userProfile?.role); // Assuming userProfile contains role

        // 2. logic: Admin (80) & Global PM (60) & Superadmin (100) see ALL
        if (currentLevel >= RoleLevel.PM) {
            return activeOnly;
        }

        // 3. If no user profile loaded yet => Empty (safe secure default)
        if (!userProfile) {
            return [];
        }

        // 4. User with assignments => Only assigned projects
        // Helper: Get list of ALLOWED project names from global map
        const allowedIds = userProfile.assignedProjectIds || [];
        const allowedNames = new Set(
            globalProjects
                .filter(gp => allowedIds.includes(gp.id))
                .map(gp => gp.name)
        );

        // Filter the weekly entry projects by this allow-list
        return activeOnly.filter(p => allowedNames.has(p.name));
    };

    const handleViewSwitch = (mode: 'editor' | 'dashboard' | 'projects' | 'users' | 'trash' | 'tasks' | 'task-manager' | 'user-roles' | 'organization-management' | 'admin-task-master' | 'reports' | 'support-management' | 'user-manual') => {
        setViewMode(mode);
        const url = new URL(window.location.href);
        if (mode === 'editor') {
            url.searchParams.delete('view');
        } else {
            url.searchParams.set('view', mode);
        }
        window.history.replaceState({}, '', url);
    };

    // When date changes implies a Monday shift, reload.
    // This effect MUST run whenever currentDate changes to keep UI in sync
    useEffect(() => {
        // Ensure we are viewing "General" or blank slate before loading new data
        setActiveTab("General");
        // [FIX] Namespace ID by Organization to prevent collision
        // Legacy (Organization 1) keeps simple date ID "2025-01-06"
        // Others get "4_2025-01-06"
        const monday = startOfWeek(currentDate, { weekStartsOn: 1 });
        const dateId = formatDateId(monday);
        const currentTenant = tenantId || "1";
        const id = currentTenant === "1" ? dateId : `${currentTenant}_${dateId}`;
        loadData(id);
    }, [currentDate, loadData, tenantId]);

    // Auto-select first project if we are on "General" (which is hidden) or an invalid tab
    useEffect(() => {
        if (loading) return;

        const visible = getVisibleProjects();
        // If we have no projects, we stay on General (or empty state)
        if (visible.length === 0) {
            setActiveTab("General");
            return;
        }

        const currentIsValid = visible.some(p => p.name === activeTab);

        // LOGIC CHANGE:
        // If the current tab ("Project A") is NOT in the new week's visible projects,
        // we MUST switch.
        // If "General" is selected, we usually Keep General, UNLESS the user wants "Put focus on first project".
        // User Request: "si al cambia de dia se pone foco en el primer proyeto abierto"
        // This implies if I have projects, I should see the first one, not General?
        // Or "General" IS the general view?
        // Let's assume: If "General" is selected, stay on General?
        // NO, User said: "pone foco en el primer proyeto abierto". This suggests skipping General if projects exist?
        // BUT "General" is valid.
        // Let's interpret: If currentIsValid => Stay (e.g. Project A exists in both days).
        // If !currentIsValid => Switch to visible[0].

        // User Complaint: "se quedan las tareas de la ultima fiche que haya abierto." indicates GHOSTING.
        // This means the UI showed Project A's tasks from Yesterday even though Project A doesn't exist Today?
        // That's a `currentIsValid` check failure.

        if (!currentIsValid) {
            // If activeTab is NOT in this week's project list...
            if (activeTab === 'General') {
                // General is always valid?
                // If the user wants to see the first project by default instead of General:
                if (visible.length > 0) setActiveTab(visible[0].name);
            } else {
                // Active tab is a Project that doesn't exist here.
                // Switch to first available, or General if none.
                if (visible.length > 0) {
                    setActiveTab(visible[0].name);
                } else {
                    setActiveTab("General");
                }
            }
        }
    }, [loading, entry.projects, userProfile, activeTab]);

    // -- Helpers --

    const getCurrentData = () => {
        if (activeTab === "General") {
            return {
                pmNotes: entry.pmNotes,
                conclusions: entry.conclusions,
                nextSteps: entry.nextSteps,
            };
        }
        const project = entry.projects.find(p => p.name === activeTab);
        return project || { pmNotes: "", conclusions: "", nextSteps: "" };
    };

    const updateCurrentData = (field: keyof ProjectEntry, value: string) => {
        if (activeTab === "General") {
            setEntry(prev => ({ ...prev, [field]: value }));
        } else {
            setEntry(prev => ({
                ...prev,
                projects: prev.projects.map(p => {
                    if (p.name !== activeTab) return p;

                    // Standard update
                    const updatedProject = { ...p, [field]: value };

                    // Sync PM Notes to Block 0 if blocks exist (Backward Compatibility)
                    if (field === 'pmNotes' && p.blocks && p.blocks.length > 0) {
                        const newBlocks = [...p.blocks];
                        newBlocks[0] = { ...newBlocks[0], content: value };
                        updatedProject.blocks = newBlocks;
                    }

                    return updatedProject;
                })
            }));
        }
    };

    const addProject = (projectToAdd: { name: string, id: string, code: string }) => {
        const existing = entry.projects.find(p => p.name === projectToAdd.name);

        if (existing) {
            // If exists but trash, restore it
            if (existing.status === 'trash') {
                setEntry(prev => ({
                    ...prev,
                    projects: prev.projects.map(p => p.name === projectToAdd.name ? { ...p, status: 'active' } : p)
                }));
                setActiveTab(projectToAdd.name);
                setIsAddingProject(false);
            }
        } else {
            // New addition
            setEntry(prev => ({
                ...prev,
                projects: [...prev.projects, {
                    name: projectToAdd.name,
                    projectId: projectToAdd.id, // clean linking
                    pmNotes: "",
                    conclusions: "",
                    nextSteps: "",
                    status: 'active'
                }]
            }));
            setActiveTab(projectToAdd.name);
            setIsAddingProject(false);
        }
    };

    // Event Listener for Command K Navigation (Moved here to avoid ReferenceError)
    useEffect(() => {
        const handleSwitchProject = (e: CustomEvent) => {
            const p = e.detail;
            if (!p || !p.name) return;

            // Check if already in entry
            const exists = entry.projects.find(ep => ep.name === p.name);

            if (exists) {
                if (exists.status === 'trash') {
                    // Restore if trash
                    restoreProject(p.name);
                }
                setActiveTab(p.name);
            } else {
                // Auto-add project to this week
                addProject({ name: p.name, id: p.id, code: p.code });
            }
        };

        window.addEventListener('switch-project', asAny(handleSwitchProject));
        return () => window.removeEventListener('switch-project', asAny(handleSwitchProject));
    }, [entry.projects, addProject]);

    // calculate available projects to add
    const getAvailableProjectsToAdd = () => {
        // 1. Filter based on permissions
        let pool = globalProjects;
        // if (userRole !== 'app_admin' && userRole !== 'global_pm') { // userRole removed from useAuth destructuring
        if (userProfile?.role !== 'app_admin' && userProfile?.role !== 'global_pm') { // Assuming userProfile contains role
            const assignedIds = userProfile?.assignedProjectIds || [];
            pool = pool.filter(p => assignedIds.includes(p.id));
        }

        // 2. Filter: Hide only if ACTIVE in current week. 
        // If it's trash, show it so user can "re-add" (restore) it.
        return pool.filter(gp => !entry.projects.some(ep => ep.name === gp.name && ep.status !== 'trash'));
    };

    const availableProjectsToAdd = getAvailableProjectsToAdd();

    const moveProjectToTrash = (e: React.MouseEvent, name: string) => {
        e.stopPropagation();
        setConfirmModal({
            open: true,
            title: "Move to Trash",
            message: `Move "${name}" to trash?`,
            destructive: true,
            onConfirm: () => {
                setEntry(prev => ({
                    ...prev,
                    projects: prev.projects.map(p => p.name === name ? { ...p, status: 'trash' } : p)
                }));
                if (activeTab === name) setActiveTab("General");
                setConfirmModal(null);
            }
        });
    };

    const restoreProject = (name: string) => {
        setEntry(prev => ({
            ...prev,
            projects: prev.projects.map(p => p.name === name ? { ...p, status: 'active' } : p)
        }));
    };

    const handleAutoExtract = () => {
        const currentPmNotes = getCurrentData().pmNotes;
        if (!currentPmNotes.trim()) {
            showToast("UniTask", "First write some notes in 'PM Notes'.", "info");
            return;
        }

        const currentConclusions = getCurrentData().conclusions;
        const currentTasks = getCurrentData().nextSteps;
        const hasExistingData = currentConclusions.trim() || currentTasks.trim();

        const proceed = () => {
            const result = parseNotes(currentPmNotes);

            // Batch updates
            if (activeTab === "General") {
                setEntry(prev => ({
                    ...prev,
                    conclusions: result.conclusions,
                    nextSteps: result.nextSteps
                }));
            } else {
                setEntry(prev => ({
                    ...prev,
                    projects: prev.projects.map(p =>
                        p.name === activeTab ? {
                            ...p,
                            conclusions: result.conclusions,
                            nextSteps: result.nextSteps
                        } : p
                    )
                }));
            }
            setConfirmModal(null);
            showToast("UniTask", "Data extracted automatically", "success");
        };

        if (hasExistingData) {
            setConfirmModal({
                open: true,
                title: "Overwrite Data",
                message: "⚠️ Are you sure? \n\nExisting conclusions and tasks will be overwritten with the info extracted from the notes.",
                destructive: true,
                onConfirm: proceed
            });
            return;
        }

        proceed();
    };

    // AI Summary Handler
    const handleAISummary = async () => {
        const currentPmNotes = getCurrentData().pmNotes;
        if (!currentPmNotes.trim()) {
            showToast("UniTask", "First write some notes to summarize.", "info");
            return;
        }

        setIsAILoading(true);
        setShowAIModal(true);
        setAIResult(null);

        try {
            const result = await summarizeNotesWithAI(currentPmNotes);
            setAIResult(result);
        } catch (error: any) {
            setAIResult({
                resumenEjecutivo: "",
                tareasExtraidas: [],
                proximosPasos: [],
                error: error.message || "Error desconocido"
            });
        } finally {
            setIsAILoading(false);
        }
    };

    // Apply AI extracted tasks to the current entry and create Real Tasks!
    const applyAITasks = async () => {
        const allItems = [...(aiResult?.tareasExtraidas || []), ...(aiResult?.proximosPasos || [])];
        if (!allItems.length) return;

        // 1. Create Real Tasks in DB
        if (user?.uid) {
            const currentProjectName = activeTab;
            // Find Clean Project ID if in a project tab
            let projectId: string | undefined = undefined;
            if (currentProjectName !== "General") {
                // Try to find in weekly entry projects first for the linked ID
                const weeklyPrj = entry.projects.find(p => p.name === currentProjectName);
                projectId = weeklyPrj?.projectId;

                // Fallback to global projects search by name
                if (!projectId) {
                    const gp = globalProjects.find(g => g.name === currentProjectName);
                    if (gp) projectId = gp.id;
                }
            }

            try {
                // Iterate sequentially to ensure IDs are generated correctly (1, 2, 3...)
                // Do NOT use Promise.all here as it causes race conditions on reading maxNum
                for (const desc of allItems) {
                    await createTask({
                        weekId: entry.id,
                        projectId,
                        tenantId: tenantId || "1",
                        title: desc,
                        description: desc,
                        status: 'pending',
                        isActive: true, // explicit for types
                        createdBy: user.uid,
                        assignedTo: user.uid // Auto-assign to creator for now
                    }, user.uid, addDoc, currentProjectName);
                }
                showToast("UniTask", `✅ ${allItems.length} Tasks created in the database.`, "success");
            } catch (e) {
                console.error("Error creating tasks", e);
                showToast("UniTask", "There was an error saving the tasks in the database.", "error");
            }
        }

        // 2. Legacy: Append to text field removed. Using Real Tasks only.
        setShowAIModal(false);

        setShowAIModal(false);
    };

    const handleSave = async () => {
        // 1. Validate ID
        if (!entry.id) {
            console.error("Critical: Entry ID is missing!");
            const monday = startOfWeek(currentDate, { weekStartsOn: 1 });
            const recoveredId = formatDateId(monday);

            if (recoveredId) {
                const currentTenant = tenantId || "1";
                const finalId = currentTenant === "1" ? recoveredId : `${currentTenant}_${recoveredId}`;

                const updatedEntry = { ...entry, id: finalId };
                setEntry(prev => ({ ...prev, id: finalId }));

                entry.id = finalId;
            } else {
                showToast("UniTask", "Critical Error: No week ID found. Refresh the page.", "error");
                return;
            }
        }

        // 2. Validate Auth (Client Side Guard)
        if (!auth.currentUser) {
            showToast("UniTask", "⚠️ You are not logged in. Firebase will reject the save.", "error");
            return;
        }

        setSaving(true);
        try {
            await saveWeeklyEntry(entry);
            await syncShadowProjects(entry);

            fetchExistingIdsClient(tenantId || "1").then(ids => setExistingIds(new Set(ids)));
            showToast("UniTask", "Saved successfully ✨", "success");
        } catch (error: any) {
            console.error("Save error:", error);
            if (error.code === 'permission-denied') {
                showToast("UniTask", "⛔ Permission denied. Check your permissions.", "error");
            } else {
                showToast("UniTask", `Error saving: ${error.message}`, "error");
            }
        } finally {
            setSaving(false);
        }
    };

    // -- Checkbox --
    const getPreviousContextText = () => {
        if (!previousEntry) return null;
        if (activeTab === "General") return previousEntry.nextSteps;
        const prevProject = previousEntry.projects?.find(p => p.name === activeTab);
        return prevProject ? prevProject.nextSteps : null;
    };

    const previousContextText = getPreviousContextText();

    const toggleTask = (idx: number) => {
        const key = `${activeTab}-${idx}`;
        const newSet = new Set(checkedTasks);
        if (newSet.has(key)) newSet.delete(key);
        else newSet.add(key);
        setCheckedTasks(newSet);
    };

    const migrateUnfinished = () => {
        if (!previousContextText) return;
        const lines = previousContextText.split('\n').filter(l => l.trim());
        const unfinished = lines.filter((_, idx) => !checkedTasks.has(`${activeTab}-${idx}`));
        if (unfinished.length === 0) return;

        const textToAdd = unfinished.join('\n');
        const currentText = getCurrentData().nextSteps;
        const newText = currentText ? currentText + '\n' + textToAdd : textToAdd;
        updateCurrentData('nextSteps', newText);
    };

    // -- Week List Generation --
    const weeksOfYear = useMemo(() => {
        const isoYear = getISOWeekYear(currentDate);
        const firstMonday = startOfISOWeekYear(currentDate);

        // Logical limits: Show history, current week, and max 1 week of future
        const now = new Date();
        const currentRealYear = getISOWeekYear(now);
        const maxAllowedDate = addWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1);

        const weeks = [];
        let d = firstMonday;

        for (let i = 0; i < 54; i++) {
            // Only add if it belongs to the viewed year
            if (getISOWeekYear(d) === isoYear) {
                // If viewing the current year (or future year), impose the "future limit"
                // If viewing a past year, allow all
                if (isoYear < currentRealYear || d <= maxAllowedDate) {
                    weeks.push(d);
                }
            }
            d = addWeeks(d, 1);
        }

        return weeks;
    }, [currentDate]);

    // Filter Active Projects using logic
    const activeProjects = getVisibleProjects();
    const trashedProjects = entry.projects.filter(p => p.status === 'trash');

    // --- RENDER BLOCKER ---
    if (!isHydrated) {
        return (
            <div className="h-screen bg-[#09090b] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    return (
        <AppLayout
            viewMode={viewMode}
            onViewChange={handleViewSwitch}
            onOpenChangelog={() => setShowChangelog(true)} // Connected prop
        >
            <div className="flex h-full gap-6 p-4 pt-2">

                {/* LEFT SIDEBAR: Week Navigation (Only in Editor Mode) */}
                {viewMode === 'editor' && (
                    <div className="w-72 flex flex-col gap-3 shrink-0">
                        {/* Weekly List Header */}
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Weeks</h3>
                            <span className="text-[10px] text-zinc-600 font-mono">{format(currentDate, "yyyy")}</span>
                        </div>

                        {/* Scrollable List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                            {weeksOfYear.map((weekDate) => {
                                const wId = formatDateId(weekDate);
                                const isSelected = isSameDay(weekDate, currentDate);
                                const hasData = existingIds.has(wId);
                                const wNum = getWeekNumber(weekDate);
                                const monthName = format(weekDate, "MMMM", { locale: enUS });

                                // Use current entry for live preview if selected, otherwise fallback to DB map
                                let displayProjects = weeklyProjectMap[wId] || [];

                                if (wId === entry.id) {
                                    displayProjects = entry.projects
                                        .filter(p => p.status !== 'trash')
                                        .map(p => {
                                            const gp = globalProjects.find(g => g.id === p.projectId) ||
                                                globalProjects.find(g => g.name.toLowerCase().trim() === p.name.toLowerCase().trim());
                                            return {
                                                code: gp?.code || p.name.substring(0, 3).toUpperCase(),
                                                color: gp?.color || '#71717a'
                                            };
                                        });
                                }

                                return (
                                    <button
                                        key={wId}
                                        onClick={async () => {
                                            // Auto-save current before switching
                                            if (entry.id && !loading) {
                                                try {
                                                    await saveWeeklyEntry(entry);
                                                    // Update map cache locally if needed, or rely on effect
                                                } catch (e) { console.error("Auto-save failed", e); }
                                            }
                                            setCurrentDate(weekDate);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-2 rounded-lg transition-all border text-left group relative",
                                            isSelected
                                                ? "bg-white/10 border-white/10 text-white"
                                                : hasData
                                                    ? "bg-white/5 border-transparent hover:bg-white/10 text-zinc-400"
                                                    : "bg-transparent border-transparent hover:bg-white/5 text-zinc-500 opacity-60 hover:opacity-100"
                                        )}
                                    >
                                        {/* Week Number Box */}
                                        <div className={cn(
                                            "flex flex-col items-center justify-center w-8 h-8 rounded-md font-mono text-xs leading-none shrink-0",
                                            isSelected ? "bg-red-500 text-white" : "bg-white/5"
                                        )}>
                                            <span className="font-bold">{wNum}</span>
                                        </div>

                                        {/* Date Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div className="text-[10px] uppercase font-bold tracking-wider mb-0.5 truncate">
                                                    {monthName}
                                                </div>
                                            </div>

                                            {/* Active Project Codes */}
                                            {displayProjects.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {displayProjects.slice(0, 4).map((ac, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="w-1.5 h-1.5 rounded-full"
                                                            style={{ backgroundColor: ac.color }}
                                                            title={ac.code}
                                                        />
                                                    ))}
                                                    {displayProjects.length > 4 && (
                                                        <span className="text-[9px] text-zinc-600">+</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* RIGHT CANVAS: Content Area */}
                <div className="flex-1 flex flex-col min-w-0 h-full relative bg-[#0c0c0e] rounded-xl border border-white/5 overflow-hidden shadow-2xl">

                    {/* View: Editor */}
                    {viewMode === 'editor' && (
                        <div className="h-full flex flex-col">
                            {/* Editor Header */}
                            <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-white/[0.02]">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-lg font-medium text-white flex items-center gap-3">
                                        <span className="text-zinc-500">Week {entry.weekNumber}</span>
                                        <span className="text-zinc-700">/</span>
                                        <span>{format(currentDate, "MMMM d", { locale: enUS })}</span>
                                    </h2>
                                    {loading && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-white text-black text-xs font-bold rounded hover:bg-zinc-200 transition-colors disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                        {saving ? "Saving..." : "Save Changes"}
                                    </button>
                                    <button
                                        onClick={handleAISummary}
                                        disabled={isAILoading}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-[#D32F2F]/10 text-[#D32F2F] text-xs font-bold rounded border border-[#D32F2F]/20 hover:bg-[#D32F2F]/20 transition-colors"
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        AI Assist
                                    </button>
                                </div>
                            </div>

                            {/* Editor Tabs (Restructured to fix Dropdown Clipping) */}
                            <div className="flex items-center gap-1 p-2 border-b border-white/5 bg-black/20">

                                {/* Fixed Left Section: General & Add Project */}
                                <div className="flex items-center gap-1 shrink-0 relative z-50">
                                    <button
                                        onClick={() => setActiveTab("General")}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all",
                                            activeTab === "General"
                                                ? "bg-white/10 text-white"
                                                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                        )}
                                    >
                                        <Layout className="w-3.5 h-3.5" />
                                        General Review
                                    </button>

                                    <div className="w-px h-4 bg-white/10 mx-1" />

                                    {/* ADD PROJECT DROPDOWN (Fixed, No Clipping) */}
                                    {(availableProjectsToAdd.length > 0) && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsAddingProject(!isAddingProject)}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all group",
                                                    isAddingProject ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                                )}
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span className="hidden md:inline">Add Project</span>
                                                <ChevronDown className="w-3 h-3 opacity-50" />
                                            </button>

                                            {isAddingProject && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-40"
                                                        onClick={() => setIsAddingProject(false)}
                                                    />
                                                    <div className="absolute top-full left-0 mt-2 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                                                        <div className="p-2 space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                                                            <p className="px-2 py-1 text-[10px] uppercase font-bold text-zinc-600">Active Projects</p>
                                                            {availableProjectsToAdd.map(p => (
                                                                <button
                                                                    key={p.id}
                                                                    onClick={() => addProject({ name: p.name, id: p.id, code: p.code })}
                                                                    className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5 text-left group/item transition-colors"
                                                                >
                                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color || '#71717a' }} />
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-xs font-medium text-zinc-300 group-hover/item:text-white truncate">{p.name}</div>
                                                                        <div className="text-[9px] text-zinc-600 font-mono">{p.code}</div>
                                                                    </div>
                                                                    <Plus className="w-3 h-3 text-zinc-600 group-hover/item:text-white opacity-0 group-hover/item:opacity-100 transition-all" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {availableProjectsToAdd.length > 0 && <div className="w-px h-4 bg-white/10 mx-1" />}
                                </div>

                                {/* Scrollable Project Tabs */}
                                <div className="flex-1 overflow-x-auto custom-scrollbar flex items-center gap-1">
                                    {getVisibleProjects().map(p => {
                                        // Resolve Color from Global or default
                                        let color = '#fbbf24';
                                        const gp = globalProjects.find(g => g.id === p.projectId);
                                        if (gp && gp.color) color = gp.color;

                                        return (
                                            <div key={p.name} className="relative group/tab shrink-0">
                                                <button
                                                    onClick={() => setActiveTab(p.name)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all border border-transparent",
                                                        activeTab === p.name
                                                            ? "bg-[#18181b] text-white border-white/10 shadow-sm"
                                                            : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                                    )}
                                                >
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                                    {p.name}
                                                </button>
                                                {/* Quick Trash Action */}
                                                <button
                                                    onClick={(e) => moveProjectToTrash(e, p.name)}
                                                    className="absolute -top-1 -right-1 opacity-0 group-hover/tab:opacity-100 bg-red-900 border border-red-500 text-red-200 rounded-full p-0.5 hover:scale-110 transition-all z-10"
                                                    title="Move to Trash"
                                                >
                                                    <X className="w-2 h-2" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* MAIN FORM AREA (Dynamic Content) */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#0c0c0e]">
                                <div className="max-w-4xl mx-auto space-y-8">

                                    {/* 1) GENERAL VIEW (Weekly Summary) */}
                                    {activeTab === 'General' && (
                                        <>
                                            {/* GENERAL MEETING MINUTES (Was 'General Insights') */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                                        General Meeting Minutes
                                                    </label>
                                                </div>
                                                <div className="border border-zinc-800 rounded-xl overflow-hidden shadow-sm bg-[#0a0a0a] min-h-[300px]">
                                                    <RichTextEditor
                                                        content={getCurrentData().pmNotes}
                                                        onChange={(html) => updateCurrentData("pmNotes", html)}
                                                        placeholder="General meeting notes..."
                                                    />
                                                </div>
                                            </div>

                                            {/* GENERAL TASKS */}
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Tasks</label>
                                                    {previousContextText && (
                                                        <button onClick={migrateUnfinished} className="text-[#D32F2F] text-[10px] font-bold hover:underline flex items-center gap-1 uppercase tracking-wider">
                                                            <RotateCcw className="w-3 h-3" /> Migrate Old
                                                        </button>
                                                    )}
                                                </div>
                                                {/* Reusing nextSteps field, but labeling as Tasks */}
                                                <textarea
                                                    value={getCurrentData().nextSteps}
                                                    onChange={(e) => updateCurrentData("nextSteps", e.target.value)}
                                                    className="w-full h-40 bg-[#0a0a0a] border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700 resize-none font-mono shadow-inner"
                                                    placeholder="- [ ] Task..."
                                                />
                                            </div>
                                        </>
                                    )}



                                    {/* 2) PROJECT SPECIFIC VIEW */}
                                    {activeTab !== 'General' && (() => {
                                        // Resolve Project ID
                                        const prjId = entry.projects.find(p => p.name === activeTab)?.projectId ||
                                            globalProjects.find(g => g.name === activeTab)?.id;

                                        if (prjId) {
                                            return (
                                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                    {/* We render separate PM notes for the project as well */}
                                                    <div className="space-y-4 mb-8">
                                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                                            Meeting Minutes: <span className="text-white">{activeTab}</span>
                                                        </label>
                                                        <div className="border border-zinc-800 rounded-xl overflow-hidden shadow-sm bg-[#0a0a0a] min-h-[150px]">
                                                            <RichTextEditor
                                                                content={getCurrentData().pmNotes}
                                                                onChange={(html) => updateCurrentData("pmNotes", html)}
                                                                placeholder={`Status update for ${activeTab}...`}
                                                            />
                                                        </div>
                                                    </div>

                                                    <TaskList projectId={prjId} projectName={activeTab} />


                                                </div>
                                            );
                                        }
                                        return <div className="text-zinc-500 text-center py-10">Project not found.</div>;
                                    })()}
                                </div>
                            </div>

                        </div >
                    )
                    }

                    {viewMode === 'dashboard' && <Dashboard
                        entry={{ ...entry, date: currentDate.toISOString(), updatedAt: new Date().toISOString() } as any}
                        userProfile={userProfile}
                        userRole={userProfile?.role} // Assuming userProfile contains role
                        globalProjects={globalProjects}
                    />}

                    {
                        viewMode === 'projects' && (
                            <ProjectManagement />
                        )
                    }
                    {viewMode === 'users' && <UserManagement />}

                    {viewMode === 'task-manager' && <TaskManagement initialTaskId={searchParams.get('taskId')} />}

                    {viewMode === 'tasks' && <TaskDashboard
                        projects={
                            (userProfile?.role === 'app_admin' || userProfile?.role === 'global_pm') // Assuming userProfile contains role
                                ? globalProjects
                                : globalProjects.filter(p => userProfile?.assignedProjectIds?.includes(p.id))
                        }
                        userProfile={userProfile}
                        permissionLoading={profileLoading}
                    />}
                    {
                        viewMode === 'trash' && (
                            <div className="p-8">
                                <h2 className="text-2xl font-bold text-white mb-6">Trash Bin</h2>
                                <div className="grid gap-4">
                                    {trashedProjects.length === 0 && <p className="text-zinc-500">Trash is empty.</p>}
                                    {trashedProjects.map(p => (
                                        <div key={p.name} className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-white/5">
                                            <span className="text-zinc-300 font-medium">{p.name}</span>
                                            <button
                                                onClick={() => restoreProject(p.name)}
                                                className="px-3 py-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded text-xs transition-colors"
                                            >
                                                Restore
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    }

                    {/* View: User Roles */}
                    {viewMode === 'user-roles' && (
                        <div className="h-full p-6 overflow-hidden">
                            <UserRoleManagement />
                        </div>
                    )}

                    {/* View: Reports */}
                    {viewMode === 'reports' && (
                        <div className="h-full p-6 overflow-hidden">
                            <ReportManagement />
                        </div>
                    )}

                    {/* View: Support Management */}
                    {viewMode === 'support-management' && (
                        <div className="h-full overflow-hidden">
                            <SupportManagement />
                        </div>
                    )}

                    {/* View: Organization Management */}
                    {viewMode === 'organization-management' && (
                        <div className="h-full overflow-hidden">
                            <TenantManagement />
                        </div>
                    )}

                    {/* View: Admin Task Master */}
                    {viewMode === 'admin-task-master' && (
                        <div className="h-full overflow-hidden">
                            <TaskMasterDataManagement />
                        </div>
                    )}

                    {/* View: User Manual */}
                    {viewMode === 'user-manual' && (
                        <div className="h-full overflow-hidden">
                            <ManualViewer />
                        </div>
                    )}

                </div >
            </div >

            {/* AI Modal Dialog */}
            {
                showAIModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#121212] w-full max-w-2xl rounded-2xl border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                            {isAILoading ? (
                                <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full border-4 border-[#D32F2F]/20 border-t-[#D32F2F] animate-spin"></div>
                                        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Analyzing Notes...</h3>
                                    <p className="text-zinc-500 text-sm max-w-xs">Extracting tasks via Google Gemini 2.0 Flash.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="p-6 border-b border-zinc-800 bg-[#0a0a0a] flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Wand2 className="w-5 h-5 text-[#D32F2F]" />
                                            AI Analysis Result
                                        </h3>
                                        <button onClick={() => setShowAIModal(false)} className="text-zinc-500 hover:text-white">
                                            <XCircle className="w-6 h-6" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                        {aiResult?.error ? (
                                            <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-xl text-red-200 text-sm">
                                                {aiResult.error}
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Executive Summary</h4>
                                                    <p className="text-zinc-300 text-sm leading-relaxed bg-[#18181b] p-4 rounded-xl border border-white/5">
                                                        {aiResult?.resumenEjecutivo}
                                                    </p>
                                                </div>

                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                                        <ListTodo className="w-4 h-4" />
                                                        Extracted Tasks
                                                    </h4>
                                                    <div className="grid gap-2">
                                                        {[...(aiResult?.tareasExtraidas || []), ...(aiResult?.proximosPasos || [])].map((task, i) => (
                                                            <div key={i} className="flex items-start gap-3 p-3 bg-zinc-900/50 border border-white/5 rounded-lg">
                                                                <div className="w-5 h-5 rounded-md bg-[#D32F2F]/20 flex items-center justify-center shrink-0 mt-0.5">
                                                                    <ArrowRight className="w-3 h-3 text-[#D32F2F]" />
                                                                </div>
                                                                <span className="text-sm text-zinc-300">{task}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="p-4 border-t border-zinc-800 bg-[#0a0a0a] flex justify-end gap-3">
                                        <button
                                            onClick={() => setShowAIModal(false)}
                                            className="px-4 py-2 text-sm text-zinc-400 hover:text-white font-medium transition-colors"
                                        >
                                            Discard
                                        </button>
                                        <button
                                            onClick={applyAITasks}
                                            className="px-6 py-2 bg-[#D32F2F] hover:bg-red-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-red-900/20 transition-all transform hover:scale-105"
                                        >
                                            Create {((aiResult?.tareasExtraidas?.length || 0) + (aiResult?.proximosPasos?.length || 0))} Tasks
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )
            }
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
                                Cancel
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
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Changelog Modal */}
            <ChangelogModal
                isOpen={showChangelog}
                onClose={() => setShowChangelog(false)}
            />
        </AppLayout >
    );
}

"use client";
import { safeParseDate } from '@/lib/date-utils';

import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, query, orderBy, serverTimestamp, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useSafeFirestore } from "@/hooks/useSafeFirestore";
import { usePermissions } from "@/hooks/usePermissions";
import { useAccessScopes } from "@/hooks/useAccessScopes";
import { filterBySAMScope } from "@/lib/projects";
import { useTheme } from "@/hooks/useTheme";
import { Loader2, Plus, Edit2, Save, XCircle, Search, Trash2, CheckSquare, ListTodo, AlertTriangle, ArrowLeft, LayoutTemplate, Calendar as CalendarIcon, Link as LinkIcon, Users, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, X, User as UserIcon, FolderGit2, Sparkles, FileText, History, Clock, List, Timer, Share2, Fingerprint } from "lucide-react";
import { getShareUrl, copyToClipboard } from "@/lib/share";
import { cn } from "@/lib/utils";
import { Task, Project, UserProfile, AttributeDefinition, MasterDataItem, getRoleLevel, RoleLevel } from "@/types";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfToday, getDay, isValid } from "date-fns";
import { es, enUS, de, fr, ca, pt } from "date-fns/locale";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { useMasterDataLabels } from "@/hooks/useMasterDataLabels";
import { useSprints } from "@/hooks/useSprints";
import { tshirtToDays } from "@/lib/tshirtSizing";
import { FileUploader } from "./FileUploader";
import { PowerSelect } from "./ui/PowerSelect";
import { ActivityAuditModal } from "./ActivityAuditModal";
import HighlightText from "./ui/HighlightText";
import { addComment, subscribeToComments, parseMentions, formatRelativeTime, TaskComment } from "@/lib/comments";
import { MessageSquare } from "lucide-react";
import { getProgressSafe, ProgressV13 } from "@/lib/data-migration";
import { recalculateAncestors } from "@/lib/hierarchy-governance";
import { HierarchyTree } from "./HierarchyTree";
import { ProjectMindMapModal } from "./ProjectMindMapModal";
import { Network } from "lucide-react";

import { createTask } from "@/lib/tasks";

// Local MasterDataItem definition removed in favor of types.ts


export default function TaskManagement({
    initialTaskId,
    isModal = false,
    onClose
}: {
    initialTaskId?: string | null;
    isModal?: boolean;
    onClose?: () => void;
}) {
    const { userRole, user, tenantId, userProfile } = useAuth();
    const { addDoc, updateDoc, deleteDoc } = useSafeFirestore();
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const { showToast } = useToast();
    const { t, language } = useLanguage();
    const dateLocale = { en: enUS, es, de, fr, ca, pt }[language] || enUS;
    const { isAdmin: checkIsAdmin, can, permissions } = usePermissions();
    const accessScopes = useAccessScopes();
    const { getLabel } = useMasterDataLabels();
    const { sprints, activeSprint } = useSprints();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);


    // [V3] UI Flags
    const [showTree, setShowTree] = useState(false); // List vs Hierarchy
    const [showMindMap, setShowMindMap] = useState<string | null>(null); // Mind Map Project ID

    // [V15] Unified View Persistence
    const viewStateInitialized = useRef(false);

    // 1. Hydrate from URL (Once)
    useEffect(() => {
        if (typeof window !== 'undefined' && !viewStateInitialized.current) {
            const params = new URLSearchParams(window.location.search);
            const mapId = params.get('mindmap');
            const viewMode = params.get('view');

            if (mapId) setShowMindMap(mapId);
            if (viewMode === 'hierarchy') setShowTree(true);

            viewStateInitialized.current = true;
        }
    }, []);

    // 2. Sync to URL (On Change)
    useEffect(() => {
        if (!viewStateInitialized.current) return;

        const url = new URL(window.location.href);
        let hasChanges = false;

        // Mind Map State
        const currentMap = url.searchParams.get('mindmap');
        if (showMindMap && currentMap !== showMindMap) {
            url.searchParams.set('mindmap', showMindMap);
            hasChanges = true;
        } else if (!showMindMap && currentMap) {
            url.searchParams.delete('mindmap');
            hasChanges = true;
        }

        // Tree/List View State
        const currentView = url.searchParams.get('view');
        if (showTree && currentView !== 'hierarchy') {
            url.searchParams.set('view', 'hierarchy');
            hasChanges = true;
        } else if (!showTree && currentView === 'hierarchy') {
            url.searchParams.delete('view');
            hasChanges = true;
        }

        if (hasChanges) {
            window.history.replaceState({}, '', url.toString());
        }
    }, [showMindMap, showTree]);

    // Comments State
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [commentsExpanded, setCommentsExpanded] = useState(false);
    const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState("");

    // Master Data State
    const [attributeDefinitions, setAttributeDefinitions] = useState<AttributeDefinition[]>([]);
    const [masterData, setMasterData] = useState<Record<string, MasterDataItem[]>>({
        priority: [], area: [], scope: [], module: []
    });

    // Project Hierarchy State (Loaded dynamically per selected project)
    const [projectHierarchyNodes, setProjectHierarchyNodes] = useState<any[]>([]);


    // Load Attribute Definitions
    useEffect(() => {
        if (!tenantId) return;
        const q = query(collection(db, 'attribute_definitions'), where('tenantId', '==', tenantId));
        return onSnapshot(q, snap => {
            setAttributeDefinitions(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttributeDefinition)));
        });
    }, [tenantId]);

    // Load Master Data (All Types)
    useEffect(() => {
        if (!tenantId) return;
        const q = query(collection(db, 'master_data'), where('tenantId', '==', tenantId));
        return onSnapshot(q, snap => {
            const allItems = snap.docs.map(d => ({ id: d.id, ...d.data() } as MasterDataItem));
            const grouped: Record<string, MasterDataItem[]> = { priority: [], area: [], scope: [], module: [] };

            allItems.forEach(item => {
                if (!grouped[item.type]) grouped[item.type] = [];
                grouped[item.type].push(item);
            });

            // Sort
            Object.keys(grouped).forEach(k => grouped[k].sort((a, b) => a.name.localeCompare(b.name)));
            setMasterData(grouped);
        });
    }, [tenantId]);

    // AUTO-SELECT TASK FROM ID (Fix for Notifications)
    useEffect(() => {
        // [FIX] Check URL params if initialTaskId prop is missing (Client-side navigation support)
        let targetId = initialTaskId;
        if (!targetId && typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            targetId = params.get('taskId');
        }

        if (targetId && processedInitialRef.current !== targetId) {
            const loadDeepLinkedTask = async () => {
                try {
                    const { doc, getDoc } = await import("firebase/firestore");
                    const docRef = doc(db, "tasks", targetId);
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        const taskData = { id: snap.id, ...snap.data() } as Task;
                        // Determine status of this task to set sidebar filter?
                        // For now just set selectedTask.

                        // [FIX] Normalization for Deep Link
                        const normalizedTask = normalizeTask(taskData);

                        setSelectedTask(normalizedTask);
                        setFormData(normalizedTask); // Sync Form Data
                        setSidebarFilter('all'); // Ensure visibility
                        processedInitialRef.current = targetId; // Mark as processed
                    }
                } catch (e) {
                    console.error("Error loading deep linked task:", e);
                }
            };
            loadDeepLinkedTask();
        }
    }, [initialTaskId]);


    // Sidebar Filters
    const [sidebarSearch, setSidebarSearch] = useState("");
    const [sidebarFilter, setSidebarFilter] = useState<'all' | 'pending' | 'in_progress' | 'review' | 'completed' | 'discarded' | 'out_of_scope'>('all');

    // Selection state
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Subscribe to comments when task is selected
    useEffect(() => {
        if (!selectedTask?.id || !tenantId) {
            setComments([]);
            return;
        }

        const unsubscribe = subscribeToComments(selectedTask.id, tenantId, (newComments) => {
            setComments(newComments);
        });

        // Reset comment form state
        setNewComment("");
        setCommentsExpanded(false);

        return () => unsubscribe();
    }, [selectedTask?.id, tenantId]);

    // Form state
    const [formData, setFormData] = useState<Partial<Task>>({});
    const [isNew, setIsNew] = useState(false);
    const [saving, setSaving] = useState(false);

    // Fetch Project Hierarchy Nodes when projectId changes in the form
    useEffect(() => {
        if (!formData.projectId || !tenantId) {
            setProjectHierarchyNodes([]);
            return;
        }

        const fetchHierarchy = async () => {
            try {
                const targetTenantId = tenantId || "1";
                const q = query(
                    collection(db, "project_hierarchy"),
                    where("projectId", "==", formData.projectId),
                    where("tenantId", "==", targetTenantId) // Use targetTenantId like loadData does
                );
                const snap = await getDocs(q);
                const nodes: any[] = [];
                snap.forEach(doc => nodes.push({ id: doc.id, ...doc.data() }));

                // Sort nodes by WBS (natural sort for strings like "1.2", "1.10")
                nodes.sort((a, b) => {
                    const wbsA = a.wbs || "";
                    const wbsB = b.wbs || "";
                    return wbsA.localeCompare(wbsB, undefined, { numeric: true, sensitivity: 'base' });
                });
                setProjectHierarchyNodes(nodes);
            } catch (error) {
                console.error("Error fetching project hierarchy:", error);
                setProjectHierarchyNodes([]);
            }
        };

        fetchHierarchy();
    }, [formData.projectId, tenantId]);

    // Permissions Helper - now using usePermissions hook
    const isAdmin = checkIsAdmin();

    // [FIX] Normalize Task Helper - ensures consistent task data structure
    const normalizeTask = (task: Task): Task => {
        return {
            ...task,
            title: task.title || task.description || "",
            dependencies: task.dependencies || [],
            acceptanceCriteria: task.acceptanceCriteria || [],
            attributes: task.attributes || {},
            raci: task.raci || { responsible: [], accountable: [], consulted: [], informed: [] }
        };
    };

    // Dirty Check Helper
    const isDirty = () => {
        if (!selectedTask && !isNew) return false;
        if (isNew) {
            // Check if user typed anything meaningful
            const hasContent = !!formData.title || !!formData.description || (formData.acceptanceCriteria?.length ?? 0) > 1;
            return hasContent;
        }
        if (!selectedTask) return false;

        // Compare key fields (Added isBlocking and new classification fields)
        // [V3] Removed 'progress' from here as it is checked via getProgressSafe
        const keys: (keyof Task)[] = ['title', 'description', 'status', 'isBlocking', 'techDescription', 'rtmId', 'relatedDailyStatusId', 'startDate', 'endDate', 'projectId', 'priority', 'scope', 'area', 'module', 'sprintId', 'clientDeadline'];
        for (const key of keys) {
            const val1 = formData[key] ?? "";
            const val2 = (selectedTask as any)[key] ?? "";
            // Loose equality for null/undefined/"" and trimming strings
            // Treat null as empty string explicitly to avoid "null" string conversion
            const v1Str = (val1 === null || val1 === undefined) ? "" : String(val1).trim();
            const v2Str = (val2 === null || val2 === undefined) ? "" : String(val2).trim();

            if (v1Str !== v2Str) return true;
        }

        // Complex objects
        const raciForm = JSON.stringify(formData.raci);
        const raciSelected = JSON.stringify(selectedTask.raci);
        if (raciForm !== raciSelected) return true;

        // Deep compare dependencies (arrays)
        const deps1 = (formData.dependencies || []).sort().join(',');
        const deps2 = (selectedTask.dependencies || []).sort().join(',');
        if (deps1 !== deps2) return true;

        const acForm = JSON.stringify(formData.acceptanceCriteria);
        const acSelected = JSON.stringify(selectedTask.acceptanceCriteria);
        if (acForm !== acSelected) return true;

        const attrsForm = JSON.stringify(formData.attributes);
        const attrsSelected = JSON.stringify(selectedTask.attributes);
        if (attrsForm !== attrsSelected) return true;

        // [V3 Migration] Safe Progress Check
        const oldP = getProgressSafe(selectedTask).actual;
        const newP = getProgressSafe(formData).actual;
        if (oldP !== newP) return true;

        return false;
    };

    // Warn on browser close/refresh
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

    // UI States
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [activeRaciRole, setActiveRaciRole] = useState<'responsible' | 'accountable' | 'consulted' | 'informed' | null>(null);
    const [dependencySearch, setDependencySearch] = useState("");

    // Date Picker State
    const [datePickerTarget, setDatePickerTarget] = useState<'startDate' | 'endDate' | 'clientDeadline' | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void; destructive?: boolean } | null>(null);
    const [showAuditLog, setShowAuditLog] = useState(false);
    const retriedIds = useRef<Set<string>>(new Set());
    const processedInitialRef = useRef<string | null>(null);

    // Data Loader
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Force use of the ACTIVE context tenantId (masqueraded or real)
            const targetTenantId = tenantId || "1";

            // Load Projects (filtered by organization)
            const qp = query(collection(db, "projects"), where("tenantId", "==", targetTenantId), orderBy("name"));
            const snapP = await getDocs(qp);
            const loadedProjects: Project[] = [];
            snapP.forEach(doc => loadedProjects.push({ id: doc.id, ...doc.data() } as Project));
            setProjects(loadedProjects);

            const qu = query(collection(db, "users"), where("tenantId", "==", targetTenantId));
            const snapU = await getDocs(qu);
            const loadedUsers: UserProfile[] = [];
            snapU.forEach(doc => loadedUsers.push({ uid: doc.id, ...doc.data() } as UserProfile));
            setUsers(loadedUsers);

            const qt = query(collection(db, "tasks"), where("tenantId", "==", targetTenantId), orderBy("createdAt", "desc"));
            const snapT = await getDocs(qt);
            const loadedTasks: Task[] = [];
            snapT.forEach(doc => {
                const data = doc.data();
                if (data.isActive !== false) {
                    loadedTasks.push({ id: doc.id, ...data } as Task);
                }
            });
            setTasks(loadedTasks);
        } catch (error) {
            // console.error("Error loading TaskManagement data", error);
            showToast("Error", "No se pudieron cargar los datos", "error");
        } finally {
            setLoading(false);
        }
    }, [tenantId, showToast]);

    // Initial Selection from Prop
    useEffect(() => {
        const checkInitialTask = async () => {
            if (!loading && initialTaskId) {
                // [FIX] Prevent re-processing the same initialTaskId
                if (processedInitialRef.current === initialTaskId) return;

                // IMPORTANT: If already selected, do nothing more!
                if (selectedTask?.id === initialTaskId) {
                    processedInitialRef.current = initialTaskId; // Mark as processed
                    return;
                }

                if (initialTaskId === 'new') {
                    const newTemplate: Partial<Task> = {
                        title: "",
                        status: 'pending',
                        projectId: "", // User must select
                        acceptanceCriteria: [
                            { id: '1', text: t('task_manager.criteria_placeholder'), completed: false }
                        ],
                        progress: 0,
                        progressV13: { actual: 0, planned: 0 },
                        type: 'task',
                        order: Date.now() / 1000,
                        ancestorIds: [],
                        raci: { responsible: [], accountable: [], consulted: [], informed: [] },
                        dependencies: [],
                        tenantId: tenantId || "1",
                        isActive: true
                    };
                    const ghost = { id: 'new', friendlyId: 'NEW', ...newTemplate } as Task;
                    setSelectedTask(ghost);
                    setFormData(newTemplate);
                    setIsNew(true);
                    setConfirmModal(null);
                    processedInitialRef.current = 'new';
                    return;
                }

                const target = tasks.find(t => t.id === initialTaskId);
                if (target) {
                    const normalized = normalizeTask(target);
                    setSelectedTask(normalized);
                    setFormData(normalized);
                    processedInitialRef.current = initialTaskId; // Mark as processed
                } else {
                    if (!retriedIds.current.has(initialTaskId)) {
                        retriedIds.current.add(initialTaskId);

                        try {
                            const taskDoc = await getDoc(doc(db, "tasks", initialTaskId));
                            if (taskDoc.exists()) {
                                const foundTask = { id: taskDoc.id, ...taskDoc.data() } as Task;

                                // [FIX] Tenant Isolation Check
                                // Prevent Superadmins from seeing mixed content when masquerading
                                if (foundTask.tenantId && foundTask.tenantId !== tenantId) {
                                    console.warn(`[TaskManagement] Task ${foundTask.id} belongs to tenant ${foundTask.tenantId}, current context is ${tenantId}. Hiding.`);
                                    // Optional: Show toast or clear URL?
                                    // For now, just ignore it so it doesn't appear in the wrong list
                                    return;
                                }

                                if (foundTask.isActive === false) {
                                    console.warn(`[TaskManagement] Task ${foundTask.id} is inactive/archived. Hiding.`);
                                    return;
                                }

                                // Add to list and select
                                const normalized = normalizeTask(foundTask);
                                setTasks(prev => [foundTask, ...prev]);
                                setSelectedTask(normalized);
                                setFormData(normalized);
                                processedInitialRef.current = initialTaskId; // Mark as processed
                            } else {
                                showToast("Error", "La tarea solicitada ya no existe.", "error");
                            }
                        } catch (e: any) {
                            // [FIX] Detect Permission Denied
                            if (e.code === 'permission-denied') {
                                console.error("[TaskManagement] Permission denied for task:", initialTaskId, "User:", user?.email, "Role:", userRole);
                                showToast("Error de Acceso", "No tienes permisos para ver esta tarea o pertenece a otra organización.", "error");
                            } else {
                                console.error("[TaskManagement] Error fetching individual task:", e);
                                loadData();
                            }
                        }
                    } else if (selectedTask?.id !== initialTaskId) {
                        // Silent fail if we already retried and didn't find/access it
                        // This prevents the error log loop while keeping the UI stable
                    }
                }
            }
        };

        checkInitialTask();
    }, [initialTaskId, loading, tasks, loadData, showToast, user, userRole]); // Removed selectedTask to prevent loop

    useEffect(() => {
        loadData();
    }, [user, userRole, loadData]);


    // Computed Lists
    const visibleProjects = filterBySAMScope(
        projects.filter(p => {
            if (isAdmin) return true;
            if (permissions.projectAccess?.viewAll) return true;
            if (!userProfile?.assignedProjectIds) return false;
            return userProfile.assignedProjectIds.includes(p.id);
        }),
        accessScopes
    );

    const visibleTasks = tasks.filter(t => {
        if (t.isActive === false) return false;

        // FILTER BY SIMULATED ROLE
        // If simulated role is superadmin/app_admin, see all loaded tasks (which are already tenant-filtered by loadData).
        if (userRole === 'superadmin' || userRole === 'app_admin') {
            // See all
        } else {
            // Regular user constraints
            if (!t.projectId) return false;
            // Check if project is assigned to user

            // Note: visibleProjects is already filtered by assignment for non-admins
            const isVisible = visibleProjects.some(vp => vp.id === t.projectId);
            if (!isVisible && tasks.indexOf(t) < 5) {
                // Debug first few hidden tasks
                // Filter projects
            }
            if (!isVisible) return false;
        }

        // Apply Sidebar Filters
        if (sidebarFilter !== 'all' && t.status !== sidebarFilter) return false;

        if (sidebarSearch.trim()) {
            const q = sidebarSearch.toLowerCase();
            return (
                (t.title?.toLowerCase().includes(q)) ||
                (t.description?.toLowerCase().includes(q)) ||
                (t.friendlyId?.toLowerCase().includes(q))
            );
        }

        return true;
    }).sort((a, b) => {
        // [SORTING V15] Match Sprint Board Logic
        // Priority: review > in_progress > pending > completed > others
        const priority: Record<string, number> = {
            'review': 0,
            'in_progress': 1,
            'pending': 2,
            'completed': 3,
            'discarded': 4,
            'out_of_scope': 5
        };

        const statusA = a.status ? a.status.toLowerCase() : '';
        const statusB = b.status ? b.status.toLowerCase() : '';

        const pA = priority[statusA] ?? 99;
        const pB = priority[statusB] ?? 99;

        if (pA !== pB) return pA - pB;

        // Secondary: Oldest First (createdAt)
        const getTime = (d: any) => {
            if (!d) return 0;
            if (d.seconds) return d.seconds * 1000; // Firestore Timestamp
            if (d instanceof Date) return d.getTime();
            if (typeof d === 'string') return new Date(d).getTime();
            return 0;
        };

        const timeA = getTime(a.createdAt);
        const timeB = getTime(b.createdAt);

        return timeA - timeB;
    });




    // --- HANDLERS ---

    const handleSelectTask = (task: Task) => {
        // [FIX] Check if CURRENT task (not the new one) has unsaved changes
        // We need to check BEFORE updating selectedTask
        const currentTaskIsDirty = isDirty();

        const proceed = () => {
            // [FIX] Normalize Data on Selection
            // This ensures selectedTask (baseline) and formData (draft) start IDENTICAL
            // to prevent immediate "unsaved changes" flag.
            const normalizedTask = normalizeTask(task);

            setSelectedTask(normalizedTask);
            setFormData(normalizedTask);

            setIsNew(false);
            setIsStatusOpen(false);
            setActiveRaciRole(null);
            setDependencySearch("");
            setConfirmModal(null);
        };

        if (currentTaskIsDirty) {
            setConfirmModal({
                open: true,
                title: t('task_manager.unsaved_changes'),
                message: t('task_manager.discard_and_switch'),
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
                // startDate: REMOVED - Uses createdAt
                acceptanceCriteria: [
                    { id: '1', text: t('task_manager.criteria_placeholder'), completed: false }
                ],
                // [V3 Migration] Shadow Initialization
                progress: 0, // Legacy fallback
                progressV13: { actual: 0, planned: 0 },
                type: 'task',
                order: Date.now() / 1000,
                ancestorIds: [],

                raci: { responsible: [], accountable: [], consulted: [], informed: [] },
                dependencies: [],
                tenantId: tenantId || "1",
                isActive: true // [FIX] Ensure task is visible by default
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
                title: t('task_manager.unsaved_changes'),
                message: t('task_manager.discard_and_create'),
                onConfirm: proceed
            });
            return;
        }
        proceed();
    };

    const handleSave = async () => {
        // console.log("[DEBUG] handleSave triggered. formData:", formData);
        if (!formData.title) return showToast("UniTaskController", t('task_manager.title_required'), "error");
        if (!formData.projectId) return showToast("UniTaskController", t('task_manager.project_required'), "error");

        // Security Check: Ensure project is allowed
        if (!isAdmin) {
            const isAllowed = visibleProjects.some(p => p.id === formData.projectId);
            if (!isAllowed) return showToast("UniTaskController", t('task_manager.no_project_permission'), "error");
        }

        // [V13.3] Effort Tracking Validation
        const actualEffortValue = typeof formData.actualEffort === 'string'
            ? parseFloat((formData.actualEffort as any).replace(',', '.'))
            : formData.actualEffort;

        if (formData.status === 'completed' && !actualEffortValue) {
            return showToast("UniTaskController", "⚠️ Esfuerzo real obligatorio: Debes registrar los días invertidos para cerrar la tarea", "error");
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
                // --- DEDUPLICATION CHECK ---
                const { findDuplicate } = await import("@/lib/deduplication");
                const duplicate = findDuplicate(formData.title || "", tasks, 0.85); // High threshold

                if (duplicate) {
                    // Reuse confirm modal if possible, or just a custom confirm
                    // Since specific confirmModal state is complex, I'll use window.confirm for MVP rapid check
                    // OR reuse setConfirmModal if I can satisfy its interface
                    const confirmCreate = window.confirm(
                        `⚠️ POSIBLE DUPLICADO DETECTADO\n\n` +
                        `Esta tarea es muy similar a:\n` +
                        `[${duplicate.friendlyId}] ${duplicate.title}\n\n` +
                        `¿Deseas crearla de todos modos?`
                    );
                    if (!confirmCreate) {
                        setSaving(false);
                        return;
                    }
                }

                // [V3] Hierarchy Governance (New Task)
                let calculatedAncestors: string[] = [];
                if (formData.parentId) {
                    try {
                        // Pass 'tasks' as the universe. Since it's new, no ID to check for cycles.
                        calculatedAncestors = recalculateAncestors(formData.parentId, tasks);
                    } catch (e: any) {
                        showToast("Error de Jerarquía", e.message, "error");
                        setSaving(false);
                        return;
                    }
                }

                // [SMART ID] Removed client-side generation. Cloud Function assigns it.
                // We set a temporary marker or leave it null.
                const friendlyId = "Generando..."; // Temporary display

                // Clean actual effort before saving
                const finalActualEffort = typeof formData.actualEffort === 'string'
                    ? parseFloat((formData.actualEffort as any).replace(',', '.'))
                    : formData.actualEffort;

                const docRef = await createTask({
                    ...formData,
                    actualEffort: finalActualEffort ?? null,
                    ancestorIds: calculatedAncestors,
                    tenantId: tenantId || "1",
                    creationSource: 'manual_main'
                } as any, user?.uid || "unknown", addDoc, visibleProjects.find(p => p.id === formData.projectId)?.name);

                // Optimistic UI for local state
                const createdTask = { id: docRef.id, friendlyId: "Generando ID...", ...formData, ancestorIds: calculatedAncestors } as Task;
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

                    // Clean actual effort before saving
                    if (data.actualEffort !== undefined && data.actualEffort !== null) {
                        data.actualEffort = typeof data.actualEffort === 'string'
                            ? parseFloat((data.actualEffort as any).replace(',', '.'))
                            : data.actualEffort;
                    }

                    // [V3 Migration] Dual Write Strategy
                    // We write to progressV13 (New Truth) and sync legacy progress (Backup/Compat)
                    if (data.progress || data.progressV13) {
                        const safeP = getProgressSafe(formData);

                        // 1. Write Shadow Field
                        data.progressV13 = safeP;

                        // 2. Sync Legacy Field (Keep it as number for V12 compatibility)
                        // @ts-ignore
                        data.progress = safeP.actual;
                    }

                    // [V3] Hierarchy Governance (Move)
                    if (selectedTask.parentId !== formData.parentId) {
                        try {
                            const newAncestors = recalculateAncestors(formData.parentId, tasks, selectedTask.id);
                            data.ancestorIds = newAncestors;
                            // Also update local state 'data' to reflect change immediately?
                            // Yes, data is used for updateDoc below.
                        } catch (e: any) {
                            showToast("Error de Jerarquía", e.message, "error");
                            setSaving(false);
                            return;
                        }
                    }

                    // [BURNDOWN FIX] Set closedAt timestamp on completion/closure
                    const isClosedStatus = (s?: string) => s === 'completed' || s === 'discarded' || s === 'out_of_scope';
                    const wasClosed = selectedTask.status ? isClosedStatus(selectedTask.status) : false;
                    const isClosed = data.status ? isClosedStatus(data.status) : wasClosed;
                    if (isClosed && !wasClosed) {
                        data.closedAt = serverTimestamp();
                        data.closedBy = user?.uid;
                    } else if (!isClosed && wasClosed) {
                        // Re-opening task
                        data.closedAt = null;
                        data.closedBy = null as any;
                    }



                    await updateDoc(doc(db, "tasks", selectedTask.id), {
                        ...data,
                        updatedAt: serverTimestamp()
                    });

                    // [FIX] La tarea YA se guardó (updateDoc de arriba). Todo lo que sigue es
                    // bitácora/notificaciones "best-effort": si algo de esto explota (ej. una
                    // fecha inválida rompiendo format()), no debe mostrar "Error al guardar"
                    // ni saltarse el toast de éxito — el cambio real ya está en Firestore.
                    try {
                    // AUDIT LOG (Deadline Change)
                    if (selectedTask.endDate !== formData.endDate && user) {
                        const oldDate = selectedTask.endDate ? format(new Date(selectedTask.endDate), 'dd/MM/yy') : 'Sin fecha';
                        const newDate = formData.endDate ? format(new Date(formData.endDate), 'dd/MM/yy') : 'Sin fecha';
                        addDoc(collection(db, "task_activities"), {
                            taskId: selectedTask.id,
                            tenantId: tenantId,
                            userId: user.uid,
                            userEmail: user.email,
                            userName: user.displayName || 'Usuario',
                            type: 'deadline_change',
                            details: `Deadline cambiado de ${oldDate} a ${newDate}`,
                            createdAt: serverTimestamp()
                        }).catch(e => console.error("Audit Log Error", e));
                    }

                    // AUDIT LOG (Status, Assignment, Classification, Dependencies)
                    if (user) {
                        // 1. Status Change
                        if (selectedTask.status !== formData.status) {
                            addDoc(collection(db, "task_activities"), {
                                taskId: selectedTask.id,
                                tenantId: tenantId,
                                userId: user.uid,
                                userEmail: user.email,
                                userName: user.displayName || 'Usuario',
                                type: 'status_change',
                                details: `Estado cambiado de ${getStatusLabel(selectedTask.status)} a ${getStatusLabel(formData.status)}`,
                                createdAt: serverTimestamp()
                            }).catch(e => console.error("Audit Log Error (status_change)", e));

                            // CROSS-TRIGGER: Dependency Release
                            if (['completed', 'discarded', 'out_of_scope'].includes(formData.status || '')) {
                                const q = query(collection(db, "tasks"), where("dependencies", "array-contains", selectedTask.id), where("tenantId", "==", tenantId));
                                getDocs(q).then(snapshot => {
                                    snapshot.forEach(doc => {
                                        const statusWord = formData.status === 'completed' ? 'completada' : formData.status === 'discarded' ? 'descartada' : 'declarada fuera de alcance';
                                        addDoc(collection(db, "task_activities"), {
                                            taskId: doc.id,
                                            tenantId: tenantId,
                                            userId: user.uid,
                                            userEmail: user.email,
                                            userName: userProfile?.displayName || user.displayName || 'Usuario',
                                            type: 'dependency_released',
                                            details: `Dependencia liberada: "${selectedTask.title}" ha sido ${statusWord}.`,
                                            createdAt: serverTimestamp()
                                        }).catch(e => console.error("Audit Log Error (dependency_released)", e));
                                    });
                                }).catch(e => console.error("Audit Log Error (dependency release query)", e));
                            }
                        }

                        // 2. Assignment
                        if (selectedTask.assignedTo !== formData.assignedTo) {
                            const oldUser = users.find(u => u.uid === selectedTask.assignedTo)?.email || 'Sin asignar';
                            const newUser = users.find(u => u.uid === formData.assignedTo)?.email || 'Sin asignar';
                            addDoc(collection(db, "task_activities"), {
                                taskId: selectedTask.id,
                                tenantId: tenantId,
                                userId: user.uid,
                                userEmail: user.email,
                                userName: user.displayName || 'Usuario',
                                type: 'assignment_change',
                                details: `Responsable cambiado de ${oldUser} a ${newUser}`,
                                createdAt: serverTimestamp()
                            }).catch(e => console.error("Audit Log Error (assignment_change)", e));
                        }

                        // 3. Hierarchy Change [NEW V3]
                        if (selectedTask.type !== formData.type) {
                            addDoc(collection(db, "task_activities"), {
                                taskId: selectedTask.id,
                                tenantId: tenantId,
                                userId: user.uid,
                                userEmail: user.email,
                                userName: user.displayName || 'Usuario',
                                type: 'hierarchy_change',
                                details: `Tipo de tarea cambiado de "${selectedTask.type}" a "${formData.type}"`,
                                createdAt: serverTimestamp()
                            }).catch(e => console.error(e));
                        }

                        if (selectedTask.parentId !== formData.parentId) {
                            // Fetch parent titles if possible, or just log IDs for MVP
                            // To be fancy, we'd need to lookup the parent names from 'tasks' array
                            const oldParent = tasks.find(t => t.id === selectedTask.parentId)?.title || "Raíz";
                            const newParent = tasks.find(t => t.id === formData.parentId)?.title || "Raíz";

                            addDoc(collection(db, "task_activities"), {
                                taskId: selectedTask.id,
                                tenantId: tenantId,
                                userId: user.uid,
                                userEmail: user.email,
                                userName: user.displayName || 'Usuario',
                                type: 'hierarchy_move',
                                details: `Movido de "${oldParent}" a "${newParent}"`,
                                createdAt: serverTimestamp()
                            }).catch(e => console.error(e));
                        }


                        // 3. Classification (Generic Check for key fields)
                        ['priority', 'area', 'scope', 'module', 'sprintId'].forEach((field) => {
                            // @ts-ignore
                            if (selectedTask[field] !== formData[field]) {
                                addDoc(collection(db, "task_activities"), {
                                    taskId: selectedTask.id,
                                    tenantId: tenantId,
                                    userId: user.uid,
                                    userEmail: user.email,
                                    userName: userProfile?.displayName || user.displayName || 'Usuario',
                                    type: 'classification_change',
                                    // @ts-ignore
                                    details: `${field.charAt(0).toUpperCase() + field.slice(1)} cambiado de "${selectedTask[field] || '-'}" a "${formData[field] || '-'}"`,
                                    createdAt: serverTimestamp()
                                }).catch(e => console.error("Audit Log Error (classification_change)", e));
                            }
                        });

                        // 4. Dependencies (Added/Removed)
                        const oldDeps = selectedTask.dependencies || [];
                        const newDeps = formData.dependencies || [];
                        const addedDeps = newDeps.filter(d => !oldDeps.includes(d));
                        const removedDeps = oldDeps.filter(d => !newDeps.includes(d));

                        addedDeps.forEach(depId => {
                            const depTask = tasks.find(t => t.id === depId);
                            addDoc(collection(db, "task_activities"), {
                                taskId: selectedTask.id,
                                tenantId: tenantId,
                                userId: user.uid,
                                userEmail: user.email,
                                userName: user.displayName || 'Usuario',
                                type: 'dependency_added',
                                details: `Añadida dependencia: ${depTask?.title || depId}`,
                                createdAt: serverTimestamp()
                            }).catch(e => console.error("Audit Log Error (dependency_added)", e));
                        });

                        removedDeps.forEach(depId => {
                            const depTask = tasks.find(t => t.id === depId);
                            addDoc(collection(db, "task_activities"), {
                                taskId: selectedTask.id,
                                tenantId: tenantId,
                                userId: user.uid,
                                userEmail: user.email,
                                userName: user.displayName || 'Usuario',
                                type: 'dependency_removed',
                                details: `Eliminada dependencia: ${depTask?.title || depId}`,
                                createdAt: serverTimestamp()
                            }).catch(e => console.error("Audit Log Error (dependency_removed)", e));
                        });
                    }

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
                    } catch (auditError) {
                        // No relanzar: la tarea ya se guardó, esto es solo bitácora/notificación.
                        console.error("[TaskManagement] Error en audit log/notificaciones post-guardado (el cambio SÍ se guardó):", auditError);
                    }

                    setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, ...data } as Task : t));

                    // [FIX] Normalize Updated State
                    // Ensure the new selectedTask is perfectly aligned with formData to clear dirty flag
                    const updatedTask = { ...selectedTask, ...data } as Task;
                    const normalizedUpdated = {
                        ...updatedTask,
                        title: updatedTask.title || updatedTask.description || "",
                        dependencies: updatedTask.dependencies || [],
                        acceptanceCriteria: updatedTask.acceptanceCriteria || [],
                        attributes: updatedTask.attributes || {},
                        raci: updatedTask.raci || { responsible: [], accountable: [], consulted: [], informed: [] }
                    };

                    // Update selectedTask reference to match the new saved state exactly
                    setSelectedTask(normalizedUpdated);
                    // Also refresh formData to be safe, although it should match
                    setFormData(normalizedUpdated);

                    setIsNew(false);
                    showToast("UniTaskController", t('task_manager.saved'), "success");
                    if (isModal && onClose) {
                        onClose();
                    }
                }
            }
        } catch (e) {
            console.error(e);
            showToast("UniTaskController", t('task_manager.save_error'), "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        // Double Check UI shouldn't allow this, but safe guard
        if (!can('delete', 'tasks')) return showToast("UniTaskController", t('task_manager.no_project_permission'), "error");

        if (!selectedTask?.id || isNew) return;

        setConfirmModal({
            open: true,
            title: t('task_manager.delete_confirm_title'),
            message: t('task_manager.delete_confirm_message'),
            destructive: true,
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, "tasks", selectedTask.id));
                    setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
                    setSelectedTask(null);
                    showToast("UniTaskController", t('task_manager.deleted'), "success");
                    if (isModal && onClose) {
                        onClose();
                    }
                } catch (e) {
                    console.error(e);
                    showToast("UniTaskController", t('task_manager.delete_error'), "error");
                }
                setConfirmModal(null);
            }
        });
    };

    const handleCloseModal = () => {
        if (isDirty()) {
            setConfirmModal({
                open: true,
                title: t('task_manager.unsaved_changes'),
                message: t('task_manager.discard_and_close') || "¿Estás seguro de que deseas cerrar? Se perderán los cambios no guardados.",
                onConfirm: () => {
                    if (onClose) onClose();
                }
            });
            return;
        }
        if (onClose) onClose();
    };

    // Close modal on Escape
    useEffect(() => {
        if (!isModal) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                handleCloseModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isModal, formData, selectedTask, isNew]);

    // --- CUSTOM DATE PICKER COMPONENT ---
    const CustomDatePicker = ({ target, value, onClose, onSelect }: { target: string, value: string | undefined, onClose: () => void, onSelect: (d: string) => void }) => {
        const title = target === 'startDate' ? 'Fecha de Inicio' : target === 'clientDeadline' ? 'Deadline Cliente' : 'Fecha Fin';
        const today = startOfToday();

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
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                        <div key={d} className="text-[10px] text-zinc-600 font-bold">{d}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for start of month alignment (Mon-Sun) */}
                    {Array.from({ length: (getDay(startOfMonth(currentMonth)) + 6) % 7 }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}

                    {days.map(d => {
                        const valDate = value ? new Date(value) : null;
                        const isSelected = (valDate && isValid(valDate)) && isSameDay(valDate, d);
                        // Prevent selection of past dates for Deadline (endDate), but allow if already selected
                        const isPast = (target === 'endDate' || target === 'clientDeadline') && isBefore(d, today);
                        const isDisabled = isPast && !isSelected;

                        return (
                            <button
                                key={d.toISOString()}
                                disabled={isDisabled}
                                onClick={() => {
                                    if (!isDisabled) {
                                        onSelect(d.toISOString());
                                        onClose();
                                    }
                                }}
                                className={cn(
                                    "h-7 w-7 rounded-full flex items-center justify-center text-xs transition-all",
                                    isSelected ? "bg-indigo-600 text-white font-bold" :
                                        isDisabled ? "text-zinc-700 cursor-not-allowed decoration-zinc-700 line-through opacity-50" :
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
            case 'discarded': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            case 'out_of_scope': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
        }
    };

    const getStatusLabel = (s?: string) => {
        switch (s) {
            case 'completed': return t('task_manager.status_completed');
            case 'in_progress': return t('task_manager.status_in_progress');
            case 'review': return t('task_manager.status_review');
            case 'discarded': return t('task_manager.status_discarded');
            case 'out_of_scope': return t('task_manager.status_out_of_scope');
            default: return t('task_manager.status_pending');
        }
    };

    // --- RENDER ---
    // Removed Blocking Return for Restricted Users

    return (
        <div className="flex h-full bg-background text-foreground">
            {/* Sidebar List */}
            {!isModal && (
                <div className={cn("w-72 border-r border-border flex-shrink-0 transition-all duration-300 bg-card/30", selectedTask ? "hidden lg:block lg:w-72" : "w-full lg:w-72")}>
                <div className="h-full flex flex-col">
                    <div className={cn("p-4 border-b", isLight ? "bg-zinc-50 border-zinc-200" : "bg-muted/10 border-border")}>
                        <div className="flex justify-between items-center mb-3">
                            <h2 className={cn("text-xs font-bold uppercase tracking-wider", isLight ? "text-zinc-900" : "text-white")}>Tareas ({visibleTasks.length})</h2>
                            <button onClick={handleCreateClick} className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-all"><Plus className="w-3.5 h-3.5" /></button>
                        </div>

                        {/* Search & Filter */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center gap-2 mb-2">
                                <div className="relative flex-1">
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
                                <button
                                    onClick={() => setShowTree(!showTree)}
                                    className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                                    title={showTree ? "Ver Lista" : "Ver Jerarquía"}
                                >
                                    {showTree ? <List className="w-3.5 h-3.5" /> : <FolderGit2 className="w-3.5 h-3.5" />}
                                </button>
                                {/* Mind Map Sidebar Button (If filtering by project or general access) */}
                                <button
                                    onClick={() => {
                                        // Try to find context project, or open for first available?
                                        // For now, if we have a Task selected, use that.
                                        // If not, maybe just warn?
                                        // Actually, user wants access "from both places".
                                        // If filtering by project (tasks.length > 0), maybe pick the first one?
                                        if (projects.length > 0) {
                                            // Prefer current filter context if we had one...
                                            // But simplified: just open for the first project found if user has access
                                            setShowMindMap(projects[0].id);
                                        }
                                    }}
                                    className="p-1.5 rounded text-zinc-400 hover:text-indigo-400 hover:bg-white/5 transition-all"
                                    title="Abrir Mapa Jerárquico Completo"
                                >
                                    <Network className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {!showTree && (
                                <div className="grid grid-cols-7 gap-0.5 bg-black/20 rounded p-0.5 border border-white/5">
                                    {(['all', 'pending', 'in_progress', 'review', 'completed', 'discarded', 'out_of_scope'] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setSidebarFilter(f)}
                                            className={cn(
                                                "py-1 text-[8px] font-bold uppercase rounded transition-all flex items-center justify-center",
                                                sidebarFilter === f
                                                    ? "bg-indigo-600 text-white shadow-sm"
                                                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                            )}
                                            title={f === 'all' ? t('task_manager.filter_all') : getStatusLabel(f)}
                                        >
                                            {f === 'all' ? 'ALL' : f === 'in_progress' ? 'PROG' : f === 'out_of_scope' ? 'OUT' : f === 'discarded' ? 'DESC' : f.substring(0, 4).toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {showTree ? (
                        <HierarchyTree
                            tasks={tasks.filter(t => t.isActive !== false)} // Pass active tasks, tree handles filtering by context if needed
                            onSelectTask={handleSelectTask}
                            selectedTaskId={selectedTask?.id}
                        />
                    ) : (
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {visibleTasks.map(t => {
                                const project = projects.find(p => p.id === t.projectId);
                                return (
                                    <div key={t.id} onClick={() => handleSelectTask(t)} className={cn("group flex flex-col p-2.5 rounded-lg cursor-pointer transition-all border",
                                        selectedTask?.id === t.id
                                            ? (isLight ? "bg-zinc-900 border-zinc-900 shadow-sm" : "bg-primary/20 border-primary/50")
                                            : (isLight ? "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50" : "bg-card/50 border-transparent hover:bg-white/5 hover:border-white/5")
                                    )}>
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className={cn("font-mono text-[9px] opacity-70",
                                                    selectedTask?.id === t.id ? "text-white" : "text-zinc-500"
                                                )} >
                                                    <HighlightText text={t.friendlyId || 'No ID'} highlight={sidebarSearch} />
                                                </span>
                                                {/* STATUS LABEL (Highlighted) */}
                                                <span className={cn(
                                                    "text-[10px] uppercase px-1.5 py-0.5 rounded font-extrabold tracking-wider",
                                                    // Light theme: vibrant solid colors with white text
                                                    // Dark theme: translucent backgrounds with colored text
                                                    t.status === 'completed'
                                                        ? (isLight ? "bg-blue-600 text-white" : "bg-blue-500/20 text-blue-400")
                                                        : t.status === 'in_progress'
                                                            ? (isLight ? "bg-emerald-600 text-white" : "bg-emerald-500/20 text-emerald-400")
                                                            : t.status === 'review'
                                                                ? (isLight ? "bg-amber-600 text-white" : "bg-amber-500/20 text-amber-400")
                                                                : t.status === 'discarded'
                                                                    ? (isLight ? "bg-rose-600 text-white" : "bg-rose-500/20 text-rose-400")
                                                                    : t.status === 'out_of_scope'
                                                                        ? (isLight ? "bg-purple-600 text-white" : "bg-purple-500/20 text-purple-400")
                                                                        : (isLight ? "bg-zinc-500 text-white" : "bg-zinc-700/50 text-zinc-400")
                                                )}>
                                                    {t.status === 'in_progress' ? 'EN PROCESO' :
                                                        t.status === 'review' ? 'REVISIÓN' :
                                                            t.status === 'completed' ? 'HECHO' :
                                                                t.status === 'discarded' ? 'DESCARTADA' :
                                                                    t.status === 'out_of_scope' ? 'FUERA ALCANCE' : 'PENDIENTE'}
                                                </span>
                                            </div>
                                            {t.isBlocking && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                        </div>
                                        <div className={cn("text-[11px] line-clamp-2 mb-1.5 font-medium transition-colors",
                                            selectedTask?.id === t.id
                                                ? (isLight ? "text-white" : "text-white")
                                                : (isLight ? "text-zinc-900 group-hover:text-black" : "text-zinc-300 group-hover:text-white")
                                        )}>
                                            {t.title || t.description || "Sin Título"}
                                        </div>
                                        {project && <div className="text-[9px] text-zinc-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />{project.name}</div>}
                                        {t.sprintId && (
                                            <div className="text-[9px] flex items-center gap-1 text-emerald-500 ml-auto bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                <Timer className="w-2.5 h-2.5" />
                                                {sprints.find(s => s.id === t.sprintId)?.name || 'Sprint'}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            )}

            {/* Main Content */}
            <div className={cn("flex-1 flex flex-col min-w-0 bg-background", !selectedTask ? "hidden lg:flex" : "flex")}>
                {!selectedTask ? (
                    <div className={cn("flex-1 flex flex-col items-center justify-center", isLight ? "text-zinc-400" : "text-white")}>
                        {loading ? (
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        ) : (
                            <>
                                <LayoutTemplate className="w-12 h-12 mb-3 opacity-80" />
                                <p className={cn("text-sm font-medium", isLight ? "text-zinc-500" : "text-white")}>{t('task_manager.select_task')}</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar relative">
                        {/* Header */}
                        <div className={cn("backdrop-blur-sm border-b px-6 py-4 sticky top-0 z-10 shadow-lg shrink-0",
                            isLight ? "bg-white/90 border-zinc-200 shadow-zinc-200/50" : "bg-card/90 border-white/5 shadow-black/20"
                        )}>
                            <div className="max-w-6xl mx-auto">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col gap-1">
                                        <div className={cn("text-[10px] font-bold uppercase tracking-widest font-mono flex flex-wrap items-center gap-x-4 gap-y-2", isLight ? "text-zinc-500" : "text-zinc-400")}>
                                            <span>ID: {selectedTask.friendlyId || selectedTask.id}</span>

                                            {/* Dynamic Reception Blocks */}
                                            {/* Dynamic Attributes (User Defined Blocks) */}
                                            {/* Dynamic Attributes Removed from Header per User Request */}

                                            {/* Related Daily Status ID (Specific) */}
                                            <span className="text-zinc-400 flex items-center gap-1">| DAILY ID:
                                                <input
                                                    className={cn("bg-transparent outline-none w-16 border-b border-transparent hover:border-zinc-500 focus:border-indigo-500 transition-colors text-center p-0 h-4 font-mono", isLight ? "text-zinc-600" : "text-zinc-300")}
                                                    value={formData.relatedDailyStatusId || ""}
                                                    onChange={e => setFormData({ ...formData, relatedDailyStatusId: e.target.value })}
                                                    placeholder="-"
                                                />
                                            </span>
                                            <span className="text-zinc-400">| PRJ: <span className={cn(isLight ? "text-zinc-600" : "text-zinc-300")}>{projects.find(p => p.id === formData.projectId)?.code || "-"}</span></span>
                                            <span className="text-zinc-400">| <span className={cn(isLight ? "text-zinc-600" : "text-zinc-300")}>                                                            {(() => { const d = safeParseDate(formData.createdAt); return d ? format(d, 'dd/MM/yy', { locale: es }) : '-'; })()}</span></span>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="flex items-center gap-2">
                                            {/* [V3] Mind Map Button */}
                                            {selectedTask && (
                                                <button
                                                    onClick={() => setShowMindMap(formData.projectId || selectedTask.projectId || null)}
                                                    className={cn("p-1.5 rounded transition-all mr-1", isLight ? "text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100" : "text-zinc-500 hover:text-indigo-400 hover:bg-white/5")}
                                                    title="Ver en Mapa Jerárquico"
                                                >
                                                    <Network className="w-4 h-4" />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => setShowAuditLog(true)}
                                                className={cn("p-1.5 rounded transition-all mr-1", isLight ? "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5")}
                                                title="Ver Bitácora de Cambios"
                                            >
                                                <History className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={async () => {
                                                    const url = getShareUrl('tasks', selectedTask.id);
                                                    const success = await copyToClipboard(url);
                                                    if (success) showToast("UniTask", t('common.link_copied'), "success");
                                                }}
                                                className={cn("p-1.5 rounded transition-all mr-2", isLight ? "text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100" : "text-zinc-500 hover:text-indigo-400 hover:bg-white/5")}
                                                title="Copiar enlace de la tarea"
                                            >
                                                <Share2 className="w-4 h-4" />
                                            </button>
                                            <span className={cn("text-[10px] font-bold uppercase", isLight ? "text-zinc-500" : "text-zinc-400")}>Estado</span>
                                            <button onClick={() => setIsStatusOpen(!isStatusOpen)} className={cn("px-3 py-1 rounded text-xs font-bold border transition-all flex items-center gap-1.5", getStatusColor(formData.status))}>
                                                {getStatusLabel(formData.status)} <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                                            </button>
                                            {isModal && (
                                                <button
                                                    onClick={handleCloseModal}
                                                    className={cn("p-1.5 rounded transition-all ml-2", isLight ? "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5")}
                                                    title={t('common.close') || "Cerrar"}
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                        {isStatusOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setIsStatusOpen(false)} />
                                                <div className="absolute right-0 top-full mt-1 w-40 bg-popover border border-border rounded-lg shadow-2xl z-50 overflow-hidden py-1">
                                                    {(['pending', 'in_progress', 'review', 'completed', 'discarded', 'out_of_scope'] as const).map(s => (
                                                        <button key={s} onClick={() => { setFormData({ ...formData, status: s }); setIsStatusOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5 flex items-center gap-2">
                                                            <div className={cn("w-1.5 h-1.5 rounded-full", getStatusColor(s).replace('text-', 'bg-').split(' ')[0])} /> {getStatusLabel(s)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                    </div>
                                </div>


                                <div className="space-y-4 pt-2">

                                    {/* TITLE */}
                                    <div>
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
                                        className={cn("text-xl md:text-2xl font-bold bg-transparent outline-none w-[calc(100%-1rem)] ml-2 leading-tight",
                                            isLight ? "text-zinc-900 placeholder:text-zinc-400" : "text-white placeholder:text-zinc-600"
                                        )}
                                        value={formData.title || ""}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Escribe el título de la tarea..."
                                    />
                                </div>
                            </div>
                        </div>


                        <div className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                {/* Col 1 - Operativa (Ancho 9) */}
                                <div className="md:col-span-9 space-y-6">

                                    {/* Calendar & Responsable (Side by Side Grid) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                                        {/* Dates & Timeline (Schedule & Sprint) */}
                                        <div className={cn("border rounded-xl p-5 shadow-lg relative flex flex-col justify-between", isLight ? "bg-white border-zinc-200" : "bg-card border-white/10")}>
                                            <div>
                                                <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2", isLight ? "text-zinc-900" : "text-white")}>
                                                    <CalendarIcon className="w-3.5 h-3.5" />
                                                    {t('task_manager.schedule')}
                                                </h3>

                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* Sprint & Sprint End */}
                                                    <div className="relative group">
                                                        <label className={cn("text-[9px] font-bold uppercase block mb-1", isLight ? "text-zinc-500" : "text-white")}>Sprint / Ciclo</label>
                                                        <select
                                                            value={formData.sprintId || ""}
                                                            onChange={e => {
                                                                const newSprintId = e.target.value || null;
                                                                const currentSprintId = selectedTask?.sprintId || null;

                                                                // [STRICT RULE] Completed tasks have special restrictions
                                                                if (['completed', 'discarded', 'out_of_scope'].includes(selectedTask?.status || '') && currentSprintId) {
                                                                    // Rule 1: Cannot remove from sprint (set to backlog)
                                                                    if (!newSprintId) {
                                                                        alert(t('sprints.error_completed_no_backlog')); // "Completed tasks cannot be moved to backlog."
                                                                        return;
                                                                    }

                                                                    // Rule 2: Can only change sprint if Admin + source is active
                                                                    const sourceSprint = sprints.find(s => s.id === currentSprintId);
                                                                    if (newSprintId !== currentSprintId) {
                                                                        if (sourceSprint?.status === 'closed') {
                                                                            alert(t('sprints.error_completed_closed_sprint')); // "Cannot move completed task from closed sprint."
                                                                            return;
                                                                        }

                                                                        if (sourceSprint?.status === 'active') {
                                                                            if (!isAdmin) {
                                                                                alert(t('sprints.error_completed_active_sprint_permission')); // "Only Admins can move completed tasks from active sprint."
                                                                                return;
                                                                            }

                                                                            const confirmMove = window.confirm(t('sprints.confirm_completed_move')); // "Admin Override: Are you sure?"
                                                                            if (!confirmMove) return;
                                                                        }
                                                                    }
                                                                }

                                                                // [VALIDATION] Capacity Check
                                                                if (newSprintId) {
                                                                    const targetSprint = sprints.find(s => s.id === newSprintId);
                                                                    if (targetSprint) {
                                                                        const taskEffort = formData.estimatedEffort || 0;

                                                                        // Calculate current load of target sprint
                                                                        // Exclude current task id just in case (though onChange implies difference)
                                                                        const currentLoad = tasks
                                                                            .filter(t => t.sprintId === newSprintId && t.id !== formData.id)
                                                                            .reduce((sum, t) => sum + (t.estimatedEffort || 0), 0);

                                                                        const projectedLoad = currentLoad + taskEffort;
                                                                        const sprintLimit = targetSprint.plannedCapacity || targetSprint.capacity || 20;

                                                                        if (projectedLoad > sprintLimit) {
                                                                            const confirmOverload = window.confirm(
                                                                                `⚠️ ALERTA DE CAPACIDAD\n\n` +
                                                                                `Añadir esta tarea al Sprint "${targetSprint.name}" excederá su capacidad planificada.\n` +
                                                                                `Capacidad: ${sprintLimit} días\n` +
                                                                                `Actual + Tarea: ${projectedLoad.toFixed(1)} días\n\n` +
                                                                                `¿Deseas continuar de todos modos?`
                                                                            );
                                                                            if (!confirmOverload) return;
                                                                        }
                                                                    }
                                                                }

                                                                setFormData({ ...formData, sprintId: e.target.value });
                                                            }}
                                                            className={cn("w-full appearance-none border rounded-lg px-2.5 py-1.5 text-xs font-bold focus:ring-2 outline-none transition-all cursor-pointer",
                                                                isLight ? "bg-zinc-50 border-zinc-300 text-zinc-900 focus:ring-indigo-500/50" : "bg-black/20 border-white/10 text-white focus:ring-indigo-500/50"
                                                            )}
                                                        >
                                                            <option value="">Sin Asignar (Backlog)</option>
                                                            {sprints.map(s => (
                                                                <option key={s.id} value={s.id}>
                                                                    {s.name} ({s.status.toUpperCase()})
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {formData.sprintId && sprints.find(s => s.id === formData.sprintId)?.status === 'active' && (
                                                            <div className="absolute right-2 top-7">
                                                                <span className="relative flex h-2 w-2">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="relative group">
                                                        <label className={cn("text-[9px] font-bold uppercase block mb-1 text-zinc-400")}>
                                                            Final de Sprint
                                                        </label>
                                                        <div
                                                            className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-muted/50 cursor-not-allowed",
                                                                isLight ? "border-zinc-200" : "border-white/5"
                                                            )}
                                                        >
                                                            <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                                                            <span className="text-xs font-mono text-muted-foreground truncate">
                                                                {formData.sprintId && sprints.find(s => s.id === formData.sprintId)?.endDate
                                                                    ? (() => { const d = safeParseDate(sprints.find(s => s.id === formData.sprintId)?.endDate); return d ? format(d, 'dd MMM yy', { locale: es }) : '-'; })()
                                                                    : '-'
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Dates */}
                                                    <div className="relative group">
                                                        <label className={cn("text-[9px] font-bold uppercase block mb-1", isLight ? "text-zinc-500" : "text-white")}>{t('task_manager.start_date')}</label>
                                                        <div className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border", isLight ? "bg-zinc-50 border-zinc-200" : "bg-black/20 border-white/5")}>
                                                            <CalendarIcon className="w-3.5 h-3.5 text-zinc-500" />
                                                            <span className="text-xs text-zinc-500 font-mono truncate">
                                                                {(() => { const d = safeParseDate(formData.createdAt); return d ? format(d, 'dd MMM yy', { locale: es }) : (isNew ? format(new Date(), 'dd MMM yy', { locale: es }) : 'Pendiente'); })()}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="relative group">
                                                        <label className={cn("text-[9px] font-bold uppercase block mb-1", isLight ? "text-red-600" : "text-red-400")}>{t('task_manager.end_date')}</label>
                                                        <div
                                                            className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer hover:border-indigo-500/50 transition-colors",
                                                                isLight ? "bg-white border-zinc-200" : "bg-black/20 border-white/5"
                                                            )}
                                                            onClick={() => { setDatePickerTarget('endDate'); setCurrentMonth(formData.endDate ? new Date(formData.endDate) : new Date()); }}
                                                        >
                                                            <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                                                            <span className={cn("text-xs font-mono truncate", isLight ? "text-zinc-900" : "text-zinc-300")}>
                                                                {(() => { const d = safeParseDate(formData.endDate); return d ? format(d, 'dd MMM yy', { locale: es }) : 'Seleccionar'; })()}
                                                            </span>
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
                                        </div>

                                        {/* Assignment (Responsable de Tarea) */}
                                        <div className={cn("border rounded-xl p-5 shadow-lg relative flex flex-col justify-between", isLight ? "bg-white border-zinc-200" : "bg-card border-white/10")}>
                                            <div>
                                                <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2", isLight ? "text-zinc-900" : "text-white")}>
                                                    <Users className="w-3.5 h-3.5" />
                                                    {t('task_manager.task_owner')}
                                                </h3>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-indigo-600/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                                        <UserIcon className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <select
                                                            className={cn("w-full appearance-none border rounded-lg px-2.5 py-1.5 text-xs font-bold focus:ring-2 outline-none transition-all cursor-pointer",
                                                                isLight ? "bg-zinc-50 border-zinc-300 text-zinc-900 focus:ring-indigo-500/50" : "bg-black/20 border-white/10 text-white focus:ring-indigo-500/50"
                                                            )}
                                                            value={formData.assignedTo || ""}
                                                            onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                                                            disabled={!!(formData.sprintId && sprints.find(s => s.id === formData.sprintId)?.status === 'active' && !isAdmin && getRoleLevel(userRole) < 60)}
                                                        >
                                                            <option value="">{t('task_manager.select_owner')}</option>
                                                            {users.map(u => (
                                                                <option key={u.uid} value={u.uid}>
                                                                    {u.displayName} ({u.role?.replace('_', ' ')})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-zinc-500 italic mt-auto pt-4">
                                                {t('task_manager.assignment_notification')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tech Desc (Renamed) */}
                                    <div className={cn("border rounded-xl p-5 shadow-lg", isLight ? "bg-white border-zinc-200" : "bg-card border-white/10")}>
                                        <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-3", isLight ? "text-zinc-900" : "text-white")}>{t('task_manager.description')}</h3>
                                        <textarea
                                            className={cn("w-full min-h-[250px] border rounded-lg p-3 text-xs focus:outline-none resize-y font-mono",
                                                isLight ? "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-400" : "bg-black/20 border-white/5 text-zinc-300 focus:border-indigo-500/50"
                                            )}
                                            value={formData.techDescription || ""}
                                            onChange={e => setFormData({ ...formData, techDescription: e.target.value })}
                                            placeholder="Detalles..."
                                        />
                                    </div>

                                    {/* Comments Section */}
                                    <div className={cn("border rounded-xl p-5 shadow-lg", isLight ? "bg-white border-zinc-200" : "bg-card border-white/10")}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <h3 className={cn("text-xs font-bold uppercase tracking-wider", isLight ? "text-zinc-900" : "text-white")}>
                                                    {t('comments.title')}
                                                </h3>
                                                {comments.length > 0 && (
                                                    <button
                                                        onClick={() => setCommentsExpanded(!commentsExpanded)}
                                                        className={cn(
                                                            "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold transition-all",
                                                            isLight
                                                                ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                                                                : "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
                                                        )}
                                                        title={`${comments.length} comentarios`}
                                                    >
                                                        {comments.length}
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setCommentsExpanded(!commentsExpanded)}
                                                className={cn(
                                                    "p-1.5 rounded-lg transition-all flex items-center gap-1 text-[10px] font-bold",
                                                    isLight
                                                        ? "text-indigo-600 hover:bg-indigo-50"
                                                        : "text-indigo-400 hover:bg-indigo-500/10"
                                                )}
                                            >
                                                <Plus className="w-3 h-3" />
                                                {t('comments.add')}
                                            </button>
                                        </div>

                                        {/* Expanded Comments Panel */}
                                        {commentsExpanded && (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                                {/* New Comment Input */}
                                                <div className="relative">
                                                    <textarea
                                                        className={cn(
                                                            "w-full min-h-[100px] border rounded-lg p-3 text-xs focus:outline-none resize-y",
                                                            isLight
                                                                ? "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-indigo-400 placeholder:text-zinc-400"
                                                                : "bg-black/20 border-white/10 text-zinc-300 focus:border-indigo-500/50 placeholder:text-zinc-600"
                                                        )}
                                                        value={newComment}
                                                        onChange={(e) => {
                                                            setNewComment(e.target.value);
                                                            // Check for @ mentions
                                                            const lastAt = e.target.value.lastIndexOf('@');
                                                            if (lastAt !== -1 && lastAt === e.target.value.length - 1 ||
                                                                (lastAt !== -1 && e.target.value.substring(lastAt + 1).match(/^[a-zA-Z0-9_ñÑáéíóúÁÉÍÓÚüÜ.-]*$/))) {
                                                                setShowMentionSuggestions(true);
                                                                setMentionSearch(e.target.value.substring(lastAt + 1));
                                                            } else {
                                                                setShowMentionSuggestions(false);
                                                            }
                                                        }}
                                                        placeholder={t('comments.placeholder')}
                                                    />

                                                    {/* Mention Suggestions */}
                                                    {showMentionSuggestions && (
                                                        <div className={cn(
                                                            "absolute bottom-full left-0 right-0 mb-1 border rounded-lg shadow-xl max-h-32 overflow-y-auto z-50",
                                                            isLight ? "bg-white border-zinc-200" : "bg-popover border-border"
                                                        )}>
                                                            {users
                                                                .filter(u => {
                                                                    const searchNorm = mentionSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                                                    const nameNorm = (u.displayName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                                                    return nameNorm.includes(searchNorm);
                                                                })
                                                                .slice(0, 5)
                                                                .map(u => (
                                                                    <button
                                                                        key={u.uid}
                                                                        onClick={() => {
                                                                            const lastAt = newComment.lastIndexOf('@');
                                                                            setNewComment(newComment.substring(0, lastAt) + `@${u.displayName} `);
                                                                            setShowMentionSuggestions(false);
                                                                        }}
                                                                        className={cn(
                                                                            "w-full text-left px-3 py-2 text-xs flex items-center gap-2 border-b last:border-0",
                                                                            isLight
                                                                                ? "hover:bg-zinc-50 border-zinc-100 text-zinc-700"
                                                                                : "hover:bg-white/5 border-white/5 text-zinc-300"
                                                                        )}
                                                                    >
                                                                        <div className={cn(
                                                                            "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold",
                                                                            isLight ? "bg-indigo-100 text-indigo-600" : "bg-indigo-500/20 text-indigo-400"
                                                                        )}>
                                                                            {u.displayName?.substring(0, 2).toUpperCase()}
                                                                        </div>
                                                                        {u.displayName}
                                                                    </button>
                                                                ))}
                                                        </div>
                                                    )}

                                                    {newComment.trim() && (
                                                        <button
                                                            onClick={async () => {
                                                                if (!selectedTask?.id || !user || !tenantId) return;
                                                                const mentions = parseMentions(newComment, users);
                                                                await addComment(
                                                                    selectedTask.id,
                                                                    tenantId,
                                                                    user.uid,
                                                                    user.displayName || 'Usuario',
                                                                    user.photoURL || undefined,
                                                                    newComment,
                                                                    mentions
                                                                );
                                                                setNewComment("");
                                                            }}
                                                            className="absolute bottom-2 right-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all"
                                                        >
                                                            <MessageSquare className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Comments List (Newest First) */}
                                                {comments.length === 0 ? (
                                                    <div className={cn("text-center py-4 text-xs", isLight ? "text-zinc-400" : "text-zinc-500")}>
                                                        {t('comments.empty')}
                                                    </div>
                                                ) : (
                                                    <div className={cn("space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pl-3 border-l", isLight ? "border-zinc-200" : "border-white/10")}>
                                                        {comments.map(comment => (
                                                            <div key={comment.id} className={cn("p-3 rounded-lg", isLight ? "bg-zinc-50" : "bg-black/20")}>
                                                                <p className={cn("text-xs mb-2 whitespace-pre-wrap", isLight ? "text-zinc-700" : "text-zinc-300")}>
                                                                    {comment.content}
                                                                </p>
                                                                <div className={cn("flex items-center gap-2 text-[10px]", isLight ? "text-zinc-400" : "text-zinc-500")}>
                                                                    <span className="font-medium">{comment.authorName}</span>
                                                                    <span>•</span>
                                                                    <span>{formatRelativeTime(comment.createdAt, t)}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Dependencies (Movido de derecha) */}
                                    <div className={cn("border rounded-xl p-5 shadow-lg", isLight ? "bg-white border-zinc-200" : "bg-card border-white/10")}>
                                        <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-3", isLight ? "text-zinc-900" : "text-white")}>{t('task_manager.dependencies')}</h3>

                                        {/* List Existing */}
                                        <div className="space-y-2 mb-3">
                                            {formData.dependencies?.map(depId => {
                                                const depTask = tasks.find(t => t.id === depId);
                                                const depNode = projectHierarchyNodes.find(n => n.id === depId);

                                                if (!depTask && !depNode) return null;
                                                // If it's a regular task, hide if closed
                                                if (depTask && ['completed', 'discarded', 'out_of_scope'].includes(depTask.status)) return null;

                                                const title = depNode ? depNode.title : depTask?.title;
                                                const identifier = depNode ? (depNode.wbs ? `[WBS: ${depNode.wbs}]` : '') : (depTask?.friendlyId || 'Unknown');

                                                return (
                                                    <div key={depId} className="flex items-center gap-3 p-2 bg-red-500/5 text-red-400 rounded-lg text-xs border border-red-500/10 justify-between group hover:border-red-500/30 transition-all">
                                                        <button
                                                            onClick={() => depTask && handleSelectTask(depTask)}
                                                            className={cn("flex items-center gap-2 text-left flex-1 outline-none", !depTask && "cursor-default")}
                                                            title={depTask ? "Ver Tarea Dependiente" : "Nodo del Cronograma"}
                                                        >
                                                            <AlertTriangle className="w-4 h-4 shrink-0" />
                                                            <div>
                                                                <span className="font-bold block text-[9px] uppercase opacity-70">{t('task_manager.blocked_by')}</span>
                                                                <div className={cn("font-medium transition-all", depTask ? "text-zinc-300 hover:text-red-300 underline underline-offset-2 decoration-red-500/30" : "text-zinc-400")}>
                                                                    {identifier} {title}
                                                                </div>
                                                            </div>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const newDeps = formData.dependencies?.filter(d => d !== depId);
                                                                setFormData({ ...formData, dependencies: newDeps });
                                                            }}
                                                            className="p-1 hover:bg-red-500/20 rounded text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Eliminar Dependencia"
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
                                                    {projectHierarchyNodes
                                                        .filter(n =>
                                                            n.id !== formData.id && // Don't depend on self
                                                            ((n.wbs && n.wbs.toLowerCase().includes(dependencySearch.toLowerCase())) ||
                                                                n.title?.toLowerCase().includes(dependencySearch.toLowerCase()))
                                                        )
                                                        .slice(0, 10)
                                                        .map(n => (
                                                            <button
                                                                key={n.id}
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    if (!formData.dependencies?.includes(n.id)) {
                                                                        setFormData({ ...formData, dependencies: [...(formData.dependencies || []), n.id] });
                                                                    }
                                                                    setDependencySearch("");
                                                                }}
                                                                className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:bg-white/5 hover:text-white border-b border-white/5 last:border-0"
                                                            >
                                                                {n.wbs && <span className="font-bold font-mono text-indigo-400 mr-2">[{n.wbs}]</span>}
                                                                {n.title}
                                                            </button>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>


                                </div>

                                {/* Col 2 - Metadatos (Ancho 3) */}
                                <div className="md:col-span-3 space-y-6">

                                    {/* Project Selector - Added context block (Movido de izquierda) */}
                                    <div className={cn("border rounded-xl p-5 shadow-lg", isLight ? "bg-white border-zinc-200" : "bg-card border-white/10")}>
                                        <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-3", isLight ? "text-zinc-900" : "text-white")}>{t('task_manager.classification_project')}</h3>

                                        <div className="space-y-4">
                                            {/* 1. Project Selector */}
                                            <div>
                                                <label className={cn("text-[10px] font-bold uppercase mb-1 block", isLight ? "text-zinc-500" : "text-zinc-400")}>{t('task_manager.assigned_project')}</label>
                                                <div className="flex items-center gap-2">
                                                    <FolderGit2 className="w-4 h-4 text-indigo-500" />
                                                    <select
                                                        className={cn("border rounded-lg px-3 py-2 text-xs focus:outline-none w-full disabled:opacity-50 disabled:cursor-not-allowed",
                                                            isLight ? "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-400" : "bg-black/20 border-white/5 text-zinc-300 focus:border-indigo-500/50"
                                                        )}
                                                        value={formData.projectId || ""}
                                                        onChange={e => {
                                                            const pid = e.target.value;
                                                            const proj = visibleProjects.find(p => p.id === pid);
                                                            setFormData({
                                                                ...formData,
                                                                projectId: pid,
                                                                projectCode: proj?.code || 'TSK'
                                                            });
                                                        }}
                                                        disabled={!isNew}
                                                    >
                                                        <option value="" disabled>{t('task_manager.select_project')}</option>
                                                        {visibleProjects.map(p => (
                                                            <option key={p.id} value={p.id}>{p.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {!isNew && <div className="text-[9px] text-zinc-600 dark:text-zinc-500 mt-1">{t('task_manager.project_locked')}</div>}
                                            </div>

                                            {/* Stacked Layout for Classification */}

                                            {/* Priority */}
                                            <div>
                                                <label className={cn("text-[10px] font-bold uppercase mb-1 block", isLight ? "text-zinc-500" : "text-zinc-400")}>{getLabel('priority')}</label>
                                                <PowerSelect
                                                    value={formData.priority || ""}
                                                    onChange={(val) => setFormData({ ...formData, priority: val as any })}
                                                    options={[
                                                        ...(masterData.priority?.map(i => ({ value: i.name, label: i.name, color: i.color })) || []),
                                                        ...((!masterData.priority || masterData.priority.length === 0) ? [
                                                            { value: 'low', label: 'Baja', color: '#10b981' },
                                                            { value: 'medium', label: 'Media', color: '#f59e0b' },
                                                            { value: 'high', label: 'Alta', color: '#ef4444' }
                                                        ] : [])
                                                    ]}
                                                    placeholder="Normal"
                                                />
                                            </div>

                                            {/* Estimation (New Integration in Metadata) */}
                                            <div>
                                                <label className={cn("text-[10px] font-bold uppercase mb-1 block", isLight ? "text-zinc-500" : "text-zinc-400")}>
                                                    Estimación
                                                </label>
                                                <select
                                                    value={formData.estimatedEffortSize || ""}
                                                    onChange={e => {
                                                        const size = e.target.value as 'XS' | 'S' | 'M' | 'L' | 'XL' | '';
                                                        const days = size ? tshirtToDays(size) : undefined;
                                                        setFormData({ ...formData, estimatedEffortSize: size || undefined, estimatedEffort: days });
                                                    }}
                                                    className={cn("w-full appearance-none border rounded-lg px-3 py-2 text-xs font-bold outline-none transition-all cursor-pointer",
                                                        isLight ? "bg-zinc-50 border-zinc-300 text-zinc-900" : "bg-black/20 border-white/10 text-white"
                                                    )}
                                                >
                                                    <option value="">Sin estimar</option>
                                                    <option value="XS">XS (1h)</option>
                                                    <option value="S">S (0.5d)</option>
                                                    <option value="M">M (2d)</option>
                                                    <option value="L">L (1w)</option>
                                                    <option value="XL">XL (2w)</option>
                                                </select>
                                            </div>

                                            {/* Actual Effort (Conditional) */}
                                            {formData.status === 'completed' && (
                                                <div>
                                                    <label className={cn("text-[10px] font-bold uppercase mb-1 block flex items-center gap-1", isLight ? "text-zinc-500" : "text-zinc-400")}>
                                                        Esfuerzo Real <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formData.actualEffort !== undefined && formData.actualEffort !== null ? formData.actualEffort : ""}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            // Basic regex to allow numbers and decimal separators
                                                            if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                                                                setFormData({ ...formData, actualEffort: val as any });
                                                            }
                                                        }}
                                                        onBlur={e => {
                                                            // On blur we can normalize decimal separator if needed, 
                                                            // but let's keep it simple and just let the string stay until save.
                                                            const val = e.target.value.replace(',', '.');
                                                            if (val && !isNaN(parseFloat(val))) {
                                                                setFormData({ ...formData, actualEffort: val as any });
                                                            }
                                                        }}
                                                        placeholder="Días reales"
                                                        className={cn("w-full border rounded-lg px-3 py-2 text-xs font-bold outline-none transition-all",
                                                            isLight ? "bg-zinc-50 border-zinc-300 text-zinc-900" : "bg-black/20 border-white/10 text-white"
                                                        )}
                                                    />
                                                </div>
                                            )}
                                            {/* Area */}
                                            <div>
                                                <label className={cn("text-[10px] font-bold uppercase mb-1 block", isLight ? "text-zinc-500" : "text-zinc-400")}>{getLabel('area')} *</label>
                                                <PowerSelect
                                                    value={formData.area || ""}
                                                    onChange={(val) => setFormData({ ...formData, area: val })}
                                                    options={(masterData.area || []).map(i => ({ value: i.name, label: i.name, color: i.color }))}
                                                    placeholder="Seleccionar Área"
                                                />
                                            </div>

                                            {/* Scope */}
                                            <div>
                                                <label className={cn("text-[10px] font-bold uppercase mb-1 block", isLight ? "text-zinc-500" : "text-zinc-400")}>{getLabel('scope')}</label>
                                                <PowerSelect
                                                    value={formData.scope || ""}
                                                    onChange={(val) => setFormData({ ...formData, scope: val })}
                                                    options={(masterData.scope || []).map(i => ({ value: i.name, label: i.name, color: i.color }))}
                                                    placeholder="Seleccionar Alcance"
                                                />
                                            </div>

                                            {/* Module */}
                                            <div>
                                                <label className={cn("text-[10px] font-bold uppercase mb-1 block", isLight ? "text-zinc-500" : "text-zinc-400")}>{getLabel('module')} *</label>
                                                <PowerSelect
                                                    value={formData.module || ""}
                                                    onChange={(val) => setFormData({ ...formData, module: val })}
                                                    options={(masterData.module || []).map(i => ({ value: i.name, label: i.name, color: i.color }))}
                                                    placeholder="Seleccionar Módulo"
                                                />
                                            </div>

                                            {/* Dynamic Attributes (Exclude System Blocks) */}
                                            {attributeDefinitions.filter(attr => {
                                                const systemKeys = ['priority', 'area', 'scope', 'module'];
                                                return !systemKeys.includes(attr.id) && !systemKeys.includes(attr.mappedField as any);
                                            }).map(attr => (
                                                <div key={attr.id}>
                                                    <label className={cn("text-[10px] font-bold uppercase mb-1 block", isLight ? "text-zinc-500" : "text-zinc-400")}>
                                                        {attr.name}
                                                    </label>
                                                    <PowerSelect
                                                        value={formData.attributes?.[attr.id] || ""}
                                                        onChange={(val) => setFormData({
                                                            ...formData,
                                                            attributes: {
                                                                ...(formData.attributes || {}),
                                                                [attr.id]: val
                                                            }
                                                        })}
                                                        options={(masterData[attr.id] || []).map(i => ({ value: i.id, label: i.name, color: i.color }))}
                                                        placeholder={`Seleccionar ${attr.name}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Hierarchy Controls [V3] */}
                                    <div className={cn("border rounded-xl p-5 shadow-lg", isLight ? "bg-white border-zinc-200" : "bg-card border-white/10")}>
                                        <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-3", isLight ? "text-zinc-900" : "text-white")}>Jerarquía (V3)</h3>
                                        <div className="space-y-4">
                                            {/* Type */}
                                            <div>
                                                <label className={cn("text-[10px] font-bold uppercase mb-1 block", isLight ? "text-zinc-500" : "text-zinc-400")}>Tipo de Elemento</label>
                                                <select
                                                    className={cn("w-full border rounded-lg px-3 py-2 text-xs font-bold focus:outline-none",
                                                        isLight ? "bg-zinc-50 border-zinc-300" : "bg-zinc-950 border-white/10 text-zinc-300"
                                                    )}
                                                    value={formData.type || 'task'}
                                                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                                >
                                                    <option value="epic">Epica / Fase</option>
                                                    <option value="task">Tarea Estándar</option>
                                                    <option value="subtask">Subtarea / Checklist</option>
                                                    <option value="milestone">Hito (Milestone)</option>
                                                </select>
                                            </div>

                                            {/* Parent Selector */}
                                            <div>
                                                <label className={cn("text-[10px] font-bold uppercase mb-1 block", isLight ? "text-zinc-500" : "text-zinc-400")}>
                                                    Padre (Mover a...)
                                                </label>
                                                <select
                                                    className={cn("w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none truncate",
                                                        isLight ? "bg-zinc-50 border-zinc-300" : "bg-zinc-950 border-white/10 text-zinc-300"
                                                    )}
                                                    value={formData.parentId || ""}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setFormData({ ...formData, parentId: val === "" ? undefined : val });
                                                    }}
                                                >
                                                    <option value="">(Raíz / Sin Padre)</option>

                                                    {/* 1. Hierarchy Nodes (from Import) */}
                                                    {projectHierarchyNodes.length > 0 && (
                                                        <optgroup label="Nodos del Cronograma (Plan)">
                                                            {projectHierarchyNodes.map(node => (
                                                                <option key={node.id} value={node.id}>
                                                                    {node.type === 'root_epic' ? '🟢 ' : node.type === 'epic' ? '🔵 ' : '🟣 '}{node.title.substring(0, 50)} {node.wbs ? `(WBS: ${node.wbs})` : ''}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    )}

                                                    {/* 2. Standard Tasks (Fallback/Manual) */}
                                                    <optgroup label="Tareas del Proyecto">
                                                        {tasks
                                                            .filter(t => t.id !== formData.id && t.projectId === formData.projectId) // Valid parents (Same Project, Not Self)
                                                            .map(t => (
                                                                <option key={t.id} value={t.id}>
                                                                    {t.friendlyId ? `[${t.friendlyId}] ` : ''}{t.title.substring(0, 40)}
                                                                </option>
                                                            ))}
                                                    </optgroup>
                                                </select>
                                                {/* Ancestor Debug Info */}
                                                {formData.ancestorIds && formData.ancestorIds.length > 0 && (
                                                    <div className="text-[9px] text-zinc-500 mt-1 font-mono">
                                                        Path: {formData.ancestorIds.join(' > ')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Trazabilidad [V13.5.5] */}
                                    {!isNew && (
                                        <div className={cn("border rounded-xl p-5 shadow-lg relative overflow-hidden", isLight ? "bg-zinc-50 border-zinc-200" : "bg-card border-white/10")}>
                                            <div className="absolute top-0 right-0 p-3 opacity-10">
                                                <Fingerprint className="w-12 h-12" />
                                            </div>
                                            <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2", isLight ? "text-zinc-600" : "text-zinc-400")}>
                                                <Fingerprint className="w-3.5 h-3.5" />
                                                {t('traceability.title')}
                                            </h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-[11px]">
                                                    <span className="text-zinc-500">{t('traceability.created_by')}</span>
                                                    <span className={cn("font-bold flex items-center gap-1.5", isLight ? "text-zinc-900" : "text-zinc-200")}>
                                                        <div className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[8px]">
                                                            {users.find(u => u.uid === formData.createdBy)?.displayName?.substring(0, 1) || "?"}
                                                        </div>
                                                        {users.find(u => u.uid === formData.createdBy)?.displayName || "Sistema / IA"}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-[11px]">
                                                    <span className="text-zinc-500">{t('traceability.created_at')}</span>
                                                    <span className={cn("font-mono", isLight ? "text-zinc-900" : "text-white")}>
                                                        {(() => {
                                                            const d = safeParseDate(formData.createdAt);
                                                            return d ? format(d, 'dd MMM yyyy HH:mm', { locale: es }) : '-';
                                                        })()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-[11px]">
                                                    <span className="text-zinc-500">{t('traceability.source')}</span>
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-tighter",
                                                        formData.creationSource?.startsWith('ai_')
                                                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                                            : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                                    )}>
                                                        {t(`traceability.sources.${formData.creationSource || 'manual_main'}`)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions (Existente) */}
                                    <div className="pt-2 border-t border-white/5 flex flex-col gap-3">
                                        <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-indigo-900/30 transition-all flex justify-center items-center gap-2 text-xs uppercase tracking-wide">
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t('task_manager.save_changes')}
                                        </button>
                                        {!isNew && can('delete', 'tasks') && <button onClick={handleDelete} className="w-full py-3 bg-transparent border border-white/10 text-red-400 hover:bg-red-500/10 hover:border-red-500/20 font-bold rounded-lg transition-all text-xs uppercase tracking-wide">{t('task_manager.delete_task')}</button>}
                                        {isModal && (
                                            <button onClick={handleCloseModal} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold rounded-lg transition-all text-xs uppercase tracking-wide">
                                                {t('common.cancel') || 'Cancelar'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>




                        {/* Confirmation Modal */}
                        {
                            confirmModal && confirmModal.open && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                                    <div className="bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 scale-100 animate-in zoom-in-95 duration-200">
                                        <h3 className="text-lg font-bold text-white mb-2">{confirmModal.title}</h3>
                                        <p className="text-sm text-zinc-400 mb-6">{confirmModal.message}</p>
                                        <div className="flex justify-end gap-3">
                                            <button
                                                onClick={() => setConfirmModal(null)}
                                                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                                            >
                                                {t('task_manager.cancel')}
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
                                                {t('task_manager.confirm')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        {/* Mind Map Modal */}
                        {
                            showMindMap && projects.length > 0 && (
                                <ProjectMindMapModal
                                    project={projects.find(p => p.id === showMindMap) || projects[0]} // Fallback or logic to handle 'not found'
                                    initialTaskId={selectedTask?.id}
                                    onClose={() => setShowMindMap(null)}
                                />
                            )
                        }

                        {/* Audit Log Modal */}
                        {
                            selectedTask && showAuditLog && (
                                <ActivityAuditModal
                                    taskId={selectedTask.id}
                                    onClose={() => setShowAuditLog(false)}
                                    isLight={isLight}
                                    theme={theme}
                                />
                            )
                        }
                    </div>
                )
                }
            </div>
        </div >
    );
};


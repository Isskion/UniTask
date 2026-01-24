"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, query, orderBy, serverTimestamp, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useSafeFirestore } from "@/hooks/useSafeFirestore";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/hooks/useTheme";
import { Loader2, Plus, Edit2, Save, XCircle, Search, Trash2, CheckSquare, ListTodo, AlertTriangle, ArrowLeft, LayoutTemplate, Calendar as CalendarIcon, Link as LinkIcon, Users, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, X, User as UserIcon, FolderGit2, Sparkles, FileText, History, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task, Project, UserProfile, AttributeDefinition, MasterDataItem } from "@/types";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfToday, getDay } from "date-fns";
import { es, enUS, de, fr, ca, pt } from "date-fns/locale";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { FileUploader } from "./FileUploader";
import { PowerSelect } from "./ui/PowerSelect";
import { ActivityAuditModal } from "./ActivityAuditModal";
import HighlightText from "./ui/HighlightText";
import { addComment, subscribeToComments, parseMentions, formatRelativeTime, TaskComment } from "@/lib/comments";
import { MessageSquare } from "lucide-react";

// Local MasterDataItem definition removed in favor of types.ts


export default function TaskManagement({ initialTaskId }: { initialTaskId?: string | null }) {
    const { userRole, user, tenantId } = useAuth();
    const { addDoc, updateDoc, deleteDoc } = useSafeFirestore();
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const { showToast } = useToast();
    const { t, language } = useLanguage();
    const dateLocale = { en: enUS, es, de, fr, ca, pt }[language] || enUS;
    const { isAdmin: checkIsAdmin, can, permissions } = usePermissions();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<any>(null);

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
        if (initialTaskId && processedInitialRef.current !== initialTaskId) {
            const loadDeepLinkedTask = async () => {
                try {
                    const { doc, getDoc } = await import("firebase/firestore");
                    const docRef = doc(db, "tasks", initialTaskId);
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        const taskData = { id: snap.id, ...snap.data() } as Task;
                        // Determine status of this task to set sidebar filter?
                        // For now just set selectedTask.

                        // [FIX] Normalization for Deep Link
                        const normalizedTask = {
                            ...taskData,
                            title: taskData.title || taskData.description || "",
                            // Ensure arrays are at least empty arrays, not undefined
                            dependencies: taskData.dependencies || [],
                            acceptanceCriteria: taskData.acceptanceCriteria || [],
                            attributes: taskData.attributes || {},
                            raci: taskData.raci || { responsible: [], accountable: [], consulted: [], informed: [] }
                        };

                        setSelectedTask(normalizedTask);
                        setFormData(normalizedTask); // Sync Form Data
                        setSidebarFilter('all'); // Ensure visibility
                        processedInitialRef.current = initialTaskId; // Mark as processed
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
    const [sidebarFilter, setSidebarFilter] = useState<'all' | 'active' | 'completed'>('active');

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

        // Compare key fields (Added isBlocking and new classification fields)
        // [V3] Removed 'progress' from here as it is now an object
        const keys: (keyof Task)[] = ['title', 'description', 'status', 'isBlocking', 'techDescription', 'rtmId', 'relatedDailyStatusId', 'startDate', 'endDate', 'projectId', 'priority', 'scope', 'area', 'module'];
        for (const key of keys) {
            const val1 = formData[key] ?? "";
            const val2 = (selectedTask as any)[key] ?? "";
            // Loose equality for null/undefined/"" and trimming strings
            const v1Str = String(val1).trim();
            const v2Str = String(val2).trim();
            if (v1Str !== v2Str) return true;
        }

        // Complex objects
        if (JSON.stringify(formData.raci) !== JSON.stringify(selectedTask.raci)) return true;

        // Deep compare dependencies (arrays)
        const deps1 = (formData.dependencies || []).sort().join(',');
        const deps2 = (selectedTask.dependencies || []).sort().join(',');
        if (deps1 !== deps2) return true;

        if (JSON.stringify(formData.acceptanceCriteria) !== JSON.stringify(selectedTask.acceptanceCriteria)) return true;
        if (JSON.stringify(formData.attributes) !== JSON.stringify(selectedTask.attributes)) return true;

        // [V3] Progress Check
        // Handle legacy (number) vs V3 (object) comparison if needed
        const oldProgress = typeof selectedTask.progress === 'number' ? selectedTask.progress : (selectedTask.progress?.actual || 0);
        const newProgress = formData.progress?.actual || 0;
        if (oldProgress !== newProgress) return true;

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
            snapT.forEach(doc => loadedTasks.push({ id: doc.id, ...doc.data() } as Task));
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
                // IMPORTANT: If already selected, do nothing more!
                if (selectedTask?.id === initialTaskId) return;

                const target = tasks.find(t => t.id === initialTaskId);
                if (target) {
                    setSelectedTask(target);
                } else {
                    if (!retriedIds.current.has(initialTaskId)) {
                        retriedIds.current.add(initialTaskId);

                        try {
                            const taskDoc = await getDoc(doc(db, "tasks", initialTaskId));
                            if (taskDoc.exists()) {
                                const foundTask = { id: taskDoc.id, ...taskDoc.data() } as Task;
                                // Add to list and select
                                setTasks(prev => [foundTask, ...prev]);
                                setSelectedTask(foundTask);
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
    }, [initialTaskId, loading, tasks, loadData, showToast, selectedTask, user, userRole]);

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
            const isVisible = visibleProjects.some(vp => vp.id === t.projectId);
            if (!isVisible && tasks.indexOf(t) < 5) {
                // Debug first few hidden tasks
                // Filter projects
            }
            if (!isVisible) return false;
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
            // [FIX] Normalize Data on Selection
            // This ensures selectedTask (baseline) and formData (draft) start IDENTICAL
            // to prevent immediate "unsaved changes" flag.
            const normalizedTask = {
                ...task,
                title: task.title || task.description || "",
                // Ensure arrays are at least empty arrays, not undefined
                dependencies: task.dependencies || [],
                acceptanceCriteria: task.acceptanceCriteria || [],
                attributes: task.attributes || {},
                raci: task.raci || { responsible: [], accountable: [], consulted: [], informed: [] }
            };

            setSelectedTask(normalizedTask);
            setFormData(normalizedTask);

            setIsNew(false);
            setIsStatusOpen(false);
            setActiveRaciRole(null);
            setDependencySearch("");
            setConfirmModal(null);
        };

        if (isDirty()) {
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
                // [V3] Initialize new fields
                type: 'task',
                order: Date.now() / 1000, // Simple float order based on timestamp for now
                ancestorIds: [],
                progress: {
                    actual: 0
                },
                raci: { responsible: [], accountable: [], consulted: [], informed: [] },
                dependencies: [],
                tenantId: tenantId || "1"
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
        if (!formData.title) return showToast("UniTaskController", t('task_manager.title_required'), "error");
        if (!formData.projectId) return showToast("UniTaskController", t('task_manager.project_required'), "error");

        // Security Check: Ensure project is allowed
        if (!isAdmin) {
            const isAllowed = visibleProjects.some(p => p.id === formData.projectId);
            if (!isAllowed) return showToast("UniTaskController", t('task_manager.no_project_permission'), "error");
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

                const friendlyId = `TSK-${Math.floor(1000 + Math.random() * 9000)}`;
                const docRef = await addDoc(collection(db, "tasks"), {
                    ...formData,
                    friendlyId,
                    tenantId: tenantId || "1",
                    createdBy: user?.uid || "unknown",
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

                    // [V3] Deep merge progress to preserve 'planned' or handle legacy migration
                    if (data.progress) {
                        const oldProgress = typeof selectedTask.progress === 'number'
                            ? { actual: selectedTask.progress }
                            : (selectedTask.progress || { actual: 0 });

                        data.progress = { ...oldProgress, ...data.progress };
                    }

                    await updateDoc(doc(db, "tasks", selectedTask.id), {
                        ...data,
                        updatedAt: serverTimestamp()
                    });

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
                            });

                            // CROSS-TRIGGER: Dependency Release
                            if (formData.status === 'completed') {
                                const q = query(collection(db, "tasks"), where("dependencies", "array-contains", selectedTask.id), where("tenantId", "==", tenantId));
                                getDocs(q).then(snapshot => {
                                    snapshot.forEach(doc => {
                                        addDoc(collection(db, "task_activities"), {
                                            taskId: doc.id,
                                            tenantId: tenantId,
                                            userId: user.uid,
                                            userEmail: user.email,
                                            userName: user.displayName || 'Usuario',
                                            type: 'dependency_released',
                                            details: `Dependencia liberada: "${selectedTask.title}" ha sido completada.`,
                                            createdAt: serverTimestamp()
                                        });
                                    });
                                });
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
                            });
                        }

                        // 3. Classification (Generic Check for key fields)
                        ['priority', 'area', 'scope', 'module'].forEach((field) => {
                            // @ts-ignore
                            if (selectedTask[field] !== formData[field]) {
                                addDoc(collection(db, "task_activities"), {
                                    taskId: selectedTask.id,
                                    tenantId: tenantId,
                                    userId: user.uid,
                                    userEmail: user.email,
                                    userName: user.displayName || 'Usuario',
                                    type: 'classification_change',
                                    // @ts-ignore
                                    details: `${field.charAt(0).toUpperCase() + field.slice(1)} cambiado de "${selectedTask[field] || '-'}" a "${formData[field] || '-'}"`,
                                    createdAt: serverTimestamp()
                                });
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
                            });
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
                            });
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
                } catch (e) {
                    console.error(e);
                    showToast("UniTaskController", t('task_manager.delete_error'), "error");
                }
                setConfirmModal(null);
            }
        });
    };

    // --- CUSTOM DATE PICKER COMPONENT ---
    const CustomDatePicker = ({ target, value, onClose, onSelect }: { target: string, value: string | undefined, onClose: () => void, onSelect: (d: string) => void }) => {
        const title = target === 'startDate' ? 'Fecha de Inicio' : 'Fecha Fin';
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
                        const isSelected = value && isSameDay(new Date(value), d);
                        // Prevent selection of past dates for Deadline (endDate), but allow if already selected
                        const isPast = target === 'endDate' && isBefore(d, today);
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
            default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
        }
    };

    const getStatusLabel = (s?: string) => {
        switch (s) {
            case 'completed': return t('task_manager.status_completed');
            case 'in_progress': return t('task_manager.status_in_progress');
            case 'review': return t('task_manager.status_review');
            default: return t('task_manager.status_pending');
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
                                        {f === 'all' ? t('task_manager.filter_all') : f === 'active' ? t('task_manager.filter_active') : t('task_manager.filter_completed')}
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
                                            )} >
                                                <HighlightText text={t.friendlyId || 'No ID'} highlight={sidebarSearch} />
                                            </span>
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
                        <p className={cn("text-sm font-medium", isLight ? "text-zinc-500" : "text-white")}>{t('task_manager.select_task')}</p>
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
                                            <span className="text-zinc-400">| <span className={cn(isLight ? "text-zinc-600" : "text-zinc-300")}>{formData.createdAt ? format(formData.createdAt.toDate ? formData.createdAt.toDate() : new Date(formData.createdAt), 'dd/MM/yy', { locale: es }) : "-"}</span></span>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setShowAuditLog(true)}
                                                className={cn("p-1.5 rounded transition-all mr-2", isLight ? "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5")}
                                                title="Ver Bitácora de Cambios"
                                            >
                                                <History className="w-4 h-4" />
                                            </button>
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

                                    </div></div></div></div>

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


                        <div className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                {/* Col 1 - Operativa (Ancho 8) */}
                                <div className="md:col-span-8 space-y-6">

                                    {/* Dates & Timeline (Simplified) */}
                                    <div className={cn("border rounded-xl p-5 shadow-lg relative", isLight ? "bg-white border-zinc-200" : "bg-card border-white/10")}>
                                        <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-4", isLight ? "text-zinc-900" : "text-white")}>{t('task_manager.schedule')}</h3>
                                        <div className="flex items-start gap-4">
                                            {/* Start Date */}
                                            <div className="flex-1 relative group">
                                                <label className={cn("text-[9px] font-bold uppercase block mb-1", isLight ? "text-zinc-500" : "text-white")}>{t('task_manager.start_date')}</label>
                                                <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border", isLight ? "bg-zinc-50 border-zinc-200" : "bg-black/20 border-white/5")}>
                                                    <CalendarIcon className="w-4 h-4 text-zinc-500" />
                                                    <span className="text-xs text-zinc-500 font-mono">
                                                        {formData.createdAt
                                                            ? format(formData.createdAt.toDate ? formData.createdAt.toDate() : new Date(formData.createdAt), 'dd MMM yyyy', { locale: es })
                                                            : (isNew ? format(new Date(), 'dd MMM yyyy', { locale: es }) : "Pendiente")
                                                        }
                                                    </span>
                                                </div>
                                            </div>

                                            {/* End Date */}
                                            <div className="flex-1 relative group">
                                                <label className={cn("text-[9px] font-bold uppercase block mb-1", isLight ? "text-red-600" : "text-red-400")}>{t('task_manager.end_date')}</label>
                                                <div
                                                    className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:border-indigo-500/50 transition-colors",
                                                        isLight ? "bg-white border-zinc-200" : "bg-black/20 border-white/5"
                                                    )}
                                                    onClick={() => { setDatePickerTarget('endDate'); setCurrentMonth(formData.endDate ? new Date(formData.endDate) : new Date()); }}
                                                >
                                                    <CalendarIcon className={cn("w-4 h-4", isLight ? "text-zinc-400" : "text-zinc-400")} />
                                                    <span className={cn("text-xs font-mono", isLight ? "text-zinc-900" : "text-zinc-300")}>
                                                        {formData.endDate ? format(new Date(formData.endDate), 'dd MMM yyyy', { locale: es }) : 'Seleccionar'}
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

                                    {/* Assignment (No Title) */}
                                    <div className={cn("border rounded-xl p-5 shadow-lg relative", isLight ? "bg-white border-zinc-200" : "bg-card border-white/10")}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                                                <UserIcon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <label className={cn("text-[10px] font-bold uppercase mb-1 block", isLight ? "text-zinc-500" : "text-zinc-400")}>{t('task_manager.task_owner')}</label>
                                                <select
                                                    className={cn("w-full appearance-none border rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 outline-none transition-all cursor-pointer",
                                                        isLight ? "bg-zinc-50 border-zinc-300 text-zinc-900 focus:ring-indigo-500/50" : "bg-black/20 border-white/10 text-white focus:ring-indigo-500/50"
                                                    )}
                                                    value={formData.assignedTo || ""}
                                                    onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                                                >
                                                    <option value="">{t('task_manager.select_owner')}</option>
                                                    {users.map(u => (
                                                        <option key={u.uid} value={u.uid}>
                                                            {u.displayName} ({u.role?.replace('_', ' ')})
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="text-[10px] text-zinc-500 mt-1 italic">
                                                    {t('task_manager.assignment_notification')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tech Desc (Renamed) */}
                                    <div className={cn("border rounded-xl p-5 shadow-lg", isLight ? "bg-white border-zinc-200" : "bg-card border-white/10")}>
                                        <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-3", isLight ? "text-zinc-900" : "text-white")}>{t('task_manager.description')}</h3>
                                        <textarea
                                            className={cn("w-full min-h-[80px] border rounded-lg p-3 text-xs focus:outline-none resize-none font-mono",
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
                                                            "w-full min-h-[60px] border rounded-lg p-3 text-xs focus:outline-none resize-none",
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
                                                    <div className={cn("space-y-2 max-h-60 overflow-y-auto custom-scrollbar pl-3 border-l", isLight ? "border-zinc-200" : "border-white/10")}>
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
                                                // REQUIREMENT: Hide completed dependencies
                                                if (!depTask || depTask.status === 'completed') return null;

                                                return (
                                                    <div key={depId} className="flex items-center gap-3 p-2 bg-red-500/5 text-red-400 rounded-lg text-xs border border-red-500/10 justify-between group hover:border-red-500/30 transition-all">
                                                        <button
                                                            onClick={() => handleSelectTask(depTask)}
                                                            className="flex items-center gap-2 text-left flex-1 outline-none"
                                                            title="Ver Tarea Dependiente"
                                                        >
                                                            <AlertTriangle className="w-4 h-4 shrink-0" />
                                                            <div>
                                                                <span className="font-bold block text-[9px] uppercase opacity-70">{t('task_manager.blocked_by')}</span>
                                                                <div className="font-medium text-zinc-300 hover:text-red-300 underline underline-offset-2 decoration-red-500/30 transition-all">
                                                                    {depTask.friendlyId || 'Unknown'} - {depTask.title}
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
                                                    {tasks
                                                        .filter(t =>
                                                            t.id !== selectedTask.id &&
                                                            t.projectId === formData.projectId && // REQUIREMENT: Same Project Only
                                                            t.status !== 'completed' && // Optional: Filter out completed tasks from being added as new dependencies?
                                                            (t.friendlyId?.toLowerCase().includes(dependencySearch.toLowerCase()) || t.title?.toLowerCase().includes(dependencySearch.toLowerCase()))
                                                        )
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


                                </div>

                                {/* Col 2 - Metadatos (Ancho 4) */}
                                <div className="md:col-span-4 space-y-6">

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
                                                        onChange={e => setFormData({ ...formData, projectId: e.target.value })}
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
                                                <label className={cn("text-[10px] font-bold uppercase mb-1 block", isLight ? "text-zinc-500" : "text-zinc-400")}>{t('task_manager.priority')}</label>
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

                                            {/* Area */}
                                            <div>
                                                <label className={cn("text-[10px] font-bold uppercase mb-1 block", isLight ? "text-zinc-500" : "text-zinc-400")}>{t('task_manager.area')} *</label>
                                                <PowerSelect
                                                    value={formData.area || ""}
                                                    onChange={(val) => setFormData({ ...formData, area: val })}
                                                    options={(masterData.area || []).map(i => ({ value: i.name, label: i.name, color: i.color }))}
                                                    placeholder="Seleccionar Área"
                                                />
                                            </div>

                                            {/* Scope */}
                                            <div>
                                                <label className={cn("text-[10px] font-bold uppercase mb-1 block", isLight ? "text-zinc-500" : "text-zinc-400")}>{t('task_manager.scope')}</label>
                                                <PowerSelect
                                                    value={formData.scope || ""}
                                                    onChange={(val) => setFormData({ ...formData, scope: val })}
                                                    options={(masterData.scope || []).map(i => ({ value: i.name, label: i.name, color: i.color }))}
                                                    placeholder="Seleccionar Alcance"
                                                />
                                            </div>

                                            {/* Module */}
                                            <div>
                                                <label className={cn("text-[10px] font-bold uppercase mb-1 block", isLight ? "text-zinc-500" : "text-zinc-400")}>{t('task_manager.module')} *</label>
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

                                    {/* Actions (Existente) */}
                                    <div className="pt-2 border-t border-white/5 flex flex-col gap-3">
                                        <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-indigo-900/30 transition-all flex justify-center items-center gap-2 text-xs uppercase tracking-wide">
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t('task_manager.save_changes')}
                                        </button>
                                        {!isNew && can('delete', 'tasks') && <button onClick={handleDelete} className="w-full py-3 bg-transparent border border-white/10 text-red-400 hover:bg-red-500/10 hover:border-red-500/20 font-bold rounded-lg transition-all text-xs uppercase tracking-wide">{t('task_manager.delete_task')}</button>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


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

                {/* Audit Log Modal */}
                {selectedTask && showAuditLog && (
                    <ActivityAuditModal
                        taskId={selectedTask.id}
                        onClose={() => setShowAuditLog(false)}
                        isLight={isLight}
                        theme={theme}
                    />
                )}
            </div>
        </div>
    );
}

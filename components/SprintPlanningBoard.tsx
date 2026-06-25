"use client";

import { safeParseDate } from "@/lib/date-utils";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useSprints } from "@/hooks/useSprints";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import { format, addDays, getDay, startOfToday, endOfDay, isWithinInterval } from 'date-fns';
import { Task, Project, UserProfile, RoleLevel } from "@/types";
import { Timer, AlertTriangle, TrendingUp, Users, Search, Filter, Briefcase, BarChart } from "lucide-react";
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getActiveProjects, filterBySAMScope } from "@/lib/projects";
import { useAccessScopes } from "@/hooks/useAccessScopes";
import { SprintBurndown } from "@/components/SprintBurndown"; // Import Burndown component
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragEndEvent,
    useDraggable,
    useDroppable,
} from '@dnd-kit/core';

export function SprintPlanningBoard() {
    const { user, tenantId, viewContext } = useAuth();
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const { sprints, loading: sprintsLoading } = useSprints();
    const { t } = useLanguage();
    const accessScopes = useAccessScopes();

    const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]); // [NEW] Resource Filter
    const [backlogTasks, setBacklogTasks] = useState<Task[]>([]);
    const [sprintTasks, setSprintTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
    const [projects, setProjects] = useState<Project[]>([]);

    // Resource Management
    const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Get active/planning sprints
    const availableSprints = sprints.filter(s => s.status === 'active' || s.status === 'planning');
    const selectedSprint = availableSprints.find(s => s.id === selectedSprintId);

    // Load Projects & Users
    useEffect(() => {
        const loadMetadata = async () => {
            if (!tenantId) return;

            // Projects
            const projs = await getActiveProjects(tenantId);
            setProjects(filterBySAMScope(projs, accessScopes));

            // Users (for Workload)
            try {
                const qUsers = query(collection(db, "users"), where("tenantId", "==", tenantId));
                const snapUsers = await getDocs(qUsers);
                const uMap: Record<string, UserProfile> = {};
                snapUsers.forEach(d => {
                    uMap[d.id] = { uid: d.id, ...d.data() } as UserProfile;
                });
                setUsersMap(uMap);
            } catch (e) {
                console.error("Error loading users for sprint board:", e);
            }
        };
        loadMetadata();
    }, [tenantId]);

    // Load tasks
    useEffect(() => {
        if (!tenantId) return;

        const tasksRef = collection(db, "tasks");
        const q = query(tasksRef, where("tenantId", "==", tenantId), where("isActive", "==", true));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));

            // Separate backlog (no sprint) from sprint tasks
            // [REVERT] Backlog should NOT show completed tasks.
            const backlog = allTasks.filter(t => !t.sprintId && t.status !== 'completed' && t.status !== 'discarded' && t.status !== 'out_of_scope');
            const sprint = selectedSprintId
                ? allTasks.filter(t => t.sprintId === selectedSprintId)
                : [];

            setBacklogTasks(backlog);
            setSprintTasks(sprint);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tenantId, selectedSprintId]);

    // [AUTOMATION] Auto-Open Active Sprint on Load
    // [AUTOMATION] Auto-Open Active Sprint on Load
    useEffect(() => {
        if (sprintsLoading) return;

        // If selection already exists, do nothing
        if (selectedSprintId) return;

        console.log("Auto-Open Debug:", {
            count: sprints.length,
            statuses: sprints.map(s => `${s.name}: ${s.status}`)
        });

        // 1. Priority: Find ACTIVE sprint
        let target = sprints.find(s => s.status === 'active');

        // 2. Fallback: Find LATEST PLANNED sprint (since sprints are desc ordered)
        if (!target) {
            target = sprints.find(s => s.status === 'planning');
        }

        if (target) {
            console.log(`✅ Auto-opening sprint: ${target.name} (${target.status})`);
            setSelectedSprintId(target.id);
        } else {
            console.warn("⚠️ No active or planning sprint found. Available:", sprints.map(s => s.status));
            // LAST RESORT: Just pick the first one if it exists?
            // if (sprints.length > 0) setSelectedSprintId(sprints[0].id);
        }
    }, [sprintsLoading, sprints, selectedSprintId]);

    // Filter Logic
    const filterTasks = (tasks: Task[]) => {
        return tasks.filter(task => {
            // Text Search (ID or Title)
            const matchesSearch = searchQuery === "" ||
                task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (task.friendlyId && task.friendlyId.toLowerCase().includes(searchQuery.toLowerCase())) ||
                task.id.toLowerCase().includes(searchQuery.toLowerCase());

            // Project Filter
            const matchesProject = selectedProjectId === "ALL" || task.projectId === selectedProjectId;

            // Resource Filter
            const matchesUser = selectedUserIds.length === 0 || (task.assignedTo && selectedUserIds.includes(task.assignedTo));

            return matchesSearch && matchesProject && matchesUser;
        });
    };

    const filteredBacklog = useMemo(() => {
        const tasks = filterTasks(backlogTasks);

        return tasks.sort((a, b) => {
            // Priority: review > in_progress > pending > others
            const priority: Record<string, number> = {
                'review': 0,
                'in_progress': 1,
                'pending': 2
            };

            const pA = priority[a.status] ?? 99;
            const pB = priority[b.status] ?? 99;

            if (pA !== pB) return pA - pB;

            // Secondary: Oldest First (createdAt)
            const dateA = a.createdAt && (a.createdAt as any).seconds ? (a.createdAt as any).seconds : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const dateB = b.createdAt && (b.createdAt as any).seconds ? (b.createdAt as any).seconds : (b.createdAt ? new Date(b.createdAt).getTime() : 0);

            return dateA - dateB;
        });
    }, [backlogTasks, searchQuery, selectedProjectId, selectedUserIds]);

    const filteredSprint = useMemo(() => filterTasks(sprintTasks), [sprintTasks, searchQuery, selectedProjectId, selectedUserIds]);


    // Calculate capacity metrics
    const calculateCapacity = () => {
        if (!selectedSprint) return { committed: 0, capacity: 0, percentage: 0 };

        const committed = sprintTasks.reduce((sum, task) => sum + (task.estimatedEffort || 0), 0);
        // [CHANGE] Use plannedCapacity (calculated based on resources) if available, fallback to legacy capacity
        const capacity = selectedSprint.plannedCapacity || selectedSprint.capacity || 20;
        const percentage = capacity > 0 ? (committed / capacity) * 100 : 0;

        return { committed, capacity, percentage };
    };

    const { committed, capacity, percentage } = calculateCapacity();

    // [AUTOMATION] Check for Sprint Expiry & Flag Tasks
    useEffect(() => {
        if (!selectedSprint || !sprintTasks.length || !activeId) return; // Only run if loaded and not dragging

        const checkExpiry = async () => {
            const now = new Date();
            const endDate = safeParseDate(selectedSprint.endDate);

            // If sprint expired yesterday or before
            if (endDate && endDate < now && selectedSprint.status === 'active') {
                const needsUpdate = sprintTasks.filter(t => !t.needsRollover && t.status !== 'completed' && t.status !== 'discarded' && t.status !== 'out_of_scope');

                if (needsUpdate.length > 0) {
                    console.log(`Flagging ${needsUpdate.length} tasks for rollover from expired sprint ${selectedSprint.name}`);
                    // Batch update could be better, but for now individual updates
                    needsUpdate.forEach(async (task) => {
                        try {
                            const ref = doc(db, 'tasks', task.id);
                            await updateDoc(ref, { needsRollover: true });
                        } catch (e) {
                            console.error("Error flagging task:", e);
                        }
                    });
                }
            }
        };

        checkExpiry();
    }, [selectedSprint, sprintTasks.length]); // Run when sprint or task count changes

    // Group Workload by User
    const workloadByUser = useMemo(() => {
        const stats: Record<string, number> = {};
        sprintTasks.forEach(t => {
            if (t.assignedTo) {
                stats[t.assignedTo] = (stats[t.assignedTo] || 0) + (t.estimatedEffort || 0);
            } else {
                stats['unassigned'] = (stats['unassigned'] || 0) + (t.estimatedEffort || 0);
            }
        });
        return stats;
    }, [sprintTasks]);

    // Get capacity color
    const getCapacityColor = () => {
        if (percentage < 80) return "text-indigo-500"; // Healthy = Indigo (Brand)
        if (percentage < 100) return "text-yellow-500";
        return "text-red-500";
    };

    const getCapacityBg = () => {
        if (percentage < 80) return "bg-indigo-500"; // Healthy = Indigo (Brand)
        if (percentage < 100) return "bg-yellow-500";
        return "bg-red-500";
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const taskId = active.id as string;
        const targetContainer = over.id as string;

        // Find the task
        const task = [...backlogTasks, ...sprintTasks].find(t => t.id === taskId);
        if (!task) return;

        // Determine new sprint ID based on drop container
        let newSprintId: string | null = null;
        if (targetContainer === 'sprint-column') {
            if (!selectedSprintId) return; // Should not happen if container is visible
            newSprintId = selectedSprintId;
        } else if (targetContainer === 'backlog-column') {
            newSprintId = null;
        } else {
            return; // Dropped elsewhere
        }

        // Only update if changed
        if (task.sprintId !== newSprintId) {
            // [DEBUG] Log for troubleshooting
            console.log('[SprintBoard] handleDragEnd:', {
                taskId: task.id,
                taskStatus: task.status,
                fromSprint: task.sprintId,
                toSprint: newSprintId,
                isCompleted: task.status === 'completed'
            });

            // [STRICT RULE] Completed tasks CANNOT be moved via drag-and-drop at all.
            // They must be managed via the Task Manager (ABM) with Admin approval.
            if (['completed', 'discarded', 'out_of_scope'].includes(task.status)) {
                console.log('[SprintBoard] BLOCKING closed task move!');
                alert(t('sprints.error_completed_immovable')); // "Completed tasks cannot be moved from the Sprint Board. Use Task Manager."
                return;
            }

            // [VALIDATION] Capacity Check
            if (newSprintId && selectedSprint) {
                const taskEffort = task.estimatedEffort || 0;
                // Check if adding this task exceeds capacity
                // We use 'committed' calculated above which is current sprint load
                // Since 'task' is NOT in 'sprintTasks' (it's in backlogTasks or another sprint if we supported cross-sprint drag), it's safe to add.
                // NOTE: If we support reordering within sprint, this check isn't needed because sprintId doesn't change.
                const projectedLoad = committed + taskEffort;
                const sprintLimit = selectedSprint.plannedCapacity || selectedSprint.capacity || 20;

                if (projectedLoad > sprintLimit) {
                    const confirmOverload = window.confirm(
                        `⚠️ ALERTA DE CAPACIDAD\n\n` +
                        `Añadir esta tarea excederá la capacidad planificada del Sprint.\n` +
                        `Capacidad: ${sprintLimit} días\n` +
                        `Actual + Tarea: ${projectedLoad.toFixed(1)} días\n\n` +
                        `¿Deseas continuar de todos modos?`
                    );
                    if (!confirmOverload) return;
                }
            }

            try {
                const taskRef = doc(db, 'tasks', taskId);
                const updates: any = {
                    sprintId: newSprintId
                };

                // If assigning to a sprint, suggest updating the clientDeadline to match Sprint End
                if (newSprintId) {
                    const targetSprint = availableSprints.find(s => s.id === newSprintId);
                    if (targetSprint && targetSprint.endDate) {
                        updates.clientDeadline = targetSprint.endDate;
                        updates.endDate = targetSprint.endDate.toDate ? targetSprint.endDate.toDate().toISOString() : targetSprint.endDate;
                    }

                    // [AUTOMATION] Pending -> In Progress when added to Sprint
                    if (task.status === 'pending') {
                        updates.status = 'in_progress';
                    }
                } else {
                    // [AUTOMATION] Back to Backlog Cleanup
                    // 1. Remove Sprint Association
                    updates.sprintId = null;
                    updates.needsRollover = null; // Clear any legacy flags

                    // 2. Reset Status?
                    // User Rule: "in_progress" -> "pending".
                    // "completed" -> Blocked above, so we don't worry.
                    // "review" -> Keep it? Or reset? Usually review implies it needs attention. 
                    // Let's stick to: In Progress -> Pending. Review -> Review (maybe they are reviewing it outside sprint)
                    if (task.status === 'in_progress') {
                        updates.status = 'pending';
                    }
                }

                await updateDoc(taskRef, updates);
                // alert(t('sprints.success_updated')); // Optional success message
            } catch (error: any) {
                console.error("Error updating sprint:", error);
                alert(`${t('common.error')}: ${error.message || 'Update failed'}`);
            }
        }
    };

    const activeTask = activeId ? [...backlogTasks, ...sprintTasks].find(t => t.id === activeId) : null;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-sm text-muted-foreground">{t('sprints.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="border-b pb-4 border-border">
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                        <Timer className="w-6 h-6 text-indigo-500" />
                        {t('sprints.simulator_title')}
                    </h1>
                    <p className="text-sm mt-1 mb-4 text-muted-foreground">
                        {t('sprints.simulator_subtitle')}
                    </p>

                    {/* Filters Toolbar */}
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[250px] shrink-0">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder={t('sprints.search_placeholder') || "Search ID or Name..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 bg-background border-input text-foreground placeholder:text-muted-foreground focus:ring-primary/20 transition-all"
                            />
                        </div>

                        {/* Project Filter */}
                        <div className="relative w-full md:w-64 min-w-[200px] shrink-0">
                            <Filter className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                            <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 appearance-none bg-background border-input text-foreground focus:ring-primary/20 transition-all"
                            >
                                <option value="ALL">All Projects</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Sprint Selector & Capacity */}
                <div className="border rounded-xl p-6 shadow-sm bg-card border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Sprint Selector */}
                        <div>
                            <label className="text-xs font-bold uppercase block mb-2 text-foreground">
                                {t('sprints.sprint_active')}
                            </label>
                            <select
                                value={selectedSprintId || ""}
                                onChange={e => setSelectedSprintId(e.target.value || null)}
                                className="w-full border rounded-lg px-4 py-3 text-sm font-bold focus:ring-2 outline-none bg-background border-input text-foreground focus:ring-primary/20"
                            >
                                <option value="">{t('sprints.select_sprint')}</option>
                                {availableSprints.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({s.status.toUpperCase()})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Capacity Indicator */}
                        {selectedSprint && (
                            <div>
                                <label className="text-xs font-bold uppercase block mb-2 text-foreground">
                                    {t('sprints.sprint_promise')}
                                </label>
                                <div className="space-y-2">
                                    {/* Progress Bar */}
                                    <div className="h-8 rounded-lg overflow-hidden bg-muted/50">
                                        <div
                                            className={cn("h-full transition-all duration-300", getCapacityBg())}
                                            style={{ width: `${Math.min(percentage, 100)}%` }}
                                        />
                                    </div>
                                    {/* Metrics */}
                                    <div className="flex items-center justify-between text-xs">
                                        <span className={cn("font-mono", getCapacityColor())}>
                                            {committed.toFixed(1)} / {capacity} {t('sprints.days')}
                                        </span>
                                        <span className={cn("font-bold", getCapacityColor())}>
                                            {percentage < 80 && t('sprints.promise_healthy')}
                                            {percentage >= 80 && percentage < 100 && t('sprints.promise_tight')}
                                            {percentage >= 100 && t('sprints.promise_risky')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Workload Distribution (NEW) */}
                    {selectedSprint && (
                        <div className="mt-6 pt-6 border-t border-border">
                            <h4 className="text-xs font-bold uppercase mb-3 flex items-center gap-2 text-foreground opacity-80">
                                <BarChart className="w-4 h-4" /> Team Workload Distribution
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {Object.entries(workloadByUser).map(([uid, load]) => {
                                    const userProfile = usersMap[uid];
                                    const isSelected = selectedUserIds.includes(uid);

                                    return (
                                        <div
                                            key={uid}
                                            onClick={() => {
                                                setSelectedUserIds(prev =>
                                                    prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
                                                );
                                            }}
                                            className={cn(
                                                "flex items-center gap-2 p-2 rounded-lg bg-background border transition-all cursor-pointer hover:shadow-md select-none",
                                                isSelected
                                                    ? "border-primary ring-1 ring-primary shadow-sm bg-primary/5"
                                                    : "border-border hover:border-primary/50"
                                            )}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 font-bold text-[10px] text-muted-foreground border border-border">
                                                {userProfile?.photoURL ? (
                                                    <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span>{userProfile?.displayName ? userProfile.displayName.substring(0, 2).toUpperCase() : "??"}</span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[10px] font-bold truncate text-foreground">{userProfile?.displayName || "Unassigned"}</div>
                                                <div className="text-[10px] font-mono text-muted-foreground">{load.toFixed(1)} days</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Burndown Chart (Right below Capacity/Workload) */}
                    {selectedSprint && (
                        <div className="mt-6 pt-6 border-t border-border">
                            <h4 className="text-xs font-bold uppercase mb-3 flex items-center gap-2 text-foreground opacity-80">
                                <TrendingUp className="w-4 h-4" /> Burndown Chart
                            </h4>
                            <div className="bg-background/50 rounded-lg p-2 border border-border">
                                <SprintBurndown
                                    sprint={selectedSprint}
                                    tasks={sprintTasks}
                                    usersMap={usersMap}
                                    selectedUserIds={selectedUserIds}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Board */}
                {selectedSprintId ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                        {/* Backlog Column */}
                        <DroppableColumn
                            id="backlog-column"
                            title={t('sprints.backlog')}
                            count={filteredBacklog.length}
                            icon={Users}
                            className="bg-card border-border"
                        >
                            {filteredBacklog.length === 0 ? (
                                <p className="text-xs text-center py-8 text-muted-foreground">
                                    {t('sprints.no_backlog_tasks')}
                                </p>
                            ) : (
                                filteredBacklog.map(task => (
                                    <DraggableTaskCard key={task.id} task={task} isLight={isLight} t={t} usersMap={usersMap} />
                                ))
                            )}
                        </DroppableColumn>

                        {/* Sprint Column */}
                        <DroppableColumn
                            id="sprint-column"
                            title={t('sprints.current_promise')}
                            count={filteredSprint.length}
                            icon={TrendingUp}
                            className="bg-card shadow-indigo-500/5 border-indigo-500/20"
                            titleClassName="text-indigo-500"
                            headerIconClassName="text-indigo-500"
                        >
                            {filteredSprint.length === 0 ? (
                                <p className="text-xs text-center py-8 text-indigo-500/60">
                                    {t('sprints.drag_here')}
                                </p>
                            ) : (
                                filteredSprint.map(task => (
                                    <DraggableTaskCard key={task.id} task={task} isLight={isLight} inSprint t={t} usersMap={usersMap} />
                                ))
                            )}
                        </DroppableColumn>
                    </div>
                ) : (
                    <div className="border rounded-xl p-12 text-center bg-card border-border">
                        <Timer className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm font-bold text-foreground">
                            {t('sprints.select_to_start')}
                        </p>
                        <p className="text-xs mt-1 text-muted-foreground">
                            {t('sprints.select_desc')}
                        </p>
                    </div>
                )}

                <DragOverlay>
                    {activeTask ? (
                        <div className="opacity-80 rotate-2 cursor-grabbing">
                            <TaskCard task={activeTask} isLight={isLight} t={t} usersMap={usersMap} />
                        </div>
                    ) : null}
                </DragOverlay>
            </div>
        </DndContext >
    );
}

// Droppable Column Component
function DroppableColumn({ id, title, count, children, icon: Icon, className, titleClassName, headerIconClassName }: any) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={cn("border rounded-xl p-4 shadow-sm transition-colors",
                className,
                isOver && "bg-accent border-emerald-500 ring-2 ring-emerald-500/10"
            )}
        >
            <h3 className={cn("text-sm font-bold uppercase mb-4 flex items-center gap-2",
                titleClassName || "text-foreground"
            )}>
                <Icon className={cn("w-4 h-4", headerIconClassName)} />
                {title} ({count})
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto min-h-[200px] pr-2 custom-scrollbar">
                {children}
            </div>
        </div>
    );
}

// Draggable Task Card Wrapper
function DraggableTaskCard(props: any) {
    const isCompleted = ['completed', 'discarded', 'out_of_scope'].includes(props.task.status);
    // [CHANGE] Disable dragging for completed tasks strict rule
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: props.task.id,
        disabled: isCompleted
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={cn("touch-none", isDragging && "opacity-50", isCompleted && "cursor-default")}>
            <TaskCard {...props} isDraggable={!isCompleted} />
        </div>
    );
}

// Task Card Pure Component
function TaskCard({ task, isLight, inSprint = false, t, isDraggable = true, usersMap }: { task: Task; isLight: boolean; inSprint?: boolean; t: (key: string) => string; isDraggable?: boolean; usersMap?: Record<string, UserProfile> }) {
    const hasRisk = task.clientDeadline && task.sprintId;
    const isCompleted = ['completed', 'discarded', 'out_of_scope'].includes(task.status);

    // Assignee
    const assignee = task.assignedTo && usersMap ? usersMap[task.assignedTo] : null;

    // Date Formatting
    const formatDateShort = (val: any) => {
        if (!val) return null;
        const d = safeParseDate(val);
        return d ? format(d, 'dd/MM') : null;
    };

    const deadline = task.clientDeadline;
    const deadlineDate = safeParseDate(deadline);
    const isOverdue = deadlineDate && deadlineDate < new Date();

    // Status Colors
    const getStatusColor = (s: string) => {
        switch (s) {
            case 'completed': return 'bg-emerald-500 text-white';
            case 'in_progress': return 'bg-blue-500 text-white';
            case 'review': return 'bg-purple-500 text-white';
            case 'discarded': return 'bg-rose-500 text-white';
            case 'out_of_scope': return 'bg-purple-500 text-white';
            default: return 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300';
        }
    };

    const getStatusLabel = (s: string) => {
        switch (s) {
            case 'completed': return 'DONE'; // Compact
            case 'in_progress': return 'WIP';
            case 'review': return 'REV';
            case 'discarded': return 'DISC';
            case 'out_of_scope': return 'OUT';
            default: return 'PEND';
        }
    };

    return (
        <div className={cn("border rounded-lg p-3 transition-all select-none bg-background relative",
            isDraggable ? "cursor-grab hover:shadow-md" : "cursor-default opacity-90",
            isCompleted && inSprint
                ? "bg-emerald-500/10 border-emerald-500/30" // Completed in Sprint (Green)
                : (isLight ? "border-input hover:border-primary/50" : "border-white/5 hover:border-primary/50")
        )}>
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-[10px] uppercase font-bold px-1.5 py-0.5 rounded leading-none", getStatusColor(task.status))}>
                            {getStatusLabel(task.status)}
                        </span>
                        <p className={cn("text-[10px] font-mono opacity-50 truncate")}>
                            {task.friendlyId || task.id.slice(0, 4)}
                        </p>
                    </div>
                    <p className={cn("text-xs font-medium leading-snug line-clamp-2", isCompleted ? "opacity-70" : "text-foreground")}>
                        {task.title}
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                {/* Left: Assignee */}
                <div className="flex items-center gap-1.5 min-w-0">
                    {assignee ? (
                        <>
                            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 text-[8px] font-bold border border-border">
                                {assignee.photoURL ? (
                                    <img src={assignee.photoURL} alt={assignee.displayName} className="w-full h-full object-cover" />
                                ) : (
                                    <span>{assignee.displayName ? assignee.displayName.substring(0, 2).toUpperCase() : "??"}</span>
                                )}
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                                {assignee.displayName?.split(' ')[0]}
                            </span>
                        </>
                    ) : (
                        <span className="text-[10px] text-muted-foreground italic opacity-50">Unassigned</span>
                    )}
                </div>

                {/* Right: Deadline & Size */}
                <div className="flex items-center gap-2 shrink-0">
                    {deadlineDate && (
                        <div className={cn("text-[10px] font-mono flex items-center gap-1", isOverdue ? "text-red-500 font-bold" : "text-muted-foreground")}>
                            {isOverdue && <AlertTriangle className="w-3 h-3" />}
                            {formatDateShort(deadline)}
                        </div>
                    )}

                    {task.estimatedEffortSize && (
                        <div className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded",
                            task.estimatedEffortSize === 'XS' ? "bg-blue-500/10 text-blue-500" :
                                task.estimatedEffortSize === 'S' ? "bg-green-500/10 text-green-500" :
                                    task.estimatedEffortSize === 'M' ? "bg-yellow-500/10 text-yellow-500" :
                                        task.estimatedEffortSize === 'L' ? "bg-orange-500/10 text-orange-500" :
                                            "bg-red-500/10 text-red-500"
                        )}>
                            {task.estimatedEffortSize}
                        </div>
                    )}
                </div>
            </div>

            {/* Risk Indicator moved to bottom or combined with date? 
               Let's keep the dedicated risk if strictly needed, but date color mostly covers it.
               The previous code had dedicated risk line.
            */}
            {hasRisk && !deadlineDate && (
                <div className="flex items-center gap-1 mt-1 text-[10px] text-red-500">
                    <AlertTriangle className="w-3 h-3" />
                </div>
            )}
        </div>
    );
}
